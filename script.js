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

        resultBox.textContent = "Fetching and extracting build data...";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Status ${response.status} - ${errorText || response.statusText}`);
            }

            const rawHtml = await response.text();

            // The regex to find poe.ninja's hidden JSON data block
            const jsonMatch = rawHtml.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

            if (jsonMatch && jsonMatch[1]) {
                // Convert the raw text back into a usable JavaScript Object
                const nextData = JSON.parse(jsonMatch[1]);
                
                // Isolate the core character properties (ignoring site navigation data)
                const buildData = nextData.props?.pageProps || nextData;

                // Output the clean JSON
                resultBox.innerHTML = `
                    <strong>Extraction Successful!</strong><br><br>
                    Data isolated and ready for processing:<br><br>
                    <textarea style="width: 100%; height: 350px; font-family: monospace; font-size: 14px; background: #fff; padding: 10px;">${JSON.stringify(buildData, null, 2)}</textarea>
                `;
            } else {
                throw new Error("Could not locate the data block. poe.ninja may have changed their layout.");
            }
            
        } catch (error) {
            resultBox.textContent = `Error: ${error.message}`;
            resultBox.style.color = "#e74c3c";
        }
    });
});
