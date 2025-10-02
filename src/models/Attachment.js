import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    fileUrl: { type: String, required: true }, // public/local/cloud URL
    fileType: { type: String, required: true }, // e.g. image/png, application/pdf
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    relatedTo: { type: mongoose.Schema.Types.ObjectId, required: true },
    relatedModel: {
      type: String,
      enum: ["Ticket", "Message"],
      required: true,
    },

    originalName: { type: String }, // optional: original file name
    size: { type: Number },         // optional: file size in bytes
  },
  { timestamps: true }
);

const Attachment = mongoose.model("Attachment", attachmentSchema);
export default Attachment;

