<template>
  <div class="arena">
    <h2>SpaceWar</h2>
    <div class="playerName">
      <input
        type="text"
        placeholder="Please enter your name and hit enter"
        autocomplete="off"
        name="name"
        v-model="name"
        @keyup="startGame($event)"
      />
      <label for="ship1">
        <img src="@/assets/spaceship_klaas.gif" />
      </label>
      <input type="radio" name="ship" id="ship1" value="ship1" />
      <label for="ship2">
        <img src="@/assets/spaceship_lukas.gif" />
      </label>
      <input type="radio" name="ship" id="ship2" value="ship2" />
    </div>
  </div>
</template>

<script>
  export default {
    name: "Landing",
    data() {
      return {
        name: "",
      };
    },
    methods: {
      startGame(e) {
        let key = e.which || e.keyCode;
        if (key === 13) {
          localStorage.setItem("name", this.name);
          this.$router.push("arena");
        }
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
    text-align: center;
  }
  .playerName {
    margin: 50px auto;
    padding: 20px;
    border: 3px solid rgb(110, 110, 110);
    width: 30%;
    border-radius: 8px;
  }
  .playerName input {
    width: 100%;
    font-size: 20px;
    margin: 10px;
  }
</style>
