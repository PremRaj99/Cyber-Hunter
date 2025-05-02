import express from "express";
import { subscribeNewsletter } from "../controllers/newsletter.controller.js";

const router = express.Router();

// POST /api/v1/newsletter/subscribe - Subscribe to newsletter
router.post("/subscribe", subscribeNewsletter);

export default router;
