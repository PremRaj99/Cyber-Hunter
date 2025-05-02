import { sendMail } from "../utils/mailHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Subscribe to newsletter
 * @route POST /api/v1/newsletter/subscribe
 */
export const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    console.log(`Processing newsletter subscription for: ${email}`);

    // Here you would typically store the email in a database
    // This is omitted for brevity but would be important in a real application

    // Send confirmation email
    const subject = "Welcome to Cyber Hunter Newsletter";
    const text = "Thank you for subscribing to the Cyber Hunter Newsletter!";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0891b2;">Welcome to Cyber Hunter!</h1>
        </div>
        <p>Hello,</p>
        <p>Thank you for subscribing to the Cyber Hunter newsletter! We're excited to have you join our community.</p>
        <p>You'll now receive the latest updates on:</p>
        <ul>
          <li>Cybersecurity trends and insights</li>
          <li>Upcoming events and workshops</li>
          <li>Exclusive resources and tools</li>
          <li>Community challenges and competitions</li>
        </ul>
        <p>Stay tuned for our next update!</p>
        <div style="background-color: #0891b2; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <a href="https://www.cyberhunter.club" style="color: white; text-decoration: none; font-weight: bold;">Visit Our Website</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          If you didn't sign up for this newsletter, you can safely ignore this email.
        </p>
      </div>
    `;

    try {
      console.log("Attempting to send confirmation email");
      const emailResult = await sendMail(email, subject, text, html);

      // Log more details about the response
      if (emailResult && emailResult.success) {
        console.log(
          "Email sent successfully with ID:",
          emailResult.message_ids[0]
        );
      } else {
        console.log("Email sending response:", emailResult);
      }

      // Store subscription in database here (commented out as placeholder)
      // await NewsletterSubscription.create({ email });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { email, subscribed: true },
            "Successfully subscribed to newsletter"
          )
        );
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Store subscription anyway - emails can be sent later
      // await NewsletterSubscription.create({ email, emailSent: false });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { email, subscribed: true, emailSent: false },
            "Subscribed to newsletter, but confirmation email could not be sent"
          )
        );
    }
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process subscription. Please try again later.",
    });
  }
};

// Helper function to validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}
