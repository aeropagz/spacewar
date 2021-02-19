<template>
  <div class="arena">
    <div class="playerName">
      <h2>SpaceWar</h2>
      <input
        type="text"
        placeholder="Please enter your name and hit enter"
        autocomplete="off"
        name="name"
        v-model="name"
        @keyup="startGame($event)"
      />
      <div class="playerShip">
        <p>Choose your Ship</p>
        <label for="ship1">
          <img src="spaceship_klaas.gif" />
        </label>
        <input
          type="radio"
          name="ship"
          id="ship1"
          value="spaceship_klaas.gif"
          v-model="ship"
        />
        <label for="ship2">
          <img src="spaceship_lukas.gif" />
        </label>
        <input
          type="radio"
          name="ship"
          id="ship2"
          value="spaceship_lukas.gif"
          v-model="ship"
        />
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "Landing",
    data() {
      return {
        name: localStorage.getItem("name") || "",
        ship: localStorage.getItem("ship") || "spaceship_klaas.gif",
      };
    },
    methods: {
      startGame(e) {
        let key = e.which || e.keyCode;
        if (key === 13) {
          localStorage.setItem("name", this.name);
          localStorage.setItem("ship", this.ship);
          this.$router.push("arena");
        }
      },
    },
  };
</script>

<style lang="less" scoped>
  .arena {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    background: #111a29;
    text-align: center;
  }
  .playerName {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 50px auto;
    padding: 20px;
    border: 3px solid rgb(110, 110, 110);
    width: 30%;
    border-radius: 8px;
  }
  .playerName input[type="text"] {
    width: 100%;
    font-size: 20px;
    margin: 10px;
  }
</style>
