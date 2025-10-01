import User from "../models/User.js";  // adjust path if needed

let aiUserId = null;

export const initAIUser = async () => {
  try {
    // Check if AI user already exists
    let aiUser = await User.findOne({ email: "ai@system.com" });

    if (!aiUser) {
      aiUser = await User.create({
        name: "AI Assistant",
        email: "ai@system.com",
        password: "system-generated", // not used for login
        role: "agent",
      });
      console.log("✅ AI Assistant user created:", aiUser._id);
    } else {
      console.log("ℹ️ AI Assistant already exists:", aiUser._id);
    }

    aiUserId = aiUser._id.toString();
    return aiUserId;
  } catch (err) {
    console.error("❌ Failed to initialize AI Assistant:", err.message);
    throw err;
  }
};

export const getAIUserId = () => aiUserId;

