import { verifyJWT } from "../middlewares/verifyUser.js";
import express from "express"
import { createTechStack, deleteTechStack, getMyTechStacks, getTechStacks, updateTechStack } from "../controllers/techStack.controller.js";

const Router = express.Router();

// define all routes

Router.post("/", verifyJWT, createTechStack);
Router.put("/:techStackId", verifyJWT, updateTechStack)
Router.delete("/:techStackId", verifyJWT, deleteTechStack)
Router.get("/", getTechStacks)
Router.get("/me/:userId", getMyTechStacks)

export default Router;