const express = require("express");
const authRouter = require("./auth");
const userRouter = require("./users");
const categoryRouter = require("./categories");
const couponRouter = require("./coupons");
const productRouter = require("./products");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/coupons", couponRouter);
router.use("/admin/products", productRouter);

module.exports = router;
