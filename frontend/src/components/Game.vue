<template>
  <div
    class="arena"
    @keydown="handleKey('down', $event)"
    @keyup="handleKey('up', $event)"
    @mousemove="updateMouse($event)"
    @mousedown="startShoot()"
    @mouseup="stopShoot()"
    ref="arena"
    tabindex="-1"
  >
    <div class="center"></div>
    <div class="ping">{{ this.status.ping }}</div>
    <div class="player-local">
      <img
        :src="status.ship"
        :style="{ transform: `rotate(${controls.rotation}rad)` }"
      />
    </div>
    <div
      class="field"
      :style="{
        top: `calc(50% - ${this.status.field.y}px)`,
        left: `calc(50% - ${this.status.field.x}px)`,
      }"
    >
      <div v-if="otherPlayers.length">
        <div
          class="player-remote"
          v-for="player in otherPlayers"
          :key="player.uuid"
          :style="{
            top: `calc(${(player.pos.y / 4000) * 100}%)`,
            left: `calc(${(player.pos.x / 4000) * 100}%)`,
          }"
        >
          <img
            :src="player.ship"
            alt=""
            :style="{ transform: `rotate(${player.pos.rotation}rad)` }"
          />
          <p class="playerName">{{ player.name }}</p>
        </div>
      </div>
      <div v-if="ownProjectiles.length">
        <div
          class="projectile"
          v-for="(projectile, index) in ownProjectiles"
          :key="`projectile-${index}`"
          :style="{
            top: `calc(${(projectile.y / 4000) * 100}%)`,
            left: `calc(${(projectile.x / 4000) * 100}%)`,
          }"
        >
          <img
            src="shot.png"
            alt=""
            :style="{ transform: `rotate(${projectile.dir + Math.PI / 2}rad)` }"
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
        ownProjectiles: [],
        otherProjectiles: [],
        ammo: 20,
        status: {
          ping: "0ms",
          uuid: null,
          name: localStorage.getItem("name") || "",
          ship: localStorage.getItem("ship") || "",
          field: {
            x: 2000,
            y: 2000,
          },
          players: {},
        },
        gameInterval: null,
        gateway: null,
        publicPath: process.env.BASE_URL,
      };
    },
    computed: {
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

        if (this.shooting && this.ammo) {
          this.ownProjectiles.push({
            x: this.status.field.x,
            y: this.status.field.y,
            dir: this.controls.rotation - Math.PI / 2,
            ticks: 50,
          });
          this.ammo--;
        }

        this.ownProjectiles.forEach((projectile, index) => {
          if (projectile.ticks <= 0) {
            this.ownProjectiles.splice(index, 1);
            this.ammo++;
          }
          projectile.x += 20 * Math.cos(projectile.dir);
          projectile.y += 20 * Math.sin(projectile.dir);
          projectile.ticks--;
        });

        this.gateway.send({ code: "movement", payload });
        if (this.ownProjectiles.length)
          this.gateway.send({
            code: "projectiles",
            payload: { projectiles: this.ownProjectiles },
          });
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
          let tempProjectiles = [];

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
                  ship: this.status.ship,
                },
              });
              break;

            case "player_state":
              if (!payload.players[this.status.uuid]) {
                console.error("Own player not found");
                break;
              }

              this.status.players = payload.players;
              delete payload.projectiles[this.status.uuid];
              Object.keys(payload.projectiles).map((key) => {
                tempProjectiles.push(payload.projectiles[key]);
                console.log(payload.projectiles[key].length);
                console.log(payload.projectiles[key][0]);
              });

              this.otherProjectiles = [...tempProjectiles];
              break;

            default:
              console.error(`Code: '${code}' not valid`);
          }
        });

        this.gateway.start();
      },
      startShoot() {
        this.shooting = true;
      },
      stopShoot() {
        this.shooting = false;
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
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99;
    }

    .player-local img,
    .player-remote img {
      width: 88px;
      height: 72px;
    }
    .projectile {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
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
    .playerName {
      z-index: 2;
      color: white;
      margin: 12px 0px;
      text-align: center;
    }
    * {
      margin: 0px;
      padding: 0px;
      user-select: none;
      -moz-user-select: none;
      -webkit-user-drag: none;
      -webkit-user-select: none;
      -ms-user-select: none;
    }
    .center {
      position: absolute;
      width: 1px;
      height: 1px;
      top: calc(50%);
      left: calc(50%);
      background-color: rgb(0, 255, 13);
      z-index: 100;
    }
  }
</style>
