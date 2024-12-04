import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

export default async function connectToDb() {
  mongoose
    .connect(process.env.MONGO + "/" + DB_NAME)
    .then(() => {
      console.log("MongoDb is Connected");
    })
    .catch((err) => {
      console.log(err);
    });
}
