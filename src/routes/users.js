const express = require("express");
const UserController = require("../controllers/users");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

const router = express.Router();

router.get("/me", authMiddleware, UserController.getMe);

router.get("/", authMiddleware, adminMiddleware, UserController.getAllUsers);
router.get("/:id", authMiddleware, adminMiddleware, UserController.getUserById);

module.exports = router;
