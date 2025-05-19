import express from "express";

import { verifyJWT } from "../middlewares/verifyUser.js";
import { acceptInvite, declineInvite, getInvites } from "../controllers/userInvite.controller.js";

const router = express.Router();

router.get("/", verifyJWT, getInvites);
router.post("/accept-invite/:inviteId", verifyJWT, acceptInvite);
router.post("/decline-invite/:inviteId", verifyJWT, declineInvite);

export default router;
