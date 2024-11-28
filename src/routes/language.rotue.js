import { createLanguage, deleteLanguage, getLanguages, updateLanguage } from "../controllers/language.controller.js";
import { verifyToken } from "../utils/verifyUser.js";
import express from "express"

const Router = express.Router();

// define all routes

Router.post("/", verifyToken, createLanguage);
Router.put("/:languageId", verifyToken, updateLanguage)
Router.delete("/:languageId", verifyToken, deleteLanguage)
Router.get("/", getLanguages)

export default Router;