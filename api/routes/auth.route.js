import express from "express";
import { signin, signup, test } from "../controllers/auth.controller.js";

const Router = express.Router();

// define router

Router.get("/test", test)
Router.post("/signin", signin)
Router.post("/signup", signup)
Router.post("/signout", signout)

export default Router;