<template>
  <div class="arena">
    <div class="lost">
      <h1>You lost!</h1>
      <button @click="restart()">Play again</button>
    </div>
  </div>
</template>

<script>
  export default {
    methods: {
      restart() {
        this.$router.push("arena");
      },
    },
  };
</script>

<style>
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
  .lost {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: 50px auto;
    padding: 20px;
    border: 3px solid rgb(110, 110, 110);
    width: 30%;
    border-radius: 8px;
    transform: translate(-50%, -50%);
  }
  button {
    padding: 10px;
    font-size: 20px;
  }
</style>
