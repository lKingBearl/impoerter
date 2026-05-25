document.addEventListener("DOMContentLoaded", () => {

    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    let latestData = null;

    parseBtn.addEventListener("click", async () => {

        const inputUrl = poeUrlInput.value.trim();

        if (!inputUrl) {
            resultBox.textContent = "Please enter a URL.";
            return;
        }

        resultBox.textContent =
            "Resolving character API...";

        try {

            let apiUrl = inputUrl;

            // If user pasted normal profile URL
            if (
                inputUrl.includes("/profile/") &&
                !inputUrl.includes("/api/")
            ) {

                // Fetch profile HTML
                const htmlResponse =
                    await fetch(inputUrl);

                const html =
                    await htmlResponse.text();

                // Find model endpoint
                const modelMatch =
                    html.match(
                        /https:\/\/poe\.ninja\/poe2\/api\/profile\/characters\/.*?\/model\/\d+/
                    );

                if (!modelMatch) {

                    // fallback simpler regex
                    const partialMatch =
                        html.match(
                            /\/poe2\/api\/profile\/characters\/.*?\/model\/\d+/
                        );

                    if (!partialMatch) {
                        throw new Error(
                            "Could not resolve model API URL"
                        );
                    }

                    apiUrl =
                        "https://poe.ninja" +
                        partialMatch[0];

                } else {

                    apiUrl = modelMatch[0];
                }
            }

            resultBox.textContent =
                "Fetching character data...";

            // Existing parser call
            const response = await fetch(
                `/api/parse?url=${encodeURIComponent(apiUrl)}`
            );

            const data = await response.json();

            latestData = data;

            resultBox.innerHTML = `
                <h3>Character Data</h3>

                <textarea
                    style="
                        width:100%;
                        height:500px;
                        font-family:monospace;
                        font-size:12px;
                        white-space:pre;
                        margin-bottom:10px;
                    "
                >${JSON.stringify(data, null, 2)}</textarea>

                <button id="download-btn"
                    style="
                        padding:10px 16px;
                        cursor:pointer;
                    "
                >
                    Download TXT
                </button>
            `;

            // Download button
            document
                .getElementById("download-btn")
                .addEventListener("click", () => {

                    if (!latestData) return;

                    const text =
                        JSON.stringify(
                            latestData,
                            null,
                            2
                        );

                    const blob =
                        new Blob(
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
                "Failed to retrieve character data.\n\n" +
                err.message;
        }
    });
});
