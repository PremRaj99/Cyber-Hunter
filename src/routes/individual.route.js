import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { createIndividual, getIndividual, updateIndividual } from "../controllers/individual.controller.js";

const Router = express.Router();

// define router

Router.post("/", verifyToken, createIndividual)
Router.put("/:userId", verifyToken, updateIndividual)
Router.get("/:individualId", getIndividual);

export default Router;