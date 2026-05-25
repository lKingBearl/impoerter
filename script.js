document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", async () => {
        const url = poeUrlInput.value.trim();
        resultBox.textContent = "Fetching build data...";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            // Dump the data object
            resultBox.innerHTML = `
                <strong>Data Extracted:</strong>
                <textarea style="width: 100%; height: 400px;">${JSON.stringify(data, null, 2)}</textarea>
            `;
        } catch (e) {
            resultBox.textContent = "Error: Could not retrieve data.";
        }
    });
});
