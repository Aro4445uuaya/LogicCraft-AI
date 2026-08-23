require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
    }
});

let editor;
let correctedEditor;

const languageSelect = document.getElementById("language");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");


// ===============================
// MONACO EDITOR
// ===============================

require(["vs/editor/editor.main"], function () {

    console.log("Monaco Editor loaded");

    editor = monaco.editor.create(
        document.getElementById("codeEditor"),
        {
            value: `public class Hello {

    public static void main(String[] args) {

        System.out.println("Welcome to LogicCraft AI");

    }

}`,

            language: "java",
            theme: "vs-dark",
            automaticLayout: true,

            minimap: {
                enabled: false
            },

            fontSize: 15,

            padding: {
                top: 20,
                bottom: 20
            },

            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth"
        }
    );
});


// ===============================
// UPLOAD FILE
// ===============================

uploadBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (event) => {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        if (editor) {
            editor.setValue(e.target.result);
        }

    };

    reader.readAsText(file);
});


// ===============================
// ANALYZE CODE
// ===============================

analyzeBtn.addEventListener("click", async () => {

    if (!editor) {
        alert("Editor is still loading. Please wait.");
        return;
    }

    const code = editor.getValue().trim();

    if (code === "") {
        alert("Please paste or upload your code first!");
        return;
    }

    const selectedLanguage = languageSelect.value;
    const user = JSON.parse(localStorage.getItem("logiccraftUser"));

    console.log("Sending code to AI...");

    resultBox.innerHTML = `
        <h3>🤖 Analyzing...</h3>
        <p>LogicCraft AI is reviewing your code...</p>
    `;

    try {

        const response = await fetch(
            "https://logiccraft-ai.onrender.com/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    googleId:user.googleId,
                    code: code,
                    language: selectedLanguage,
                    prompt: `
You are LogicCraft AI, an expert code reviewer.

Review this ${selectedLanguage} code.

Code:
${code}

Return:
1. Score out of 10
2. Issues found
3. Suggestions
4. Corrected code

Be accurate and concise.
                    `
                })
            }
        );

        const data = await response.json();

        console.log("AI response:", data);



        if (!response.ok || data.error) {
            throw new Error(data.error || "AI request failed");
        }
        await loadReviewHistory();


        // ===============================
        // SHOW AI RESULT
        // ===============================

        resultBox.innerHTML = `

        

        
            <h3>Analysis Complete ✅</h3>

<div class="ai-response-content">

    <div class="score">
        <strong>Score:</strong> ${data.score}/10
    </div>

    <h4>❌ Issues Found</h4>

    <ul>
        ${data.issues.map(issue =>
            `<li>${issue}</li>`
        ).join("")}
    </ul>

    <h4>💡 Suggestions</h4>

    <ul>
        ${data.suggestions.map(suggestion =>
            `<li>${suggestion}</li>`
        ).join("")}
    </ul>

</div>



<h4>✅ Corrected Code</h4>

<div id="correctedCode"></div>

<button id="copyCodeBtn">
    📋 Copy Corrected Code
</button>

<button id="applyFixBtn">
    🛠 Apply Fix
</button>
        `;

       


        const formattedCorrectedCode =
    String(data.correctedCode || "")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");

      if (correctedEditor) {
    correctedEditor.dispose();
}

correctedEditor = monaco.editor.create(
    document.getElementById("correctedCode"),
    {
        value: formattedCorrectedCode,
        language: selectedLanguage,
        theme: "vs-dark",
        readOnly: true,
        automaticLayout: true,
        minimap: {
            enabled: false
        },
        fontSize: 15,
        lineNumbers: "on",
        scrollBeyondLastLine: false
    }
);

        

        const copyCodeBtn =
            document.getElementById("copyCodeBtn");

        copyCodeBtn.addEventListener("click", async () => {

            const correctedCode =
                document.getElementById("correctedCode").innerText;

            await navigator.clipboard.writeText(correctedCode);

            copyCodeBtn.innerText = "✅ Copied!";

            setTimeout(() => {
                copyCodeBtn.innerText =
                    "📋 Copy Corrected Code";
            }, 2000);

        });


        

        const applyFixBtn =
            document.getElementById("applyFixBtn");

        applyFixBtn.addEventListener("click", () => {

    editor.setValue(formattedCorrectedCode);
    editor.setValue({lineNUmber: 1, column: 1});

    applyFixBtn.innerText = "✅ Fix Applied";

    setTimeout(() => {
        applyFixBtn.innerText = "🛠 Apply Fix";
    }, 2000);

});


    } catch (error) {

        console.error("AI Review Error:", error);

        resultBox.innerHTML = `
            <h3>❌ Analysis Failed</h3>
            <p>${error.message}</p>
        `;
    }

});



