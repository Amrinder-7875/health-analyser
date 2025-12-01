console.log("🔥 Frontend Loaded");

const fileInput = document.getElementById("fileInput");
const fileNameText = document.getElementById("fileName");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingBox = document.getElementById("loadingState");
const errorBox = document.getElementById("errorState");
const resultsBox = document.getElementById("resultsState");

let selectedFile = null;

fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
    if(selectedFile){
        fileNameText.innerText = "Selected: " + selectedFile.name;
        analyzeBtn.disabled = false;
    }
});

// Analyze button listener
analyzeBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("BUTTON CLICKED");

    if (!selectedFile) {
        showError("Please upload a file");
        return;
    }

    loadingBox.style.display = "block";
    resultsBox.style.display = "none";
    errorBox.style.display = "none";
    analyzeBtn.disabled = true;

    await sendToAPI();

    loadingBox.style.display = "none";
    analyzeBtn.disabled = false;
});
// 🌙 THEME TOGGLE
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

async function sendToAPI() {
    const formData = new FormData();
    formData.append("file", selectedFile);

    console.log("📤 Sending file to backend...");

    try {
        const response = await fetch("http://localhost:3000/analyze", {
            method: "POST",
            body: formData
        });
        console.log("STATUS:", response.status);

        const data = await response.json();
        console.log("📥 API RESPONSE:", data);

        if (!data.success) {
            showError(data.error || "Something went wrong.");
        } else {
            showResults(data.result);
        }
    } catch (err) {
        console.error("❌ Fetch Error:", err);
        showError("Unable to connect to server.");
    }
}

function showResults(text) {
    const formatted = text
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>")
        .trim();

    resultsBox.innerHTML = formatted;
    resultsBox.style.display = "block";
    errorBox.style.display = "none";
}

function showError(msg) {
    errorBox.innerText = msg;
    errorBox.style.display = "block";
    resultsBox.style.display = "none";
}
