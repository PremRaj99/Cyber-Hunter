import SupportTicket from "../models/SupportTicket.js";

// Create a new support ticket
export async function createTicket(req, res) {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide both title and description",
      });
    }

    const newTicket = new SupportTicket({
      user: req.user._id, // From auth middleware
      title,
      description,
    });

    const savedTicket = await newTicket.save();

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: savedTicket,
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create support ticket",
      error: error.message,
    });
  }
}

// Get all tickets for the authenticated user
export async function getUserTickets(req, res) {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve support tickets",
      error: error.message,
    });
  }
}

// Get a ticket by ID (only if it belongs to the authenticated user)
export async function getTicketById(req, res) {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found or you do not have permission to view it",
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket details",
      error: error.message,
    });
  }
}

// Update a ticket status (e.g., close it)
export async function updateTicketStatus(req, res) {
  try {
    const { status } = req.body;

    if (!status || !["open", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (open or closed)",
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found or you do not have permission to update it",
      });
    }

    ticket.status = status;
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: `Ticket marked as ${status}`,
      data: ticket,
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error.message,
    });
  }
}
