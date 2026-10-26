---
title: "iPhone HEIC Explained: Why Portals Reject Your Photos (And the 10-Second Fix)"
description: "Every iPhone since iOS 11 saves photos as HEIC. Here's why that breaks most upload forms, and the fastest way to convert to JPG without uploading to a server."
publishedAt: 2026-01-25
author: "PixelKit"
tags: ["heic", "iphone", "jpg"]
relatedCombos: ["heic-to-jpg", "heic-to-jpg-under-100kb", "heic-to-jpg-under-50kb"]
draft: false
---

You take a photo on your iPhone, try to upload it to a portal, and get: **"Invalid file format."** Or worse, the portal silently accepts it but the preview is blank. Either way, the culprit is almost always **HEIC**.

## What HEIC actually is

HEIC stands for **High Efficiency Image Container**. It's a container format based on HEVC (the video codec), and Apple adopted it as the default iPhone photo format starting with iOS 11 in 2017. The idea was simple: half the file size of JPG at the same visual quality, so you can store more photos on your phone.

For Apple's ecosystem, it's great. For the rest of the web, it's a problem.

## Why portals reject HEIC

Government portals, exam forms, job applications, and most CMS upload fields were built in the 2010s and only accept **JPG**, **PNG**, or sometimes **GIF**. Their server-side validation was written before HEIC existed and has never been updated. When your iPhone photo arrives as HEIC, the portal doesn't recognize it and rejects the whole upload.

The portal isn't wrong, exactly — HEIC is not a universal web format. Chrome, Firefox, and Edge on Windows do **not** natively render HEIC. Safari on macOS does. This is why a HEIC photo looks fine on your iPhone but shows up blank on a Windows laptop.

## The three HEIC problems, solved

**Problem 1: Format.** The portal only accepts JPG. → Convert HEIC → JPG.

**Problem 2: File size.** Most portals also cap at 100KB, 200KB, or 500KB. A native HEIC photo is often 1.5–3 MB. → Compress to hit the KB target.

**Problem 3: Dimensions.** Some portals require specific dimensions (e.g. "600×600 to 1200×1200"). → Resize during conversion.

PixelKit's HEIC converter handles all three in one pass. Drop the HEIC file, set the target, and download a JPG that satisfies the portal's rules.

## The 10-second fix (no upload, no app)

1. Open [PixelKit's HEIC to JPG tool](/heic-to-jpg).
2. Drop the HEIC file into the box. It never leaves your device — PixelKit runs heic2any inside a Web Worker on your phone or laptop.
3. Download the JPG.

If the portal has a size limit, use the specific target page instead:
- [HEIC to JPG under 50KB](/heic-to-jpg-under-50kb) — exam portals, signatures
- [HEIC to JPG under 100KB](/heic-to-jpg-under-100kb) — Aadhaar, most job forms
- [HEIC to JPG under 200KB](/heic-to-jpg-under-200kb) — passport, visa

Each page targets exactly that limit. No guessing, no slider.

## Can I stop my iPhone from using HEIC?

Yes, and it's a good idea if you regularly upload photos to web forms.

On iOS 17+:

**Settings → Camera → Formats → Most Compatible**

This makes the camera save every photo as JPG going forward. It's a small hit to storage (roughly double the file size per photo) but eliminates the HEIC problem for every future upload.

If you don't want to change the setting (HEIC is genuinely better for storage), just run photos through the PixelKit HEIC converter before uploading. It's a few seconds.

## What about HEIC from other sources?

HEIC is also used by some Android phones (Samsung, Google Pixel in certain modes), by macOS screenshots (in some configs), and by the **Live Photos** feature when exported. PixelKit's HEIC converter handles all of these — it uses the same `heic2any` decoder that Apple's own libraries are based on, so anything Apple produces, PixelKit can read.

## A quick sanity check

After converting, before you upload: open the resulting JPG in your normal photo viewer and confirm the image looks correct. This catches the rare case where a Live Photo export produced a frame you didn't mean to send (usually the "key photo" rather than the frame you meant). If so, re-export from the Photos app as a still image and re-run the conversion.

Related reading: [Why portals reject 200KB photos](/blog/why-portals-reject-200kb-photos) · [Compress Aadhaar to 100KB PDF](/blog/compress-aadhaar-to-100kb-pdf)