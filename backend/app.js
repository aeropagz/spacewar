require("nocamel");

config = require("./config.js");

const gateway = require("./gateway/gateway.js");

const express = require("express");
const redis = require("redis");
const session = require("express-session");
const store = require("connect-redis")(session);

const app = express();
const routes = require("./routes");

let redis_client = redis.createClient({ host: "localhost", port: 6379 });

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: new store({ client: redis_client }),
    secret: "678s857d9f879a87shd9hf9a87sd6f98",
    resave: false,
    saveUninitialized: true,
  })
);

app.use("/", routes);

app.listen(8889, () => {});
