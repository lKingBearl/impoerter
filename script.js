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

        resultBox.innerHTML = "<strong>Downloading and brute-forcing HTML data...</strong>";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error(`Status ${response.status} - ${await response.text()}`);
            }

            const rawData = await response.text();

            // 1. Aggressively unescape the entire HTML document to reveal hidden JSON payloads
            let cleanText = rawData;
            for (let i = 0; i < 3; i++) {
                cleanText = cleanText.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '');
            }

            // 2. The Bracket-Counting Algorithm: Hunt for valid JSON objects in the raw text
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
                
                // Count opening and closing brackets to extract complete objects
                while (end < cleanText.length && brackets > 0) {
                    let char = cleanText[end];
                    let prevChar = cleanText[end-1];
                    
                    if (char === '"' && prevChar !== '\\') inString = !inString;
                    
                    if (!inString) {
                        if (char === '{') brackets++;
                        else if (char === '}') brackets--;
                    }
                    end++;
                    
                    // Failsafe to prevent browser freezing on massive strings
                    if (end - start > 2000000) { isValid = false; break; } 
                }
                
                if (brackets === 0 && isValid) {
                    let jsonString = cleanText.substring(start, end);
                    const lowerJson = jsonString.toLowerCase();
                    
                    // Verify the object contains Path of Exile data before parsing
                    if (lowerJson.includes('"ehp"') || lowerJson.includes('"life"') || lowerJson.includes('"equipment"')) {
                        if (jsonString.length > maxLength) {
                            try {
                                bestPayload = JSON.parse(jsonString);
                                maxLength = jsonString.length;
                            } catch(e) {}
                        }
                    }
                }
            }

            if (!bestPayload) {
                throw new Error("Could not extract character JSON from the HTML string.");
            }

            // 3. Filter down to a clean object optimized for local model ingestion
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
                    if (lowerKey === 'name' && path.includes('item') && typeof val === 'string
