/* Input checking + cleaning for the two form functions.
   Runs on the SERVER, so it cannot be skipped by editing the web page. */
"use strict";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Remove control characters and trim. Keeps normal letters (including ñ, é, etc.).
function clean(value) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

// Philippine mobile (09XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX) or international E.164 (+ then 8-15 digits).
function isValidPhone(value) {
  const s = String(value).replace(/[\s\-().]/g, "");
  return /^(\+?63|0)9\d{9}$/.test(s) || /^\+[1-9]\d{7,14}$/.test(s);
}

const FIELDS = {
  firstName: { label: "first name", max: 60 },
  lastName: { label: "last name", max: 60 },
  nickname: { label: "nickname", max: 40 },
  address: { label: "address", max: 250, min: 5 },
  contactNumber: { label: "contact number", max: 25, phone: true },
  email: { label: "email address", max: 120, email: true },
  name: { label: "name", max: 100 },
  message: { label: "message", max: 2000, min: 5 },
};

function validate(input, names) {
  const values = {};
  const errors = {};
  for (const name of names) {
    const rule = FIELDS[name];
    const v = clean(input && input[name]);
    values[name] = v;
    if (!v) errors[name] = `Please enter your ${rule.label}.`;
    else if (rule.min && v.length < rule.min) errors[name] = `Your ${rule.label} looks too short.`;
    else if (v.length > rule.max) errors[name] = `Your ${rule.label} is too long (max ${rule.max} characters).`;
    else if (rule.email && !EMAIL_RE.test(v)) errors[name] = "Please enter a valid email address.";
    else if (rule.phone && !isValidPhone(v)) errors[name] = "Please enter a valid Philippine mobile number or an international number starting with +.";
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}

// Only letters, digits and dashes: safe to use as an "Idempotency-Key" header.
function safeSubmissionId(id) {
  const s = String(id || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 64);
  return s.length >= 8 ? s : "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = { validate, clean, isValidPhone, safeSubmissionId, escapeHtml, EMAIL_RE };
