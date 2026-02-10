const express = require("express");
const UserController = require("../controllers/users");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.get("/me", authMiddleware, UserController.getMe);

module.exports = router;
