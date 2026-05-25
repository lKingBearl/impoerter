document.addEventListener("DOMContentLoaded", () => {
    const parseBtn = document.getElementById("parse-btn");
    const poeUrlInput = document.getElementById("poe-url");
    const resultBox = document.getElementById("result-box");

    parseBtn.addEventListener("click", () => {
        const url = poeUrlInput.value.trim();

        // Check if the input is empty
        if (!url) {
            resultBox.textContent = "Error: Please enter a poe.ninja URL.";
            resultBox.style.color = "#e74c3c"; // Change text to red
            return;
        }

        // Show a temporary loading state
        resultBox.textContent = "Fetching build data...";
        resultBox.style.color = "#333";

        // Simulate a small delay, then show the sample text
        setTimeout(() => {
            resultBox.innerHTML = `
                <strong>Mock Parse Successful!</strong><br><br>
                Target URL: ${url}<br>
                Mock Data: Ready for local AI processing.
            `;
        }, 600);
    });
});
