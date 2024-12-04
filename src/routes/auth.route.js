import express from "express";
import { login, logout, signup, test } from "../controllers/auth.controller.js";

const Router = express.Router();

// define router

Router.get("/test", test);
Router.post("/login", login);
Router.post("/signup", signup);
Router.post("/logout", logout);

export default Router;
