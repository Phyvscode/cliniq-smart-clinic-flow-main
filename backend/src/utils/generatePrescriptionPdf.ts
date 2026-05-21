import path from "path";
import fs from "fs";

export interface PrescMedicine {
  name:              string;
  morning:           boolean;
  afternoon:         boolean;
  evening:           boolean;
  night:             boolean;
  frequencyInterval?: string | null;
  dosageAmount?:     number | null;
  dosageUnit?:       string | null;
  durationDays:      number;
  instructions?:     string;
}

export interface PrescData {
  doctorName:      string;
  specialization?: string;
  qualification?:  string;
  licenseNumber?:  string;
  address?:        string;
  signatureUrl?:   string;   // path to signature image on disk
  patientName:     string;
  patientAge:      number;
  patientGender:   string;
  date:            string;
  rxCode?:         string;   // e.g. 20260506001
  patientCode?:    string;   // permanent 6-digit patient code
  diagnosis?:      string;
  problems?:       string[];
  medicines:       PrescMedicine[];
  notes?:          string;
}

const freqLabel = (m: PrescMedicine): string => {
  if (m.frequencyInterval) {
    const map: Record<string, string> = { "4h":"Every 4 hrs","6h":"Every 6 hrs","8h":"Every 8 hrs","12h":"Every 12 hrs" };
    return map[m.frequencyInterval] ?? m.frequencyInterval;
  }
  const slots = [m.morning&&"Morning",m.afternoon&&"Afternoon",m.evening&&"Evening",m.night&&"Night"].filter(Boolean);
  return slots.length ? slots.join(", ") : "As directed";
};

