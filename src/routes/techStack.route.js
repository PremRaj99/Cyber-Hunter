import { verifyToken } from "../utils/verifyUser.js";
import express from "express"
import { createTechStack, deleteTechStack, getTechStacks, updateTechStack } from "../controllers/techStack.controller.js";

const Router = express.Router();

// define all routes

Router.post("/", verifyToken, createTechStack);
Router.put("/:techStackId", verifyToken, updateTechStack)
Router.delete("/:techStackId", verifyToken, deleteTechStack)
Router.get("/", getTechStacks)

export default Router;