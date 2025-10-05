import Attachment from "../models/Attachment.js";
import { sendAIImageReply } from "../utils/aiReply.js";
import path from "path";
import fs from "fs";
export const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params; // ticket or message id
    const { url, relatedModel, prompt } = req.body;

    if (!["Ticket", "Message"].includes(relatedModel)) {
      return res.status(400).json({ success: false, error: "Invalid relatedModel" });
    }

    let fileUrl, fileType, size, originalName;

    if (url) {
      fileUrl = url;
      fileType = "url/external";
    } else if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileType = req.file.mimetype;
      size = req.file.size;
      originalName = req.file.originalname;
    } else {
      return res.status(400).json({ success: false, error: "File or URL required" });
    }

    const attachment = await Attachment.create({
      fileUrl,
      fileType,
      size,
      originalName,
      uploadedBy: req.user.id,
      relatedTo: id,
      relatedModel,
    });

    // ✅ Trigger AI in background for Ticket attachments
    if (relatedModel === "Ticket") {
      sendAIImageReply({ ticketId: id, attachmentUrl: fileUrl, prompt, fileType });
    }

    res.status(201).json({ success: true, data: attachment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export const getAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const attachment = await Attachment.findById(id).populate("uploadedBy", "name email");

    if (!attachment) {
      return res.status(404).json({ success: false, error: "Attachment not found" });
    }

    res.json({ success: true, data: attachment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

