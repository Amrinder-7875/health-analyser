// ---- API Route (OpenRouter + pdf-parse) ----
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
        error: "Could not extract text from PDF. Please upload a text-based report."
      });
    }

    // Limit text length so the request is not too large
    const MAX_CHARS = 8000;
    if (pdfText.length > MAX_CHARS) {
      pdfText = pdfText.slice(0, MAX_CHARS) + "\n\n[Text truncated for analysis]";
    }

    // 3) Call OpenRouter chat completion
    const completion = await openRouter.post("/chat/completions", {
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        {
          role: "system",
          content:
            "You are an expert medical assistant. Analyze the user's lab report text and respond clearly, in simple language, without giving definitive diagnoses. Always encourage consulting a real doctor."
        },
        {
          role: "user",
          content:
            `Here is a medical report. Carefully analyze it and answer in the following structured format:\n\n1. Short Summary (2-3 lines)\n2. Abnormal Values (list with value, normal range, and if it is high/low)\n3. Possible Health Concerns (bullet points, use words like 'may indicate', 'could be related to')\n4. Lifestyle & Diet Suggestions (bullet list)\n5. Urgency (Normal / Monitor / See doctor soon / See doctor urgently)\n\nReport text:\n\n${pdfText}`
        }
      ]
    });

    const result =
      completion.data?.choices?.[0]?.message?.content?.trim() ||
      "No response from analysis model.";

    // Optional: delete uploaded file after processing
    fs.unlink(req.file.path, () => {});

    return res.json({
      success: true,
      result
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
      error: apiError
    });
  }
});
