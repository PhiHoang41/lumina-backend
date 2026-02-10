const express = require("express");
const authRouter = require("./auth");
const userRouter = require("./users");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);

module.exports = router;