const signatureBase64 = (sigPath: string): string => {
  try {
    const fullPath = path.isAbsolute(sigPath) ? sigPath : path.join(process.cwd(), sigPath);
    if (!fs.existsSync(fullPath)) return "";
    const buf  = fs.readFileSync(fullPath);
    const ext  = path.extname(sigPath).replace(".","").toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch { return ""; }
};

export const buildPrescriptionHtml = (data: PrescData): string => {
  const sigB64 = data.signatureUrl ? signatureBase64(data.signatureUrl) : "";

  const medicinesHtml = data.medicines.map((m, i) => {
    const dosage  = m.dosageAmount ? `${m.dosageAmount}${m.dosageUnit ?? ""}` : "";
    const timing  = freqLabel(m);
    const instr   = m.instructions ? `<span class="instr">${m.instructions}</span>` : "";
    return `
      <tr class="${i % 2 === 0 ? "even" : "odd"}">
        <td class="med-num">${i + 1}</td>
        <td class="med-name">${m.name}${dosage ? ` <span class="dosage">${dosage}</span>` : ""}</td>
        <td class="med-timing">${timing}</td>
        <td class="med-duration">${m.durationDays} day${m.durationDays !== 1 ? "s" : ""}</td>
        <td class="med-instr">${instr}</td>
      </tr>`;
  }).join("");

  const problemsHtml = data.problems?.length
    ? `<div class="complaints">
        <span class="section-label">Chief Complaints:</span>
        ${data.problems.map(p => `<span class="tag">${p}</span>`).join("")}
       </div>`
    : "";

  const diagnosisHtml = data.diagnosis
    ? `<div class="diagnosis-row">
        <span class="section-label">Diagnosis:</span>
        <span class="diagnosis-text">${data.diagnosis}</span>
       </div>`
    : "";

  const notesHtml = data.notes
    ? `<div class="notes-section">
        <div class="notes-label">Doctor's Notes</div>
        <div class="notes-text">${data.notes.replace(/\n/g, "<br/>")}</div>
       </div>`
    : "";

  const sigHtml = sigB64
    ? `<img src="${sigB64}" class="sig-img" alt="Signature" />`
    : `<div class="sig-line"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    padding: 28px 32px;
    background: #fff;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .clinic-brand { }
  .clinic-name { font-size: 26px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .clinic-sub  { font-size: 10px; color: #64748b; margin-top: 2px; }
  .doctor-info { text-align: right; }
  .doctor-name { font-size: 15px; font-weight: 700; color: #1e293b; }
  .doctor-sub  { font-size: 10px; color: #64748b; margin-top: 2px; line-height: 1.5; }

  /* ── Patient info bar ── */
  .patient-bar {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px;
    background: #f8faff;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  .info-cell label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
  .info-cell p     { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }

  /* ── Complaints + Diagnosis ── */
  .complaints, .diagnosis-row {
    margin-bottom: 10px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }
  .section-label { font-size: 10px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; padding-top: 2px; }
  .tag { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 10px; padding: 2px 8px; border-radius: 20px; }
  .diagnosis-text { font-size: 12px; font-weight: 600; color: #1e293b; }

  /* ── Medicines table ── */
  .table-header {
    font-size: 10px;
    font-weight: 700;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #dbeafe;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #2563eb; color: white; }
  thead th { padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
  tbody tr.even { background: #f8faff; }
  tbody tr.odd  { background: #fff; }
  tbody td { padding: 8px 10px; font-size: 11px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
  .med-num    { width: 28px; color: #94a3b8; font-weight: 700; }
  .med-name   { font-weight: 600; color: #1e293b; }
  .dosage     { background: #f0fdf4; color: #16a34a; font-size: 10px; padding: 1px 6px; border-radius: 4px; margin-left: 6px; font-weight: 600; }
  .med-timing { color: #475569; }
  .med-duration { color: #475569; white-space: nowrap; }
  .instr      { background: #fffbeb; color: #92400e; font-size: 10px; padding: 1px 6px; border-radius: 4px; }

  /* ── Notes ── */
  .notes-section {
    background: #f8faff;
    border: 1px solid #dbeafe;
    border-left: 3px solid #2563eb;
    border-radius: 0 8px 8px 0;
    padding: 10px 14px;
    margin-bottom: 20px;
  }
  .notes-label { font-size: 10px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .notes-text  { font-size: 11px; color: #374151; line-height: 1.7; }

  /* ── Footer / Signature ── */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #e2e8f0;
    padding-top: 14px;
    margin-top: 8px;
  }
  .footer-left  { font-size: 10px; color: #94a3b8; }
  .footer-right { text-align: right; }
  .sig-img      { width: 300px; height: 90px; object-fit: contain; display: block; margin-bottom: 4px; margin-left: auto; }
  .sig-line     { width: 140px; border-top: 1px solid #1a1a1a; margin-bottom: 4px; margin-left: auto; }
  .sig-name     { font-size: 11px; font-weight: 600; color: #1e293b; }
  .sig-sub      { font-size: 9px; color: #94a3b8; }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="clinic-brand">
    <div class="clinic-name">ClinIQ</div>
    <div class="clinic-sub">Smart Clinic Management</div>
  </div>
  <div class="doctor-info">
    <div class="doctor-name">Dr. ${data.doctorName}</div>
    ${data.specialization ? `<div class="doctor-sub">${data.specialization}</div>` : ""}
    ${data.qualification  ? `<div class="doctor-sub">${data.qualification}</div>`  : ""}
    ${data.licenseNumber  ? `<div class="doctor-sub">Reg. No: ${data.licenseNumber}</div>` : ""}
    ${data.address        ? `<div class="doctor-sub">${data.address}</div>` : ""}
  </div>
</div>

<!-- RxCode top right -->
${data.rxCode ? `<div style="text-align:right;margin-bottom:10px;">
  <span style="font-size:10px;color:#64748b;letter-spacing:0.5px;">Rx Code</span>
  <span style="font-family:monospace;font-size:13px;font-weight:700;color:#2563eb;margin-left:6px;">${data.rxCode}</span>
  ${data.patientCode ? `<span style="font-size:9px;color:#94a3b8;margin-left:10px;">Patient ID: ${data.patientCode}</span>` : ""}
</div>` : ""}

<!-- Patient Bar -->
<div class="patient-bar">
  <div class="info-cell"><label>Patient Name</label><p>${data.patientName}</p></div>
  <div class="info-cell"><label>Age / Gender</label><p>${data.patientAge} yrs / ${data.patientGender}</p></div>
  <div class="info-cell"><label>Date</label><p>${data.date}</p></div>
  <div class="info-cell"><label>Ref No.</label><p>#RX-${Date.now().toString().slice(-6)}</p></div>
</div>

<!-- Chief Complaints -->
${problemsHtml}

<!-- Diagnosis -->
${diagnosisHtml}

<!-- Medicines -->
<div class="table-header">Prescribed Medicines</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Medicine</th>
      <th>Frequency</th>
      <th>Duration</th>
      <th>Instructions</th>
    </tr>
  </thead>
  <tbody>${medicinesHtml}</tbody>
</table>

<!-- Doctor's Notes -->
${notesHtml}

<!-- Footer with Signature -->
<div class="footer">
  <div class="footer-left">
    <div>Generated by ClinIQ · ${data.date}</div>
    <div style="margin-top:3px;">This prescription is valid for 30 days from the date of issue.</div>
  </div>
  <div class="footer-right">
    ${sigHtml}
    <div class="sig-name">Dr. ${data.doctorName}</div>
    ${data.specialization ? `<div class="sig-sub">${data.specialization}</div>` : ""}
    <div class="sig-sub">Signature &amp; Stamp</div>
  </div>
</div>

</body>
</html>`;
};

export const generatePrescriptionPdf = async (data: PrescData, filename: string): Promise<string> => {
  const html       = buildPrescriptionHtml(data);
  const outputDir  = path.join(process.cwd(), "uploads", "prescriptions");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);

  // Find system Chrome
  const findChrome = (): string => {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      (process.env.LOCALAPPDATA ?? "") + "\\Google\\Chrome\\Application\\chrome.exe",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium",
    ];
    for (const c of candidates) {
      try { if (fs.existsSync(c)) return c; } catch {}
    }
    return "";
  };

  const executablePath = process.env.CHROME_PATH || findChrome();

  if (!executablePath) {
    // Fallback: save as HTML (printable from browser)
    const htmlPath = filePath.replace(/\.pdf$/, ".html");
    fs.writeFileSync(htmlPath, html);
    return htmlPath;
  }

  const puppeteer = require("puppeteer-core");
  const browser   = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path:            filePath,
      format:          "A4",
      margin:          { top:"15mm", right:"12mm", bottom:"15mm", left:"12mm" },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  return filePath;
};