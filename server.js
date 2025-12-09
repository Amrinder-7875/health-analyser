import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";

import pdfParse from "pdf-parse/lib/pdf-parse.js";


dotenv.config();

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://health-analyser.vercel.app",
  "https://health-analyser.onrender.com"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());
app.use(express.json());

// ---- Multer File Upload Config ----
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// ---- OpenRouter Config ----
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY is missing. Please set it in your .env file.");
}

const openRouter = axios.create({
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  }
});

// ---- API Route ----
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
                text: `Analyze this medical report and return the result in the following format:

                1. Summary
                2. Abnormal Values
                3. Possible Medical Conditions
                4. Diet & Lifestyle Recommendations
                5. Urgency Level
                `
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    return res.json({
      success: true,
      result
    });

  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || "Failed to process PDF"
    });
  }
});

// ---- Start Server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Health Analyzer Backend Running at http://localhost:${PORT}`);
});  
