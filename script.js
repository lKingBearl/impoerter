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

        resultBox.textContent = "Decoding server stream...";
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

            // 1. Detect if Cloudflare blocked us entirely
            if (rawData.toLowerCase().includes("just a moment") || rawData.includes("cloudflare-challenge")) {
                throw new Error("poe.ninja's Cloudflare Bot Protection blocked the proxy.");
            }

            const lines = rawData.split('\n');
            
            // 2. Parse the Next.js RSC stream format
            for (let line of lines) {
                // Look for lines that start with an ID and a colon (e.g., `1:{"foo":"bar"}`)
                const firstColon = line.indexOf(':');
                if (firstColon > -1 && firstColon < 10) {
                    const content = line.substring(firstColon + 1);
                    try {
                        let parsed = JSON.parse(content);
                        
                        // Next.js often double-stringifies the data
                        if (typeof parsed === 'string') {
                            try { parsed = JSON.parse(parsed); } catch(e) {}
                        }

                        const str = JSON.stringify(parsed).toLowerCase();
                        
                        // Look for the massive block containing core stats
                        if ((str.includes('life') || str.includes('energyshield')) && str.length > maxLength) {
                            bestPayload = parsed;
                            maxLength = str.length;
                        }
                    } catch(e) {}
                }
            }

            // Fallback: If it's standard HTML, hunt for the Next.js script tags
            if (!bestPayload) {
                const scriptMatches = [...rawData.matchAll(/self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)/g)];
                for (let match of scriptMatches) {
                    try {
                        let unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        let parsed = JSON.parse(unescaped);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                        
                        const str = JSON.stringify(parsed).toLowerCase();
                        if ((str.includes('life') || str.includes('energyshield')) && str.length > maxLength) {
                            bestPayload = parsed;
                            maxLength = str.length;
                        }
                    } catch (e) {}
                }
            }

            // 3. THE SAFETY NET: If we STILL can't find it, print out exactly what the server sent
            if (!bestPayload) {
                resultBox.innerHTML = `
                    <strong>Error: Data not found.</strong><br><br>
                    The server returned an unknown format. Here are the first 1000 characters of the server response so we can debug it:<br><br>
                    <textarea style="width: 100%; height: 250px; font-family: monospace; font-size: 12px; background: #ffebee;">${rawData.substring(0, 1000).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
                `;
                return;
            }

            // 4. Filter it down to just the requested AI stats
            const cleanStats = extractAIStats(bestPayload);

            resultBox.innerHTML = `
                <strong>Extraction Successful!</strong><br><br>
                <strong>AI-Ready Clean Data:</strong><br>
                <textarea style="width: 100%; height: 350px; font-family: monospace; font-size: 14px; background: #e8f5e9; padding: 10px; border: 1px solid #4caf50;">${JSON.stringify(cleanStats, null, 2)}</textarea>
            `;
            
        } catch (error) {
            resultBox.textContent = `Error: ${error.message}`;
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
