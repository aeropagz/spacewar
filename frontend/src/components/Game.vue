<template>
  <div
    class="arena"
    @keydown="handleKey('down', $event)"
    @keyup="handleKey('up', $event)"
    ref="arena"
    tabindex="-1"
  >
    <div>
      <img
        src="@/assets/spaceship_klaas.gif"
        alt="spaceship"
        class="player-local"
      />
    </div>
    <div class="field" :style="fieldStyle">
      <div class="players"></div>
    </div>
  </div>
</template>

<script>
  export default {
    mounted() {
      const arenaRef = this.$refs.arena;
      arenaRef.focus();
    },
    created() {
      this.moveShip();
    },
    beforeDestroy() {
      clearInterval(this.clientTick);
    },
    data() {
      return {
        controls: {
          up: 0,
          left: 0,
          down: 0,
          right: 0,
        },
        status: {
          ping: "0ms",
          uuid: null,
          name: null,
          field: {
            x: 2000,
            y: 2000,
          },
          players: {},
        },
        clientTick: null,
      };
    },
    computed: {
      fieldStyle() {
        return {
          top: `calc(50% - ${this.status.field.x}px)`,
          left: `calc(50% - ${this.status.field.y}px)`,
        };
      },
    },
    methods: {
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
      moveShip() {
        this.clientTick = setInterval(() => {
          if (this.controls.up) {
            this.status.field.x -= 50;
          } else if (this.controls.down) {
            this.status.field.x += 50;
          } else if (this.controls.left) {
            this.status.field.y -= 50;
          } else if (this.controls.right) {
            this.status.field.y += 50;
          }
        }, 50);
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

    .player-local {
      position: absolute;
      top: calc(50% - 100px);
      left: calc(50% - 100px);
      width: 200px;
      height: 200px;
      z-index: 1;
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
