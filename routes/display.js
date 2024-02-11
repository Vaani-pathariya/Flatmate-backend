const express = require("express");
const router = express.Router();
const {authenticateToken} = require("../middlewares");
const { getFlats, getFlatmates } = require("../controllers/display");

//Get all the flats 
router.get("/flats", authenticateToken, getFlats);
//Get all the flatmates 
router.get("/flatmates", authenticateToken, getFlatmates);
module.exports = router;
