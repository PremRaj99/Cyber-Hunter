import { createInterest, deleteInterest, getInterests, updateInterest } from "../controllers/interest.controller.js";
import { verifyJWT } from "../middlewares/verifyUser.js";
import express from "express"

const Router = express.Router();

// define all routes

Router.post("/", verifyJWT, createInterest);
Router.put("/:interestId", verifyJWT, updateInterest)
Router.delete("/:interestId", verifyJWT, deleteInterest)
Router.get("/", getInterests)

export default Router;