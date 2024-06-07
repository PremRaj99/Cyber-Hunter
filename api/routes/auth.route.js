import express from "express";
import { signin, test } from "../controllers/auth.controller.js";

const Router = express.Router();

// define router

Router.get("/test", test)
Router.post("/signin", signin)

export default Router;