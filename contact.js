/* POST /.netlify/functions/contact
   Emails a message from the Contact page to the club inbox. Same honesty rule as register.js. */
"use strict";

const { validate, safeSubmissionId, escapeHtml } = require("../lib/validate");
const { getConfig, sendEmail, json, readJsonBody, manilaTime } = require("../lib/mail");

const SUBJECT = "New Smash Culture Club Message";

exports.handler = async (event) => {
  const parsed = readJsonBody(event);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  if (body.website) return json(400, { ok: false, message: "We couldn’t process that submission." });

  const { values, errors, ok } = validate(body, ["name", "email", "message"]);
  if (!ok) return json(400, { ok: false, message: "Please fix the highlighted fields and try again.", errors });

  const cfg = getConfig();
  if (!cfg.apiKey) {
    console.error("RESEND_API_KEY is not set in the Netlify environment variables.");
    return json(503, { ok: false, message: "The message form isn’t switched on yet, so nothing was sent." });
  }

  const when = manilaTime();
  const text = `Name: ${values.name}\nEmail: ${values.email}\nSent: ${when}\n\nMessage:\n${values.message}`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="color:#003B25">New Smash Culture Club Message</h2>` +
    `<p><strong>Name:</strong> ${escapeHtml(values.name)}<br><strong>Email:</strong> ${escapeHtml(values.email)}<br><strong>Sent:</strong> ${escapeHtml(when)}</p>` +
    `<p style="white-space:pre-wrap;border-left:4px solid #C7F536;padding-left:12px">${escapeHtml(values.message)}</p>` +
    `<p style="color:#46594d;font-size:13px">Reply to this email to answer them directly.</p></div>`;

  const submissionId = safeSubmissionId(body.submissionId);
  const sent = await sendEmail({
    apiKey: cfg.apiKey,
    idempotencyKey: submissionId ? `msg-${submissionId}` : undefined,
    payload: { from: cfg.from, to: [cfg.to], reply_to: values.email, subject: SUBJECT, text, html },
  });
  if (!sent.ok) {
    console.error(`Contact email failed: status=${sent.status} reason=${sent.reason}`);
    return json(502, { ok: false, message: "We couldn’t send your message just now, so it was not sent." });
  }
  return json(200, { ok: true });
};
