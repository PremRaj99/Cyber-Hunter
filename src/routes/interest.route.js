import { createInterest, deleteInterest, getInterests, updateInterest } from "../controllers/interest.controller.js";
import { verifyToken } from "../utils/verifyUser.js";
import express from "express"

const Router = express.Router();

// define all routes

Router.post("/", verifyToken, createInterest);
Router.put("/:interestId", verifyToken, updateInterest)
Router.delete("/:interestId", verifyToken, deleteInterest)
Router.get("/", getInterests)

export default Router;