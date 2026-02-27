# Tour Go — Travel Place Intelligence Bot

AI-powered travel discovery engine. Search any city, region, or country and get a structured list of famous and underrated places with **exact GPS coordinates**.

## 🚀 Setup

### 1. Get a Gemini API Key (Free)
Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free API key.

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY
```

### 3. Install & Run
```bash
npm install
npm run dev
```
The app runs at `http://localhost:3000`.

## 🐛 Bugs Fixed (v1 → v2)

| # | Bug | Fix |
|---|-----|-----|
| 1 | Wrong model name `gemini-3-flash-preview` (non-existent) | Changed to `gemini-2.0-flash` |
| 2 | `Modality` imported but never used | Removed unused import |
| 3 | `tools: [{ googleSearch: {} }]` conflicts with `responseMimeType: "application/json"` | Removed conflicting tool config; model uses built-in knowledge with low temperature for accuracy |
| 4 | `process.env.GEMINI_API_KEY` check in React `useEffect` — always triggers error at runtime since Vite injects it at build time | Moved to module-level `const API_KEY_CONFIGURED` check |
| 5 | `toFixed()` called on potentially non-numeric latitude/longitude if AI returns strings | Wrapped in `Number()` cast + added sanitization in service layer |
| 6 | Filter state not reset on new search — old filter could hide all new results | Added `setFilter('all')` on each new search |
| 7 | Stale data shown during new search | Added `setData(null)` before new request |
| 8 | No error UI — errors only logged, no visual feedback | Added styled error banner with `AlertCircle` icon |
| 9 | Coordinate precision only 4 decimal places (~11m accuracy) in display | Now shows 6 decimal places (~0.1m accuracy) |
| 10 | Prompt allowed "intelligent inference" of coordinates (i.e., guessing) | Prompt now demands verified coordinates and explains the standard with an example |
| 11 | Button disabled state missing `cursor-not-allowed` | Added proper disabled cursor styling |
| 12 | Animation delay unbounded — 30+ cards create 1.5s+ delay for last card | Capped animation delay at 0.6s max |

## 📁 Project Structure
```
src/
  App.tsx              # Main UI component
  services/
    gemini.ts          # Gemini API integration + data validation
  index.css            # Tailwind v4 theme + glass utilities
main.tsx               # React entry point
```

## 🔑 How API Key Works
The key is injected by Vite at build/dev time via `vite.config.ts`:
```ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```
This means the `.env` file is read at **server start** — restart `npm run dev` after changing it.
