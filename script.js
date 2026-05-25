document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", async () => {
        const url = poeUrlInput.value.trim();

        if (!url) {
            resultBox.textContent = "Error: Please enter a poe.ninja URL.";
            resultBox.style.color = "#e74c3c";
            return;
        }

        resultBox.textContent = "Fetching build data via Cloudflare Function...";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            // This grabs the exact error code from the server instead of a generic message
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Status ${response.status} - ${errorText || response.statusText}`);
            }

            const rawData = await response.text();

            resultBox.innerHTML = `
                <strong>Fetch Successful!</strong><br><br>
                Raw Data Output (Truncated):<br><br>
                <textarea style="width: 100%; height: 200px; font-family: monospace;">${rawData.substring(0, 1000)}...</textarea>
            `;
            
        } catch (error) {
            resultBox.textContent = `Error: ${error.message}`;
            resultBox.style.color = "#e74c3c";
        }
    });
});
