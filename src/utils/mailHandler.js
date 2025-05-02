import nodemailer from "nodemailer";
import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const sendMail = async (to, subject, text, html) => {
  try {
    const token = process.env.MAILTRAP_TOKEN;
    if (!token) {
      throw new Error("Mailtrap token not found");
    }

    console.log("Setting up email transport with Mailtrap");

    // Create Mailtrap client using the correct SDK implementation
    const client = new MailtrapClient({ token });

    // Use the correct sender format
    const sender = {
      email: process.env.MAILTRAP_EMAIL || "noreply@cyberhunter.com",
      name: process.env.MAILTRAP_USER || "Cyber Hunter",
    };

    const recipient = { email: to };

    // Debug mail options
    console.log(`Sending email to: ${to}, Subject: ${subject}`);

    // Send using the Mailtrap client's send method
    const response = await client.send({
      from: sender,
      to: [recipient],
      subject,
      text,
      html,
      category: "Newsletter",
    });

    console.log(
      "Message sent: %s",
      response.success ? response.message_ids[0] : "Failed"
    );
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    // More detailed error logging including response info
    if (error.response) {
      console.error("Error details:", error.response.data);
      console.error("Error status:", error.response.status);
    } else {
      console.error("Error message:", error.message);
    }
    throw error;
  }
};
