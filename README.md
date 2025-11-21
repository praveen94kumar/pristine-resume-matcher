# Pristine Technologies – Resume Matcher (AI Based)

A 100% static, client-side web app for HR resume screening. Upload a job description and multiple resumes (.pdf, .txt, .docx), extract text in-browser, and use Google Gemini to generate match scores, keywords, and recommendations. Runs instantly on GitHub Pages — no build tools and no frameworks.

---

## Features

- **Job description input:** Manual textarea or upload `.txt` / `.pdf` (PDF text extraction in browser).
- **Multiple resumes upload:** Supports `.pdf`, `.txt`, `.docx` (DOCX extraction via Mammoth.js, PDF via PDF.js).
- **AI matching:** Uses Google Gemini JS SDK (`gemini-2.0-flash`) to produce:
  - Match Score (0–100)
  - Matched Keywords
  - Missing Keywords
  - Short Summary
  - Overall Fit Recommendation
- **Results dashboard:** Table view with per-candidate score, keywords, summary, recommendation, and a “View Resume” modal.
- **Export shortlist:** One-click CSV export.
- **UI:** Clean, professional HR look, mobile-friendly, Pristine brand colors.

---

## Files

- `index.html` — App markup and library CDNs (PDF.js, Mammoth.js)
- `style.css` — Brand styling and responsive layout
- `script.js` — In-browser file parsing and Gemini AI matching
- `assets/logo.png` — Base64 PNG logo
- `README.md` — Deployment and usage instructions

---

## Deployment on GitHub Pages

1. **Create a new repository** on GitHub (e.g., `pristine-resume-matcher`).
2. **Add the files**:
   - Drag-and-drop or upload `index.html`, `style.css`, `script.js`, `README.md`, and the `assets/logo.png` file (create the `assets` folder).
   - Ensure the folder structure matches exactly.
3. **Enable GitHub Pages**:
   - Go to Settings → Pages.
   - Under “Build and deployment”, set **Source** to “Deploy from a branch”.
   - Choose the `main` (or `master`) branch, and **root** folder.
   - Save. GitHub Pages will provide a URL (e.g., `https://<username>.github.io/pristine-resume-matcher/`).
4. **Wait for deployment** (usually <1 minute). Open your Pages URL to use the app.

---

## Usage

- **Add your Gemini API key** in the top-right input and click **Save**. The key is stored in your browser’s local storage for convenience.
- **Enter the job description** via the textarea or upload a `.txt`/`.pdf` file and click **Load JD from file**.
- **Upload resumes** (`.pdf`, `.txt`, `.docx`) using the file input. Click **Process and match** to run AI matching.
- **Review results** in the dashboard. Click **View resume** to read the full extracted text in a modal.
- **Export shortlist** as CSV using the button above the table.

---

## Notes

- This app is **entirely client-side**. Your uploaded documents are processed in your browser; calls to Gemini happen directly from the client using your API key.
- PDF extraction uses **PDF.js** and DOCX extraction uses **Mammoth.js** via public CDNs.
- If the AI response cannot be parsed, the app performs a **fallback local keyword overlap** to still provide a score and basic summary.

---

## Security and privacy

- Your Gemini API key is stored **locally in your browser** using `localStorage`. You can clear it by removing site data or clicking “Save” with an empty value.
- Documents are not uploaded to any server by this app. They are parsed locally, but using the AI model will send relevant text to Google’s API as part of the prompt.

---

## Troubleshooting

- **Blank results or errors:** Ensure your API key is valid and that your browser/network allows requests to Google’s Generative AI endpoints.
- **PDF/DOCX parsing issues:** Try re-saving the file, or ensure it’s not scanned-only without embedded text. This app extracts text from text-based PDFs; scanned images won’t yield text.
- **Mobile layout:** The app is responsive, but large tables are best viewed on desktop.

---

## Brand colors

- Primary Gold: `#B9A121`
- Secondary Maroon: `#A22C29`
- Accent Mustard: `#C7AC2A`
- Text Dark: `#3C3C3C`
- Background: `#FFFFFF`

---

