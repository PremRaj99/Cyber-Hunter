import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import { createIndividual, getIndividual, updateIndividual } from "../controllers/individual.controller.js";

const Router = express.Router();

// define router

Router.post("/", verifyJWT, createIndividual)
Router.put("/:userId", verifyJWT, updateIndividual)
Router.get("/:individualId", getIndividual);

export default Router;