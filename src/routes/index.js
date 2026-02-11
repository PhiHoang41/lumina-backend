const express = require("express");
const authRouter = require("./auth");
const userRouter = require("./users");
const categoryRouter = require("./categories");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);

module.exports = router;
