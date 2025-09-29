import mongoose from "mongoose";
const chatSchema = new mongoose.Schema({
  userId: String,
  prompt: String,
  response: String,
  imageUrl: String,
  
},{timestamps:true});

export default mongoose.model("Chat", chatSchema);
