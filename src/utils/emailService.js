import nodemailer from "nodemailer";

// Configure nodemailer with environment variables
let transporter;

// Initialize the email transporter
const initializeTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send an email
export const sendMail = async ({ to, subject, text, html }) => {
  // Initialize the transporter if not already done
  if (!transporter) {
    initializeTransporter();
  }

  const mailOptions = {
    from:
      process.env.EMAIL_FROM ||
      '"Cyber Hunter Club" <support@cyberhunter.club>',
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Initialize on module load
initializeTransporter();
