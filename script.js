// Auto switch backend URL based on environment
const backendURL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000" 
    : "https://health-analyser.onrender.com"; // <-- Your Render backend URL


const fileInput = document.getElementById("file-input");
const analyzeBtn = document.getElementById("analyze-btn");
const resultBox = document.getElementById("result");
const statusText = document.getElementById("status");

let selectedFile = null;

// Detect file
fileInput.addEventListener("change", (e) => {
  selectedFile = e.target.files[0];
  statusText.textContent = selectedFile
    ? `Selected: ${selectedFile.name}`
    : "No file selected.";
  resultBox.innerHTML = "";
});

// Button click
analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    alert("Please upload a PDF file first.");
    return;
  }

  statusText.innerHTML = "⏳ Uploading & Analyzing...";
  resultBox.innerHTML = "";
  analyzeBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch(`${backendURL}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Server error. Please try again.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to analyze.");
    }

    resultBox.innerHTML = `<pre>${data.result}</pre>`;
    statusText.innerHTML = "✅ Analysis complete.";

  } catch (error) {
    console.error(error);
    resultBox.innerHTML = `<p style="color:red;">❌ ${error.message}</p>`;
    statusText.innerHTML = "⚠️ Unable to connect to server. Check API or network.";
  }

  analyzeBtn.disabled = false;
});
