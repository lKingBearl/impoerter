document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", async () => {
        const url = poeUrlInput.value.trim();
        if (!url) return;

        resultBox.textContent = "Fetching character model data...";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            // Output the raw, clean JSON directly
            resultBox.innerHTML = `
                <strong>Data Successfully Fetched!</strong><br><br>
                <textarea style="width: 100%; height: 400px; font-family: monospace; font-size: 13px; background: #f8f9fa;">${JSON.stringify(data, null, 2)}</textarea>
            `;
        } catch (e) {
            resultBox.textContent = "Error: Could not retrieve data.";
        }
    });
});
