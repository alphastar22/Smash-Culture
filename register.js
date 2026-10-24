/* POST /.netlify/functions/register
   Validates the registration, then emails it to the club inbox.
   It answers { ok: true } ONLY when the email service accepted the message. */
"use strict";

const { validate, safeSubmissionId, escapeHtml } = require("../lib/validate");
const { getConfig, sendEmail, json, readJsonBody, manilaTime } = require("../lib/mail");

const FIELD_LIST = ["firstName", "lastName", "nickname", "address", "contactNumber", "email"];
const SUBJECT = "New Smash Culture Club Registration";

function buildAdminEmail(v, when) {
  const rows = [
    ["First name", v.firstName],
    ["Last name", v.lastName],
    ["Nickname", v.nickname],
    ["Address", v.address],
    ["Contact number", v.contactNumber],
    ["Email address", v.email],
    ["Submitted", when],
  ];
  const text = rows.map(([k, val]) => `${k}: ${val}`).join("\n");
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:560px">` +
    `<h2 style="color:#003B25;margin:0 0 12px">New Smash Culture Club Registration</h2>` +
    `<table style="border-collapse:collapse;width:100%">` +
    rows.map(([k, val]) =>
      `<tr><td style="padding:8px 12px;border:1px solid #dde5de;background:#f7f5e9;font-weight:bold;width:150px;vertical-align:top">${escapeHtml(k)}</td>` +
      `<td style="padding:8px 12px;border:1px solid #dde5de;vertical-align:top">${escapeHtml(val).replace(/\n/g, "<br>")}</td></tr>`).join("") +
    `</table><p style="color:#46594d;font-size:13px">Reply to this email to answer the registrant directly.</p></div>`;
  return { text, html };
}

exports.handler = async (event) => {
  const parsed = readJsonBody(event);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  // Hidden "website" field: humans never see it, spam bots fill it in.
  if (body.website) return json(400, { ok: false, message: "We couldn’t process that submission." });

  const { values, errors, ok } = validate(body, FIELD_LIST);
  if (!ok) return json(400, { ok: false, message: "Please fix the highlighted fields and try again.", errors });

  const cfg = getConfig();
  if (!cfg.apiKey) {
    console.error("RESEND_API_KEY is not set in the Netlify environment variables.");
    return json(503, { ok: false, message: "Registration isn’t switched on yet, so nothing was submitted." });
  }

  const when = manilaTime();
  const { text, html } = buildAdminEmail(values, when);
  const submissionId = safeSubmissionId(body.submissionId);

  const sent = await sendEmail({
    apiKey: cfg.apiKey,
    idempotencyKey: submissionId ? `reg-${submissionId}` : undefined,
    payload: { from: cfg.from, to: [cfg.to], reply_to: values.email, subject: SUBJECT, text, html },
  });

  if (!sent.ok) {
    console.error(`Registration email failed: status=${sent.status} reason=${sent.reason}`);
    return json(502, { ok: false, message: "We couldn’t deliver your registration just now, so it was not submitted." });
  }

  // Optional friendly confirmation to the registrant. A failure here never fails the registration.
  let confirmationSent = false;
  if (cfg.sendConfirmation) {
    const c = await sendEmail({
      apiKey: cfg.apiKey,
      idempotencyKey: submissionId ? `conf-${submissionId}` : undefined,
      payload: {
        from: cfg.from,
        to: [values.email],
        subject: "Welcome to Smash Culture Pickleball Club",
        text: `Hi ${values.nickname},\n\nThanks for registering with Smash Culture Pickleball Club. We’ve received your details and will be in touch.\n\nSmash Your Limits.\nSmash Culture Pickleball Club`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="color:#003B25">Welcome to the culture, ${escapeHtml(values.nickname)}!</h2><p>Thanks for registering with Smash Culture Pickleball Club. We’ve received your details and will be in touch.</p><p><strong>Smash Your Limits.</strong></p></div>`,
      },
    });
    confirmationSent = c.ok;
    if (!c.ok) console.error(`Confirmation email failed: status=${c.status} reason=${c.reason}`);
  }

  return json(200, { ok: true, confirmationSent });
};
