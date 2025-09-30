import Ticket from "../models/Ticket.js";
import Message from "../models/Message.js";
import User from "../models/User.js"; 

export const createTicket = async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      priority,
      customerId: req.user.id, // customer from auth
      companyId: req.user.companyId || null,
    });
    console.log("DEBUG req.user:", req.user);

  await ticket.save();
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Fetch a ticket + paginated messages
export const getTicketWithMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const ticket = await Ticket.findById(id)
      .populate("customerId", "name email")
      .populate("assignedTo", "name email");

    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    const messages = await Message.find({ ticketId: id })
      .sort({ createdAt: 1 }) 
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("senderId", "name email role");

    const totalMessages = await Message.countDocuments({ ticketId: id });

    res.json({
      success: true,
      data: { ticket, messages, totalMessages, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Post a message to a ticket
export const postMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    const message = await Message.create({
      ticketId: id,
      senderId: req.user.id,
      content,
      isAIGenerated: false, // always false for user input
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update ticket (assign agent, update status)
export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    if (status) ticket.status = status;

    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user || user.role !== "agent") {
        return res.status(400).json({ success: false, error: "Assigned user must be an agent" });
      }
      ticket.assignedTo = assignedTo;
    }

    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
