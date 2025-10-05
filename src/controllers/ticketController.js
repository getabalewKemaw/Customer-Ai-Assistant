import Ticket from "../models/Ticket.js";
import Message from "../models/Message.js";
import User from "../models/User.js"; 
import ai from "../config/gemini.js";
import {sendAITextReply} from "../utils/aiReply.js"
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
  await ticket.save();
   if (description) {
      sendAITextReply({ ticketId: ticket._id, prompt: description });
    }



    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
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
export const postMessage = async (req, res) => {
  try {
    const { id } = req.params; 
    const { content } = req.body;
    const userMessage = await Message.create({
      ticketId: id,
      senderId: req.user.id,
      content,
      isAIGenerated: false,
    });
    let aiMessage = null;
    const aiUser = await User.findOne({ role: "agent", name: "AI Assistant" });

    if (aiUser) {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: [{ role: "user", parts: [{ text: content }] }],
      });
      aiMessage = await Message.create({
        ticketId: id,
        senderId: aiUser._id,
        content: response.text,
        isAIGenerated: true,
      });
    }
    res.status(201).json({
      success: true,
      data: {
        userMessage,
        aiMessage, 
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { title, description },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    // if description changed → generate AI reply
    if (description) {
      const aiUser = await User.findOne({ role: "agent", name: "AI Assistant" });
      if (aiUser) {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-001",
          contents: [{ role: "user", parts: [{ text: description }] }],
        });

        await Message.create({
          ticketId: ticket._id,
          senderId: aiUser._id,
          content: response.text,
          isAIGenerated: true,
        });
      }
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};


export const getUserTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Find tickets for the logged-in user
    const tickets = await Ticket.find({ customerId: req.user.id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalTickets = await Ticket.countDocuments({ customerId: req.user.id });

    res.json({
      success: true,
      data: {
        tickets,
        totalTickets,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};







