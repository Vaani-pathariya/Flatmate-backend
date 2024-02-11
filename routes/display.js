const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares");
const { getFlats, getFlatmates } = require("../controllers/display");
// router.get("/flats", authenticateToken, getFlats);
// router.get("/flatmates", authenticateToken, getFlatmates);
module.exports = router;
