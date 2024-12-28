import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const sendMail = async (to, subject, text, html) => {
  // Create a transporter object using SMTP transport

  try {
    const token = process.env.MAILTRAP_TOKEN;
    if (!token) {
      throw new Error("Mailtrap token not found");
    }
    const transporter = nodemailer.createTransport(
      MailtrapTransport({
        token: token,
      })
    );

    const sender = {
      name: process.env.MAILTRAP_USER,
      address: process.env.MAILTRAP_EMAIL,
    };

    // Setup email data
    const mailOptions = {
      from: sender,
      to,
      subject,
      text,
      html
    };

    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email: %s", error);
    throw error;
  }
};
