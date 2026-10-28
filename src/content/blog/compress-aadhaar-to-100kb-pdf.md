---
title: "How to Compress an Aadhaar Card to a 100KB PDF (Step by Step)"
description: "Aadhaar and PAN portals reject PDFs over 100KB or 200KB. Here's the exact workflow to hit the limit without losing readable text on the scan."
publishedAt: 2026-01-20
author: "PixelKit"
tags: ["aadhaar", "pdf", "compression"]
relatedCombos: ["jpg-to-pdf-under-100kb", "png-to-pdf-under-100kb", "compress-pdf", "compress-image-to-100kb"]
draft: false
---

If you've tried to upload an Aadhaar scan to UIDAI, an income-tax portal, or a bank KYC form, you've probably hit this: **"Maximum file size 100KB"** or **"PDF must be under 200KB."** A phone-camera photo of your Aadhaar is usually 2–8 MB — twenty to eighty times over the limit.

Here's the fastest way to fix it, without losing readable text on the scan.

## Why Aadhaar PDFs end up so large

Three reasons:

1. **You photographed, not scanned.** A modern phone camera produces 12–48 MP images. A scanner produces 2–3 MP. The camera shot is 20× larger for the same amount of information.
2. **Camera apps save JPEG at very high quality.** Around 0.92–0.95 on the JPEG scale, versus 0.7–0.8 for a scanned PDF.
3. **The PDF wrapper adds overhead.** Every image embedded in a PDF carries stream headers and metadata. On a small PDF this can be a few KB; on a large one it's a rounding error.

The good news: Aadhaar is mostly text on a plain background. That compresses extremely well — as long as you use the right technique.

## The right technique: JPG inside a PDF, not PNG

If your PDF tool embeds a **PNG** image, the file will be large no matter what quality slider you use, because PNG is lossless. The file size grows with image dimensions, not with a quality slider.

The fix is to embed a **JPG** image inside the PDF, at a quality you control. This is what PixelKit's PDF engine does: it converts your Aadhaar scan to a JPG with the binary-search compression loop, then wraps that JPG in a PDF using jsPDF.

The result: a PDF that is 100KB (or whatever target you set), with a scan that is still readable at 100% zoom.

## Step by step

1. Open [PixelKit's JPG to PDF under 100KB tool](/jpg-to-pdf-under-100kb).
2. Drop your Aadhaar scan (JPG, PNG, HEIC — any common image format).
3. The tool converts it to a JPG targeting *slightly under* 100KB (about 97KB, leaving room for the PDF wrapper), then wraps it into a PDF.
4. Download the PDF. It's a standard, single-page PDF that every portal accepts.

If your portal asks for 200KB, use the [JPG to PDF under 200KB tool](/jpg-to-pdf-under-200kb) — same workflow, larger target.

## Quality tips for readable text

- **Crop tight.** Crop to just the Aadhaar card, not the desk around it. This alone often halves the file size.
- **Shoot from directly above, flat.** Perspective skew makes text harder to compress cleanly, because the JPEG encoder has to preserve the warped edges.
- **Use soft, even light.** Shadows on the card force the encoder to spend bits reproducing the shadow gradient instead of the text.
- **Avoid the flash.** Direct flash creates specular highlights on the card's glossy surface that are hard to compress and hard to read.

The pipeline above usually keeps a 12-digit Aadhaar number and the address block perfectly readable at 100KB. If your portal accepts 200KB, use the 200KB target for extra safety — the scan will be near-perfect.

## What if the portal rejects PDF and asks for JPG?

Some portals flip between "PDF required" and "JPG required" depending on the form step. If yours asks for JPG, use [Compress Image to 100KB](/compress-image-to-100kb) — same compression engine, JPG output.

## One thing to double-check before you submit

Some KYC portals check the **number of pages** as well as the size. Make sure your PDF has exactly the pages the portal asks for — usually one, sometimes two (front and back of the card). PixelKit's PDF tool embeds each image you drop as one page, so drop one file for one page, two for two.

Related reading: [Why portals reject 200KB photos](/blog/why-portals-reject-200kb-photos) · [iPhone HEIC explained](/blog/iphone-heic-explained)
