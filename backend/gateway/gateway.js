const ws = require("ws");
const ioredis = require("ioredis");
const uuid = require("uuid");

let clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const FIELD_MAX_WIDTH = 4000;
const FIELD_MAX_HEIGHT = 4000;

const CODE_PING = "ping";
const CODE_REGISTER = "register";
const CODE_PLAYER_STATE = "player_state";

const CODE_MOVEMENT = "movement";
const CODE_SET_NAME = "set_name";

const wss = new ws.Server({ port: 8888 });
const rpub = new ioredis(6379, "localhost");

const state = {
  game1: {
    players: {},
  },
};

set_interval(() => {
  for (let player in state.game1.players) {
    player = state.game1.players[player];
    if (player.input.up) player.pos.y -= 22;
    if (player.input.down) player.pos.y += 22;
    if (player.input.left) player.pos.x -= 22;
    if (player.input.right) player.pos.x += 22;

    player.pos.x = clamp(player.pos.x, 0, FIELD_MAX_WIDTH);
    player.pos.y = clamp(player.pos.y, 0, FIELD_MAX_HEIGHT);
  }

  rpub.publish(
    "game1",
    JSON.stringify({
      code: CODE_PLAYER_STATE,
      payload: {
        players: state.game1.players,
      },
    })
  );
}, 50);

wss.on("connection", (socket) => {
  const rsub = new ioredis(6379, "localhost");

  socket.uuid = uuid.v4().split("-")[0];

  state.game1.players[socket.uuid] = {
    uuid: socket.uuid,
    name: "unknown",
    pos: {
      x: 2000,
      y: 2000,
    },
    input: {
      up: 0,
      left: 0,
      down: 0,
      right: 0,
    },
  };

  socket.send(
    JSON.stringify({
      code: CODE_REGISTER,
      payload: {
        uuid: socket.uuid,
      },
    })
  );

  socket.on("message", (message) => {
    try {
      message = JSON.parse(message);
      console.log(message);
      let player = state.game1.players[socket.uuid];
      switch (message.code) {
        
        case "movement":
          let { pressed, dir } = message.payload;

          player.input[dir] = pressed;
          break;

        case "set_name":
          let { name } = message.payload;
          player.name = name;
          break;
      }
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("close", () => {
    rsub.disconnect();
    delete state.game1.players[socket.uuid];
  });

  socket.on("pong", () => {
    socket.alive = true;
  });

  rsub.subscribe("game1");
  rsub.on("message", (channel, message) => {
    socket.send(message);
  });
});

set_interval(() => {
  wss.clients.for_each((socket) => {
    if (socket.alive === false) {
      return socket.terminate();
    }

    socket.ping_start = +new Date();
    socket.alive = false;
    socket.ping(() => {});
    if (!socket.has_pong) {
      socket.on("pong", () => {
        socket.has_pong = true;

        let time_end = +new Date() - socket.ping_start;
        let latency = Math.ceil(time_end) + "ms";
        socket.send(
          JSON.stringify({
            code: CODE_PING,
            payload: {
              ping: latency,
            },
          })
        );
      });
    }
  });
}, 2000);
