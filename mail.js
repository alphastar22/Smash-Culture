/* Sends email through Resend (https://resend.com) using plain fetch — no packages to install.
   The API key is read from the RESEND_API_KEY environment variable that you set in Netlify.
   It never appears in the website's files. */
"use strict";

const DEFAULT_CLUB_EMAIL = "smashcultureclubzc2k26@gmail.com";

function getConfig(env = process.env) {
  return {
    apiKey: (env.RESEND_API_KEY || "").trim(),
    to: (env.NOTIFY_EMAIL || DEFAULT_CLUB_EMAIL).trim(),
    // "onboarding@resend.dev" works immediately but can only deliver to the email you signed up to Resend with.
    from: (env.FROM_EMAIL || "Smash Culture Club <onboarding@resend.dev>").trim(),
    sendConfirmation: String(env.SEND_CONFIRMATION || "").toLowerCase() === "true",
  };
}

/** Returns { ok: true, id } or { ok: false, status, reason }. Never throws. */
async function sendEmail({ apiKey, payload, idempotencyKey, timeoutMs = 10000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (res.ok && data && data.id) return { ok: true, id: data.id };
    return { ok: false, status: res.status, reason: (data && (data.name || data.message)) || "unknown" };
  } catch (err) {
    return { ok: false, status: 0, reason: err && err.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

/** Parses and size-checks the request. Returns { error: response } or { data }. */
function readJsonBody(event) {
  if (event.httpMethod !== "POST") {
    const r = json(405, { ok: false, message: "Method not allowed." });
    r.headers.Allow = "POST";
    return { error: r };
  }
  let raw = event.body || "";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  if (raw.length > 12000) return { error: json(413, { ok: false, message: "That request is too large." }) };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("bad");
    return { data };
  } catch (_) {
    return { error: json(400, { ok: false, message: "We couldn’t read that request. Please try again." }) };
  }
}

function manilaTime(date = new Date()) {
  const local = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full", timeStyle: "long", timeZone: "Asia/Manila",
  }).format(date);
  return `${local} (${date.toISOString()} UTC)`;
}

module.exports = { getConfig, sendEmail, json, readJsonBody, manilaTime, DEFAULT_CLUB_EMAIL };
