document.addEventListener("DOMContentLoaded", () => {

    // -------------------------
    // BOOKMARKLET GENERATOR
    // Builds the bookmarklet href dynamically so it always points back to THIS tool's origin
    // -------------------------
    const toolOrigin = window.location.origin;
    const toolUrl = window.location.origin + window.location.pathname;

    const bookmarkletCode = `(function(){
  if(window.__poeGrabberActive){
    alert('PoE Build Grabber is already active on this tab.');
    return;
  }
  window.__poeGrabberActive = true;

  var _fetch = window.fetch;

  window.fetch = function() {
    var args = arguments;
    var url = args[0];

    if (typeof url === 'string' && url.includes('/model/')) {
      window.fetch = _fetch;
      window.__poeGrabberActive = false;

      var banner = document.getElementById('__poe-grabber-banner');
      if (banner) banner.remove();

      var win = window.open(
        '${toolUrl}?poeurl=' + encodeURIComponent(url),
        '_blank'
      );

      if (!win) {
        alert('Popup blocked! Please allow popups for this site, then try again.');
      }

      return _fetch.apply(this, args);
    }

    return _fetch.apply(this, args);
  };

  var banner = document.createElement('div');
  banner.id = '__poe-grabber-banner';
  banner.style = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:99999',
    'background:#c89b3c',
    'color:#1a0f00',
    'font-family:system-ui,sans-serif',
    'font-size:13px',
    'font-weight:500',
    'padding:8px 16px',
    'text-align:center',
    'box-shadow:0 2px 8px rgba(0,0,0,0.15)'
  ].join(';');
  banner.textContent = 'PoE Build Grabber active — navigate to a character page to capture their data automatically.';
  document.body.appendChild(banner);
})();`;

    const bookmarkletHref = "javascript:" + encodeURIComponent(bookmarkletCode);
    document.getElementById("bookmarklet-link").href = bookmarkletHref;


    // -------------------------
    // TAB SWITCHING
    // -------------------------
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".panel").forEach(p => {
                p.classList.add("hidden");
                p.classList.remove("active");
            });
            tab.classList.add("active");
            const panel = document.getElementById("panel-" + tab.dataset.tab);
            panel.classList.remove("hidden");
            panel.classList.add("active");
        });
    });


    // -------------------------
    // STATUS BAR
    // -------------------------
    function setStatus(state, text) {
        const dot = document.getElementById("status-dot");
        const label = document.getElementById("status-text");
        dot.className = "dot";
        if (state) dot.classList.add(state);
        label.textContent = text;
    }


    // -------------------------
    // AUTO-FILL FROM BOOKMARKLET
    // If opened by the bookmarklet, ?poeurl= will be in the query string
    // -------------------------
    const params = new URLSearchParams(window.location.search);
    const incomingUrl = params.get("poeurl");

    if (incomingUrl) {
        document.getElementById("poe-url").value = incomingUrl;
        fetchAndParse(incomingUrl);
    }


    // -------------------------
    // PARSE BUTTON
    // -------------------------
    document.getElementById("parse-btn").addEventListener("click", () => {
        const url = document.getElementById("poe-url").value.trim();
        if (!url) {
            setStatus("", "Please enter a URL first.");
            return;
        }
        fetchAndParse(url);
    });


    // -------------------------
    // FETCH + PARSE
    // -------------------------
    async function fetchAndParse(url) {
        setStatus("amber", "Fetching character data...");

        try {
            const res = await fetch("/api/parse?url=" + encodeURIComponent(url));
            const data = await res.json();

            if (data.error) {
                setStatus("red", "Error: " + data.error);
                return;
            }

            showResult(data);

        } catch (err) {
            console.error(err);
            setStatus("red", "Failed to fetch. Check the URL and try again.");
        }
    }


    // -------------------------
    // SHOW RESULT
    // -------------------------
    function showResult(data) {
        setStatus("green", "Character loaded successfully.");

        const char = data.character || {};
        const items = data.items || [];
        const skills = data.skills || [];
        const initials = (char.name || "??").substring(0, 2).toUpperCase();

        document.getElementById("char-header").innerHTML = `
            <div class="char-header">
                <div class="char-avatar">${initials}</div>
                <div>
                    <div class="char-name">${char.name || "Unknown"}</div>
                    <div class="char-sub">Level ${char.level || "?"} ${char.class || ""}</div>
                    <div class="pills">
                        <span class="pill">${items.length} items</span>
                        <span class="pill">${skills.length} skills</span>
                    </div>
                </div>
            </div>
        `;

        const formatted = formatForLLM(data);
        document.getElementById("output-text").value = formatted;

        const outputArea = document.getElementById("output-area");
        outputArea.classList.remove("hidden");
    }


    // -------------------------
    // FORMAT AS PLAIN TEXT FOR LLM
    // This is what actually gets copied/downloaded
    // -------------------------
    function formatForLLM(data) {
        const char = data.character || {};
        const lines = [];

        lines.push("=== PATH OF EXILE 2 CHARACTER ===");
        lines.push("Name:  " + (char.name  || "Unknown"));
        lines.push("Level: " + (char.level || "?"));
        lines.push("Class: " + (char.class  || "?"));
        lines.push("");

        const stats = data.stats || {};
        if (Object.keys(stats).length > 0) {
            lines.push("=== STATS ===");
            for (const [k, v] of Object.entries(stats)) {
                lines.push(k + ": " + v);
            }
            lines.push("");
        }

        const items = data.items || [];
        if (items.length > 0) {
            lines.push("=== EQUIPPED ITEMS ===");
            for (const item of items) {
                lines.push("[" + (item.slot || "Unknown") + "] " + (item.name || "(unnamed)") + " — " + (item.type || ""));
                if (item.rarity)                  lines.push("  Rarity:    " + item.rarity);
                if (item.implicits?.length)        lines.push("  Implicits: " + item.implicits.join(" | "));
                if (item.explicits?.length)        lines.push("  Explicits: " + item.explicits.join(" | "));
                if (item.crafted?.length)          lines.push("  Crafted:   " + item.crafted.join(" | "));
                if (item.enchantments?.length)     lines.push("  Enchants:  " + item.enchantments.join(" | "));
                if (item.socketedItems?.length) {
                    for (const s of item.socketedItems) {
                        lines.push("    Socketed: " + (s.typeLine || s.name || JSON.stringify(s)));
                    }
                }
                lines.push("");
            }
        }

        const skills = data.skills || [];
        if (skills.length > 0) {
            lines.push("=== SKILLS ===");
            for (const skill of skills) {
                if (typeof skill === "string") {
                    lines.push("- " + skill);
                } else if (skill.name) {
                    let line = "- " + skill.name;
                    if (skill.level)   line += " (Level " + skill.level + ")";
                    if (skill.quality) line += " [Q" + skill.quality + "]";
                    lines.push(line);
                    if (skill.supports?.length) {
                        lines.push("  Supports: " + skill.supports.join(", "));
                    }
                } else {
                    lines.push("- " + JSON.stringify(skill));
                }
            }
            lines.push("");
        }

        const passives = data.passives || [];
        if (passives.length > 0) {
            lines.push("=== PASSIVES ===");
            if (Array.isArray(passives)) {
                if (typeof passives[0] === "string") {
                    lines.push(passives.join(", "));
                } else {
                    lines.push(JSON.stringify(passives, null, 2));
                }
            }
            lines.push("");
        }

        return lines.join("\n");
    }


    // -------------------------
    // COPY + DOWNLOAD
    // -------------------------
    document.getElementById("copy-btn").addEventListener("click", () => {
        const t = document.getElementById("output-text");
        t.select();
        navigator.clipboard.writeText(t.value).catch(() => {
            document.execCommand("copy");
        });
    });

    document.getElementById("download-btn").addEventListener("click", () => {
        const text = document.getElementById("output-text").value;
        const blob = new Blob([text], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "poe-character.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

});
