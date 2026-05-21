import { Response } from "express";
import path from "path";
import fs from "fs";
import Prescription from "../models/Prescription";
import Staff from "../models/Staff";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const calcAge = (dob: any): number => {
  if (!dob) return 0;
  const today = new Date(); const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// Find Chrome executable on Windows / Mac / Linux
const findChrome = (): string => {
  const candidates = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return "";
};

// Generate PDF from HTML using puppeteer-core + system Chrome
const generatePdfFromHtml = async (html: string, outputPath: string): Promise<void> => {
  const puppeteer = require("puppeteer-core");
  const executablePath = process.env.CHROME_PATH || findChrome();

  if (!executablePath) {
    throw new Error(
      "Chrome not found. Set CHROME_PATH env variable to your Chrome executable path.\n" +
      "e.g. CHROME_PATH=\"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe\""
    );
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path:            outputPath,
      format:          "A4",
      margin:          { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
};

// ── GET /api/prescriptions/:id/lab-form ──────────────────────────────────────
export const downloadLabForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rx = await Prescription.findById(req.params.id)
    .populate("patient")
    .populate("doctor", "name");

  if (!rx) {
    res.status(404).json({ message: "Prescription not found" }); return;
  }
  if (!rx.labTests || rx.labTests.tests.length === 0) {
    res.status(400).json({ message: "No lab tests found on this prescription" }); return;
  }

  const patient      = rx.patient as any;
  const doctor       = rx.doctor  as any;
  const staffProfile = await Staff.findOne({ user: doctor._id });
  const patientAge   = patient.dateOfBirth ? calcAge(patient.dateOfBirth) : (patient.age ?? 0);
  const dateStr      = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const testsHtml = rx.labTests.tests
    .map(t => `
      <div class="test-item">
        <div class="checkbox"></div>
        <span>${t}</span>
      </div>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:"Segoe UI",Arial,sans-serif; font-size:12px; color:#1a1a1a; padding:32px; background:#fff; }

    .header { display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2px solid #2563eb; padding-bottom:16px; margin-bottom:20px; }
    .clinic-name { font-size:22px; font-weight:700; color:#2563eb; letter-spacing:-0.5px; }
    .doctor-info { text-align:right; }
    .doctor-name { font-size:14px; font-weight:600; }
    .doctor-sub  { font-size:11px; color:#555; margin-top:2px; }

    .title-bar { background:#2563eb; color:#fff; text-align:center; padding:8px; border-radius:6px; font-size:14px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px; }

    .patient-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; background:#f8faff; border:1px solid #dbeafe; border-radius:8px; padding:14px; margin-bottom:20px; }
    .info-item label { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:0.5px; }
    .info-item p { font-size:13px; font-weight:600; margin-top:2px; }

    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#2563eb; border-bottom:1px solid #dbeafe; padding-bottom:6px; margin-bottom:12px; }
    .tests-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px; }
    .test-item { display:flex; align-items:center; gap:8px; padding:7px 10px; background:#f8faff; border:1px solid #dbeafe; border-radius:6px; }
    .checkbox { width:14px; height:14px; border:1.5px solid #2563eb; border-radius:3px; flex-shrink:0; }
    .test-item span { font-size:11.5px; }

    .notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px; margin-bottom:20px; }
    .notes-box .label { font-size:10px; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
    .notes-box p { font-size:12px; color:#78350f; }

    .referral-box { background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px; margin-bottom:20px; }
    .referral-box .label { font-size:10px; color:#166534; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
    .referral-box p { font-size:12px; color:#15803d; }

    .footer { display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid #e5e7eb; padding-top:16px; margin-top:8px; }
    .sig-line { width:160px; border-top:1px solid #1a1a1a; text-align:center; padding-top:4px; font-size:10px; color:#555; }
    .date-info { font-size:11px; color:#888; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-name">ClinIQ</div>
      <div style="font-size:11px;color:#555;margin-top:3px;">Smart Clinic Management</div>
    </div>
    <div class="doctor-info">
      <div class="doctor-name">Dr. ${doctor.name}</div>
      ${staffProfile?.specialization ? `<div class="doctor-sub">${staffProfile.specialization}</div>` : ""}
      ${staffProfile?.qualification  ? `<div class="doctor-sub">${staffProfile.qualification}</div>`  : ""}
      ${staffProfile?.licenseNumber  ? `<div class="doctor-sub">Reg. No: ${staffProfile.licenseNumber}</div>` : ""}
    </div>
  </div>

  <div class="title-bar">Lab Investigation Requisition Form</div>

  <div class="patient-grid">
    <div class="info-item"><label>Patient Name</label><p>${patient.name}</p></div>
    <div class="info-item"><label>Age / Gender</label><p>${patientAge} yrs / ${patient.gender}</p></div>
    <div class="info-item"><label>Date</label><p>${dateStr}</p></div>
    <div class="info-item"><label>Phone</label><p>${patient.phone || "—"}</p></div>
    ${patient.bloodGroup ? `<div class="info-item"><label>Blood Group</label><p>${patient.bloodGroup}</p></div>` : ""}
    ${rx.problems?.length ? `<div class="info-item" style="grid-column:span 2"><label>Chief Complaints</label><p>${rx.problems.join(", ")}</p></div>` : ""}
  </div>

  <div class="section-title">Investigations Requested</div>
  <div class="tests-grid">${testsHtml}</div>

  ${rx.labTests.notes ? `
  <div class="notes-box">
    <div class="label">Special Instructions</div>
    <p>${rx.labTests.notes}</p>
  </div>` : ""}

  ${rx.referral?.specialist ? `
  <div class="referral-box">
    <div class="label">Referred To</div>
    <p><strong>${rx.referral.specialist}</strong>${rx.referral.notes ? ` — ${rx.referral.notes}` : ""}</p>
  </div>` : ""}

  <div class="footer">
    <div class="date-info">Generated on ${dateStr}</div>
    <div class="sig-line">Dr. ${doctor.name}<br/>Signature &amp; Stamp</div>
  </div>
</body>
</html>`;

  const outputDir = path.join(process.cwd(), "uploads", "prescriptions");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `lab_form_${req.params.id}_${Date.now()}.pdf`;
  const filePath = path.join(outputDir, filename);

  try {
    await generatePdfFromHtml(html, filePath);
  } catch (err: any) {
    // Chrome not found — return the HTML directly so it can be printed from browser
    console.error("PDF generation failed:", err.message);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `inline; filename="lab_form.html"`);
    res.send(html);
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition",
    `attachment; filename="lab_form_${patient.name.replace(/\s+/g, "_")}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});