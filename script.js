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

        resultBox.innerHTML = "<strong>Stitching severed data chunks...</strong>";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error(`Status ${response.status} - ${await response.text()}`);
            }

            const rawData = await response.text();

            // 1. Extreme Stitching: Avoid Regex truncation by isolating the exact first and last quotes of every chunk
            let fullRscString = "";
            const splits = rawData.split('self.__next_f.push(');
            for (let i = 1; i < splits.length; i++) {
                const startIdx = splits[i].indexOf('"');
                const endIdx = splits[i].lastIndexOf('"]'); // Ignores inner arrays, locks onto the absolute end of the chunk
                
                if (startIdx > -1 && endIdx > startIdx) {
                    fullRscString += splits[i].substring(startIdx + 1, endIdx);
                }
            }

            if (fullRscString.length === 0) {
                fullRscString = rawData; // Fallback if they aren't using Next.js chunks at all
            }

            // 2. Extreme Unescaping: Loop through the string until all Next.js stringification layers are permanently stripped
            let cleanText = fullRscString;
            let prevLen = 0;
            while (cleanText.length !== prevLen) {
                prevLen = cleanText.length;
                cleanText = cleanText.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '');
            }

            // 3. The Bracket-Counting Algorithm: Safely extract complete JSON blocks
            let bestPayload = null;
            let maxLength = 0;
            const regex = /\{"/g;
            let match;
            
            while ((match = regex.exec(cleanText)) !== null) {
                let start = match.index;
                let end = start + 1;
                let brackets = 1;
                let inString = false;
                let isValid = true;
                
                while (end < cleanText.length && brackets > 0) {
                    let char = cleanText[end];
                    let prevChar = cleanText[end-1];
                    
                    if (char === '"' && prevChar !== '\\') inString = !inString;
                    
                    if (!inString) {
                        if (char === '{') brackets++;
                        else if (char === '}') brackets--;
                    }
                    end++;
                    
                    if (end - start > 3000000) { isValid = false; break; } 
                }
                
                if (brackets === 0 && isValid) {
                    let jsonString = cleanText.substring(start, end);
                    let lowerStr = jsonString.toLowerCase();
                    
                    // Look for core PoE indicators inside the extracted object
                    if (lowerStr.includes('"life"') && lowerStr.includes('"equipment"')) {
                        if (jsonString.length > maxLength) {
                            try {
                                bestPayload = JSON.parse(jsonString);
                                maxLength = jsonString.length;
                            } catch(e) {}
                        }
                    }
                }
            }

            // 4. Ultimate Fallback: Dump the raw unescaped string if poe.ninja renamed their variables
            if (!bestPayload) {
                resultBox.innerHTML = `
                    <strong>Data successfully stitched, but exact keys not found!</strong><br><br>
                    The server sent the data, but poe.ninja might have changed their variable names (e.g., from "life" to "base_hp"). 
                    Here is the raw, unescaped payload. You can copy this directly into your local Ollama setup to have it read the data manually:<br><br>
                    <textarea style="width: 100%; height: 400px; font-family: monospace; font-size: 12px; background: #ffebee; border: 1px solid #e74c3c;">${cleanText.substring(0, 50000).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
                `;
                return;
            }

            // 5. Filter down to a clean AI object
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
