const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connect DB successfully");
  } catch (error) {
    console.log("Connect DB failed", error);
  }
};

module.exports = connectDB;
