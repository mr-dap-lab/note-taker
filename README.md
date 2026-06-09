# 🎙️ My Hurdles — AI Meeting Recorder & Note Taker

> Record, transcribe, summarize, and archive your meetings — with an AI layer that does the heavy lifting so you can focus on the conversation.

**My Hurdles** is a full-featured, browser-based meeting recorder built for teams and professionals who need more than just a transcript. It records audio, transcribes it via Gemini AI, extracts keywords and smart summaries, organizes everything into searchable archives, and syncs to Google Drive — all from a clean, collapsible sidebar UI with dark mode support.

---

## ✨ Features

### 🎤 Recording & Transcription
- One-click audio recording with live duration display
- Automatic AI transcription via Gemini on recording completion
- Smart keyword extraction from transcripts
- Multi-language recording support
- Auto-associate recordings with scheduled calendar meeting titles

### 📋 Meeting Archives (History)
- Full searchable recording library — filter by title, note content, or date range
- Quick-select date presets (today, this week, this month, custom range)
- Folder organization for grouping related recordings
- Bulk delete with confirmation
- Share a playlist of recordings via encoded URL (read-only mode for recipients)

### 📊 Category Insights
- Visual analytics dashboard built on your recording history
- Charts and breakdowns by folder, date, duration, and keyword frequency
- Filterable by the same date ranges as the archive view

### 🤝 Integrations
- **Google Drive:** auto-upload recordings, transcriptions, and meeting minutes as `.txt` files
- **Google Auth:** sign in with Google to unlock integrations and cloud sync
- **Calendar:** auto-match recording titles to scheduled meeting names
- **Browser Notifications:** alerts for transcription completion and Drive sync status

### 🖥️ Meeting HUD (Companion)
- Live heads-up display for active Zoom / video meetings
- Add recordings directly from the HUD and push to history
- Available once a Google account is connected

### ⚙️ User Preferences
- Auto-save meeting minutes as `.txt` on recording completion
- Auto-upload to Google Drive toggle
- Auto-associate with calendar meeting titles toggle
- Collapsible sidebar with persistent state
- Dark / light mode toggle with persistent state

---

## 🛠️ Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (98.6%) |
| Framework | React 18 |
| AI | Google Gemini API (transcription + keyword extraction) |
| Storage | IndexedDB (audio blobs) + localStorage (metadata, preferences, session) |
| Auth | Google Auth (Firebase) |
| Cloud Sync | Google Drive API |
| Icons | Lucide React |
| Build | Vite |
| Scaffold | Google AI Studio repository template |

---

## 🚀 Run locally

**Prerequisites:** Node.js 18+

```bash
# 1. Clone the repo
git clone https://github.com/mr-dap-lab/note-taker.git
cd note-taker

# 2. Install dependencies
npm install

# 3. Set your Gemini API key
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=your_key_here

# 4. Start the dev server
npm run dev
```

> 🔑 Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

> 🔒 Google Drive and Calendar integrations require additional OAuth setup via Firebase. See `services/googleAuthService.ts` and `services/googleDriveService.ts` for configuration details.

---

## 📂 Project structure

```
note-taker/
├── components/
│   ├── AuthScreen.tsx          # Login / sign-up screen
│   ├── Recorder.tsx            # Audio recorder with live transcription state
│   ├── RecordingList.tsx       # Searchable, sortable archive list
│   ├── HistoryInsights.tsx     # Analytics dashboard
│   ├── DateRangePicker.tsx     # Date filter with presets
│   ├── Integrations.tsx        # Google Drive / Calendar settings
│   ├── MeetingCompanion.tsx    # Live meeting HUD
│   ├── WorkflowSelector.tsx    # Post-recording action picker
│   └── UserOptionsPopover.tsx  # User menu & preferences
├── services/
│   ├── aiService.ts            # Gemini transcription + keyword extraction
│   ├── storageService.ts       # localStorage read/write helpers
│   ├── dbService.ts            # IndexedDB audio blob management
│   ├── googleAuthService.ts    # Firebase Google Auth
│   ├── googleDriveService.ts   # Drive upload service
│   ├── calendarService.ts      # Calendar title matching
│   ├── notificationService.ts  # Browser push notifications
│   └── loggingService.ts       # Guest activity logging
├── migrated_prompt_history/    # Prompt engineering history
├── App.tsx                     # Root app, routing & state
├── types.ts                    # Full TypeScript type definitions
├── server.ts                   # Dev server config
├── firebase-applet-config.json # Firebase project config
└── vite.config.ts              # Build config
```

---

## 🗺️ Roadmap

- [ ] Export transcripts to PDF / DOCX
- [ ] Speaker diarization (who said what)
- [ ] Slack / Teams integration for auto-posting summaries
- [ ] Notion export for meeting notes
- [ ] AI-generated action item tracking
- [ ] Offline recording with background sync

---

## 🤝 Contributing

PRs welcome. Keep changes focused, TypeScript strict, and the build green.

## 📄 License

[MIT](./LICENSE)

---

*Built by [Diego Avella](https://github.com/mr-dap-lab) · Certified Scrum Master & Product Owner · AI product strategist.*



# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f59feede-8e55-4136-af50-4e896bcd7f9b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
