import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// ---- CORS CONFIG ----
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://health-analyser.vercel.app",
  "https://health-analyser.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.options("*", cors());
app.use(express.json());

// ---- MULTER FILE UPLOAD CONFIG ----
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ---- OPENROUTER CONFIG ----
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY is missing. Please set it in your environment.");
}

const openRouter = axios.create({
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// ---- ROOT ROUTE (HEALTH CHECK) ----
app.get("/", (req, res) => {
  res.send("✅ Health Analyzer Backend is Running");
});

// ---- API ROUTE (OpenRouter + pdf-parse) ----
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No PDF uploaded" });
    }

    // 1) Read PDF file
    const fileBuffer = fs.readFileSync(req.file.path);

    // 2) Extract text from PDF
    const parsed = await pdfParse(fileBuffer);
    let pdfText = parsed.text || "";

    if (!pdfText.trim()) {
      return res.status(400).json({
        success: false,
        error: "Could not extract text from PDF. Please upload a text-based report.",
      });
    }

    // Limit text length so the request is not too large
    const MAX_CHARS = 8000;
    if (pdfText.length > MAX_CHARS) {
      pdfText = pdfText.slice(0, MAX_CHARS) + "\n\n[Text truncated for analysis]";
    }

    // 3) Call OpenRouter chat completion
    const completion = await openRouter.post("/chat/completions", {
model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert medical assistant. Analyze the user's lab report text and respond clearly, in simple language, without giving definitive diagnoses. Always encourage consulting a real doctor.",
        },
        {
          role: "user",
          content: `Here is a medical report. Carefully analyze it and answer in the following structured format:\n\n1. Short Summary (2-3 lines)\n2. Abnormal Values (list with value, normal range, and if it is high/low)\n3. Possible Health Concerns (bullet points, use words like 'may indicate', 'could be related to')\n4. Lifestyle & Diet Suggestions (bullet list)\n5. Urgency (Normal / Monitor / See doctor soon / See doctor urgently)\n\nReport text:\n\n${pdfText}`,
        },
      ],
    });

    const result =
      completion.data?.choices?.[0]?.message?.content?.trim() ||
      "No response from analysis model.";

    // Optional: delete uploaded file after processing
    fs.unlink(req.file.path, () => {});

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    const apiError =
      error?.response?.data?.error?.message ||
      (typeof error?.response?.data === "string"
        ? error.response.data
        : JSON.stringify(error.response?.data || {})) ||
      error.message ||
      "Failed to process PDF";

    console.error("❌ Error while processing PDF:", apiError);

    return res.status(500).json({
      success: false,
      error: apiError,
    });
  }
});

// ---- START SERVER ----
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Health Analyzer Backend Running at http://localhost:${PORT}`);
});
