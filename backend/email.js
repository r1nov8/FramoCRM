// Email utility for sending password reset emails
import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(to, resetUrl) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@framocrm.com',
    to,
    subject: 'Framo CRM Password Reset',
    html: `<p>You requested a password reset for your Framo CRM account.</p>
           <p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 1 hour.</p>`
  });
}
