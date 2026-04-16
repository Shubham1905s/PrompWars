import nodemailer from 'nodemailer';

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const port = parsePort(process.env.SMTP_PORT, 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function formatDateTime(isoOrDate) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return date.toLocaleString();
}

/**
 * Sends booking confirmation email (best-effort).
 * Requires SMTP_* env vars to be set.
 */
export async function sendBookingEmail({ to, booking, event, guidance, arriveAt }) {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: 'smtp_not_configured' };

  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  const subject = `Booking confirmed: ${event.name} (${booking.seatIds.length} seat${booking.seatIds.length === 1 ? '' : 's'})`;

  const startsAt = formatDateTime(event.startsAt);
  const endsAt = formatDateTime(event.endsAt);
  const arriveAtText = formatDateTime(arriveAt);

  const text = [
    `Your booking is confirmed!`,
    ``,
    `Event: ${event.name}`,
    `Venue: ${event.venue}`,
    `Starts: ${startsAt}`,
    `Ends: ${endsAt}`,
    ``,
    `Seats: ${booking.seatIds.join(', ')}`,
    `Amount: ₹${booking.amount}`,
    ``,
    `Recommended arrival: ${arriveAtText}`,
    `Gate: ${guidance.recommendedGate || booking.gate}`,
    `Parking: ${guidance.recommendedParking || booking.parkingZone}`,
    ``,
    guidance.message ? `Tip: ${guidance.message}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Booking confirmed</h2>
      <p style="margin: 0 0 16px;">Your dummy payment succeeded and your seats are booked.</p>
      <div style="padding: 14px 16px; border: 1px solid rgba(148,163,184,0.35); border-radius: 14px; margin-bottom: 14px;">
        <div><strong>Event:</strong> ${event.name}</div>
        <div><strong>Venue:</strong> ${event.venue}</div>
        <div><strong>Starts:</strong> ${startsAt}</div>
        <div><strong>Ends:</strong> ${endsAt}</div>
      </div>
      <div style="padding: 14px 16px; border: 1px solid rgba(148,163,184,0.35); border-radius: 14px; margin-bottom: 14px;">
        <div><strong>Seats:</strong> ${booking.seatIds.join(', ')}</div>
        <div><strong>Amount:</strong> ₹${booking.amount}</div>
      </div>
      <div style="padding: 14px 16px; border: 1px solid rgba(148,163,184,0.35); border-radius: 14px;">
        <div><strong>Recommended arrival:</strong> ${arriveAtText}</div>
        <div><strong>Gate:</strong> ${guidance.recommendedGate || booking.gate}</div>
        <div><strong>Parking:</strong> ${guidance.recommendedParking || booking.parkingZone}</div>
        ${guidance.message ? `<div style="margin-top: 10px; color: rgba(148,163,184,0.95);"><em>${guidance.message}</em></div>` : ''}
      </div>
    </div>
  `;

  await transport.sendMail({ from, to, subject, text, html });
  return { sent: true };
}

