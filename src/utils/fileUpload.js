import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to cloudinary and return the url
 * @param {String} localFilePath - Local path of the file
 * @returns {Promise<Object>} - Cloudinary response or null on error
 */
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Check if file exists before attempting upload
    if (!fs.existsSync(localFilePath)) {
      console.error(`File not found: ${localFilePath}`);
      return null;
    }

    // Upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Automatically detect file type
    });

    // File upload successful
    console.log("File uploaded successfully", response.url);

    // Delete the local file (wrapped in try-catch to handle any errors)
    try {
      fs.unlinkSync(localFilePath);
    } catch (unlinkError) {
      console.warn(
        `Warning: Could not delete temporary file at ${localFilePath}`,
        unlinkError
      );
      // Continue execution regardless of unlink error
    }

    return response;
  } catch (error) {
    console.error("Error uploading file to cloudinary:", error);

    // Attempt to clean up the file if it exists
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (unlinkError) {
      console.warn(
        `Warning: Could not delete temporary file at ${localFilePath}`,
        unlinkError
      );
    }

    return null;
  }
};

export default uploadOnCloudinary;
