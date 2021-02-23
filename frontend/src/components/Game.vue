<template>
  <div>
    <div class="ping">{{ this.status.ping }}</div>
    <div class="leaderboard">
      <table>
        <thead>
          <tr>
            <td>Player</td>
            <td>Kills</td>
          </tr>
        </thead>
        <tr
          v-for="(player, index) in status.leaderboard"
          :key="`player-${index}`"
        >
          <td>
            {{ player.name }}
          </td>
          <td>
            {{ player.kills }}
          </td>
        </tr>
      </table>
    </div>
    <div class="health">
      <div class="progress progress-striped">
        <div
          class="progress-bar"
          :style="{ width: `${(this.status.health / 100) * 100}%` }"
        ></div>
      </div>
    </div>
    <div class="ammo">
      <div class="progress progress-striped">
        <div
          class="progress-bar"
          :style="{ width: `${(this.ammo / 20) * 100}%` }"
        ></div>
      </div>
    </div>
    <div class="skills">
      <div class="teleport"></div>
    </div>
    <canvas
      id="arena"
      @keydown="handleKey('down', $event)"
      @keyup="handleKey('up', $event)"
      @mousemove="updateMouse($event)"
      @contextmenu.prevent="teleport()"
      @mousedown="startShoot($event)"
      @mouseup="stopShoot($event)"
      @blur="clearInput()"
      ref="arena"
      tabindex="-1"
    >
    </canvas>
  </div>
</template>

