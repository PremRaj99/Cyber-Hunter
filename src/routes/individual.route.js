import express from "express";
import { verifyJWT } from "../middlewares/verifyUser.js";
import {
  createIndividual,
  getIndividual,
  getIndividualByUserId,
  updateIndividual,
} from "../controllers/individual.controller.js";

const Router = express.Router();

// define router

Router.post("/", verifyJWT, createIndividual);
Router.put("/:id", verifyJWT, updateIndividual);
Router.get("/:individualId", getIndividual);
Router.get("/user/:userId", getIndividualByUserId); // Add this new route

export default Router;
