const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const buildTicketPayload = (registration, event) => ({
  ticketId: registration.ticketId,
  registrationId: registration._id,
  eventId: event._id,
  eventTitle: event.title,
  participantName: registration.participantName,
  participantEmail: registration.email
});

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const sendTicketEmail = async (registration, event, qrDataUrl) => {
  const transporter = getTransporter();
  if (!transporter) {
    return;
  }

  const from = process.env.SMTP_FROM || 'no-reply@eventhub.local';
  const subject = `Your Ticket: ${event.title}`;
  const html = `
    <p>Hi ${registration.participantName},</p>
    <p>Your ticket for <strong>${event.title}</strong> is confirmed.</p>
    <p><strong>Ticket ID:</strong> ${registration.ticketId}</p>
    <p>Please keep this QR code ready at check-in.</p>
    <img src="${qrDataUrl}" alt="Ticket QR" style="max-width:240px;" />
    <p>Thanks,<br/>EventHub</p>
  `;

  await transporter.sendMail({
    from,
    to: registration.email,
    subject,
    html
  });
};

const issueTicket = async (registration, event) => {
  if (registration.ticketQr) {
    return registration;
  }

  const payload = buildTicketPayload(registration, event);
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload));

  registration.ticketQr = qrDataUrl;
  registration.ticketIssuedAt = new Date();
  await registration.save();

  await sendTicketEmail(registration, event, qrDataUrl);
  return registration;
};

module.exports = {
  issueTicket
};
