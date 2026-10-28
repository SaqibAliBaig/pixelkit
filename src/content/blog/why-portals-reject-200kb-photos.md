---
title: "Why Portals Reject Your 200KB Photo (And How to Fix It in 30 Seconds)"
description: "The real reasons passport, visa and exam portals reject photos at 200KB — file format, dimensions, and quality — and the fastest way to hit the exact limit."
publishedAt: 2026-01-15
author: "PixelKit"
tags: ["portals", "compression", "passport"]
relatedCombos: ["compress-image-to-200kb", "heic-to-jpg-under-200kb", "passport-photo-resizer"]
draft: false
---

You upload your photo, wait for the spinner, and the portal spits back: **"Image exceeds 200KB"** or **"Invalid file format"** or **"Dimensions out of range."** You try again with a different photo, and it fails the same way. Here's what's actually going wrong — and how to fix it in under a minute.

## Three separate limits, not one

Most people assume the portal cares about one thing: file size. In reality, most portals enforce **three** limits simultaneously:

1. **File size** (e.g. "maximum 200KB").
2. **File format** (e.g. "JPG or PNG only").
3. **Dimensions** (e.g. "between 600×600 and 1200×1200 pixels").

Your file has to satisfy all three at once. If you compress to hit 200KB but the format is HEIC, you'll still be rejected. If the format is JPG but the image is 4000×3000, some portals reject it on the dimension rule before they even look at the file size.

The good news: three limits, one fix.

## The HEIC trap

If you're on an iPhone (iOS 11 or later), your camera saves photos as **HEIC**, not JPG. HEIC is a great format — half the file size of JPG at the same quality — but the vast majority of government and exam portals still only accept JPG or PNG. So even a 150KB HEIC photo will be rejected as "invalid format."

The fix: convert HEIC → JPG first, then hit the KB target. PixelKit's [HEIC to JPG under 200KB tool](/heic-to-jpg-under-200kb) does both in one pass.

## The dimension trap

A 12-megapixel iPhone photo is around 4032×3024 pixels. Most passport portals cap at 1200×1200 or smaller. Some portals will resize for you (badly); others reject outright.

If your portal specifies a max dimension, resize **and** compress in one step. PixelKit's [Passport Photo Resizer & Compressor](/passport-photo-resizer) crops, scales dimensions, and hits your KB target together so you get a photo that satisfies every rule.

## Why manual compression rarely hits the target

Most free "image compressor" tools ask you to slide a quality slider from 1 to 100 and guess. You compress at quality 80, get 260KB, compress at 60, get 140KB, then aim for the middle — 70, 190KB, close enough. This guessing game wastes minutes per photo.

PixelKit does the guessing for you: it uses a **binary search** over the quality range, encoding the image about 12 times in a Web Worker, checking the size each time, and landing within 2% of your target in under half a second. You ask for 200KB, you get 200KB — the best possible quality at that size.

## The 30-second workflow

1. Open [Compress Image to 200KB](/compress-image-to-200kb) (or [HEIC to JPG under 200KB](/heic-to-jpg-under-200kb) for iPhone HEIC files).
2. Drop your photo in. It never leaves your device.
3. Download the result. That's it.

No signup, no upload wait, no watermark. If the portal later asks for a different limit (some ask for 50KB, some 100KB, some 240KB), open the corresponding PixelKit page and repeat — you'll always get a file that fits.

## One last tip: check the portal's *actual* requirement

Portals often state "200KB" but enforce it slightly differently. Some check file size *after* their own re-encoding, so a 195KB upload can still fail. If your 195KB file gets rejected, aim for 180KB to leave headroom. PixelKit's target is exact enough that "aim for 180" means "set 180 and get 180."

Related reading: [Compress Aadhaar to 100KB PDF](/blog/compress-aadhaar-to-100kb-pdf) · [iPhone HEIC explained](/blog/iphone-heic-explained)
