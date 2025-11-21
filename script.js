// Pristine Technologies – Resume Matcher (AI Based)
// Client-only, static web app. Uses PDF.js + Mammoth.js for text extraction and Gemini SDK for AI matching.

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Brand-safe logging
const log = (...args) => console.log("[Pristine Matcher]", ...args);

// Elements
const apiKeyInput = document.getElementById("apiKey");
const saveKeyBtn = document.getElementById("saveKeyBtn");

const jobDescriptionTextarea = document.getElementById("jobDescription");
const jdFileInput = document.getElementById("jdFile");
const loadJdBtn = document.getElementById("loadJdBtn");

const resumeFilesInput = document.getElementById("resumeFiles");
const processResumesBtn = document.getElementById("processResumesBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const uploadStatus = document.getElementById("uploadStatus");

const resultsBody = document.getElementById("resultsBody");
const exportCsvBtn = document.getElementById("exportCsvBtn");

// Modal
const resumeModal = document.getElementById("resumeModal");
const resumeModalText = document.getElementById("resumeModalText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCloseFooterBtn = document.getElementById("modalCloseFooterBtn");

// State
let resumes = []; // [{name, text, size, type}]
let shortlistRows = []; // store rows for CSV export
let genAI = null;
let model = null;

// Initialize API key from localStorage
(function init() {
  const stored = localStorage.getItem("pristine_gemini_key");
  if (stored) {
    apiKeyInput.value = stored;
    setupGemini(stored);
  }
})();

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert("Please enter your Google Gemini API key.");
    return;
  }
  localStorage.setItem("pristine_gemini_key", key);
  setupGemini(key);
  alert("API key saved locally.");
});

function setupGemini(key) {
  try {
    genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    log("Gemini SDK initialized.");
  } catch (err) {
    console.error(err);
    alert("Failed to initialize Gemini SDK. Please verify your API key.");
  }
}

/**
 * Read text from a .txt file
 */
async function readTxt(file) {
  return await file.text();
}

/**
 * Extract text from a PDF using PDF.js
 */
async function readPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    text += strings.join(" ") + "\n";
  }
  return text.trim();
}

/**
 * Extract text from a DOCX using Mammoth.js
 */
async function readDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Read JD file (.txt or .pdf) and place into textarea
 */
loadJdBtn.addEventListener("click", async () => {
  const file = jdFileInput.files?.[0];
  if (!file) {
    alert("Please select a JD file (.txt or .pdf).");
    return;
  }
  try {
    let text = "";
    if (file.name.toLowerCase().endsWith(".txt")) {
      text = await readTxt(file);
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      text = await readPdf(file);
    } else {
      alert("Unsupported JD file type. Please upload .txt or .pdf.");
      return;
    }
    jobDescriptionTextarea.value = text;
    alert("Job description loaded from file.");
  } catch (err) {
    console.error(err);
    alert("Failed to read JD file.");
  }
});

/**
 * Process resumes from file input
 */
processResumesBtn.addEventListener("click", async () => {
  shortlistRows = [];
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Please enter your Gemini API key.");
    return;
  }
  if (!model) setupGemini(apiKey);

  const jdText = jobDescriptionTextarea.value.trim();
  if (!jdText) {
    alert("Please provide the job description (textarea or upload file).");
    return;
  }

  const files = Array.from(resumeFilesInput.files || []);
  if (!files.length) {
    alert("Please upload at least one resume (.pdf, .txt, .docx).");
    return;
  }

  uploadStatus.textContent = "Reading and extracting text from resumes...";
  resumes = [];

  for (const file of files) {
    try {
      let text = "";
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".txt")) {
        text = await readTxt(file);
      } else if (lower.endsWith(".pdf")) {
        text = await readPdf(file);
      } else if (lower.endsWith(".docx")) {
        text = await readDocx(file);
      } else {
        console.warn(`Unsupported file skipped: ${file.name}`);
        continue;
      }
      resumes.push({
        name: file.name,
        text: cleanText(text),
        size: file.size,
        type: file.type || guessMime(file.name),
      });
    } catch (err) {
      console.error("Error reading resume:", file.name, err);
    }
  }

  if (!resumes.length) {
    uploadStatus.textContent = "No valid resumes processed.";
    return;
  }

  uploadStatus.textContent = `Processed ${resumes.length} resume(s). Matching with AI...`;
  await runMatching(jdText, resumes);
  uploadStatus.textContent = "Matching complete.";
  exportCsvBtn.disabled = false;
});

/**
 * Clear all data
 */
clearAllBtn.addEventListener("click", () => {
  jobDescriptionTextarea.value = "";
  jdFileInput.value = "";
  resumeFilesInput.value = "";
  resumes = [];
  shortlistRows = [];
  resultsBody.innerHTML = "";
  exportCsvBtn.disabled = true;
  uploadStatus.textContent = "";
});

/**
 * Clean text (basic normalization)
 */
function cleanText(text) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

/**
 * Guess MIME type by extension
 */
