import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  MAIL_FROM,
} = process.env;

let transporter;

export function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    // Fallback to a no-op transport if SMTP isn't configured
    transporter = {
      sendMail: async () => {
        return { messageId: "disabled-mailer" };
      },
    };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || "").toLowerCase() === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendRegistrationEmail({ to, name, course }) {
  const transport = getTransporter();
  const from = MAIL_FROM || SMTP_USER || "no-reply@example.com";
  const subject = "Welcome to the Institute!";
  const html = `
    <div style="font-family:Arial,sans-serif;">
      <h2>Welcome, ${name} 🎓</h2>
      <p>Your registration for <strong>${course}</strong> is complete.</p>
      <p>You can now log in to your dashboard to view tasks, track progress and attendance.</p>
      <p>Regards,<br/>Institute Team</p>
    </div>
  `;
  try {
    await transport.sendMail({ from, to, subject, html });
  } catch (e) {
    // Non-blocking: log and continue
    console.warn("Email send failed:", e?.message || e);
  }
}

