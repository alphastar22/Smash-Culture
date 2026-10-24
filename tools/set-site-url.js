/* Runs during the Netlify build. Social-share previews need the full web address,
   so this replaces %SITE_URL% in the pages with your real site address.
   Netlify provides it automatically (URL). If you add a custom domain, it is picked up too.
   You can force a value by setting SITE_URL in Netlify's environment variables. */
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "public");
const url = (process.env.SITE_URL || process.env.URL || "").replace(/\/+$/, "");
let n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const p = path.join(dir, f);
  const before = fs.readFileSync(p, "utf8");
  const after = before.split("%SITE_URL%").join(url);
  if (after !== before) { fs.writeFileSync(p, after); n++; }
}
console.log(url ? `Site URL set to ${url} in ${n} page(s).` : "No site URL available; share previews will use relative paths.");