function guessMime(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

/**
 * AI Matching with Gemini – expects structured JSON response
 */
async function runMatching(jdText, resumeList) {
  resultsBody.innerHTML = "";
  for (const resume of resumeList) {
    const prompt = buildPrompt(jdText, resume.text);
    try {
      const response = await model.generateContent(prompt);
      const text = await response.response.text();
      const parsed = safeJsonParse(text);

      const score = clamp(Number(parsed?.matchScore ?? 0), 0, 100);
      const matchedKeywords = arrayFrom(parsed?.matchedKeywords);
      const missingKeywords = arrayFrom(parsed?.missingKeywords);
      const summary = String(parsed?.shortSummary ?? "").trim();
      const recommendation = String(parsed?.overallFit ?? "").trim();

      addResultRow({
        candidate: resume.name,
        score,
        matchedKeywords,
        missingKeywords,
        summary,
        recommendation,
        resumeText: resume.text,
      });
    } catch (err) {
      console.error("Gemini matching error:", err);
      // Fallback: simple keyword intersection (non-AI)
      const fallback = fallbackMatch(jdText, resume.text);
      addResultRow({
        candidate: resume.name,
        score: fallback.score,
        matchedKeywords: fallback.matched,
        missingKeywords: fallback.missing,
        summary: "Automatic fallback summary based on keyword overlap.",
        recommendation: fallback.score >= 60 ? "Proceed to interview" : "Hold / needs review",
        resumeText: resume.text,
      });
    }
  }
}

/**
 * Build structured prompt for Gemini
 */
function buildPrompt(jd, resumeText) {
  return `
You are an expert HR screening assistant for Pristine Technologies. Analyze the following job description and resume. Return ONLY a JSON object with these exact fields:

{
  "matchScore": number (0-100),
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "shortSummary": string,
  "overallFit": "Strong Fit" | "Moderate Fit" | "Weak Fit" | "Needs Review"
}

Focus on skills, experience, certifications, and domain keywords. Consider seniority, relevant achievements, and tech stack alignment. Avoid PII extraction.

JOB_DESCRIPTION:
${jd}

RESUME:
${resumeText}

Return strictly valid JSON with no explanations.
`;
}

/**
 * Safe JSON parse with heuristic extraction if model wraps JSON
 */
function safeJsonParse(text) {
  try {
    // Attempt direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract JSON block from mixed text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

/**
 * Fallback matching (simple keyword overlap)
 */
function fallbackMatch(jd, resume) {
  const jdTokens = tokenize(jd);
  const resTokens = tokenize(resume);
  const jdSet = new Set(jdTokens);
  const resSet = new Set(resTokens);

  const matched = [...jdSet].filter((w) => resSet.has(w));
  const missing = [...jdSet].filter((w) => !resSet.has(w));

  const score = Math.round((matched.length / Math.max(jdSet.size, 1)) * 100);
  return { score, matched, missing };
}

/**
 * Tokenize to normalized keywords
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length > 2)
    .slice(0, 400); // cap to prevent extreme lists
}

/**
 * Utilities
 */
function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
function arrayFrom(val) {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") return val.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Add result row to dashboard
 */
function addResultRow({ candidate, score, matchedKeywords, missingKeywords, summary, recommendation, resumeText }) {
  const tr = document.createElement("tr");

  const tdName = document.createElement("td");
  tdName.textContent = candidate;

  const tdScore = document.createElement("td");
  const scoreBadge = document.createElement("span");
  scoreBadge.className = "score-badge";
  scoreBadge.textContent = `${score}`;
  tdScore.appendChild(scoreBadge);

  const tdMatched = document.createElement("td");
  tdMatched.textContent = matchedKeywords.slice(0, 30).join(", ");

  const tdMissing = document.createElement("td");
  tdMissing.textContent = missingKeywords.slice(0, 30).join(", ");

  const tdSummary = document.createElement("td");
  tdSummary.textContent = summary;

  const tdRec = document.createElement("td");
  tdRec.textContent = recommendation;

  const tdActions = document.createElement("td");
  const viewBtn = document.createElement("button");
  viewBtn.className = "btn btn-outline";
  viewBtn.textContent = "View resume";
  viewBtn.addEventListener("click", () => openResumeModal(candidate, resumeText));
  tdActions.appendChild(viewBtn);

  tr.appendChild(tdName);
  tr.appendChild(tdScore);
  tr.appendChild(tdMatched);
  tr.appendChild(tdMissing);
  tr.appendChild(tdSummary);
  tr.appendChild(tdRec);
  tr.appendChild(tdActions);

  resultsBody.appendChild(tr);

  shortlistRows.push({
    Candidate: candidate,
    Score: score,
    Matched_Keywords: matchedKeywords.join(" | "),
    Missing_Keywords: missingKeywords.join(" | "),
    Summary: summary,
    Recommendation: recommendation,
  });
}

/**
 * Modal handlers
 */
function openResumeModal(name, text) {
  resumeModalText.textContent = text;
  document.getElementById("resumeModalTitle").textContent = `Resume viewer – ${name}`;
  resumeModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  resumeModal.setAttribute("aria-hidden", "true");
}

modalCloseBtn.addEventListener("click", closeModal);
modalCloseFooterBtn.addEventListener("click", closeModal);
resumeModal.addEventListener("click", (e) => {
  // Click backdrop to close
  if (e.target.classList.contains("modal-backdrop")) {
    closeModal();
  }
});

/**
 * Export shortlist to CSV
 */
exportCsvBtn.addEventListener("click", () => {
  if (!shortlistRows.length) {
    alert("No shortlist data to export.");
    return;
  }
  const headers = Object.keys(shortlistRows[0]);
  const lines = [headers.join(",")];
  for (const row of shortlistRows) {
    const values = headers.map((h) => csvEscape(row[h]));
    lines.push(values.join(","));
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pristine_resume_shortlist.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function csvEscape(value) {
  const v = String(value ?? "");
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
