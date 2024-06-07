import express from "express";
import { test } from "../controllers/auth.controller.js";

const Router = express.Router();

// define router

Router.get("/test", test)

export default Router;