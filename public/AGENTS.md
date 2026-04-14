# Project AI Build Rules

This project uses a cost-first AI architecture.

## Main rule

Use HTML, CSS, and JavaScript first.  
Use AI only when deterministic code cannot do the job well.

## AI is allowed only for

- image understanding
- OCR-like extraction from messy images
- unstructured text extraction
- summarization
- rewriting
- classification
- reasoning across messy or variable input
- flexible recommendations

## AI must NOT be used for

- fixed calculations
- totals
- filtering
- sorting
- searching fixed local data
- validation
- layouts
- PDF export
- simple parsing when regex or JavaScript can do it reliably
- UI behavior
- static business rules

## Backend architecture

- One shared Cloudflare Worker named ai-core
- One shared Gemini API key stored only in Worker secrets
- One shared KV namespace binding named USAGE
- Reuse the same Worker for multiple AI tools using separate endpoints
- Do not create a new Worker for each tool unless clearly required

## Current AI provider

- Gemini 2.5 Flash-Lite

## Current Worker endpoints

- /receipt for image receipt extraction
- /text for general text tools

## Cost control rules

- Always keep daily free limits active
- Always keep file size limits active for uploads
- Compress images in the browser before upload
- Keep prompts short and strict
- Request JSON-only output when possible
- Never send unnecessary data to AI
- Never store uploaded files unless explicitly required
- Never expose API keys in frontend code

## Implementation rule for every new tool

### Step 1
Check if normal code can solve the problem

### Step 2
If normal code cannot solve it well, reuse ai-core

### Step 3
Add a new endpoint only if needed

### Step 4
Keep prompt short, strict, and structured

### Step 5
Return clean JSON whenever possible

## UI rule

- Make tools look simple, clean, and fast
- Show loading state
- Show user-friendly error messages
- Show result in cards, not raw JSON
- Add reset button
- Add copy button when useful

## Before building any new AI tool, always explain

- what part is normal code
- what part is AI
- why AI is necessary
- how cost is being controlled
