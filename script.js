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
            characterName = decodeURIComponent(pathParts[pathParts.length - 1]); 
        } catch (e) {
            characterName = "";
        }

        resultBox.textContent = "Hunting and filtering build data...";
        resultBox.style.color = "#333";

        try {
            const response = await fetch(`/api/parse?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Status ${response.status} - ${errorText}`);
            }

            const rawData = await response.text();
            let bestPayload = null;
            let maxLength = 0;

            const lines = rawData.split('\n');
            
            // 1. Locate the main data block
            for (let line of lines) {
                const braceIdx = line.indexOf('{');
                const bracketIdx = line.indexOf('[');
                const jsonStart = (braceIdx === -1) ? bracketIdx : (bracketIdx === -1) ? braceIdx : Math.min(braceIdx, bracketIdx);
                
                if (jsonStart > -1) {
                    try {
                        const parsed = JSON.parse(line.substring(jsonStart));
                        const str = JSON.stringify(parsed);
                        
                        const hasCharacter = characterName ? str.includes(characterName) : true;
                        const hasPoEData = str.includes('equipment') || str.includes('items') || str.includes('skills') || str.includes('passive');
                        
                        if (hasCharacter && hasPoEData && str.length > maxLength) {
                            bestPayload = parsed;
                            maxLength = str.length;
                        }
                    } catch(e) {}
                }
            }

            if (!bestPayload) {
                 throw new Error("Could not locate character data. The stream might be formatted differently.");
            }

            // 2. Filter it down to just the requested stats
            const cleanStats = extractAIStats(bestPayload);

            resultBox.innerHTML = `
                <strong>Extraction Successful!</strong><br><br>
                <strong>AI-Ready Clean Data:</strong><br>
                <textarea style="width: 100%; height: 250px; font-family: monospace; font-size: 14px; background: #e8f5e9; padding: 10px; margin-bottom: 10px; border: 1px solid #4caf50;">${JSON.stringify(cleanStats, null, 2)}</textarea>
                
                <strong>Raw Server Dump (Full data just in case):</strong><br>
                <textarea style="width: 100%; height: 100px; font-family: monospace; font-size: 14px; background: #fff; padding: 10px;">${JSON.stringify(bestPayload, null, 2)}</textarea>
            `;
            
        } catch (error) {
            resultBox.textContent = `Error: ${error.message}`;
            resultBox.style.color = "#e74c3c";
        }
    });

    // Custom crawler to find specific PoE stats anywhere in the data
    function extractAIStats(data) {
        let results = {
            Attributes: {},
            Defensive: {},
            Simulated: {},
            Gear_Equipped: []
        };

        function search(obj, path = "") {
            if (!obj || typeof obj !== 'object') return;

            if (Array.isArray(obj)) {
                obj.forEach(item => search(item, path));
                return;
            }

            for (const key in obj) {
                const lowerKey = key.toLowerCase();
                const val = obj[key];

                if (typeof val === 'object') {
                    search(val, `${path}.${key}`);
                } else if (typeof val === 'number' || typeof val === 'string') {
                    
                    // Match Attributes
                    if (['strength', 'dexterity', 'intelligence'].includes(lowerKey)) {
                        results.Attributes[key] = val;
                    }
                    
                    // Match Defensives
                    if (['life', 'energyshield', 'mana', 'armour', 'evasion', 'spirit'].includes(lowerKey)) {
                         results.Defensive[key] = val;
                    }
                    if (lowerKey.includes('res') && (lowerKey.includes('fire') || lowerKey.includes('cold') || lowerKey.includes('lightning') || lowerKey.includes('chaos'))) {
                        results.Defensive[key] = val;
                    }
                    
                    // Match Simulated Max Hits / EHP
                    if (lowerKey.includes('ehp') || lowerKey.includes('maxhit') || lowerKey.includes('effective')) {
                        results.Simulated[key] = val;
                    }

                    // Grab Item Names
                    if (lowerKey === 'name' && path.includes('item')) {
                        if (!results.Gear_Equipped.includes(val) && val.length > 2) {
                            results.Gear_Equipped.push(val);
                        }
                    }
                }
            }
        }

        search(data);
        return results;
    }
});
