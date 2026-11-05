import fs from 'fs';
import path from 'path';

const pages = [
  // 1. Signature Resizer
  {
    filename: 'signature-resizer.astro',
    title: 'Signature Resizer Online (10–20 KB & 2:1) — Free',
    description: 'Resize signature photo to 140x60 px or 280x140 px and compress to 10KB-20KB JPG online. 100% private in-browser tool with zero cloud uploads.',
    badge: '140×60 px · 280×140 px · 10KB–20KB JPG Compliant',
    h1: 'Signature Resizer & Compressor Online',
    subtitle: 'Crop unnecessary borders, rescale to official 2:1 signature dimensions, and compress strictly between 10KB and 20KB JPG with pin-sharp ink strokes.',
    toolPreset: 'signature',
    targetKb: 20,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official Exam Signature Specification Summary (2026 Direct Answer)',
      summaryText: 'Most government and recruitment examination portals (UPSC, SSC, IBPS, SBI, Railways, NTA) mandate candidate signatures in JPG/JPEG format weighing strictly between 10 KB and 20 KB. The standard dimension ratio is 2:1 (140 × 60 px, 280 × 140 px, or 3.5 × 1.5 cm), written with black or blue ink on smooth white paper.',
      portalName: 'National Examination & Recruitment Portals',
      specs: [
        { label: 'File Size Bracket', value: '10 KB to 20 KB strictly', highlight: true },
        { label: 'Aspect Ratio', value: '2:1 Horizontal (140×60 px to 280×140 px)', highlight: true },
        { label: 'Format', value: 'JPG / JPEG only' },
        { label: 'Ink & Background', value: 'Dark Ink on Plain White Paper' },
      ],
    },
    tableTitle: 'Government & Banking Exam Signature Standards',
    tableDesc: 'Compare signature dimension and file size requirements across major recruitment portals:',
    tableHeaders: ['Portal / Exam', 'Required Dimensions', 'File Size Bracket', 'Ink Color'],
    tableRows: [
      ['UPSC CSE & NDA', '280 × 140 px (3.5 × 1.5 cm)', '10 KB – 20 KB', 'Black ink only'],
      ['SSC CGL, CHSL, MTS', '140 × 60 px (4.0 × 2.0 cm)', '10 KB – 20 KB', 'Black / Blue ink'],
      ['IBPS PO & Clerk', '140 × 60 px (2:1 ratio)', '10 KB – 20 KB', 'Black ink on white'],
      ['SBI PO & Clerk', '140 × 60 px', '10 KB – 20 KB', 'Black ink on white'],
      ['Railway RRB NTPC', '80 × 35 mm (approx. 140×60 px)', '10 KB – 40 KB', 'Blue or Black ink'],
      ['NTA JEE & NEET', '3.5 × 1.5 cm', '4 KB – 30 KB', 'Black ink on white'],
    ],
    faqs: [
      {
        q: 'What are the exact photo and signature dimensions required for online exams?',
        a: 'Most portals specify a 2:1 horizontal rectangle: 140 × 60 pixels or 280 × 140 pixels (equivalent to 3.5 × 1.5 cm or 4.0 × 2.0 cm at standard print resolutions). File size must strictly be between 10 KB and 20 KB in JPG format.',
      },
      {
        q: 'Why do exam portals reject signatures smaller than 10 KB?',
        a: 'Portals enforce a minimum file size (typically 10 KB) to prevent candidates from uploading blank or corrupt placeholder files. PixelKit uses binary search quantization targeting 14 KB–18 KB, landing right in the sweet spot.',
      },
      {
        q: 'How do I keep my signature legible and crisp when compressed under 20KB?',
        a: 'Crop all excess white paper margins tightly around the signature strokes before resizing. Removing large empty white borders allows the JPEG encoder to allocate all bits to the ink strokes rather than plain background.',
      },
      {
        q: 'Is my candidate signature kept secure and private?',
        a: '100% yes. Signatures are sensitive biometric assets. PixelKit operates entirely inside your local browser memory using Canvas and WebAssembly. No signature photos ever touch external servers.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'Signature Resizer' },
    ],
  },

  // 2. Signature Resizer 10KB to 20KB
  {
    filename: 'signature-resizer-10kb-to-20kb.astro',
    title: 'Signature Resizer 10KB to 20KB Online — Free & Fast',
    description: 'Compress signature image between 10KB and 20KB JPG for government exam applications. Fast client-side binary search with zero server uploads.',
    badge: '10 KB to 20 KB Exact Bracket Lock',
    h1: 'Signature Resizer 10KB to 20KB Online',
    subtitle: 'Strictly compress your candidate signature between 10 KB and 20 KB in JPG format. Guaranteed to satisfy both minimum and maximum portal limits in 1 click.',
    toolPreset: 'signature',
    targetKb: 20,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'The 10KB–20KB Signature Requirement Explained (2026 Direct Answer)',
      summaryText: 'Portals such as SSC, UPSC, IBPS, and State PSCs enforce dual-threshold validation: signatures below 10 KB are rejected as low-resolution, and files above 20 KB are blocked as oversize. PixelKit targets ~15 KB, safely clearing both thresholds.',
      portalName: 'SSC, UPSC, IBPS, SBI & State PSC Portals',
      specs: [
        { label: 'Lower Bound', value: 'Minimum 10.0 KB strictly', highlight: true },
        { label: 'Upper Bound', value: 'Maximum 20.0 KB strictly', highlight: true },
        { label: 'Ideal Target', value: '14.0 KB to 18.0 KB' },
        { label: 'Color Format', value: '24-bit RGB JPEG' },
      ],
    },
    tableTitle: 'Portals Enforcing the Strict 10KB–20KB Signature Rule',
    tableDesc: 'Recruitment portals with strict two-sided signature file size filters:',
    tableHeaders: ['Recruiting Agency', 'Exams Covered', 'Signature Bracket', 'Accepted Formats'],
    tableRows: [
      ['Staff Selection Commission', 'CGL, CHSL, MTS, CPO, GD Constable', '10 KB – 20 KB', 'JPG / JPEG'],
      ['Union Public Service Commission', 'Civil Services (IAS/IPS), NDA, CDS, CMS', '10 KB – 20 KB', 'JPG / JPEG'],
      ['IBPS', 'PO, Clerk, Specialist Officer, RRB', '10 KB – 20 KB', 'JPG / JPEG'],
      ['State Bank of India', 'SBI PO, SBI Clerk, Junior Associates', '10 KB – 20 KB', 'JPG / JPEG'],
      ['State PSCs', 'UPPSC, BPSC, MPSC, TNPSC, KPSC', '10 KB – 20 KB', 'JPG / JPEG'],
    ],
    faqs: [
      {
        q: 'Why does my signature compress to 8KB and get rejected?',
        a: 'Signatures on pure white backgrounds have very low visual complexity, so basic compressors overshoot and compress below 10 KB. PixelKit features automated padding and quantization tuning that keeps the file safely within the 10KB–20KB bracket.',
      },
      {
        q: 'Can I upload a smartphone photo of my signature?',
        a: 'Yes. Take a photo of your signature under good lighting without shadows. Drop the picture into PixelKit, crop closely around the ink strokes, and the tool will scale and compress it between 10KB and 20KB automatically.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'Signature Resizer 10KB to 20KB' },
    ],
  },

  // 3. IBPS Photo Signature Resizer
  {
    filename: 'ibps-photo-signature-resizer.astro',
    title: 'IBPS Photo & Signature Resizer (All 4 Presets) — Free',
    description: 'Resize and compress IBPS PO, Clerk & RRB photo (20-50KB), signature (10-20KB), thumb impression & declaration in browser with zero upload.',
    badge: 'IBPS PO · Clerk · RRB · SO All-in-One Studio',
    h1: 'IBPS Photo, Signature & LTI Resizer',
    subtitle: 'Prepare all 4 required IBPS online application uploads in one place: Candidate Photograph, Signature, Left Thumb Impression, and Handwritten Declaration.',
    toolPreset: 'exam-ibps',
    targetKb: 50,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official IBPS Upload Specifications (2026 Direct Answer)',
      summaryText: 'IBPS applications require four separate digital files: (1) Passport Photo: 200 × 230 px, 20–50 KB; (2) Signature: 140 × 60 px, 10–20 KB (no capital/block letters); (3) Left Thumb Impression: 200 × 200 px or 140 × 60 px, 20–50 KB; (4) Handwritten Declaration: 800 × 400 px, 50–100 KB in English.',
      portalName: 'Institute of Banking Personnel Selection (ibps.in)',
      specs: [
        { label: 'Passport Photo', value: '200 × 230 px (20–50 KB)', highlight: true },
        { label: 'Signature', value: '140 × 60 px (10–20 KB)', highlight: true },
        { label: 'Left Thumb (LTI)', value: '200 × 200 px (20–50 KB)', highlight: true },
        { label: 'Declaration', value: '800 × 400 px (50–100 KB)', highlight: true },
      ],
    },
    tableTitle: 'Complete IBPS Application Uploads Matrix',
    tableDesc: 'Official guidelines published in the IBPS PO/Clerk notifications:',
    tableHeaders: ['Upload Item', 'Pixel Dimensions', 'File Size Bracket', 'Guidelines & Rules'],
    tableRows: [
      ['Passport Photograph', '200 × 230 pixels', '20 KB to 50 KB', 'Recent color photo, light/white background, no spectacles/cap'],
      ['Signature', '140 × 60 pixels', '10 KB to 20 KB', 'Black ink on white paper; signature in CAPITAL LETTERS is rejected'],
      ['Left Thumb Impression', '200 × 200 px (3 × 3 cm)', '20 KB to 50 KB', 'Blue or Black ink on white paper, clearly visible ridge lines'],
      ['Handwritten Declaration', '800 × 400 px (10 × 5 cm)', '50 KB to 100 KB', 'Written in candidate’s own handwriting in English with black ink'],
    ],
    faqs: [
      {
        q: 'Why does IBPS reject signatures written in capital letters?',
        a: 'IBPS guidelines state that signatures written entirely in CAPITAL LETTERS are not accepted. The signature must be in your normal running handwriting.',
      },
      {
        q: 'What is the text required for the IBPS Handwritten Declaration?',
        a: 'The official text is: "I, [Name of Candidate], hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required."',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'IBPS Resizer' },
    ],
  },

  // 4. SBI PO Photo Resizer
  {
    filename: 'sbi-po-photo-resizer.astro',
    title: 'SBI PO Photo & Signature Resizer Online (20-50KB)',
    description: 'Resize photo and signature for SBI PO & Clerk exam online. Crop to 200x230 px, compress to 20-50KB JPG locally with zero server uploads.',
    badge: 'State Bank of India PO & Clerk Compliant',
    h1: 'SBI PO Photo & Signature Resizer',
    subtitle: 'Crop and compress candidate photo (20–50KB, 200×230 px), signature (10–20KB), and left thumb impression for State Bank of India online recruitment.',
    toolPreset: 'exam-sbi',
    targetKb: 50,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official SBI PO Photo & Signature Specifications (2026 Direct Answer)',
      summaryText: 'State Bank of India mandates passport photographs to be 200 × 230 pixels, between 20 KB and 50 KB JPG. Signatures must be 140 × 60 pixels, between 10 KB and 20 KB JPG in black ink. Left thumb impression must be 20 KB to 50 KB, and handwritten declaration 50 KB to 100 KB.',
      portalName: 'State Bank of India (sbi.co.in/careers)',
      specs: [
        { label: 'Photo Size', value: '200 × 230 px (20 KB – 50 KB)', highlight: true },
        { label: 'Signature Size', value: '140 × 60 px (10 KB – 20 KB)', highlight: true },
        { label: 'Thumb Impression', value: '20 KB – 50 KB JPG' },
        { label: 'Declaration', value: '50 KB – 100 KB JPG' },
      ],
    },
    tableTitle: 'SBI Recruitment Document Standards',
    tableDesc: 'Official guidelines from SBI PO and Clerk advertisement bulletins:',
    tableHeaders: ['Document', 'Dimensions', 'File Size Limit', 'Format'],
    tableRows: [
      ['Candidate Photograph', '200 × 230 px', '20 KB – 50 KB', 'JPG / JPEG'],
      ['Signature', '140 × 60 px', '10 KB – 20 KB', 'JPG / JPEG (Black Ink)'],
      ['Left Thumb Impression', '200 × 200 px', '20 KB – 50 KB', 'JPG / JPEG (White Paper)'],
      ['Handwritten Declaration', '800 × 400 px', '50 KB – 100 KB', 'JPG / JPEG (English)'],
    ],
    faqs: [
      {
        q: 'Can I use a blue ink signature for SBI PO?',
        a: 'SBI strictly requires the signature and declaration to be in black ink on white paper. Blue ink signatures risk rejection during document verification.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'SBI PO Resizer' },
    ],
  },

  // 5. GATE Photo Resizer
  {
    filename: 'gate-photo-resizer.astro',
    title: 'GATE Photo & Signature Resizer (GOAPS 5–200KB)',
    description: 'Resize photo to 480x640 px and signature to 160x560 px for IIT GATE & JAM online application. Compress to 5-200KB JPG with zero server uploads.',
    badge: 'IIT GATE & JAM GOAPS Compliant',
    h1: 'GATE Photo & Signature Resizer',
    subtitle: 'Scale candidate photo (480×640 px, 5–200 KB) and signature (160×560 px, 5–200 KB) for IIT GATE online registration with 100% private in-browser tooling.',
    toolPreset: 'exam-gate',
    targetKb: 200,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'IIT GATE GOAPS Photo & Signature Guidelines (2026 Direct Answer)',
      summaryText: 'Graduate Aptitude Test in Engineering (GATE) candidate photographs must have an aspect ratio of 3.5:4.5 (minimum 240 × 320 px, maximum 480 × 640 px), weighing between 5 KB and 200 KB. Signatures must have an aspect ratio of 1:3.5 (minimum 80 × 280 px, maximum 160 × 560 px), weighing between 5 KB and 200 KB.',
      portalName: 'IIT GATE Organizing Institute (GOAPS)',
      specs: [
        { label: 'Photo Dimensions', value: '480 × 640 px max (3.5:4.5)', highlight: true },
        { label: 'Signature Dimensions', value: '160 × 560 px max (1:3.5)', highlight: true },
        { label: 'File Size Bracket', value: '5 KB to 200 KB strictly', highlight: true },
        { label: 'Face Coverage', value: '60% to 70% of photo area' },
      ],
    },
    tableTitle: 'GATE Photo & Signature Dimension Chart',
    tableDesc: 'Mandatory GOAPS image criteria:',
    tableHeaders: ['Item', 'Min Resolution', 'Max Resolution', 'File Size Bracket'],
    tableRows: [
      ['Passport Photograph', '240 × 320 px', '480 × 640 px', '5 KB to 200 KB JPG'],
      ['Signature', '80 × 280 px', '160 × 560 px', '5 KB to 200 KB JPG'],
    ],
    faqs: [
      {
        q: 'Why does GOAPS reject candidate photos with dark backgrounds?',
        a: 'GATE requires a clean white or very light background. Photos taken against walls with shadows or colored patterns are rejected during scrutiny.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'GATE Resizer' },
    ],
  },

  // 6. JEE Main Photo Resizer
  {
    filename: 'jee-main-photo-resizer.astro',
    title: 'JEE Main Photo & Signature Resizer (NTA 10–200KB)',
    description: 'Resize and compress photo (10-200KB) and signature (4-30KB) for NTA JEE Main online application. 100% private in-browser image studio.',
    badge: 'NTA JEE Main & JEE Advanced Compliant',
    h1: 'JEE Main Photo & Signature Resizer',
    subtitle: 'Prepare candidate photograph (10–200 KB, 80% face coverage) and signature (4–30 KB) strictly meeting National Testing Agency JEE application standards.',
    toolPreset: 'exam-neet',
    targetKb: 50,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'NTA JEE Main Photo & Signature Rules (2026 Direct Answer)',
      summaryText: 'National Testing Agency (NTA JEE Main) requires candidate photographs to be 10 KB to 200 KB JPG with 80% face coverage against a white background. Candidate signatures must be between 4 KB and 30 KB JPG in clear running handwriting.',
      portalName: 'National Testing Agency (jeemain.nta.nic.in)',
      specs: [
        { label: 'Photo Size Bracket', value: '10 KB to 200 KB JPG', highlight: true },
        { label: 'Signature Size Bracket', value: '4 KB to 30 KB JPG', highlight: true },
        { label: 'Face Coverage', value: '80% face with ears visible' },
        { label: 'Background', value: 'Plain White Background' },
      ],
    },
    tableTitle: 'JEE Main NTA Upload Requirements',
    tableDesc: 'Official criteria for JEE Main Session 1 and Session 2:',
    tableHeaders: ['Upload Component', 'Allowable Size', 'Format', 'Specific Instructions'],
    tableRows: [
      ['Passport Photograph', '10 KB – 200 KB', 'JPG / JPEG', 'White background, 80% face coverage, no mask/spectacles'],
      ['Signature', '4 KB – 30 KB', 'JPG / JPEG', 'Black ink on white paper, no capitals'],
      ['Category Certificate (if applicable)', '50 KB – 300 KB', 'PDF format', 'Clear scanned PDF document'],
    ],
    faqs: [
      {
        q: 'Do I need my name and date printed on the JEE photo?',
        a: 'NTA advises that the photograph should preferably be taken on or after the notification date, but name and date printing is optional unless specifically stated in that session’s bulletin.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'JEE Main Resizer' },
    ],
  },

  // 7. CUET Photo Resizer
  {
    filename: 'cuet-photo-resizer.astro',
    title: 'CUET Photo & Signature Resizer Online (NTA Compliant)',
    description: 'Resize candidate photograph to 350x450 px and signature to 4-30KB for CUET UG application. Fast, 100% client-side with zero cloud uploads.',
    badge: 'NTA CUET UG & PG Compliant',
    h1: 'CUET Photo & Signature Resizer',
    subtitle: 'Crop and compress candidate photo (10–200 KB, 350×450 px) and signature (4–30 KB) for Common University Entrance Test registration.',
    toolPreset: 'exam-neet',
    targetKb: 50,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'NTA CUET Photo & Signature Requirements (2026 Direct Answer)',
      summaryText: 'Common University Entrance Test (CUET UG/PG) candidates must upload a recent passport-size photograph (10 KB to 200 KB JPG) showing 80% face with both ears visible against a white background, and signature (4 KB to 30 KB JPG).',
      portalName: 'NTA CUET Portal (exams.nta.ac.in/CUET-UG)',
      specs: [
        { label: 'Photo Size', value: '10 KB to 200 KB JPG', highlight: true },
        { label: 'Signature Size', value: '4 KB to 30 KB JPG', highlight: true },
        { label: 'Background', value: 'White Background' },
        { label: 'Ears Visibility', value: 'Both ears clearly visible' },
      ],
    },
    tableTitle: 'CUET Entrance Exam Upload Guidelines',
    tableDesc: 'Mandatory parameters for CUET undergraduate and postgraduate admissions:',
    tableHeaders: ['Upload Item', 'Size Range', 'Format', 'Key Requirements'],
    tableRows: [
      ['Candidate Photo', '10 KB – 200 KB', 'JPG / JPEG', 'Clean white background, 80% face coverage'],
      ['Candidate Signature', '4 KB – 30 KB', 'JPG / JPEG', 'Black ballpoint pen on plain white paper'],
    ],
    faqs: [
      {
        q: 'Can I wear spectacles in my CUET photograph?',
        a: 'If spectacles are normally worn, they must be clear with no glare or tinted lenses. Sunglasses or colored lenses are strictly prohibited.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'CUET Resizer' },
    ],
  },

  // 8. RRB Photo Resizer
  {
    filename: 'rrb-photo-resizer.astro',
    title: 'RRB Photo Resizer Online (320x400 px, 20-50KB)',
    description: 'Crop and compress Railway RRB NTPC, ALP & Group D photo to 320x400 px (20-50KB) and signature (10-40KB) locally with zero server uploads.',
    badge: 'Indian Railways RRB NTPC · ALP · Group D Compliant',
    h1: 'Railway RRB Photo & Signature Resizer',
    subtitle: 'Resize candidate photo to 320 × 400 px (20–50 KB) and signature (10–40 KB) for Railway Recruitment Board online job applications.',
    toolPreset: 'exam-rrb',
    targetKb: 50,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official RRB Photo & Signature Specifications (2026 Direct Answer)',
      summaryText: 'Railway Recruitment Board (RRB NTPC, ALP, Technician, JE, and Group D) mandates candidate photographs in JPG format between 20 KB and 50 KB with dimensions of 320 × 400 px (35 × 45 mm). Signatures must be in running handwriting, between 10 KB and 40 KB.',
      portalName: 'Railway Recruitment Boards (rrbapply.gov.in)',
      specs: [
        { label: 'Photo Dimensions', value: '320 × 400 px (35 × 45 mm)', highlight: true },
        { label: 'Photo Size Bracket', value: '20 KB to 50 KB JPG', highlight: true },
        { label: 'Signature Size Bracket', value: '10 KB to 40 KB JPG', highlight: true },
        { label: 'Background', value: 'Plain White or Light' },
      ],
    },
    tableTitle: 'RRB Recruitment Photo Guidelines',
    tableDesc: 'Official standards across Indian Railways recruitment zones:',
    tableHeaders: ['Item', 'Dimensions', 'File Size Limit', 'Format'],
    tableRows: [
      ['Passport Photo', '320 × 400 px (3.5 × 4.5 cm)', '20 KB – 50 KB', 'JPG / JPEG'],
      ['Signature', '140 × 60 px or 80 × 35 mm', '10 KB – 40 KB', 'JPG / JPEG'],
    ],
    faqs: [
      {
        q: 'Why was my photo rejected in the previous RRB application?',
        a: 'The most common reasons for RRB photo rejections are selfies, wearing sunglasses or caps, patterned backgrounds, and file sizes outside the strict 20KB–50KB bracket.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'RRB Resizer' },
    ],
  },

  // 9. Aadhaar PDF Compressor
  {
    filename: 'aadhaar-pdf-compressor.astro',
    title: 'Aadhaar PDF Compressor Online (Under 100KB & 2MB)',
    description: 'Compress Aadhaar card and identity document PDFs under 100KB or 2MB for UIDAI portal uploads. Safe in-browser compression with zero server upload.',
    badge: 'UIDAI myAadhaar · POA / POI Document Compliant',
    h1: 'Aadhaar PDF Compressor Online',
    subtitle: 'Compress your Aadhaar card copy, proof of identity, and proof of address PDFs under 100KB, 200KB, or 2MB without losing text sharpness.',
    toolPreset: 'aadhaar-doc',
    targetKb: 100,
    from: 'pdf',
    to: 'pdf',
    fromMime: 'application/pdf',
    toMime: 'application/pdf',
    directAnswer: {
      title: 'UIDAI myAadhaar PDF Upload Specifications (2026 Direct Answer)',
      summaryText: 'UIDAI myAadhaar portal requires supporting Proof of Identity (POI) and Proof of Address (POA) documents in PDF or JPG format strictly under 2 MB (for portal updates) or under 100 KB / 200 KB (for banking, KYC, and government exams). Password-protected PDFs are rejected.',
      portalName: 'Unique Identification Authority of India (myaadhaar.uidai.gov.in)',
      specs: [
        { label: 'Max File Size', value: 'Under 2 MB (or 100 KB for KYC)', highlight: true },
        { label: 'Document Formats', value: 'PDF, JPG, PNG', highlight: true },
        { label: 'Password Security', value: 'Must be Password-Free' },
        { label: 'Legibility', value: 'Clear 12-digit number & QR code' },
      ],
    },
    tableTitle: 'Aadhaar Document Size Limits by Portal',
    tableDesc: 'File size limits when submitting Aadhaar copies to various organizations:',
    tableHeaders: ['Portal / Service', 'Required Size Limit', 'Accepted Format', 'Password Allowed?'],
    tableRows: [
      ['UIDAI myAadhaar Portal', 'Max 2 MB', 'PDF / JPG', 'No (Must remove password)'],
      ['Banking KYC & Video KYC', 'Max 100 KB – 500 KB', 'PDF / JPG', 'No'],
      ['SSC & UPSC OTR Verification', 'Max 300 KB – 500 KB', 'PDF format', 'No'],
      ['Passport Seva Portal', 'Max 1 MB', 'PDF format', 'No'],
    ],
    faqs: [
      {
        q: 'Why does UIDAI reject my e-Aadhaar PDF file?',
        a: 'Official e-Aadhaar PDFs downloaded from UIDAI are password protected (first 4 letters of name + birth year). Portals cannot read password-protected files. PixelKit decodes and re-encodes the document into an unencrypted, lightweight PDF.',
      },
      {
        q: 'Is my Aadhaar number kept confidential?',
        a: 'Yes, completely. PixelKit runs 100% locally in your browser sandbox using WebAssembly. Your identity documents never leave your computer or phone.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Document Tools', href: '/image-to-pdf/' },
      { label: 'Aadhaar PDF Compressor' },
    ],
  },

  // 10. Schengen Visa Photo Resizer
  {
    filename: 'schengen-visa-photo-resizer.astro',
    title: 'Schengen Visa Photo Resizer (35x45 mm) — Under 200KB',
    description: 'Resize and crop Schengen visa photo to 35x45 mm (413x531 px) with 70-80% face coverage and under 200KB JPG. 100% private in-browser tool.',
    badge: 'European Schengen Visa & Biometric Standard',
    h1: 'Schengen Visa Photo Resizer Online',
    subtitle: 'Crop to exact 35 × 45 mm (3.5:4.5 aspect ratio), align 70–80% face height, and compress under 200KB JPG for France, Germany, Italy, Spain & Switzerland visas.',
    toolPreset: 'schengen-visa',
    targetKb: 200,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official Schengen Visa Photo Guidelines (2026 Direct Answer)',
      summaryText: 'European Schengen visa consulates (VFS Global, TLScontact, BLS) require a 35 × 45 mm photograph (413 × 531 pixels at 300 DPI). The applicant’s face must cover 70% to 80% of the photo height (32 mm to 36 mm from chin to crown) against a light gray or white background with neutral facial expression.',
      portalName: 'European Union Schengen Consular Services',
      specs: [
        { label: 'Dimensions', value: '35 × 45 mm (413 × 531 px at 300 DPI)', highlight: true },
        { label: 'Face Height', value: '70% to 80% (32 to 36 mm)', highlight: true },
        { label: 'File Size Bracket', value: 'Under 200 KB JPG' },
        { label: 'Background', value: 'Uniform Light Gray or White' },
      ],
    },
    tableTitle: 'Schengen Visa Photo Criteria Matrix',
    tableDesc: 'Mandatory technical standards for all 29 Schengen member states:',
    tableHeaders: ['Feature', 'Official Requirement', 'Common Mistakes to Avoid'],
    tableRows: [
      ['Dimensions', '35 mm width × 45 mm height', 'Uploading 2×2 inch US visa photos instead'],
      ['Head Size', '32 mm to 36 mm (crown to chin)', 'Face too small or cut off at forehead'],
      ['Background', 'Uniform plain light gray or light blue', 'Dark shadows, flash glare, patterned walls'],
      ['Expression', 'Neutral mouth closed, eyes open looking straight', 'Smiling with visible teeth or tilted head'],
    ],
    faqs: [
      {
        q: 'Can I use a smartphone selfie for my Schengen visa photo?',
        a: 'Yes, provided someone else takes the photo from ~1.5 meters away (to avoid wide-angle nose distortion), with even natural lighting and a plain background. PixelKit will crop to 3.5:4.5 and compress under 200KB.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'Schengen Visa Resizer' },
    ],
  },

  // 11. UK Passport Photo Resizer
  {
    filename: 'uk-passport-photo-resizer.astro',
    title: 'UK Passport Photo Resizer (35x45 mm / HMPO & UKVI)',
    description: 'Resize and crop photo for UK passport renewal and UKVI visa to 35x45 mm (413x531 px) under 200KB. 100% private client-side processing.',
    badge: 'HM Passport Office & UKVI Compliant',
    h1: 'UK Passport & Visa Photo Resizer',
    subtitle: 'Resize and crop digital photos to 35 × 45 mm (413 × 531 px) for His Majesty’s Passport Office (HMPO) online renewal and UK Visas and Immigration (UKVI).',
    toolPreset: 'uk-visa',
    targetKb: 200,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'HMPO UK Digital Passport Photo Rules (2026 Direct Answer)',
      summaryText: 'HM Passport Office requires digital photos for online passport renewal to measure at least 600 × 750 pixels (or 413 × 531 px for visa uploads), between 50 KB and 10 MB (under 200 KB for consular forms). The head must be between 29 mm and 34 mm high against a plain light gray or cream background.',
      portalName: 'HM Passport Office & UKVI (gov.uk)',
      specs: [
        { label: 'Standard Dimensions', value: '35 × 45 mm (413 × 531 px)', highlight: true },
        { label: 'Head Height', value: '29 mm to 34 mm' },
        { label: 'Background', value: 'Plain cream or light grey', highlight: true },
        { label: 'File Size', value: 'Under 200 KB (Visa) / Under 10 MB (HMPO)' },
      ],
    },
    tableTitle: 'UK Passport & UKVI Photo Checklist',
    tableDesc: 'Rules verified against official GOV.UK digital passport photo checker:',
    tableHeaders: ['Parameter', 'GOV.UK Standard', 'PixelKit Implementation'],
    tableRows: [
      ['Aspect Ratio', '35:45 (3.5 cm × 4.5 cm)', 'Auto-locked 3.5:4.5 portrait crop frame'],
      ['Background', 'Light gray or cream without shadows', 'Background contrast verification'],
      ['Eyeline Level', 'Between 20mm and 30mm from bottom', 'Center-top anchor framing'],
    ],
    faqs: [
      {
        q: 'Does HMPO accept photos taken with an iPhone or Android phone?',
        a: 'Yes. GOV.UK allows taking your own photo on a mobile device, as long as it has no shadows, no filters, and meets head measurement rules. PixelKit frames and scales your photo for instant acceptance.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'UK Passport Resizer' },
    ],
  },

  // 12. Canada Visa Photo Resizer
  {
    filename: 'canada-visa-photo-resizer.astro',
    title: 'Canada Visa & PR Photo Resizer (420x540 px) — Free',
    description: 'Resize photo for IRCC Canada visa and Express Entry PR to 420x540 px and under 240KB JPG. Fast in-browser processing with zero server uploads.',
    badge: 'IRCC Canada · Express Entry · Study Permit Compliant',
    h1: 'Canada Visa & PR Photo Resizer Online',
    subtitle: 'Crop to official IRCC digital dimensions (420 × 540 px, 5:7 ratio), align 31–36 mm face height, and compress under 240KB JPG for Canadian visa and PR applications.',
    toolPreset: 'ca-visa',
    targetKb: 240,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official IRCC Canada Photo Specifications (2026 Direct Answer)',
      summaryText: 'Immigration, Refugees and Citizenship Canada (IRCC) mandates digital photos for Express Entry PR, study permits, and visitor visas to measure minimum 420 × 540 pixels (5:7 ratio) and under 240 KB JPG. The face height from chin to crown must be between 31 mm and 36 mm against a pure white background.',
      portalName: 'Immigration, Refugees and Citizenship Canada (canada.ca)',
      specs: [
        { label: 'Digital Dimensions', value: '420 × 540 pixels (5:7 ratio)', highlight: true },
        { label: 'File Size Limit', value: 'Max 240 KB JPG strictly', highlight: true },
        { label: 'Face Height', value: '31 mm to 36 mm (50–70% of frame)' },
        { label: 'Background', value: 'Plain White or Light-Coloured' },
      ],
    },
    tableTitle: 'IRCC Canada Photo Criteria',
    tableDesc: 'Technical digital standards from IRCC Appendix B:',
    tableHeaders: ['Requirement', 'IRCC Specification', 'Details'],
    tableRows: [
      ['Minimum Resolution', '420 × 540 pixels', '5:7 aspect ratio (approx. 50 × 70 mm)'],
      ['File Weight', '60 KB to 240 KB', 'Files over 240 KB fail portal upload'],
      ['Color Space', 'sRGB 24-bit color', 'Standard color space preserved'],
    ],
    faqs: [
      {
        q: 'Why does IRCC reject photos with 35x45mm sizing?',
        a: 'While many countries use 35×45 mm, Canadian permanent resident and visa applications strictly require 50×70 mm (420×540 px digital) aspect ratio. Uploading standard passport photos results in distorted proportions.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'Canada Visa Resizer' },
    ],
  },

  // 13. Australia Passport Photo Resizer
  {
    filename: 'australia-passport-photo-resizer.astro',
    title: 'Australia Passport Photo Resizer (35x45 mm) — Free',
    description: 'Resize photo for Australian passport renewal and ImmiAccount online visa to 35x45 mm (413x531 px) under 200KB. 100% private in-browser tool.',
    badge: 'Australian Passport Office & ImmiAccount Compliant',
    h1: 'Australia Passport & Visa Photo Resizer',
    subtitle: 'Crop to 35 × 45 mm (413 × 531 px), align 32–36 mm face height, and compress under 200KB JPG for Australian Passport Office and Department of Home Affairs ImmiAccount.',
    toolPreset: 'au-visa',
    targetKb: 200,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Australian Passport & Visa Photo Guidelines (2026 Direct Answer)',
      summaryText: 'The Australian Passport Office and Department of Home Affairs mandate photos measuring 35 mm to 40 mm wide by 45 mm to 50 mm high (standard 413 × 531 px at 300 DPI). The face size from top of head to bottom of chin must be between 32 mm and 36 mm against a plain light grey or white background.',
      portalName: 'Australian Passport Office (passports.gov.au)',
      specs: [
        { label: 'Dimensions', value: '35 × 45 mm (413 × 531 px)', highlight: true },
        { label: 'Face Height', value: '32 mm to 36 mm', highlight: true },
        { label: 'Background', value: 'Light Grey or Plain White' },
        { label: 'File Size Bracket', value: 'Under 200 KB (ImmiAccount) / Under 5 MB' },
      ],
    },
    tableTitle: 'Australian Biometric Standards',
    tableDesc: 'Mandatory guidelines for Australian visa and citizenship applications:',
    tableHeaders: ['Parameter', 'Official Standard', 'PixelKit Preset Configuration'],
    tableRows: [
      ['Aspect Ratio', '35:45 (3.5 × 4.5 cm)', 'Locks 3.5:4.5 portrait crop frame'],
      ['Head Size', '32 to 36 mm crown to chin', 'Center-top biometric anchor framing'],
      ['Quality & Compression', 'Clear, sharp, under 200 KB', 'Lossless chroma preserving clean skin tones'],
    ],
    faqs: [
      {
        q: 'Can I smile in my Australian passport photo?',
        a: 'No. Australian regulations require a neutral expression with mouth completely closed and eyes looking straight into the camera lens.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Portal Presets', href: '/portal-photo-size-chart/' },
      { label: 'Australia Passport Resizer' },
    ],
  },

  // 14. Change Image DPI to 300
  {
    filename: 'change-image-dpi-to-300.astro',
    title: 'Change Image DPI to 300 Online (Lossless & Fast)',
    description: 'Convert image to 300 DPI online without quality loss. Updates JFIF and PNG metadata instantly in your browser with zero server uploads.',
    badge: 'Lossless Metadata DPI Injection · 300 DPI Print Ready',
    h1: 'Change Image DPI to 300 Online',
    subtitle: 'Convert any JPG, PNG, or WebP photo to 300 DPI print resolution instantly. Modifies header metadata directly without re-encoding, blurring, or quality degradation.',
    toolPreset: 'none',
    targetKb: null,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'How 300 DPI Conversion Works Losslessly (2026 Direct Answer)',
      summaryText: 'DPI (Dots Per Inch) is a metadata tag in the image header (JFIF APP0 in JPEG, pHYs chunk in PNG) that instructs printers how many pixels to print per physical inch. Changing DPI to 300 does not alter physical pixel dimensions; it updates the print density tag so official portals recognize your image as 300 DPI print-ready.',
      portalName: 'Print & Passport Portals (DPI Metadata Standard)',
      specs: [
        { label: 'Standard Print DPI', value: '300 DPI (Universal Standard)', highlight: true },
        { label: 'Pixel Alteration', value: 'Zero (Pixels remain 100% untouched)', highlight: true },
        { label: 'Header Modified', value: 'JFIF APP0 (JPG) / pHYs (PNG)' },
        { label: 'Processing Speed', value: '< 10 milliseconds in browser' },
      ],
    },
    tableTitle: 'Standard DPI Presets & Common Uses',
    tableDesc: 'Comparison of image resolution density standards across printing and display:',
    tableHeaders: ['DPI Density', 'Common Use Case', 'Print Quality', 'File Weight Impact'],
    tableRows: [
      ['300 DPI', 'Passports, Visas, Books, Official Exam Portals', 'High Definition (Sharp)', 'Zero file size increase'],
      ['600 DPI', 'Professional Photography & Gallery Printing', 'Ultra High Definition', 'Zero file size increase'],
      ['150 DPI', 'Newspaper & High-Speed Offset Printing', 'Standard Print', 'Zero file size increase'],
      ['72 / 96 DPI', 'Websites, Displays & Smartphone Screens', 'Screen Only (Blurry on print)', 'Zero file size increase'],
    ],
    faqs: [
      {
        q: 'Why does an exam portal reject my photo for not being 300 DPI?',
        a: 'Many government admission software systems read the JFIF or EXIF DPI header tag. Even if your image has thousands of pixels, if the camera saved it with a default 72 DPI screen tag, the portal rejects it. PixelKit injects the official 300 DPI tag into the header in 5 milliseconds.',
      },
      {
        q: 'Does changing DPI reduce the visual sharpness of my image?',
        a: 'Not at all. In fact, changing DPI through metadata is 100% lossless. The raw pixel values remain identical byte-for-byte; only the physical printer measurement tag is updated to 300 dots per inch.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Image Tools', href: '/resize-image/' },
      { label: 'Change DPI to 300' },
    ],
  },

  // 15. Pixels to CM Converter
  {
    filename: 'pixels-to-cm-converter.astro',
    title: 'Pixels to CM Converter Online (At 300 DPI) — Free',
    description: 'Convert pixels to centimeters (cm) and millimeters (mm) at 300 DPI or custom DPI online. Free instant calculator and image resizer studio.',
    badge: 'Interactive DPI Calculator & Instant Photo Resizer',
    h1: 'Pixels to CM Converter Online',
    subtitle: 'Instantly calculate centimeters and millimeters from pixel dimensions at 300 DPI or any custom resolution, then resize your photo in one click.',
    toolPreset: 'none',
    targetKb: null,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Pixels to CM Conversion Formula (2026 Direct Answer)',
      summaryText: 'To convert pixels to centimeters: Centimeters = (Pixels × 2.54) ÷ DPI. At the standard print resolution of 300 DPI: 1 cm equals approximately 118.11 pixels, and 1 pixel equals 0.00846 cm. For example, a 413 × 531 pixel passport photo translates to exactly 3.5 × 4.5 cm at 300 DPI.',
      portalName: 'Print & Dimension Conversion Standard',
      specs: [
        { label: 'Formula', value: 'CM = (Pixels × 2.54) ÷ DPI', highlight: true },
        { label: 'At 300 DPI', value: '1 cm = 118.11 pixels', highlight: true },
        { label: 'At 72 DPI', value: '1 cm = 28.35 pixels' },
        { label: 'Passport (3.5×4.5cm)', value: '413 × 531 pixels @ 300 DPI' },
      ],
    },
    tableTitle: 'Common Pixel to Centimeter Dimensions at 300 DPI',
    tableDesc: 'Quick reference guide for official document and photo sizes:',
    tableHeaders: ['Standard Size Name', 'Dimensions in CM', 'Dimensions in Pixels (300 DPI)', 'Common Application'],
    tableRows: [
      ['Indian / UK / EU Passport', '3.5 × 4.5 cm', '413 × 531 px', 'Passports, Visas, SSC & UPSC'],
      ['US Visa / DS-160', '5.08 × 5.08 cm (2×2 in)', '600 × 600 px', 'US Visa, Green Card Lottery'],
      ['Stamp Size Photo', '2.5 × 3.5 cm', '295 × 413 px', 'Identity badges, bus passes'],
      ['Official Exam Signature', '4.0 × 2.0 cm', '472 × 236 px', 'SSC, Banking & State exams'],
      ['Standard Postcard', '10.0 × 15.0 cm (4×6 in)', '1181 × 1772 px', 'NEET Postcard Photo'],
      ['A4 Document Sheet', '21.0 × 29.7 cm', '2480 × 3508 px', 'Document print & scan standard'],
    ],
    faqs: [
      {
        q: 'How many pixels are in 1 cm?',
        a: 'The number of pixels in 1 centimeter depends entirely on the DPI (resolution). At 300 DPI (print standard), 1 cm = 118.11 pixels. At 150 DPI, 1 cm = 59.06 pixels. At 72 DPI (web screen), 1 cm = 28.35 pixels.',
      },
      {
        q: 'Can I resize my photo directly after calculating?',
        a: 'Yes. Use the dropzone above, enter your desired width and height in centimeters or pixels, and PixelKit will rescale your image client-side in under 1 second.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Image Tools', href: '/image-resizer-in-cm/' },
      { label: 'Pixels to CM Converter' },
    ],
  },

  // 16. CM to Pixels at 300 DPI
  {
    filename: 'cm-to-pixels-at-300-dpi.astro',
    title: 'CM to Pixels at 300 DPI Calculator & Resizer',
    description: 'Convert centimeters to pixels at 300 DPI print resolution. Instant calculation table for 3.5x4.5cm, 2x2 inch and A4 with 1-click image resizing.',
    badge: '300 DPI Exact Pixel Calculator & Converter',
    h1: 'CM to Pixels at 300 DPI Calculator',
    subtitle: 'Find exact pixel dimensions for any centimeter or millimeter measurement at 300 DPI. Pre-calibrated for passport, visa, and document printing standards.',
    toolPreset: 'none',
    targetKb: null,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'CM to Pixels Formula at 300 DPI (2026 Direct Answer)',
      summaryText: 'At 300 DPI (dots per inch), the conversion formula is: Pixels = (Centimeters × 300) ÷ 2.54. Each centimeter contains exactly 118.1102 pixels. Multiplying any centimeter measurement by 118.11 gives the exact pixel dimension required for crystal-clear 300 DPI printing.',
      portalName: 'International Print & Digital Photography Standard',
      specs: [
        { label: 'Multiplier', value: '1 cm = 118.11 pixels (@ 300 DPI)', highlight: true },
        { label: '3.5 × 4.5 cm', value: '413 × 531 pixels', highlight: true },
        { label: '5.0 × 5.0 cm', value: '591 × 591 pixels' },
        { label: 'A4 (21×29.7 cm)', value: '2480 × 3508 pixels' },
      ],
    },
    tableTitle: 'Centimeter to Pixel Conversion Table at 300 DPI',
    tableDesc: 'Precise pixel calculations for common international photo and paper dimensions:',
    tableHeaders: ['Centimeters (CM)', 'Millimeters (MM)', 'Inches', 'Exact Pixels at 300 DPI'],
    tableRows: [
      ['3.5 × 4.5 cm', '35 × 45 mm', '1.38 × 1.77 in', '413 × 531 pixels'],
      ['5.0 × 5.0 cm', '50 × 50 mm', '1.97 × 1.97 in', '591 × 591 pixels'],
      ['5.08 × 5.08 cm', '50.8 × 50.8 mm', '2.0 × 2.0 in', '600 × 600 pixels'],
      ['5.0 × 7.0 cm', '50 × 70 mm', '1.97 × 2.76 in', '591 × 827 pixels'],
      ['10.0 × 15.0 cm', '100 × 150 mm', '3.94 × 5.91 in', '1181 × 1772 pixels'],
      ['21.0 × 29.7 cm', '210 × 297 mm', '8.27 × 11.69 in', '2480 × 3508 pixels'],
    ],
    faqs: [
      {
        q: 'Why 300 DPI for printing photos and documents?',
        a: 'At a normal reading distance of 12 to 15 inches, the human eye cannot distinguish individual dots exceeding 300 DPI. It produces photographic continuous-tone quality without visible pixels.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Image Tools', href: '/image-resizer-in-cm/' },
      { label: 'CM to Pixels at 300 DPI' },
    ],
  },

  // 17. EXIF Metadata Remover
  {
    filename: 'exif-metadata-remover.astro',
    title: 'Remove EXIF Metadata from Photo Online (100% Private)',
    description: 'Strip GPS coordinates, camera serials and sensitive metadata from JPG and PNG photos in browser. Fast, 100% private with zero server uploads.',
    badge: '100% Client-Side Privacy · GPS & Camera Tag Stripper',
    h1: 'Remove EXIF Metadata from Photo Online',
    subtitle: 'Strip hidden GPS location data, camera serial numbers, date/time stamps, and device info from JPG and PNG images before sharing online.',
    toolPreset: 'none',
    targetKb: null,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'What Hidden EXIF Data Does PixelKit Strip? (2026 Direct Answer)',
      summaryText: 'Smartphone cameras and digital DSLRs embed extensive metadata into every photograph: precise GPS coordinates of your location, timestamp, camera make/model, unique lens serial numbers, exposure settings, and device owner info. PixelKit strips all APP1..APP15 and ancillary chunks in memory, returning clean, anonymous photos.',
      portalName: 'Digital Privacy & Metadata Protection Standard',
      specs: [
        { label: 'GPS Location', value: 'Completely removed (Lat/Long/Altitude)', highlight: true },
        { label: 'Device & Camera', value: 'Removed (Make, Model, Lens Serial)', highlight: true },
        { label: 'Image Quality', value: '100% intact (No visual blur)' },
        { label: 'Server Upload', value: 'Zero (Runs 100% in browser)' },
      ],
    },
    tableTitle: 'Metadata Tags Stripped vs Preserved',
    tableDesc: 'Overview of information removed to protect your privacy:',
    tableHeaders: ['Metadata Field', 'Risk Level', 'Action Taken', 'Impact on Image Quality'],
    tableRows: [
      ['GPS Latitude & Longitude', 'Critical (Reveals home/work address)', 'Permanently Purged', 'Zero impact on quality'],
      ['Camera Model & Serial Number', 'High (Device fingerprinting)', 'Permanently Purged', 'Zero impact on quality'],
      ['Date & Time Taken', 'Medium (Timeline tracking)', 'Permanently Purged', 'Zero impact on quality'],
      ['Image Dimensions & Colors', 'None (Essential for viewing)', 'Preserved Exactly', '100% identical pixel visual fidelity'],
    ],
    faqs: [
      {
        q: 'Why should I remove EXIF data before posting photos online?',
        a: 'Photos taken with smartphones contain exact GPS coordinates embedded in EXIF tags. Anyone downloading the raw image can extract the exact street address where the photo was taken. Stripping EXIF protects your physical privacy.',
      },
      {
        q: 'Does PixelKit upload my photo to any server to strip metadata?',
        a: 'Never. PixelKit runs entirely in your browser memory using WebAssembly. Your photos are scrubbed locally and never leave your phone or computer.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Privacy Tools', href: '/compress-image/' },
      { label: 'EXIF Metadata Remover' },
    ],
  },

  // 18. WhatsApp DP Cropper
  {
    filename: 'whatsapp-dp-cropper.astro',
    title: 'WhatsApp DP Cropper Online (Square & Circle Mask)',
    description: 'Crop and resize profile pictures for WhatsApp DP without losing photo quality. 1:1 square crop with circular preview and zero server uploads.',
    badge: '1:1 Square & Circular Display Crop Studio',
    h1: 'WhatsApp DP Cropper & Resizer Online',
    subtitle: 'Crop your photo to a 1:1 square (640 × 640 px or 500 × 500 px) with an instant circular mask preview so your profile picture never gets cut off.',
    toolPreset: 'social-whatsapp-dp',
    targetKb: 200,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'WhatsApp Profile Picture Size & Aspect (2026 Direct Answer)',
      summaryText: 'WhatsApp profile pictures (DP) require a 1:1 square aspect ratio. The recommended resolution is 640 × 640 pixels (or 500 × 500 px minimum) in JPG or PNG format. Because WhatsApp masks your DP into a circle in chat lists, keep important facial features centered to prevent corners from being cropped out.',
      portalName: 'WhatsApp Profile Standard (Meta)',
      specs: [
        { label: 'Aspect Ratio', value: '1:1 Square (Circular Display)', highlight: true },
        { label: 'Recommended Resolution', value: '640 × 640 pixels (HD)', highlight: true },
        { label: 'Minimum Resolution', value: '192 × 192 pixels' },
        { label: 'File Format', value: 'JPG / PNG under 2 MB' },
      ],
    },
    tableTitle: 'WhatsApp Display Guidelines',
    tableDesc: 'Optimal dimensions for WhatsApp profile photos and status images:',
    tableHeaders: ['Format Type', 'Recommended Dimensions', 'Aspect Ratio', 'Display Frame'],
    tableRows: [
      ['WhatsApp Profile Photo (DP)', '640 × 640 px (or 500 × 500 px)', '1:1 Square', 'Circular mask in chats and calls'],
      ['WhatsApp Status Image', '1080 × 1920 px', '9:16 Vertical', 'Full mobile screen'],
      ['WhatsApp Channel Icon', '500 × 500 px', '1:1 Square', 'Circular icon'],
    ],
    faqs: [
      {
        q: 'Why does WhatsApp blur my profile photo when I set it?',
        a: 'If you upload an extremely large photo (e.g. 15MB 48MP raw image), WhatsApp aggressive client-side compression reduces quality heavily. Pre-rescaling to 640 × 640 px in PixelKit produces a clean, sharp DP with zero compression blur.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Social Tools', href: '/resize-image/' },
      { label: 'WhatsApp DP Cropper' },
    ],
  },

  // 19. LinkedIn Banner Resizer
  {
    filename: 'linkedin-banner-resizer.astro',
    title: 'LinkedIn Banner Resizer (1584x396 px Safe Zones)',
    description: 'Resize and crop LinkedIn profile cover banners to exact 1584x396 px (4:1 aspect ratio) with mobile avatar safe zone. Free & private in-browser.',
    badge: '1584×396 px · 4:1 Ratio · Mobile Safe Zone Compliant',
    h1: 'LinkedIn Banner Resizer Online',
    subtitle: 'Crop and rescale your LinkedIn personal background cover to exact 1584 × 396 px (4:1 ratio) keeping key text and graphics outside mobile avatar crop zones.',
    toolPreset: 'social-linkedin-banner',
    targetKb: 500,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'Official LinkedIn Banner Dimensions (2026 Direct Answer)',
      summaryText: 'LinkedIn recommends a personal profile background banner of 1584 × 396 pixels (exact 4:1 aspect ratio) under 8 MB in JPG or PNG format. Crucially, the circular profile picture overlaps the bottom-left area of the banner on both desktop and mobile; keep important contact details and typography centered or right-aligned.',
      portalName: 'LinkedIn Profile Specifications',
      specs: [
        { label: 'Recommended Dimensions', value: '1584 × 396 pixels', highlight: true },
        { label: 'Aspect Ratio', value: '4:1 Panoramic Ratio', highlight: true },
        { label: 'Max File Size', value: 'Under 8 MB (JPG/PNG)' },
        { label: 'Safe Zone Area', value: 'Center and Right-aligned' },
      ],
    },
    tableTitle: 'LinkedIn Visual Dimensions Reference',
    tableDesc: 'Official image sizes across personal and company LinkedIn pages:',
    tableHeaders: ['Image Type', 'Dimensions', 'Aspect Ratio', 'Notes'],
    tableRows: [
      ['Personal Profile Banner', '1584 × 396 pixels', '4:1', 'Leave bottom-left clear for avatar'],
      ['Company Page Cover', '1128 × 191 pixels', '5.91:1', 'Horizontal corporate banner'],
      ['Profile Picture Avatar', '400 × 400 pixels', '1:1 Square', 'Circular display crop'],
      ['Feed Shared Post Image', '1200 × 627 pixels', '1.91:1', 'Optimal link and photo preview'],
    ],
    faqs: [
      {
        q: 'Why does my LinkedIn banner look cropped on mobile phones?',
        a: 'On smartphones, the circular profile avatar moves towards the center-left and the sides of the banner are cropped to fit narrower screens. Placing text within the center-right safe zone ensures 100% visibility on both mobile and desktop.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Social Tools', href: '/resize-image/' },
      { label: 'LinkedIn Banner Resizer' },
    ],
  },

  // 20. YouTube Thumbnail Compressor Under 2MB
  {
    filename: 'youtube-thumbnail-compressor-under-2mb.astro',
    title: 'YouTube Thumbnail Compressor Under 2MB (1280x720 HD)',
    description: 'Compress and resize YouTube thumbnails strictly under 2MB (1280x720 px, 16:9 ratio) without blur. Fast client-side tool with zero server uploads.',
    badge: '1280×720 px · 16:9 Ratio · Strictly Under 2MB JPG',
    h1: 'YouTube Thumbnail Compressor Under 2MB',
    subtitle: 'Resize and compress custom YouTube video thumbnails strictly under 2.0 MB (1280 × 720 px HD) without loss of color vibrancy or visual sharpness.',
    toolPreset: 'social-yt-thumb',
    targetKb: 2000,
    from: 'jpg',
    to: 'jpg',
    fromMime: 'image/jpeg',
    toMime: 'image/jpeg',
    directAnswer: {
      title: 'YouTube Custom Thumbnail Rules (2026 Direct Answer)',
      summaryText: 'YouTube strictly limits custom video thumbnail uploads to a maximum file size of 2 MB (2,048 KB). The optimal resolution is 1280 × 720 pixels (minimum 640 px width) with a 16:9 widescreen aspect ratio in JPG, PNG, or GIF format. Any file exceeding 2.0 MB is immediately rejected by YouTube Studio.',
      portalName: 'YouTube Studio Specifications (Google)',
      specs: [
        { label: 'Maximum File Size', value: 'Strictly under 2.0 MB (2,048 KB)', highlight: true },
        { label: 'Optimal Resolution', value: '1280 × 720 pixels (HD)', highlight: true },
        { label: 'Aspect Ratio', value: '16:9 Widescreen' },
        { label: 'Accepted Formats', value: 'JPG, PNG, GIF' },
      ],
    },
    tableTitle: 'YouTube Video & Channel Image Specifications',
    tableDesc: 'Official guidelines from YouTube Creator Studio:',
    tableHeaders: ['Asset Type', 'Ideal Dimensions', 'Aspect Ratio', 'Max File Size'],
    tableRows: [
      ['Custom Video Thumbnail', '1280 × 720 pixels', '16:9 Widescreen', 'Max 2.0 MB strictly'],
      ['YouTube Channel Banner', '2560 × 1440 pixels', '16:9', 'Max 6.0 MB'],
      ['Channel Profile Picture', '800 × 800 pixels', '1:1 Square', 'Max 4.0 MB'],
      ['YouTube Shorts Thumbnail', '1080 × 1920 pixels', '9:16 Vertical', 'Max 2.0 MB'],
    ],
    faqs: [
      {
        q: 'Why does YouTube Studio say "File is bigger than 2MB"?',
        a: 'PNG thumbnails exported from Photoshop, Canva, or Figma often exceed 2.5MB to 4MB due to lossless compression. PixelKit automatically converts and binary-search compresses the thumbnail to ~1.6MB–1.9MB JPG while preserving full HD clarity.',
      },
      {
        q: 'Will compressing my thumbnail under 2MB reduce my CTR (Click-Through Rate)?',
        a: 'No. PixelKit uses advanced perceptual quantization that keeps vibrant colors, contrast, and text overlays pin-sharp. Viewers on mobile and desktop see identical high-resolution artwork.',
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Social Tools', href: '/compress-image/' },
      { label: 'YouTube Thumbnail Compressor' },
    ],
  },
];

