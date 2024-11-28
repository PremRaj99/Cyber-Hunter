import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (userId, res, role) => {
  const token = jwt.sign(
    { id: userId, role: role },
    process.env.ACCESS_TOKEN_SECRET,
    {
      // expiresIn: "1d",
    }
  );

  res.cookie("accessToken", token, {
    // maxAge: 1 * 24 * 60 * 60 * 1000, // 1d -> ms
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });
};

export default generateTokenAndSetCookie;
