
import ai from "../config/gemini.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import fetch from "node-fetch";
import fs from "fs";

export const sendAIImageReply = async ({ ticketId, attachmentUrl, prompt, fileType }) => {
  try {
    // find AI assistant user
    const aiUser = await User.findOne({ role: "agent", name: "AI Assistant" });
    if (!aiUser) return console.log("⚠️ AI user not found");

    const finalPrompt = prompt || "Describe this image in detail.";

    let base64Image = null;
    let mimeType = fileType || "image/png";

    if (attachmentUrl.startsWith("/uploads/")) {
      // Local file → read from uploads folder
      const buffer = await fs.promises.readFile(`.${attachmentUrl}`);
      base64Image = buffer.toString("base64");
    } else {
      // Remote URL → fetch
      const responseImg = await fetch(attachmentUrl);
      mimeType = responseImg.headers.get("content-type") || mimeType;
      const buffer = await responseImg.arrayBuffer();
      base64Image = Buffer.from(buffer).toString("base64");
    }

    // Send to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [
        {
          role: "user",
          parts: [
            { text: finalPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    // Save AI reply as message
    await Message.create({
      ticketId,
      senderId: aiUser._id,
      content: response.text,
      isAIGenerated: true,
    });

    console.log(`✅ AI reply saved for ticket ${ticketId}`);
  } catch (err) {
    console.error("❌ AI image reply error:", err.message);
  }
};


export const sendAITextReply = async ({ ticketId, prompt }) => {
  try {
    const aiUser = await User.findOne({ role: "agent", name: "AI Assistant" });
    if (!aiUser) return console.log("AI user not found");

    const finalPrompt = prompt || "Please provide assistance";

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
    });

    await Message.create({
      ticketId,
      senderId: aiUser._id,
      content: response.text,
      isAIGenerated: true,
    });

    console.log(`AI text reply added for ticket ${ticketId}`);
  } catch (err) {
    console.error("AI text reply error:", err);
  }
};



// {
//   "url": "https://plus.unsplash.com/premium_photo-1755889381455-ba9accf067cc?w=600",
//   "relatedModel": "Ticket",
//   "prompt":"chek these image whether it is beutiful or not  did you see in the image "
// }
