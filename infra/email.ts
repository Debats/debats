import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailParams {
  to: string
  subject: string
  text: string
  replyTo?: string
}

export async function sendEmail({ to, subject, text, replyTo }: SendEmailParams) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    replyTo,
  })
}
