const notesInput     = document.getElementById("notes");
const wordCount      = document.getElementById("wordCount");
const wordsStat      = document.getElementById("wordsStat");
const sentencesStat  = document.getElementById("sentencesStat");
const readTimeStat   = document.getElementById("readTimeStat");
const result         = document.getElementById("result");
const clearBtn       = document.getElementById("clearBtn");
const generateBtn    = document.getElementById("generateBtn");
const generateLabel  = document.getElementById("generateBtnLabel");
const resultBadge    = document.getElementById("resultBadge");
const copyBtn        = document.getElementById("copyBtn");
const modeButtons    = document.querySelectorAll(".mode-btn");
const sampleButtons  = document.querySelectorAll(".sample-btn");

let currentMode = "summary";

/* ===== SAMPLE TEXTS ===== */
const sampleTexts = {
  sample:  "Photosynthesis is the process by which plants make their own food using sunlight, water, and carbon dioxide. It usually happens in the leaves where chlorophyll captures sunlight energy.",
  biology: "The cell is the basic unit of life. It contains organelles that perform specific functions. The nucleus controls the activities of the cell, while the mitochondria produce energy.",
  history: "The Philippine Revolution began in 1896 after the discovery of the Katipunan. Andres Bonifacio led the early resistance, and Emilio Aguinaldo later became a major leader of the revolution."
};

/* ===== STATS ===== */
function updateStats() {
  const text  = notesInput.value.trim();
  const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
  const sents = text ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;

  let readTime;
  if (words === 0) {
    readTime = "—";
  } else {
    const secs = Math.round((words / 200) * 60);
    readTime   = secs < 60 ? secs + "s" : "~" + Math.ceil(secs / 60) + "m";
  }

  wordCount.textContent     = words + " words";
  wordsStat.textContent     = words;
  sentencesStat.textContent = sents;
  readTimeStat.textContent  = readTime;
}

notesInput.addEventListener("input", updateStats);

/* ===== CLEAR ===== */
clearBtn.addEventListener("click", () => {
  notesInput.value = "";
  updateStats();
  showEmpty();
});

/* ===== MODE SWITCHING ===== */
const modeConfig = {
  summary:  { label: "Generate Summary", icon: "✦", badge: "Summary",  btnClass: "",           activeClass: "active"        },
  quiz:     { label: "Make Quiz",         icon: "⚡", badge: "Quiz",     btnClass: "quiz-mode",  activeClass: "active-quiz"   },
  keyterms: { label: "Extract Key Terms", icon: "🏷", badge: "Key Terms",btnClass: "terms-mode", activeClass: "active-terms"  }
};

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentMode = btn.dataset.mode;

    // update tab styles
    modeButtons.forEach(b => b.className = "mode-btn");
    btn.classList.add(modeConfig[currentMode].activeClass);

    // update generate button
    const cfg = modeConfig[currentMode];
    generateLabel.textContent     = cfg.label;
    generateBtn.querySelector(".btn-icon").textContent = cfg.icon;
    generateBtn.className         = "primary-btn " + cfg.btnClass;

    // update result badge
    resultBadge.textContent = cfg.badge;
    resultBadge.className   = "result-badge" +
      (currentMode === "quiz"     ? " quiz-badge"  :
       currentMode === "keyterms" ? " terms-badge" : "");
  });
});

/* ===== SAMPLE BUTTONS ===== */
sampleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    notesInput.value = sampleTexts[btn.dataset.sample] || "";
    updateStats();
  });
});

/* ===== COPY BUTTON ===== */
copyBtn.addEventListener("click", () => {
  const text = result.innerText;
  if (!text || result.classList.contains("result-empty")) return;

  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "✓";
    setTimeout(() => copyBtn.textContent = "⎘", 1500);
  });
});

/* ===== RESULT HELPERS ===== */
function showEmpty() {
  result.className = "result-empty";
  result.innerHTML = `<span class="empty-icon">◈</span><span>Your output will appear here...</span>`;
}

function showLoading() {
  result.className = "";
  result.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;
}

function showText(text) {
  result.className = "";
  result.innerHTML = `<div class="result-text">${text}</div>`;
}

function showError(msg) {
  result.className = "";
  result.innerHTML = `<div class="result-text" style="color:var(--accent3)">${msg}</div>`;
}

/* ===== GENERATE ===== */
generateBtn.addEventListener("click", async () => {
  const notes = notesInput.value.trim();

  if (!notes) {
    showError("Please enter your notes first.");
    return;
  }

  showLoading();

  try {
    const response = await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, mode: currentMode })
    });

    const data = await response.json();

    if (!data.reply) {
      showError("No result generated. Please try again.");
      return;
    }

    if (currentMode === "quiz") {
      renderQuiz(data.reply);
    } else if (currentMode === "keyterms") {
      renderTerms(data.reply);
    } else {
      showText(data.reply);
    }

  } catch (error) {
    console.error(error);
    showError("Failed to connect to the server. Please try again.");
  }
});

/* ===== QUIZ RENDERER ===== */
function renderQuiz(raw) {
  let questions;
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    questions = JSON.parse(clean);
  } catch {
    showText(raw);
    return;
  }

  const html = `
    <div class="quiz-container">
      ${questions.map((q, qi) => `
        <div class="quiz-q">
          <div class="q-text">${qi + 1}. ${q.q}</div>
          <div class="quiz-options">
            ${q.options.map((opt, oi) => `
              <button class="quiz-option"
                onclick="checkAnswer(this, ${oi}, ${q.answer})">
                ${opt}
              </button>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>`;

  result.className = "";
  result.innerHTML = html;
}

/* ===== KEY TERMS RENDERER ===== */
function renderTerms(raw) {
  let terms;
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    terms = JSON.parse(clean);
  } catch {
    showText(raw);
    return;
  }

  result.className = "";
  result.innerHTML = `
    <div class="terms-grid">
      ${terms.map(t => `<span class="term-chip">${t}</span>`).join("")}
    </div>`;
}

/* ===== QUIZ ANSWER CHECK ===== */
function checkAnswer(btn, selected, correct) {
  const options = btn.closest(".quiz-options").querySelectorAll(".quiz-option");
  options.forEach((b, i) => {
    b.style.pointerEvents = "none";
    if (i === correct) b.classList.add("correct");
    else if (i === selected) b.classList.add("wrong");
  });
}

/* ===== INIT ===== */
updateStats();