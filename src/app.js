const express = require("express");
const router = require("./routes");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();

app.use(express.json());

connectDB();

app.use("/api", router);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is running on PORT`, PORT));
