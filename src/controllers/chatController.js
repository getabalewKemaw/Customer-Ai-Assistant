import ai from "../config/gemini.js";
import fetch from "node-fetch";
export const generateText = async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    res.json({
      success: true,
      output: response.text,
    });
  } catch (error) {
    next(error);
  }
};

export const generateFromImage = async (req, res, next) => {
  try {
    const { prompt, imageUrl } = req.body;

    if (!prompt || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: "Both prompt and imageUrl are required",
      });
    }

    //  Fetch image
    const responseImg = await fetch(imageUrl);

    //  Auto-detect MIME type from headers
    const contentType = responseImg.headers.get("content-type"); // e.g., "image/png" or "image/jpeg"
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ success: false, error: "URL is not a valid image" });
    }

    //  Convert to base64
    const buffer = await responseImg.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    //  Send to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: contentType, // use the auto-detected MIME type
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      output: response.text,
    });
  } catch (error) {
    next(error);
  }
};

