import {
  create,
  find,
  findById,
  findByIdAndUpdate,
} from "../models/contactModel.js"; // Fixed import path
import { sendMail } from "../utils/emailService.js"; // Fixed import path

// Simple error handler for async functions
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Simple error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const submitContactForm = catchAsync(async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return next(new AppError("Please provide all required fields", 400));
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Please provide a valid email address", 400));
  }

  // Create contact entry in database
  const contact = await create({
    name,
    email,
    subject,
    message,
    status: "new",
    submittedAt: new Date(),
  });

  // Send notification email to admin
  try {
    await sendMail({
      to: process.env.ADMIN_EMAIL || "support@cyberhunter.club",
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          ${message.replace(/\n/g, "<br/>")}
        </div>
        <p>Please respond to this inquiry through the admin dashboard.</p>
      `,
    });

    // Send confirmation email to user
    await sendMail({
      to: email,
      subject: `Thank you for contacting Cyber Hunter Club`,
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Hello ${name},</p>
        <p>We've received your message regarding "${subject}" and will get back to you as soon as possible.</p>
        <p>Here's a copy of your message:</p>
        <div style="padding: 15px; background-color: #f5f5f5; border-radius: 5px; margin: 15px 0;">
          ${message.replace(/\n/g, "<br/>")}
        </div>
        <p>If you have any additional information to add, please reply to this email.</p>
        <p>Best regards,<br>The Cyber Hunter Team</p>
      `,
    });
  } catch (error) {
    console.error("Email notification error:", error);
    // We don't want to fail the API response if only the email fails
    // Just log the error
  }

  // Return success response
  res.status(201).json({
    success: true,
    message:
      "Your message has been sent successfully. We will contact you soon!",
    data: {
      id: contact._id,
      name,
      email,
      subject,
      submittedAt: contact.submittedAt,
    },
  });
});

export const getAllContacts = catchAsync(async (req, res, next) => {
  // Check if user is admin (assuming middleware already verified)
  if (!req.user || !req.user.isAdmin) {
    return next(
      new AppError("You do not have permission to access this resource", 403)
    );
  }

  const contacts = await find()
    .sort({ submittedAt: -1 }) // Most recent first
    .select("name email subject status submittedAt respondedAt");

  res.status(200).json({
    success: true,
    results: contacts.length,
    data: contacts,
  });
});

export const getContactById = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return next(
      new AppError("You do not have permission to access this resource", 403)
    );
  }

  const contact = await findById(req.params.id);

  if (!contact) {
    return next(new AppError("No contact found with that ID", 404));
  }

  res.status(200).json({
    success: true,
    data: contact,
  });
});

export const updateContactStatus = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (!req.user || !req.user.isAdmin) {
    return next(
      new AppError("You do not have permission to access this resource", 403)
    );
  }

  const { status, adminResponse } = req.body;

  if (!status) {
    return next(new AppError("Please provide a status", 400));
  }

  // Valid statuses
  const validStatuses = ["new", "in-progress", "responded", "closed"];
  if (!validStatuses.includes(status)) {
    return next(
      new AppError(
        "Invalid status. Must be one of: new, in-progress, responded, closed",
        400
      )
    );
  }

  // Update with timestamp if status is 'responded'
  const updateData = { status };
  if (status === "responded") {
    updateData.respondedAt = new Date();
    updateData.adminResponse = adminResponse;

    // If there's an admin response, send email to the contact
    if (adminResponse) {
      const contact = await findById(req.params.id);
      if (contact) {
        try {
          await sendMail({
            to: contact.email,
            subject: `RE: ${contact.subject} - Response from Cyber Hunter Team`,
            html: `
              <h2>Response to your inquiry</h2>
              <p>Hello ${contact.name},</p>
              <p>Thank you for contacting Cyber Hunter Club. Here is our response to your inquiry about "${
                contact.subject
              }":</p>
              <div style="padding: 15px; background-color: #f5f5f5; border-radius: 5px; margin: 15px 0;">
                ${adminResponse.replace(/\n/g, "<br/>")}
              </div>
              <p>Your original message:</p>
              <div style="padding: 15px; background-color: #f5f5f5; border-radius: 5px; margin: 15px 0; opacity: 0.8;">
                ${contact.message.replace(/\n/g, "<br/>")}
              </div>
              <p>If you have any further questions, please don't hesitate to reply to this email.</p>
              <p>Best regards,<br>The Cyber Hunter Team</p>
            `,
          });
        } catch (error) {
          console.error("Response email error:", error);
        }
      }
    }
  }

  const contact = await findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!contact) {
    return next(new AppError("No contact found with that ID", 404));
  }

  res.status(200).json({
    success: true,
    message: "Contact status updated successfully",
    data: contact,
  });
});