<script>
  import Gateway from "@/assets/js/Gateway.js";
  import { throttle } from "throttle-debounce";

  export default {
    created() {
      window.addEventListener("resize", this.initCanvas);
    },
    mounted() {
      this.initRef();
      this.initCanvas();
      this.canvasContext = this.canvas.getContext("2d");
      this.$refs.arena.focus();
      this.process_feed();
      this.gameInterval = setInterval(this.gameLoop, 50);
      this.renderInterval = setInterval(this.render, 1000 / 60);
    },
    beforeDestroy() {
      clearInterval(this.gameInterval);
      clearInterval(this.renderInterval);
      this.gateway.stop();
      this.gateway = null;
    },
    destroyed() {
      window.removeEventListener("resize", this.initCanvas);
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
          ship: localStorage.getItem("ship") || "",
          health: 100,
          field: {
            x: 2000,
            y: 2000,
          },
          players: {},
          leaderboard: [],
        },
        skills: {
          teleport: {
            ready: true,
          },
        },
        ownProjectiles: [],
        otherProjectiles: [],
        ammoCoolDown: [],
        ammo: 20,
        gameInterval: null,
        renderInterval: null,
        gateway: null,
        canvas: null,
        canvasContext: null,
        spaceshipKlaasImg: null,
        shotImg: null,
        backgroundImg: null,

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
      hitboxesOtherPlayers() {
        let hitboxes = {};
        this.otherPlayers.forEach((player) => {
          let ymin = player.pos.y + 36;
          let ymax = player.pos.y - 36;
          let xmin = player.pos.x + 36;
          let xmax = player.pos.x - 36;
          hitboxes[player.uuid] = {
            ymin,
            ymax,
            xmin,
            xmax,
          };
        });
        return hitboxes;
      },
    },
    methods: {
      gameLoop() {
        // exit if dead
        if (this.status.health <= 0) {
          this.ownProjectiles = [];
          this.gateway.send({
            code: "projectiles",
            payload: { projectiles: this.ownProjectiles },
          });
          this.$router.push("lost");
        }

        // calculate new coordinates
        if (this.controls.up) this.status.field.y -= 12;
        if (this.controls.down) this.status.field.y += 12;
        if (this.controls.left) this.status.field.x -= 12;
        if (this.controls.right) this.status.field.x += 12;
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

        // remove expired ammo cooldown
        this.ammoCoolDown = this.ammoCoolDown
          .map((cooldown) => cooldown - 1)
          .filter((cooldown) => {
            if (cooldown > 0) {
              return true;
            } else {
              this.ammo++;
              return false;
            }
          });

        // genereate new projectiles
        if (this.shooting && this.ammo) {
          this.ownProjectiles.push({
            x: this.status.field.x,
            y: this.status.field.y,
            dir: this.controls.rotation - Math.PI / 2,
            ticks: 50,
          });
          this.ammo--;
        }

        // calculate new positions of projectiles
        this.ownProjectiles.forEach((projectile, index) => {
          // remove expired projectiles
          if (projectile.ticks <= 0) {
            this.ownProjectiles.splice(index, 1);
            this.ammo++;
          }
          // hit detection
          Object.keys(this.hitboxesOtherPlayers).map((playerId) => {
            let hitbox = this.hitboxesOtherPlayers[playerId];
            if (
              projectile.x < hitbox.xmin &&
              projectile.x > hitbox.xmax &&
              projectile.y < hitbox.ymin &&
              projectile.y > hitbox.ymax
            ) {
              this.gateway.send({
                code: "player_hit",
                payload: { playerHit: playerId },
              });
              this.ammoCoolDown.push(projectile.ticks);
              this.ownProjectiles.splice(index, 1);
            }
          });

          //move projectile
          projectile.x += 30 * Math.cos(projectile.dir);
          projectile.y += 30 * Math.sin(projectile.dir);
          projectile.ticks--;
        });

        // send new position and own projectiles to server
        this.gateway.send({ code: "movement", payload });
        this.gateway.send({
          code: "projectiles",
          payload: { projectiles: this.ownProjectiles },
        });
      },

      // restrict position to boundaries
      clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
      },

      initRef() {
        this.canvas = document.getElementById("arena");
        this.spaceshipKlaasImg = new Image();
        this.spaceshipKlaasImg.src = "/img/spaceship_klaas-1.png";
        this.shotImg = new Image();
        this.shotImg.src = "/img/shot.png";
        this.backgroundImg = new Image();
        this.backgroundImg.src = "/img/hex.png";
      },

      initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log("resize");
      },

      render() {
        this.renderBackground();
        this.renderBoundaries();
        this.renderPlayer({
          name: this.status.name,
          pos: {
            x: this.status.field.x,
            y: this.status.field.y,
            rotation: this.controls.rotation,
          },
        });
        this.otherPlayers.forEach(this.renderPlayer);
        [...this.ownProjectiles, ...this.otherProjectiles].forEach(
          this.renderProjectiles
        );
      },

      renderPlayer(player) {
        const { x, y, rotation } = player.pos;

        const canvasX = this.canvas.width / 2 + x - this.status.field.x;
        const canvasY = this.canvas.height / 2 + y - this.status.field.y;

        this.canvasContext.save();
        this.canvasContext.translate(canvasX, canvasY);
        this.canvasContext.rotate(rotation);
        this.canvasContext.drawImage(this.spaceshipKlaasImg, -44, -36, 88, 72);
        this.canvasContext.restore();
      },

      renderProjectiles(projectile) {
        const { x, y, dir } = projectile;
        const canvasX = this.canvas.width / 2 + x - this.status.field.x;
        const canvasY = this.canvas.height / 2 + y - this.status.field.y;

        this.canvasContext.save();
        this.canvasContext.translate(canvasX, canvasY);
        this.canvasContext.rotate(dir + Math.PI / 2);
        this.canvasContext.drawImage(this.shotImg, -2, -4, 4, 8);
        this.canvasContext.restore();
      },

      renderBoundaries() {
        this.canvasContext.fillStyle = "#334B78";
        this.canvasContext.fillRect(
          this.canvas.width / 2 - this.status.field.x,
          this.canvas.height / 2 - this.status.field.y,
          4000,
          4000
        );
        let pattern = this.canvasContext.createPattern(
          this.backgroundImg,
          "repeat"
        );
        this.canvasContext.fillStyle = pattern;
        this.canvasContext.save();
        this.canvasContext.translate(
          -this.status.field.x,
          -this.status.field.y
        );
        this.canvasContext.fillRect(
          this.status.field.x,
          this.status.field.y,
          this.canvas.width,
          this.canvas.height
        );
        this.canvasContext.restore();
      },

      renderBackground() {
        // my implementation

        this.canvasContext.fillStyle = "#111a29";
        this.canvasContext.fillRect(
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
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

      updateMouse: throttle(30, function(event) {
        this.controls.mouseX = event.clientX;
        this.controls.mouseY = event.clientY;
      }),

      teleport() {
        if (this.skills.teleport.ready) {
          this.status.field.x +=
            400 * Math.cos(this.controls.rotation - Math.PI / 2);
          this.status.field.y +=
            400 * Math.sin(this.controls.rotation - Math.PI / 2);
          this.skills.teleport.ready = false;
          setTimeout(() => {
            this.skills.teleport.ready = true;
          }, 5000);
        }
      },

      clearInput() {
        console.log("out");
        Object.keys(this.controls).map((key) => {
          if (this.controls[key] === 1) {
            this.controls[key] = 0;
          }
        });
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
              this.status.health = payload.health;
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
              this.status.health = payload.players[this.status.uuid]["health"];
              this.status.players = payload.players;
              this.status.leaderboard = payload.leaderboard;
              delete payload.projectiles[this.status.uuid];
              Object.keys(payload.projectiles).map((key) => {
                tempProjectiles.push(...payload.projectiles[key]);
              });

              this.otherProjectiles = [...tempProjectiles];
              break;

            case "player_killed":
              console.log("player killed: ", payload.name);
              break;

            default:
              console.error(`Code: '${code}' not valid`);
          }
        });

        this.gateway.start();
      },
      startShoot(e) {
        if (e.button === 0) this.shooting = true; //if leftclick
      },
      stopShoot(e) {
        if (e.button === 0) this.shooting = false;
      },
    },
  };
