# Smash Culture Pickleball Club — Website

A fast, static website (plain HTML, CSS and JavaScript) with a small Netlify "function" that emails every registration to the club.

**Pages:** Home · Register · About Us · Contact Us · custom 404

---

## 1. What works right away vs. what needs setup

| Works immediately after deploying | Needs a one-time setup (about 10 minutes) |
|---|---|
| All four pages, navigation, mobile menu, animations | **Registration emails** (needs a free Resend account + one secret key) |
| Logo marquee, About story, values | **Contact-page message form** (uses the same setup) |
| Facebook button and Gmail-compose button | Optional: confirmation email to the person who registered (needs your own domain) |

Until the setup in Section 5 is done, the Register form will show a friendly error and **will not pretend to succeed**. It only shows "You're in" after the email service confirms it accepted the email. The Gmail and Facebook buttons need no setup.

> **Honest note:** I could not send a real email from my build environment, so the email step was tested with a simulated email service (12 automated tests) and has **not** been tested against your live Resend account. Section 9 walks you through the real test.

---

## 2. What's in this folder

```
smash-culture/
├── public/                  ← the website (this is what visitors see)
│   ├── index.html  register.html  about.html  contact.html  404.html
│   ├── css/style.css        ← all styling (brand colours are at the top)
│   ├── js/main.js           ← menu, animations, marquee, form handling
│   ├── js/init.js           ← 1-line helper
│   └── assets/
│       ├── logo.png  logo-sm.png  favicon.png  icon-*.png  og-image.jpg
│       ├── hero/            ← photos cropped from your promo banner
│       └── brands/          ← 16 individual brand logos (one file each)
├── netlify/
│   ├── functions/register.js   ← emails registrations to the club
│   ├── functions/contact.js    ← emails Contact-page messages
│   └── lib/                    ← shared checking + email code
├── tests/functions.test.js  ← automated tests for the email code
├── tools/                   ← helper scripts (you can ignore these)
├── netlify.toml             ← Netlify settings
├── .env.example             ← shows which secret settings exist (contains NO secrets)
└── README.md
```

---

## 3. Preview the site on your computer

1. Unzip the project.
2. Open the `public` folder and double-click **index.html**. It opens in your browser and all four pages and the marquee work.
3. The registration/contact **forms will show an error** when previewed this way. That is expected: they need Netlify to run the email function.

