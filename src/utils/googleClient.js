import { google } from "googleapis";
import axios from "axios";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../constant.js";

export const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
  "postmessage"
);

export const googleUserResponse = async (googleResponse) => {
  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleResponse.tokens.access_token}`
    );
    return data;
  } catch (error) {
    throw error;
  }
};
