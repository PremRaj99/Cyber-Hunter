import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
  },
  subject: {
    type: String,
    required: [true, "Subject is required"],
    trim: true,
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
  },
  status: {
    type: String,
    enum: ["new", "in-progress", "responded", "closed"],
    default: "new",
  },
  adminResponse: {
    type: String,
    trim: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
  },
});

const Contact = mongoose.model("Contact", contactSchema);

// Export methods for the controller to use
export const create = (data) => Contact.create(data);
export const find = () => Contact.find();
export const findById = (id) => Contact.findById(id);
export const findByIdAndUpdate = (id, data, options) =>
  Contact.findByIdAndUpdate(id, data, options);

export default Contact;