(Optional, for testing the forms locally: install [Node.js](https://nodejs.org), copy `.env.example` to `.env`, fill in the key, then run `npm run dev` in the project folder.)

---

## 4. Replace logos, photos and brand logos

- **Club logo:** replace `public/assets/logo.png` (and `logo-sm.png`, `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.jpg`) with new files **using the same names**. Square PNGs work best.
- **Brand marquee:** each brand is one square image in `public/assets/brands/` (`joola.png`, `head.png`, …). To use an official logo file instead, save it with the same name. To add a brand, copy one `<li class="marquee__item">…</li>` line in `index.html` and point it to your new file.
- **Photos:** `public/assets/hero/paddle-balls.jpg` is the main photo. Replace it with any landscape photo (about 1000×500 px).

> **Brand logos:** the 16 brand tiles were cut from the collage you supplied. They are other companies' trademarks and are shown "for inspiration" with a disclaimer on the page. If you want to be safe, get permission or official logo files from the brands, or remove the section.

---

## 5. Set up registration emails (free)

You'll use **Resend** (resend.com). Its free plan allows 3,000 emails a month and 100 a day (as of when this was written).

**A. Create the account (use the club email!)**
1. Go to resend.com and sign up using **smashcultureclubzc2k26@gmail.com**. This matters: without a verified domain, Resend only delivers to the email you signed up with, and that happens to be the address we want.
2. Confirm the verification email Resend sends to that Gmail.
3. In Resend, open **API Keys → Create API Key** (permission: "Sending access"). Copy the key (starts with `re_`). **Treat it like a password.** Don't paste it into any file in this folder or send it to anyone.

**B. Add it to Netlify** (after Section 7)
1. In Netlify open your site → **Site configuration → Environment variables → Add a variable**.
2. Name: `RESEND_API_KEY` Value: *your key*. Save.
3. Optional names (the defaults already work): `NOTIFY_EMAIL` (where emails go; default is the club Gmail), `FROM_EMAIL`, `SEND_CONFIRMATION`.
4. **Redeploy** (Deploys → Trigger deploy → Deploy site). Variables only apply to new deploys.

**C. Optional: confirmation email to the registrant.** Resend can only email other people from a domain you own and verify (Resend → Domains). If you buy one later: verify it, set `FROM_EMAIL` to something like `Smash Culture <hello@yourdomain.com>` and `SEND_CONFIRMATION` to `true`. Skip this for now; the club notification works without it.

**What you'll receive:** an email titled **New Smash Culture Club Registration** with first name, last name, nickname, address, contact number, email and the submission date/time (Philippine time). Hitting "Reply" replies to the registrant. Check Spam the first time and mark "Not spam".

---

## 6. Why not just drag-and-drop the folder?

Netlify's drag-and-drop ("Netlify Drop") is great for plain websites, but I could not confirm that it reliably deploys functions, and the registration function is essential. So use **Git-based deployment** (below). It also makes updates easy.

---

## 7. Deploy to Netlify (Git method, free)

1. Create a free account at **github.com** (sign in if you have one).
2. Click **New repository**, name it `smash-culture`, set it to **Private**, click **Create**.
3. On the new repo page click **uploading an existing file**. Drag in **everything inside the unzipped `smash-culture` folder** (the folders `public`, `netlify`, `tests`, `tools` and the files `netlify.toml`, `package.json`, `README.md`, `.env.example`, `.gitignore`). Click **Commit changes**.
   *Tip: GitHub's web uploader hides files starting with a dot sometimes. If `.gitignore` or `.env.example` don't upload, that's okay.*
4. Create a free account at **netlify.com** (use "Sign up with GitHub").
5. **Add new project → Import an existing project → GitHub** → pick `smash-culture`.
6. Leave the build settings as they are (Netlify reads `netlify.toml`: publish folder `public`, functions folder `netlify/functions`). Click **Deploy**.
7. Wait about a minute. Netlify gives you a link like `https://something.netlify.app`. Rename it under **Site configuration → Change project name** (e.g. `smashculture`).
8. Now do Section 5-B (add `RESEND_API_KEY`) and redeploy.

---

## 8. Update the site later

Edit a file on GitHub (open it → pencil icon → **Commit changes**), or upload replacement files (Add file → Upload files). Netlify rebuilds automatically within a minute.

The menu and footer are repeated in all five HTML files. If you change a link there, change it in each file (search for `<!-- NAV` and `<!-- FOOTER`).

---

## 9. Test on a real phone (do this before announcing!)

1. Open your Netlify link on your phone (mobile data, not just Wi-Fi).
2. Go to **Register** and submit a real test registration (use your own details).
3. Expect a green "You're in" message **and** an email at smashcultureclubzc2k26@gmail.com within a minute.
4. If you see the red error instead, see Troubleshooting.
5. Also send a test from **Contact Us → Send us a message**.

## 10. Testing checklist

- [ ] Home, Register, About Us, Contact Us each open from the menu and the footer
- [ ] Opening `/register.html`, `/about.html`, `/contact.html` directly works; `/anything-else` shows the custom 404
- [ ] Mobile menu opens, closes with ✕, Esc, and after tapping a link
- [ ] "Join the Club", "Register Now" go to Register; "Discover Our Story"/"Read Our Story" go to About
- [ ] Logo marquee scrolls right-to-left without a jump; pauses on hover; "Pause logos" button works
- [ ] Facebook button opens facebook.com/scclubzc in a new tab
- [ ] Email button opens a Gmail draft to the club; the "default email app" link opens your mail app
- [ ] Register: empty submit shows errors; bad phone/email are rejected; double-tapping Submit sends only one email
- [ ] Real registration produces the success message **and** the email
- [ ] Turn off the internet and submit: you see the red error (never green)
- [ ] Share the link in Messenger/Facebook: the preview shows the logo (previews can take a while to refresh)

## Troubleshooting

| You see | Likely cause / fix |
|---|---|
| "Registration isn't switched on yet" | `RESEND_API_KEY` is missing, or you didn't redeploy after adding it |
| "We couldn't deliver your registration" | Key is wrong; or you signed up to Resend with a different email than the one in `NOTIFY_EMAIL`; check **Netlify → Logs → Functions** for the reason |
| Form error on a double-click preview | Normal: forms only work on the deployed site |
| Email in Spam | Mark "Not spam"; optionally verify your own domain in Resend |

## Privacy & limits

- Registration details live in the club's Gmail inbox and pass through Resend. Review the privacy notice on the Register page and edit it to match how the club will really handle data (Philippine Data Privacy Act applies to personal data).
- Free-tier limits: Resend 100 emails/day; Netlify's free plan has monthly usage limits (check your Netlify dashboard if traffic grows).
- Spam protection: a hidden honeypot field plus server-side validation. For heavier spam, add a CAPTCHA later.

## Security notes

- The only secret is `RESEND_API_KEY`, stored in Netlify's environment variables. It is never in the HTML/JS, and the code is checked for it (see `tests/`). Do not commit a real `.env`.
- Run `npm test` (needs Node.js) to re-run the 12 automated checks of the email code.
