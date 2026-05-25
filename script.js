document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", async () => {
        const url = poeUrlInput.value.trim();
        if (!url) return;

        resultBox.textContent = "Fetching API data...";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            const buildData = await response.json();

            // DUMP THE ENTIRE DATA OBJECT TO THE SCREEN
            resultBox.innerHTML = `
                <strong>Full API Response (Debug):</strong><br>
                <textarea style="width: 100%; height: 500px; font-family: monospace; font-size: 12px; background: #fff; padding: 10px;">${JSON.stringify(buildData, null, 2)}</textarea>
            `;
        } catch (error) {
            resultBox.textContent = "Error: Could not reach API.";
        }
    });
});
