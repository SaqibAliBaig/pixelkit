# PixelKit

Fast, private, client-side file converter & compressor.
Convert HEIC / PNG / JPG / WEBP / PDF and hit exact KB targets — all in the browser.

## Why

- **Fast**: Astro static HTML, zero JS on the critical path, Web Worker conversion.
- **Private**: Files never leave the device. No uploads, no server.
- **Cheap**: Free hosting on Cloudflare Pages. ~$1/mo total.

## Stack

| Layer       | Choice                          |
| ----------- | ------------------------------- |
| Framework   | Astro (static, islands)         |
| Styling     | Tailwind CSS                    |
| Hosting     | Cloudflare Pages                |
| Converter   | Vanilla TS + Web Worker         |
| Libraries   | heic2any, jsPDF, UPNG.js (lazy) |
| Analytics   | Cloudflare Web Analytics        |

## Getting started

```bash
nvm use            # Node 20.11.1
npm install
npm run gen:data   # generates src/data/combinations.json
npm run dev        # http://localhost:4321