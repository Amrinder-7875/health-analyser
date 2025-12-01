import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

// Allow frontend deployment
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://healthanalyser.vercel.app" // your frontend domain
  ]
}));

app.use(express.json());

// File upload system
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Main API route
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No PDF uploaded" });
    }

    const fileData = fs.readFileSync(req.file.path).toString("base64");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: fileData
                }
              },
              {
                text: `Analyze this medical report and return: Summary, Abnormal Values, Possible Conditions, Diet Recommendation and Urgency level.`
              }
            ]
          }
        ]
      }
    );

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    return res.json({ success: true, result });

  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to analyze report. Try again later."
    });
  }
});

// Default route message
app.get("/", (req, res) => {
  res.send("Backend running ✔️");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
