const express = require("express");
const UserController = require("../controllers/users");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

const router = express.Router();

router.get("/me", authMiddleware, UserController.getMe);

router.post("/", authMiddleware, adminMiddleware, UserController.createUser);
router.get("/", authMiddleware, adminMiddleware, UserController.getAllUsers);
router.get("/:id", authMiddleware, adminMiddleware, UserController.getUserById);
router.put("/:id", authMiddleware, adminMiddleware, UserController.updateUser);
router.delete("/:id", authMiddleware, adminMiddleware, UserController.deleteUser);
router.put("/:id/password", authMiddleware, UserController.changePassword);
router.put("/:id/role", authMiddleware, adminMiddleware, UserController.changeRole);

module.exports = router;
