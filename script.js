document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", async () => {
        const url = poeUrlInput.value.trim();
        if (!url) return;

        resultBox.textContent = "Fetching raw HTML...";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            const rawHtml = await response.text();

            resultBox.innerHTML = `
                <strong>Raw HTML Captured:</strong><br>
                <p>Copy this into your local AI to extract your build stats:</p>
                <textarea style="width: 100%; height: 500px; font-family: monospace; font-size: 11px;">${rawHtml.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
            `;
        } catch (error) {
            resultBox.textContent = "Error: Could not fetch HTML.";
        }
    });
});
