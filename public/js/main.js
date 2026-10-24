/* ==========================================================================
   SMASH CULTURE — main.js (vanilla JavaScript, no libraries)
   1 Footer year · 2 Mobile menu · 3 Header shadow · 4 Reveal on scroll
   5 Logo marquee · 6 Forms (registration + contact)
   ========================================================================== */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Footer year ---------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* 2. Mobile menu ---------------------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("site-menu");
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".site-header")) setMenu(false);
    });
    window.matchMedia("(min-width: 901px)").addEventListener("change", function () { setMenu(false); });
  }

  /* 3. Header shadow after scrolling ---------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* 4. Reveal on scroll ----------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* 5. Logo marquee --------------------------------------------------- */
  var marquee = document.querySelector("[data-marquee]");
  if (marquee && !reduceMotion) {
    var track = marquee.querySelector(".marquee__track");
    var group = marquee.querySelector(".marquee__group");
    if (track && group) {
      var clone = group.cloneNode(true);       // identical second copy = seamless loop
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("img").forEach(function (img) { img.alt = ""; img.removeAttribute("loading"); });
      clone.querySelectorAll("a, button").forEach(function (n) { n.setAttribute("tabindex", "-1"); });
      track.appendChild(clone);
      // keep the speed constant (~60px per second) whatever the screen size
      var setSpeed = function () {
        var w = group.getBoundingClientRect().width;
        if (w) marquee.style.setProperty("--marquee-time", Math.round(w / 60) + "s");
      };
      setSpeed();
      window.addEventListener("resize", setSpeed);
      marquee.classList.add("is-ready");
    }
    var pauseBtn = document.querySelector("[data-marquee-toggle]");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        var paused = marquee.classList.toggle("is-paused");
        pauseBtn.setAttribute("aria-pressed", String(paused));
        pauseBtn.textContent = paused ? "Play logos" : "Pause logos";
      });
    }
  }

  /* 6. Forms ---------------------------------------------------------- */
  // Same rules are re-checked on the server (netlify/lib/validate.js).
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validPhone(v) {
    var s = String(v).replace(/[\s\-().]/g, "");
    return /^(\+?63|0)9\d{9}$/.test(s) || /^\+[1-9]\d{7,14}$/.test(s); // PH mobile, or international +CC...
  }
  var RULES = {
    firstName: { label: "first name", max: 60 },
    lastName: { label: "last name", max: 60 },
    nickname: { label: "nickname", max: 40 },
    address: { label: "address", max: 250, min: 5 },
    contactNumber: { label: "contact number", max: 25, phone: true },
    email: { label: "email address", max: 120, email: true },
    name: { label: "name", max: 100 },
    message: { label: "message", max: 2000, min: 5 }
  };
  function checkField(name, value) {
    var r = RULES[name]; var v = String(value || "").trim();
    if (!r) return "";
    if (!v) return "Please enter your " + r.label + ".";
    if (r.min && v.length < r.min) return "Your " + r.label + " looks too short.";
    if (v.length > r.max) return "Your " + r.label + " is too long (max " + r.max + " characters).";
    if (r.email && !EMAIL_RE.test(v)) return "Please enter a valid email address, like name@example.com.";
    if (r.phone && !validPhone(v)) return "Enter a Philippine mobile number (09XX XXX XXXX or +63 9XX XXX XXXX) or an international number starting with +.";
    return "";
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function setupForm(form) {
    var endpoint = form.getAttribute("data-endpoint");
    var errorBox = form.querySelector("[data-form-error]");
    var successBox = document.querySelector(form.getAttribute("data-success"));
    var submitBtn = form.querySelector('button[type="submit"]');
    var idleLabel = submitBtn.textContent;
    var submissionId = uuid();   // sent with the request so a double-tap can never create two emails
    var busy = false;

    var fields = Array.prototype.slice.call(form.querySelectorAll("[data-field]"));
    function fieldWrap(input) { return input.closest(".field"); }
    function showError(input, msg) {
      var wrap = fieldWrap(input); var err = wrap.querySelector(".field__error");
      if (msg) { input.setAttribute("aria-invalid", "true"); err.textContent = msg; wrap.classList.add("has-error"); }
      else { input.removeAttribute("aria-invalid"); err.textContent = ""; wrap.classList.remove("has-error"); }
    }
    fields.forEach(function (input) {
      input.addEventListener("blur", function () { if (input.value || input.hasAttribute("aria-invalid")) showError(input, checkField(input.name, input.value)); });
      input.addEventListener("input", function () { if (input.hasAttribute("aria-invalid")) showError(input, checkField(input.name, input.value)); });
    });
    function showFormError(html) {
      errorBox.innerHTML = html; errorBox.classList.add("is-visible");
    }
    function clearFormError() { errorBox.classList.remove("is-visible"); errorBox.textContent = ""; }
    function setBusy(on) {
      busy = on; submitBtn.disabled = on; submitBtn.setAttribute("aria-busy", String(on));
      submitBtn.textContent = on ? "Sending…" : idleLabel;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;                       // ignore repeated taps while a request is in flight
      clearFormError();
      var firstBad = null;
      fields.forEach(function (input) {
        var msg = checkField(input.name, input.value);
        showError(input, msg);
        if (msg && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      var payload = { submissionId: submissionId };
      fields.forEach(function (input) { payload[input.name] = input.value.trim(); });
      var hp = form.querySelector('[name="website"]'); payload.website = hp ? hp.value : "";

      setBusy(true);
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

      fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (res) {
          return res.json().catch(function () { return null; }).then(function (data) { return { res: res, data: data }; });
        })
        .then(function (r) {
          // SUCCESS only when the server explicitly confirms the email was handed to the mail service.
          if (r.res.ok && r.data && r.data.ok === true) { onSuccess(); return; }
          if (r.data && r.data.errors) {                       // server-side validation messages
            var first = null;
            fields.forEach(function (input) {
              var m = r.data.errors[input.name]; if (m) { showError(input, m); if (!first) first = input; }
            });
            if (first) { first.focus(); return; }
          }
          onFailure(r.data && r.data.message);
        })
        .catch(function () { onFailure(); })
        .then(function () { clearTimeout(timer); });
    });

    function onSuccess() {
      form.reset(); fields.forEach(function (i) { showError(i, ""); });
      submissionId = uuid();
      setBusy(false);
      form.hidden = true;
      var intro = document.querySelector("[data-form-intro]"); if (intro) intro.hidden = true;
      successBox.classList.add("is-visible"); successBox.hidden = false;
      successBox.setAttribute("tabindex", "-1"); successBox.focus();
    }
    function onFailure(serverMsg) {
      setBusy(false);
      var mail = "smashcultureclubzc2k26@gmail.com";
      showFormError((serverMsg ? escapeHtml(serverMsg) + " " : "Sorry, we couldn’t send your details just now. Nothing was submitted, so please try again in a moment. ") +
        'If it keeps happening, email us at <a href="mailto:' + mail + '">' + mail + "</a>.");
      errorBox.setAttribute("tabindex", "-1"); errorBox.focus();
    }
    var again = document.querySelector("[data-form-again]");
    if (again) again.addEventListener("click", function () {
      successBox.classList.remove("is-visible"); successBox.hidden = true;
      form.hidden = false;
      var intro = document.querySelector("[data-form-intro]"); if (intro) intro.hidden = false;
      var f = form.querySelector("[data-field]"); if (f) f.focus();
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  document.querySelectorAll("form[data-endpoint]").forEach(setupForm);
})();
