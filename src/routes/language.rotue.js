import { createLanguage, deleteLanguage, getLanguages, updateLanguage } from "../controllers/language.controller.js";
import { verifyJWT } from "../middlewares/verifyUser.js";
import express from "express"

const Router = express.Router();

// define all routes

Router.post("/", verifyJWT, createLanguage);
Router.put("/:languageId", verifyJWT, updateLanguage)
Router.delete("/:languageId", verifyJWT, deleteLanguage)
Router.get("/", getLanguages)

export default Router;