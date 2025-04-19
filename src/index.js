import dotenv from "dotenv";
import connectToDb from "./config/connectToDb.js";
import app from "./app.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const port = process.env.PORT || 5000;

await connectToDb();
app.listen(port, () => {
  console.log("Server is running on http://localhost:" + port);
});
