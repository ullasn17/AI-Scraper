# SchemeSathi AI — AI-Powered Indian Government Scheme Discovery Platform

**SchemeSathi AI** is a production-oriented, full-stack citizen welfare discovery platform that automatically indexes government schemes from authorized official websites, structures and verifies information using **Groq AI**, stores data in **MongoDB Atlas**, and empowers Indian citizens to discover schemes through keyword search, eligibility matching, and a natural-language RAG chatbot.

---

## 🌟 Key Features

### 1. Dual-Mode Conversational AI Assistant
- **Mode A (General-Purpose Assistant):** Answers general inquiries (e.g., explaining AI, drafting application letters, computer science, general educational queries) with conversational context.
- **Mode B (Scheme Advisory with RAG):** Automatically classifies citizen intent, queries verified scheme records from MongoDB, grounds answers strictly in official rules, and returns citations with official government portal links.
- **Floating Global Widget & Dedicated `/assistant` Page:** Citizens can chat across the entire site or use the full-screen desktop interface.

### 2. Scheme Directory & Search Engine (`/schemes`)
- Multi-faceted filtering by **Category** (Education, Agriculture, Health, Housing, etc.), **Jurisdiction** (Central vs. State Government), and **Specific States** (Karnataka, Maharashtra, etc.).
- Full-text search on scheme names, ministries, and benefit summaries.
- List and Grid view toggles, URL sharing, and authenticated citizen bookmarking.

### 3. Detailed Verification Pages (`/schemes/[slug]`)
- Displays official benefits, eligibility criteria, income/age ceilings, required documents, sequential application steps, and nodal ministry names.
- Direct links to official government application portals and audit timestamps with SHA-256 content hashes.

### 4. Zero-Knowledge Citizen Eligibility Checker (`/eligibility`)
- Transparent assessment based on domicile, age, education, occupation, and approximate family income.
- **Strict Privacy Assurance:** **Never** asks for Aadhaar numbers, bank account numbers, passwords, or OTPs.
- Categorizes results into **Likely Match**, **Potential Match**, or **Unlikely Match** with human-readable rationale.

### 5. Authorized Node.js Web Scraping & PDF Extraction Engine
- **100% Node.js / TypeScript**: Built using `native fetch`, `Cheerio`, `pdf-parse`, and `Zod`. **Zero Python code**.
- **SSRF & Security Guardrails**: Blocks loopback (`127.0.0.1`, `localhost`), RFC 1918 private subnets, cloud metadata endpoints (`169.254.169.254`), and strictly enforces domain allowlists.
- **Automated Deduplication**: SHA-256 content hashing prevents redundant AI calls and preserves previous versions in `SchemeVersion`.

### 6. Operational Admin Dashboard (`/admin`)
- Live database metrics: Total schemes, verified schemes, pending review, active crawlers, crawl job logs.
- Manage authorized source registry (add, edit, disable government sources).
- Manual on-demand crawler triggering with live inspection of crawl audit logs.
- Verification approval queue for newly extracted schemes.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js App Router (v16+), React 19, TypeScript |
| **Styling** | Tailwind CSS, Lucide React Icons |
| **Backend** | Next.js Route Handlers (`force-dynamic`) |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **AI Inference** | Groq SDK (`openai/gpt-oss-120b` / `qwen/qwen3.8-27b`) |
| **Web Scraping** | Node.js `fetch`, Cheerio, `pdf-parse`, Zod |
| **Security** | SSRF Validator, Sliding-Window Rate Limiter, `jose` JWTs, `bcryptjs` |
| **Testing** | Vitest |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v20.x or v22.x+ (tested on v24.18.0)
- **npm**: v10+
- **MongoDB Atlas** or local MongoDB instance
- **Groq API Key** (from [console.groq.com](https://console.groq.com))

### 2. Environment Variables Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the required keys in `.env.local`:
```env
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
AUTH_SECRET=your_super_secret_auth_key_2026
ADMIN_EMAIL=admin@schemesathi.gov.in
SCRAPER_USER_AGENT=SchemeSathiBot/1.0 (+https://schemesathi.gov.in/bot)
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed the Database
Populate flagship Central and Karnataka government schemes, approved sources, and the default admin account:
```bash
npm run seed
```
> **Default Admin Account:**
> - Email: `admin@schemesathi.gov.in`
> - Password: `Admin@SchemeSathi2026!`

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Running Crawler & Background Worker

### Option A: Trigger Crawl via Admin UI
1. Sign in with the administrator account at [http://localhost:3000/login](http://localhost:3000/login).
2. Go to [http://localhost:3000/admin](http://localhost:3000/admin).
3. Click **"Run Crawler Now"** or select a specific source from the **Source Registry** tab.

### Option B: On-Demand Crawl via Terminal
Execute a direct crawl on an approved URL using the CLI runner:
```bash
npm run crawl:once https://www.myscheme.gov.in/
```

### Option C: Persistent Scheduled Background Worker
In a separate terminal, launch the scheduler:
```bash
npm run worker
```
The scheduler checks approved sources at configured intervals (e.g., every 24 hours) and updates scheme records without blocking web traffic.

---

## 🧪 Running Automated Tests

Run the Vitest test suite covering SSRF validation, deduplication, and schema parsing:
```bash
npm test
```

Build the production bundle and type-check:
```bash
npm run build
```

---

## 🛡️ Security & Scraping Compliance

1. **SSRF Guardrails**: The URL validator (`src/lib/security/urlValidator.ts`) rejects private IP subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`), metadata services (`169.254.169.254`), and non-HTTP protocols.
2. **Citizen Privacy**: The platform does not request, log, or persist sensitive personal information (Aadhaar, OTPs, or bank passwords).
3. **Official Disclaimer**: All eligibility calculations are informational. Respective government departments remain the sole adjudicating authorities for benefit disbursements.
