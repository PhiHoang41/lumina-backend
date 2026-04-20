const express = require("express");
const UserController = require("../controllers/users");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

const router = express.Router();

router.get("/me", authMiddleware, UserController.getMe);
router.put("/me/profile", authMiddleware, UserController.updateMyProfile);
router.put("/me/password", authMiddleware, UserController.changeMyPassword);

router.post("/", authMiddleware, adminMiddleware, UserController.createUser);
router.get("/", authMiddleware, adminMiddleware, UserController.getAllUsers);
router.get("/:id", authMiddleware, adminMiddleware, UserController.getUserById);
router.put("/:id", authMiddleware, adminMiddleware, UserController.updateUser);
router.delete("/:id", authMiddleware, adminMiddleware, UserController.deleteUser);
router.patch("/:id/soft-delete", authMiddleware, adminMiddleware, UserController.softDeleteUser);
router.put("/:id/password", authMiddleware, UserController.changePassword);
router.put("/:id/admin-password", authMiddleware, adminMiddleware, UserController.adminChangePassword);
router.put("/:id/role", authMiddleware, adminMiddleware, UserController.changeRole);

module.exports = router;
