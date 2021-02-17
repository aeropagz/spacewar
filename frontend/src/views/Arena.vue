<template>
  <div>
    <game></game>
  </div>
</template>

<script>
  // @ is an alias to /src
  import Game from "../components/Game.vue";

  export default {
    name: "Arena",
    components: {
      Game,
    },
  };
</script>
