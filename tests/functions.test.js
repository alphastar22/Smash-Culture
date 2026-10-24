/* Run with:  npm test   (needs Node 18+). Uses a FAKE email service: nothing is really sent. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const GOOD = {
  firstName: "Juan", lastName: "Dela Cruz", nickname: "JD", address: "12 Rizal St, Brgy 1, Sample City",
  contactNumber: "0917 123 4567", email: "juan@example.com", submissionId: "abc12345-test", website: "",
};
const ev = (body, method = "POST") => ({ httpMethod: method, body: typeof body === "string" ? body : JSON.stringify(body), headers: {} });

function setup({ key = "re_TEST_SECRET_KEY", resend = { status: 200, json: { id: "email_1" } }, env = {} } = {}) {
  for (const k of ["RESEND_API_KEY", "NOTIFY_EMAIL", "FROM_EMAIL", "SEND_CONFIRMATION"]) delete process.env[k];
  if (key) process.env.RESEND_API_KEY = key;
  Object.assign(process.env, env);
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    if (resend === "network") throw new Error("offline");
    return { ok: resend.status < 300, status: resend.status, json: async () => resend.json };
  };
  delete require.cache[require.resolve("../netlify/functions/register")];
  delete require.cache[require.resolve("../netlify/functions/contact")];
  return { calls, register: require("../netlify/functions/register").handler, contact: require("../netlify/functions/contact").handler };
}

test("valid registration emails the club with every field and the exact subject", async () => {
  const { calls, register } = setup();
  const res = await register(ev(GOOD));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).ok, true);
  assert.equal(calls.length, 1);
  const m = calls[0].body;
  assert.deepEqual(m.to, ["smashcultureclubzc2k26@gmail.com"]);
  assert.equal(m.subject, "New Smash Culture Club Registration");
  for (const v of ["Juan", "Dela Cruz", "JD", "12 Rizal St", "0917 123 4567", "juan@example.com"]) assert.ok(m.text.includes(v), v);
  assert.match(m.text, /Submitted: .*UTC/);
  assert.equal(m.reply_to, "juan@example.com");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer re_TEST_SECRET_KEY");
  assert.equal(calls[0].opts.headers["Idempotency-Key"], "reg-abc12345-test");
});

test("API key is never returned to the browser", async () => {
  const { register } = setup();
  const res = await register(ev(GOOD));
  assert.ok(!res.body.includes("re_TEST_SECRET_KEY"));
});

test("email service rejects -> error, NEVER success", async () => {
  for (const status of [401, 403, 422, 429, 500]) {
    const { register } = setup({ resend: { status, json: { name: "x", message: "no" } } });
    const res = await register(ev(GOOD));
    assert.equal(res.statusCode, 502, `status ${status}`);
    assert.equal(JSON.parse(res.body).ok, false);
  }
});

test("network failure -> error, NEVER success", async () => {
  const { register } = setup({ resend: "network" });
  const res = await register(ev(GOOD));
  assert.equal(res.statusCode, 502);
  assert.equal(JSON.parse(res.body).ok, false);
});

test("2xx without an email id is not treated as success", async () => {
  const { register } = setup({ resend: { status: 200, json: {} } });
  assert.equal((await register(ev(GOOD))).statusCode, 502);
});

test("missing API key -> clear 'not switched on' error, nothing sent", async () => {
  const { calls, register } = setup({ key: "" });
  const res = await register(ev(GOOD));
  assert.equal(res.statusCode, 503);
  assert.equal(JSON.parse(res.body).ok, false);
  assert.equal(calls.length, 0);
});

test("validation: missing/invalid fields are rejected with per-field messages", async () => {
  const { calls, register } = setup();
  const res = await register(ev({ ...GOOD, firstName: "", email: "nope", contactNumber: "123" }));
  assert.equal(res.statusCode, 400);
  const b = JSON.parse(res.body);
  assert.ok(b.errors.firstName && b.errors.email && b.errors.contactNumber);
  assert.equal(calls.length, 0);
});

test("phone numbers: PH and international accepted, junk rejected", () => {
  const { isValidPhone } = require("../netlify/lib/validate");
  for (const ok of ["09171234567", "0917 123 4567", "+639171234567", "639171234567", "+1 415 555 2671", "+44 20 7946 0958"]) assert.ok(isValidPhone(ok), ok);
  for (const bad of ["12345", "0817123456", "abc", "+0123456789", "09171234", ""]) assert.ok(!isValidPhone(bad), bad);
});

test("honeypot, wrong method, bad JSON, oversized body", async () => {
  const { calls, register } = setup();
  assert.equal((await register(ev({ ...GOOD, website: "http://spam" }))).statusCode, 400);
  assert.equal((await register(ev(GOOD, "GET"))).statusCode, 405);
  assert.equal((await register(ev("{not json"))).statusCode, 400);
  assert.equal((await register(ev("x".repeat(13000)))).statusCode, 413);
  assert.equal(calls.length, 0);
});

test("HTML in user input is escaped in the email", async () => {
  const { calls, register } = setup();
  await register(ev({ ...GOOD, nickname: "<script>alert(1)</script>" }));
  assert.ok(!calls[0].body.html.includes("<script>"));
  assert.ok(calls[0].body.html.includes("&lt;script&gt;"));
});

test("optional confirmation email: sent when enabled, failure does not fail registration", async () => {
  const on = setup({ env: { SEND_CONFIRMATION: "true" } });
  const r1 = await on.register(ev(GOOD));
  assert.equal(JSON.parse(r1.body).confirmationSent, true);
  assert.equal(on.calls.length, 2);
  assert.deepEqual(on.calls[1].body.to, ["juan@example.com"]);

  let n = 0;
  const off = setup({ env: { SEND_CONFIRMATION: "true" } });
  global.fetch = async () => (++n === 1 ? { ok: true, status: 200, json: async () => ({ id: "a" }) } : { ok: false, status: 403, json: async () => ({}) });
  const r2 = await off.register(ev(GOOD));
  assert.equal(r2.statusCode, 200);
  assert.equal(JSON.parse(r2.body).confirmationSent, false);
});

test("contact form emails the club with its own subject", async () => {
  const { calls, contact } = setup();
  const res = await contact(ev({ name: "Ana", email: "ana@example.com", message: "Do you have beginner nights?", website: "" }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls[0].body.subject, "New Smash Culture Club Message");
  assert.ok(calls[0].body.text.includes("beginner nights"));
  const bad = setup({ resend: { status: 500, json: {} } });
  assert.equal((await bad.contact(ev({ name: "Ana", email: "ana@example.com", message: "Hello there" }))).statusCode, 502);
});
