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

        resultBox.innerHTML = "<strong>Reconstructing Next.js Data Stream...</strong>";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error(`Status ${response.status} - ${await response.text()}`);
            }

            const rawData = await response.text();
            let bestPayload = null;
            let maxLength = 0;

            // 1. Reconstruct modern Next.js App Router RSC chunks
            let fullRscString = "";
            const splits = rawData.split('self.__next_f.push(');
            for (let i = 1; i < splits.length; i++) {
                // Safely extract the JavaScript array containing the chunked strings
                const match = splits[i].match(/^(\[\d+,\s*"(?:\\.|[^"\\])*"\])/);
                if (match) {
                    try {
                        const parsedArray = JSON.parse(match[1]); 
                        if (parsedArray && typeof parsedArray[1] === 'string') {
                            // Stitch the severed chunks back together into one giant payload
                            fullRscString += parsedArray[1]; 
                        }
                    } catch(e) {}
                }
            }

            // 2. Once the stream is stitched together, parse it line by line
            if (fullRscString.length > 0) {
                const lines = fullRscString.split('\n');
                for (let line of lines) {
                    const firstColon = line.indexOf(':');
                    if (firstColon > -1 && firstColon < 10) {
                        const content = line.substring(firstColon + 1);
                        try {
                            let parsed = JSON.parse(content);
                            // Next.js double-stringifies some data layers, so we parse it again if needed
                            if (typeof parsed === 'string') {
                                try { parsed = JSON.parse(parsed); } catch(e) {}
                            }
                            
                            const str = JSON.stringify(parsed).toLowerCase();
                            // Locate the specific Path of Exile profile payload
                            if ((str.includes('life') || str.includes('equipment')) && str.length > maxLength) {
                                bestPayload = parsed;
                                maxLength = str.length;
                            }
                        } catch(e) {}
                    }
                }
            }

            // 3. Fallback: Check for older Next.js standard data blocks
            if (!bestPayload) {
                const nextDataMatch = rawData.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
                if (nextDataMatch) {
                    try { bestPayload = JSON.parse(nextDataMatch[1]); } catch(e) {}
                }
            }

            if (!bestPayload) {
                throw new Error("Could not reconstruct character JSON. poe.ninja may be hiding the data differently.");
            }

            // 4. Filter down to a clean object optimized for local model ingestion
            const cleanStats = extractAIStats(bestPayload);

            resultBox.innerHTML = `
                <strong>Extraction Successful!</strong><br><br>
                <strong>Local LLM Context Payload:</strong><br>
                <textarea style="width: 100%; height: 400px; font-family: monospace; font-size: 14px; background: #e8f5e9; padding: 10px; border: 1px solid #4caf50;">${JSON.stringify(cleanStats, null, 2)}</textarea>
            `;
            
        } catch (error) {
            resultBox.innerHTML = `<strong>Error:</strong> ${error.message}`;
            resultBox.style.color = "#e74c3c";
        }
    });

    // Recursively scans the payload for specific combat stats and gear
    function extractAIStats(data) {
        let results = { Attributes: {}, Defensive: {}, Simulated: {}, Gear_Equipped: [] };

        function search(obj, path = "") {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) { obj.forEach(item => search(item, path)); return; }

            for (const key in obj) {
                const lowerKey = key.toLowerCase();
                const val = obj[key];

                if (typeof val === 'object') {
                    search(val, `${path}.${key}`);
                } else if (typeof val === 'number' || typeof val === 'string') {
                    if (['strength', 'dexterity', 'intelligence'].includes(lowerKey)) results.Attributes[key] = val;
                    if (['life', 'energyshield', 'mana', 'armour', 'evasion', 'spirit'].includes(lowerKey)) results.Defensive[key] = val;
                    if (lowerKey.includes('res') && (lowerKey.includes('fire') || lowerKey.includes('cold') || lowerKey.includes('lightning') || lowerKey.includes('chaos'))) results.Defensive[key] = val;
                    if (lowerKey.includes('ehp') || lowerKey.includes('maxhit') || lowerKey.includes('effective')) results.Simulated[key] = val;
                    if (lowerKey === 'name' && path.includes('item') && typeof val === 'string' && val.length > 2) {
                        if (!results.Gear_Equipped.includes(val)) results.Gear_Equipped.push(val);
                    }
                }
            }
        }
        search(data);
        return results;
    }
});
