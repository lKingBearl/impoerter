document.addEventListener("DOMContentLoaded", () => {

    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    let latestData = null;

    parseBtn.addEventListener("click", async () => {

        const url = poeUrlInput.value.trim();

        if (!url) {
            resultBox.textContent = "Please enter a URL.";
            return;
        }

        resultBox.textContent = "Fetching character data...";

        try {

            const response = await fetch(
                `/api/parse?url=${encodeURIComponent(url)}`
            );

            const data = await response.json();

            latestData = data;

            resultBox.innerHTML = `
                <h3>Character Data</h3>

                <textarea
                    id="json-output"
                    style="
                        width: 100%;
                        height: 500px;
                        font-family: monospace;
                        font-size: 12px;
                        white-space: pre;
                        margin-bottom: 10px;
                    "
                >${JSON.stringify(data, null, 2)}</textarea>

                <button id="download-btn"
                    style="
                        padding: 10px 16px;
                        cursor: pointer;
                    "
                >
                    Download TXT
                </button>
            `;

            // DOWNLOAD BUTTON
            const downloadBtn =
                document.getElementById("download-btn");

            downloadBtn.addEventListener("click", () => {

                if (!latestData) return;

                const text =
                    JSON.stringify(latestData, null, 2);

                const blob = new Blob(
                    [text],
                    { type: "text/plain" }
                );

                const downloadUrl =
                    URL.createObjectURL(blob);

                const a =
                    document.createElement("a");

                a.href = downloadUrl;

                a.download =
                    "poe-character-data.txt";

                document.body.appendChild(a);

                a.click();

                document.body.removeChild(a);

                URL.revokeObjectURL(downloadUrl);
            });

        } catch (err) {

            console.error(err);

            resultBox.textContent =
                "Failed to retrieve data.";
        }
    });
});
