# AI Rules for This Project

## Goal

Build useful AI tools with the lowest possible cost.

## Core philosophy

AI is the last layer, not the first layer.

## Decision rule

Use AI only when one of these is true

- input is messy
- input is image-based
- input structure changes often
- rules are too flexible for normal code
- summarization or reasoning is needed
- writing quality improvement is needed

Do not use AI when one of these is true

- a formula can do it
- JavaScript can do it
- regex can do it
- local filtering can do it
- fixed business rules can do it
- HTML/CSS can do it

## Approved AI use cases

- receipt extraction from image
- invoice extraction from image
- text rewriting
- message polishing
- summary generation
- file analysis
- smart schedule suggestions
- classification of unstructured content

## Rejected AI use cases

- simple invoice calculators
- standard VAT calculators
- fixed cost formulas
- product filtering
- totals and sums
- basic reports
- ordinary PDF generators

## Security rules

- API key only in Cloudflare Worker secret
- Never place secrets in HTML
- Never place secrets in public JavaScript
- Never commit secrets to GitHub

## Cost protection rules

- Daily usage limit required
- File size limit required
- Browser compression required for image uploads
- Short prompts only
- Structured JSON output preferred
- No unnecessary history storage

## Worker structure

- Shared Worker: ai-core
- Shared usage KV binding: USAGE
- Reusable helper logic for Gemini calls
- Reusable headers and error handling

## Whenever building a new AI tool

Always answer these first

1. Why can normal code not solve this well
2. Which endpoint should be reused or added
3. What is the daily free limit
4. What is the file size limit
5. What JSON output should be returned
