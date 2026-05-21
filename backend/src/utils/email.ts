import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

// ── OTP Email (for forgot PIN / forgot password) ───────────────────────────────
export const sendOtpEmail = async (to: string, name: string, otp: string): Promise<void> => {
  const transporter = createTransporter();
  const clinic = "ClinIQ";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:0}
    .c{max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .h{background:#2563eb;padding:28px;text-align:center}.h h1{color:#fff;margin:0;font-size:22px}
    .b{padding:32px}
    .otp{background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;padding:28px;text-align:center;margin:24px 0}
    .otp p{margin:0 0 10px;font-size:13px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .otp code{font-size:40px;font-family:monospace;color:#1d4ed8;font-weight:900;letter-spacing:10px}
    .exp{text-align:center;font-size:13px;color:#ef4444;font-weight:600;margin-bottom:20px}
    .note{font-size:13px;color:#71717a;line-height:1.6}
    .f{padding:16px 32px;border-top:1px solid #f4f4f5;text-align:center}.f p{font-size:11px;color:#a1a1aa;margin:0}
  </style></head>
  <body><div class="c">
    <div class="h"><h1>${clinic} — Verification Code</h1></div>
    <div class="b">
      <p style="color:#18181b;font-size:15px;">Hi <strong>${name}</strong>,</p>
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;">Use the code below to reset your PIN. It expires in 20 minutes.</p>
      <div class="otp"><p>Your Verification Code</p><code>${otp}</code></div>
      <p class="exp">⏱ Expires in 20 minutes</p>
      <p class="note">Never share this code with anyone. ${clinic} staff will never ask for it.</p>
    </div>
    <div class="f"><p>© ${new Date().getFullYear()} ${clinic}. Do not reply.</p></div>
  </div></body></html>`;
  await transporter.sendMail({
    from: `"${clinic}" <${process.env.SMTP_USER}>`,
    to, subject: `${otp} is your ${clinic} verification code`, html,
  });
};

// ── Credentials Email (sends PIN to new doctor/receptionist) ───────────────────
export interface CredentialsEmailOptions {
  to:          string;
  name:        string;
  role:        "doctor" | "reception";
  email:       string;
  pin:         string;
  clinicName?: string;
}

export const sendCredentialsEmail = async (opts: CredentialsEmailOptions): Promise<void> => {
  const transporter = createTransporter();
  const clinic      = opts.clinicName || "ClinIQ";
  const roleLabel   = opts.role === "doctor" ? "Doctor" : "Receptionist";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;margin:0;padding:0}
    .c{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .h{background:#2563eb;padding:32px;text-align:center}
    .h h1{color:#fff;margin:0;font-size:24px}.h p{color:rgba(255,255,255,.75);margin:6px 0 0;font-size:14px}
    .b{padding:32px}
    .info{background:#f4f4f5;border-radius:12px;padding:20px;margin:20px 0}
    .info p{margin:0 0 6px;font-size:13px;color:#71717a}.info strong{color:#18181b;font-size:15px}
    .pin-box{background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;padding:28px;text-align:center;margin:20px 0}
    .pin-box p{margin:0 0 10px;font-size:13px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .pin-box code{font-size:42px;font-family:monospace;color:#1d4ed8;font-weight:900;letter-spacing:12px}
    .note{font-size:13px;color:#71717a;line-height:1.6;margin-top:16px}
    .f{padding:16px 32px;border-top:1px solid #f4f4f5;text-align:center}.f p{font-size:11px;color:#a1a1aa;margin:0}
  </style></head>
  <body><div class="c">
    <div class="h"><h1>${clinic}</h1><p>Smart Clinic Management</p></div>
    <div class="b">
      <p style="font-size:16px;color:#18181b;">Hello <strong>${opts.name}</strong>,</p>
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
        Welcome to ${clinic}! Your ${roleLabel} account has been created by the admin.
        Use the PIN below to log in.
      </p>
      <div class="info">
        <p>Login Email</p><strong>${opts.email}</strong>
        <p style="margin-top:12px;">Role</p><strong>${roleLabel}</strong>
      </div>
      <div class="pin-box">
        <p>Your 6-Digit Login PIN</p>
        <code>${opts.pin}</code>
      </div>
      <p class="note">
        Please change your PIN after your first login. Keep it safe and do not share it with anyone.
      </p>
      <p class="note">
        Login at: <a href="${process.env.CLIENT_URL || "http://localhost:5173"}" style="color:#2563eb;">
          ${process.env.CLIENT_URL || "http://localhost:5173"}
        </a>
      </p>
    </div>
    <div class="f"><p>© ${new Date().getFullYear()} ${clinic}. Automated email — do not reply.</p></div>
  </div></body></html>`;
  await transporter.sendMail({
    from:    `"${clinic}" <${process.env.SMTP_USER}>`,
    to:      opts.to,
    subject: `Your ${clinic} ${roleLabel} Login PIN`,
    html,
  });
};