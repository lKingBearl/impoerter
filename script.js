document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", async () => {
        const url = poeUrlInput.value.trim();
        if (!url) return;

        resultBox.textContent = "Fetching direct API data...";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            const buildData = await response.json();

            // The API returns a clean object. We just pass it through our filter.
            const cleanStats = extractAIStats(buildData);

            resultBox.innerHTML = `
                <strong>Data Successfully Extracted from API!</strong><br><br>
                <textarea style="width: 100%; height: 400px; font-family: monospace; font-size: 14px; background: #e8f5e9; padding: 10px;">${JSON.stringify(cleanStats, null, 2)}</textarea>
            `;
        } catch (error) {
            resultBox.textContent = "Error: Failed to fetch API data.";
        }
    });

    function extractAIStats(data) {
        // Since it's now a clean JSON API, we can target specific keys directly
        // This is a robust fallback if the structure changes slightly
        return {
            Character: data.character?.name || "Unknown",
            Level: data.character?.level || 0,
            Class: data.character?.class || "Unknown",
            Stats: data.stats || "Stats not found in API response",
            Items: data.items?.map(i => i.name) || []
        };
    }
});
