import mongoose from "mongoose";
const messageSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    isAIGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Performance optimization: fetch by ticket + createdAt (for pagination)
messageSchema.index({ ticketId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
