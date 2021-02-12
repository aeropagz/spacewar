const express = require("express");
const router = express.Router();

const home = async () => {
  return res.send("Hallo");
};

router.get("/", home);

module.exports = router;