languageSelect.addEventListener("change", () => {

    if (!editor) return;

    const selectedLanguage =
        languageSelect.value;

    monaco.editor.setModelLanguage(
        editor.getModel(),
        selectedLanguage
    );

});

// ===============================
// REVIEW HISTORY
// ===============================

async function getUserReviews() {

    const user = JSON.parse(
        localStorage.getItem("logiccraftUser")
    );

    if (!user || !user.googleId) {
        return [];
    }

    const response = await fetch(
       `https://logiccraft-ai.onrender.com/api/reviews/${user.googleId}`
    );

    if (!response.ok) {
        throw new Error("Failed to load reviews");
    }

    return await response.json();
}

async function loadReviewHistory() {

    const historyList =
        document.getElementById("historyList");

    const history =
        await getUserReviews();

    if (history.length === 0) {
        historyList.innerHTML =
            "<p>No reviews yet.</p>";
        return;
    }

    historyList.innerHTML = history.map(review => `
    <div class="history-item" data-id="${review._id}">

        <div>
            
        <span class="language-badge">
    ${(review.language || "text").toUpperCase()}
</span>

            <p>
    Score:
    <span class="score-badge">
        ${review.score}/10
    </span>
</p>

            <small>${review.createdAt}</small>
        </div>

        <button class="delete-review-btn" data-id="${review._id}">
            🗑️
        </button>

    </div>
`).join("");

document.querySelectorAll(".delete-review-btn").forEach(button => {

    button.addEventListener("click", async (event) => {

        event.stopPropagation();

        const reviewId = button.dataset.id;

        try {

            const response = await fetch(
                `https://logiccraft-ai.onrender.com/api/reviews/${reviewId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to delete review"
                );
            }

            loadReviewHistory();

        } catch (error) {

            console.error("Delete error:", error);
            alert(error.message);

        }

    });

});

    document.querySelectorAll(".history-item").forEach(item => {

    item.addEventListener("click", () => {

        const reviewId = item.dataset.id;

        const selectedReview =
            history.find(review => review._id === reviewId);

        if (!selectedReview) return;

        resultBox.innerHTML = `

            <h3>Analysis Complete ✅</h3>

            <div class="ai-response-content">

                <div class="score">
                    <strong>Score:</strong> ${selectedReview.score}/10
                </div>

                <h4>❌ Issues Found</h4>

                <ul>
                    ${selectedReview.issues.map(issue =>
                        `<li>${issue}</li>`
                    ).join("")}
                </ul>

                <h4>💡 Suggestions</h4>

                <ul>
                    ${selectedReview.suggestions.map(suggestion =>
                        `<li>${suggestion}</li>`
                    ).join("")}
                </ul>

            </div>

            <h4>✅ Corrected Code</h4>

            <pre id="correctedCode"></pre>

        `;

        document.getElementById("correctedCode").textContent =
            selectedReview.correctedCode;

    });

});

}

loadReviewHistory();



// ===============================
// CLEAR REVIEW HISTORY
// ===============================

const clearHistoryBtn =
    document.getElementById("clearHistoryBtn");

clearHistoryBtn.addEventListener("click", async () => {

    const user = JSON.parse(
        localStorage.getItem("logiccraftUser")
    );

    if (!user || !user.googleId) {
        alert("User not found");
        return;
    }

    const confirmClear =
        confirm("Are you sure you want to clear all review history?");

    if (!confirmClear) {
        return;
    }

    try {

        const response = await fetch(
           `https://logiccraft-ai.onrender.com/api/reviews/user/${user.googleId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to clear history"
            );
        }

        await loadReviewHistory();

        alert("Review history cleared successfully");

    } catch (error) {

        console.error("Clear history error:", error);
        alert(error.message);

    }

});

// ===============================
// LOAD USER PROFILE
// ===============================

const user = JSON.parse(localStorage.getItem("logiccraftUser"));

console.log("Logged in user:", user);

const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");

if (user) {
    userName.textContent = user.name || "Welcome";
    userPhoto.src = user.photo || "https://via.placeholder.com/40";
}

// ===============================
// LOGOUT
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("logicCraftUser");
            window.location.href = "index.html";
        });
    }

});
