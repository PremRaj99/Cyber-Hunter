import UserInvite from "../models/userInvite.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getInvites = asyncHandler(async (req, res, next) => {
  const invites = await UserInvite.find({ userId: req.user._id }).populate({
    path: "teamId",
    select: "TeamName TeamLogo TeamCreaterId points",
    populate: {
      path: "TeamCreaterId",
      select: "email",
    },
  });
  if (!invites) {
    throw new ApiError(404, "No invites found");
  }
  res
    .status(200)
    .json(ApiResponse(200, invites, "Invites fetched successfully"));
});

export const acceptInvite = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { inviteId } = req.params;

  const invite = await UserInvite.findById(inviteId);
  if (!invite) {
    return res.status(404).json({ message: "Invite not found" });
  }

  if (invite.userId.toString() !== userId) {
    throw new ApiError(403, "You are not authorized to accept this invite");
  }

  invite.status = "accepted";
  await invite.save();

  res.status(200).json(ApiResponse(200, null, "Invite accepted successfully"));
});

export const declineInvite = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { inviteId } = req.params;

  const invite = await UserInvite.findById(inviteId);
  if (!invite) {
    return res.status(404).json({ message: "Invite not found" });
  }

  if (invite.userId.toString() !== userId) {
    throw new ApiError(403, "You are not authorized to decline this invite");
  }

  invite.status = "rejected";
  await invite.save();

  res.status(200).json(ApiResponse(200, null, "Invite declined successfully"));
});
