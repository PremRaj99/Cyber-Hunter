import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

export default async function connectToDb() {
  try {
    await mongoose.connect(
      process.env.MONGO + "/" + DB_NAME + "?retryWrites=true&w=majority"
    );
    console.log("MongoDb is Connected");
  } catch (error) {
    console.log(error);
  }
}