function generateAstroPage(page) {
  const jsonLdStr = `const jsonLd = [
  buildSoftwareApplicationJsonLd({
    name: 'PixelKit ${page.h1.replace(/&amp;/g, '&')}',
    description: pageDesc,
    url: new URL('/${page.filename.replace('.astro', '')}/', SITE.url).href,
  }),
  buildFaqJsonLd(faqs),
  buildBreadcrumbJsonLd(
    breadcrumbs.map((b) => ({
      name: b.label,
      url: b.href ? new URL(b.href, SITE.url).href : undefined,
    }))
  ),
];`;

  return `---
import BaseLayout from '@layouts/BaseLayout.astro';
import Breadcrumbs from '@components/ui/Breadcrumbs.astro';
import Badge from '@components/ui/Badge.astro';
import ToolPreview from '@components/home/ToolPreview.astro';
import FAQSection from '@components/seo/FAQSection.astro';
import DirectAnswerBox from '@components/seo/DirectAnswerBox.astro';
import { SITE } from '@lib/constants';
import {
  buildSoftwareApplicationJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
} from '@lib/seo/jsonld';

const breadcrumbs = ${JSON.stringify(page.breadcrumbs, null, 2)};

const faqs = ${JSON.stringify(page.faqs, null, 2)};

const pageTitle = '${page.title}';
const pageDesc = '${page.description}';

${jsonLdStr}
---

<BaseLayout
  title={pageTitle}
  description={pageDesc}
  jsonLd={jsonLd}
  width="wide"
>
  <div class="mx-auto max-w-5xl px-2 sm:px-0">
    <Breadcrumbs items={breadcrumbs} />

    <header class="text-center mt-5 sm:mt-8">
      <Badge variant="muted" class="mx-auto inline-flex items-center gap-1.5 py-1 px-3 text-xs shadow-sm">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-success"></span>
        <span>${page.badge}</span>
      </Badge>

      <h1 class="mt-3.5 sm:mt-4 text-balance text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-fg">
        ${page.h1}
      </h1>

      <p class="mx-auto mt-3 sm:mt-4 max-w-2xl text-balance text-xs sm:text-base text-muted leading-relaxed">
        ${page.subtitle}
      </p>
    </header>

    <!-- GEO Direct Answer Definition Block -->
    <DirectAnswerBox
      title="${page.directAnswer.title}"
      summaryText="${page.directAnswer.summaryText}"
      portalName="${page.directAnswer.portalName}"
      specs={${JSON.stringify(page.directAnswer.specs)}}
    />

    <div class="mt-6 sm:mt-8">
      <ToolPreview
        from="${page.from}"
        to="${page.to}"
        fromMime="${page.fromMime}"
        toMime="${page.toMime}"
        ${page.targetKb ? `targetKb={${page.targetKb}}` : ''}
        initialTool="passport"
        ${page.toolPreset !== 'none' ? `preset="${page.toolPreset}"` : ''}
      />
    </div>

    <!-- Official Specification Table -->
    <section class="mt-12 sm:mt-16 rounded-2xl border border-border/80 bg-surface/90 p-5 sm:p-8 shadow-xs">
      <h2 class="text-lg sm:text-2xl font-bold tracking-tight text-fg">
        ${page.tableTitle}
      </h2>
      <p class="mt-1 text-xs sm:text-sm text-muted">
        ${page.tableDesc}
      </p>

      <div class="mt-6 overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr class="border-b border-border bg-surface text-fg font-semibold">
              ${page.tableHeaders.map((h) => `<th class="py-3 px-4">${h}</th>`).join('\n              ')}
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            ${page.tableRows
              .map(
                (row) => `<tr>
              ${row
                .map(
                  (cell, i) =>
                    `<td class="py-3 px-4 ${i === 0 ? 'font-medium text-fg' : 'text-muted'}">${cell}</td>`
                )
                .join('\n              ')}
            </tr>`
              )
              .join('\n            ')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Technical Principles Section -->
    <section class="mt-12 sm:mt-16 rounded-2xl border border-border/80 bg-surface/90 p-5 sm:p-8 shadow-xs">
      <h2 class="text-lg sm:text-2xl font-bold tracking-tight text-fg">
        Why In-Browser Processing is Essential for Sensitive Photos &amp; IDs
      </h2>
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm text-muted leading-relaxed">
        <div class="p-4 rounded-xl bg-surface/50 border border-border/50">
          <h3 class="font-semibold text-fg text-sm mb-1.5 flex items-center gap-1.5">
            <span>🔒</span> Zero Cloud Uploads
          </h3>
          <p>Signatures, Aadhaar IDs, and passport photos are sensitive personal biometric assets. PixelKit processes all operations locally in browser RAM.</p>
        </div>
        <div class="p-4 rounded-xl bg-surface/50 border border-border/50">
          <h3 class="font-semibold text-fg text-sm mb-1.5 flex items-center gap-1.5">
            <span>⚡</span> Sub-Second Quantization
          </h3>
          <p>Powered by WebAssembly and Canvas binary-search encoding, resizing and compressing takes under 200ms with zero server latency.</p>
        </div>
        <div class="p-4 rounded-xl bg-surface/50 border border-border/50">
          <h3 class="font-semibold text-fg text-sm mb-1.5 flex items-center gap-1.5">
            <span>🎯</span> Portal Pass Guarantee
          </h3>
          <p>Dimensions, aspect ratios, and KB file limits are locked directly to the official government guidelines for immediate intake clearance.</p>
        </div>
      </div>
    </section>

    <FAQSection faqs={faqs} />
  </div>
</BaseLayout>
`;
}

console.log('Generating 20 new high-intent P4 expansion pages in src/pages/...');
for (const p of pages) {
  const filePath = path.join('src/pages', p.filename);
  const code = generateAstroPage(p);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✓ Created ${filePath} (${p.title.length} chars title, ${p.description.length} chars desc)`);
}
console.log('All 20 pages created successfully.');
