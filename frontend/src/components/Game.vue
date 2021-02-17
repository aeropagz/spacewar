<template>
  <div
    class="arena"
    @keydown="handleKey('down', $event)"
    @keyup="handleKey('up', $event)"
    @mousemove="updateMouse($event)"
    ref="arena"
    tabindex="-1"
  >
    <div class="ping">{{ this.status.ping }}</div>
    <div>
      <img
        src="@/assets/spaceship_klaas.gif"
        alt="spaceship"
        class="player-local"
        :style="{
          transform: `rotate(${controls.rotation}rad)`,
        }"
      />
    </div>
    <div class="field" :style="fieldStyle">
      <div v-if="otherPlayers.length" class="players-remote">
        <div v-for="player in otherPlayers" :key="player.uuid">
          <img
            src="@/assets/spaceship_klaas.gif"
            alt=""
            class="player-remote"
            :style="{
              top: `calc(${(player.pos.y / 4000) * 100}%)`,
              left: `calc(${(player.pos.x / 4000) * 100}%)`,
              transform: `rotate(${player.pos.rotation}rad)`,
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import Gateway from "@/assets/js/Gateway.js";

  export default {
    mounted() {
      this.$refs.arena.focus();
      this.process_feed();
      this.gameInterval = setInterval(this.gameLoop, 40);
    },
    beforeDestroy() {
      clearInterval(this.gameInterval);
      this.gateway.stop();
    },

    data() {
      return {
        controls: {
          up: 0,
          left: 0,
          down: 0,
          right: 0,
          mouseX: 0,
          mouseY: 0,
          rotation: 0,
        },
        status: {
          ping: "0ms",
          uuid: null,
          name: localStorage.getItem("name") || "",
          field: {
            x: 2000,
            y: 2000,
          },
          players: {},
        },
        gameInterval: null,
        gateway: null,
      };
    },
    computed: {
      fieldStyle() {
        return {
          top: `calc(50% - ${this.status.field.y}px)`,
          left: `calc(50% - ${this.status.field.x}px)`,
        };
      },

      updateRotation() {
        let deltaY = this.controls.mouseY - window.innerHeight / 2;
        let deltaX = this.controls.mouseX - window.innerWidth / 2;
        let degree = Math.atan(deltaY / deltaX);
        if (this.controls.mouseX < window.innerWidth / 2) {
          degree += Math.PI;
        }
        degree += Math.PI / 2;
        return degree;
      },

      otherPlayers() {
        const otherPlayers = Object.keys(this.status.players)
          .map((key) => {
            return this.status.players[key];
          })
          .filter((player) => player.uuid !== this.status.uuid);
        return otherPlayers;
      },
    },
    methods: {
      gameLoop() {
        if (this.controls.up) this.status.field.y -= 8;
        if (this.controls.down) this.status.field.y += 8;
        if (this.controls.left) this.status.field.x -= 8;
        if (this.controls.right) this.status.field.x += 8;
        this.status.field.x = this.clamp(this.status.field.x, 0, 4000);
        this.status.field.y = this.clamp(this.status.field.y, 0, 4000);
        this.controls.rotation = this.updateRotation;
        let payload = {
          position: {
            x: this.status.field.x,
            y: this.status.field.y,
          },
          rotation: this.controls.rotation,
        };
        this.gateway.send({ code: "movement", payload });
        console.log(this.otherPlayers[0]);
      },

      clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
      },

      handleKey(type, e) {
        let key = e.which || e.keyCode;
        let payload = {
          pressed: type === "down" ? 1 : 0,
        };
        switch (key) {
          case 87:
            payload.dir = "up";
            break;
          case 65:
            payload.dir = "left";
            break;
          case 83:
            payload.dir = "down";
            break;
          case 68:
            payload.dir = "right";
            break;
          default:
            return;
        }
        if (this.controls[payload.dir] === payload.pressed) {
          return;
        }
        this.controls[payload.dir] = payload.pressed;
      },

      updateMouse(event) {
        this.controls.mouseX = event.clientX;
        this.controls.mouseY = event.clientY;
      },

      process_feed() {
        this.gateway = new Gateway();
        this.gateway.feed((msg) => {
          let data = JSON.parse(msg);
          let { code, payload } = data;

          switch (code) {
            case "ping":
              this.status.ping = payload.ping;
              break;

            case "register":
              this.status.uuid = payload.uuid;
              this.gateway.send({
                code: "set_name",
                payload: {
                  name: this.status.name.substring(0, 16),
                },
              });
              break;

            case "player_state":
              if (!payload.players[this.status.uuid]) {
                console.error("Own player not found");
                break;
              }

              this.status.players = payload.players;
              break;

            default:
              console.error(`Code: '${code}' not valid`);
          }
        });

        this.gateway.start();
      },
    },
  };
</script>

<style lang="less">
  .arena {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background: #111a29;
    .ping {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 2;
      font-size: 20px;
      user-select: none;
    }
    .player-local,
    .player-remote {
      position: absolute;
      top: calc(50% - 36px);
      left: calc(50% - 44px);
      width: 88px;
      height: 72px;
      z-index: 1;
      user-select: none;
      -moz-user-select: none;
      -webkit-user-drag: none;
      -webkit-user-select: none;
      -ms-user-select: none;
    }
    .field {
      position: absolute;
      width: 4000px;
      height: 4000px;
      top: calc(50%);
      left: calc(50%);
      border: #566f9d 1px solid;
      background-image: url("~@/assets/hex.png");
      background-color: #334b78;
      transition: all 0.1s;
    }
  }
</style>