</script>

<style lang="less" scoped>
  * {
    user-select: none;
    -moz-user-select: none;
    -webkit-user-drag: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }
  .skills {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background-color: rgba(255, 255, 255, 0.25);
  }
  .ping {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 2;
    font-size: 20px;
    margin-bottom: 10px;
    user-select: none;
  }
  .health {
    position: absolute;
    top: 20px;
    left: 50%;
    width: 400px;
    text-align: center;
    z-index: 2;
    font-size: 20px;
    user-select: none;
    transform: translate(-50%, 0);
  }
  .ammo {
    position: absolute;
    top: 20px;
    width: 400px;
    transform: translate(-100%, 0);
    left: 98%;
    z-index: 2;
    font-size: 20px;
    user-select: none;
  }
  #arena {
    width: 100%;
    height: 100%;
  }

  .progress {
    padding: 6px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 6px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25),
      0 1px rgba(255, 255, 255, 0.08);
  }
  .progress-bar {
    height: 18px;
    background-color: #ee303c;
    border-radius: 4px;
    transition: 0.4s linear;
    transition-property: width, background-color;
  }
  .health .progress-striped .progress-bar {
    background-color: #9efc51;
    width: 100%;
    background-image: linear-gradient(
      45deg,
      rgb(72, 252, 17) 25%,
      transparent 25%,
      transparent 50%,
      rgb(72, 252, 17) 50%,
      rgb(72, 252, 17) 75%,
      transparent 75%,
      transparent
    );
  }
  .leaderboard {
    position: absolute;
    padding: 10px;
    top: 50px;
    left: 20px;
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: 8px;
  }
  .leaderboard table {
    margin-top: 10px;
  }

  .leaderboard td {
    padding: 10px 5px;
  }
</style>
