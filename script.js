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

        let characterName = "";
        try {
            const parsedUrl = new URL(url);
            const pathParts = parsedUrl.pathname.split('/');
            characterName = pathParts[pathParts.length - 1]; 
        } catch (e) {
            characterName = "ROTATester"; 
        }

        resultBox.textContent = "Fetching raw data stream bypassing HTML...";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Status ${response.status} - ${errorText}`);
            }

            const rawData = await response.text();
            let bestPayload = null;

            const lines = rawData.split('\n');
            for (let line of lines) {
                const braceIdx = line.indexOf('{');
                const bracketIdx = line.indexOf('[');
                const jsonStart = (braceIdx === -1) ? bracketIdx : (bracketIdx === -1) ? braceIdx : Math.min(braceIdx, bracketIdx);
                
                if (jsonStart > -1) {
                    try {
                        const parsed = JSON.parse(line.substring(jsonStart));
                        const str = JSON.stringify(parsed);
                        
                        if (str.includes(characterName) && str.includes('Life')) {
                            if (!bestPayload || str.length > JSON.stringify(bestPayload).length) {
                                bestPayload = parsed;
                            }
                        }
                    } catch(e) {
                        // Ignore incomplete fragments
                    }
                }
            }

            if (bestPayload) {
                resultBox.innerHTML = `
                    <strong>Extraction Successful!</strong><br><br>
                    Data isolated and ready for processing:<br><br>
                    <textarea style="width: 100%; height: 350px; font-family: monospace; font-size: 14px; background: #fff; padding: 10px;">${JSON.stringify(bestPayload, null, 2)}</textarea>
                `;
            } else {
                throw new Error("Could not locate character data in the stream.");
            }
            
        } catch (error) {
            resultBox.textContent = `Error: ${error.message}`;
            resultBox.style.color = "#e74c3c";
        }
    });
});
