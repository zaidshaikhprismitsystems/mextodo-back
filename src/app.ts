import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import fileUpload from "express-fileupload";

dotenv.config();

const app = express();
const PORT = 4000;

app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(fileUpload());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", routes);

app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Hello, Mextodo!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
