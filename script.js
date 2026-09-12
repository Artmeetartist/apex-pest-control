/* =========================================================
   APEX PEST SOLUTIONS — Interactions
   Vanilla JS, no dependencies.
   ---------------------------------------------------------
   Integration hooks live in CONFIG below. Point `forms.endpoint`
   at Web3Forms / Formspree / your CRM, and `ai.endpoint` at your
   LLM backend to go from demo mode to production.
   ========================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------
     CONFIG — wire real services here
  ------------------------------------------------------ */
  var CONFIG = {
    phone: "+12815550123",
    phoneDisplay: "(281) 555-0123",
    email: "hello@apexpestsolutions.com",
    forms: {
      // Google Apps Script Web App URL that captures leads to a Google Sheet
      // and sends the auto-reply emails. Deploy apps-script/Code.gs (see
      // apps-script/README.md) and paste its "/exec" URL here.
      //   e.g. "https://script.google.com/macros/s/AKfy..../exec"
      // When null, forms run in demo mode (no network request).
      endpoint: "https://script.google.com/macros/s/AKfycbzD2WbP5JS9G8ZukjHdMSe-08tr7LCV2CqhiJPE9_oVjDPuFcq3nSst27b0IvK33nT2/exec",
      // Transport: "apps-script" sends a CORS preflight-free text/plain POST
      // (required for Google Apps Script). Use "json" for Web3Forms/Formspree/API.
      transport: "apps-script",
      // Optional shared secret — must match SHARED_SECRET in Code.gs (leave null to disable).
      accessKey: null
    },
    ai: {
      // Point at your LLM/agent endpoint to replace the local mock brain.
      // Expected: POST {message, history} -> {reply, chips?}
      endpoint: null
    }
  };

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = function () { return window.matchMedia("(max-width: 960px)").matches; };

  /* ======================================================
     Overlay / scroll-lock manager
  ====================================================== */
  var lockCount = 0;
  function lockScroll() { lockCount++; document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden"; }
  function unlockScroll() { lockCount = Math.max(0, lockCount - 1); if (lockCount === 0) { document.documentElement.style.overflow = ""; document.body.style.overflow = ""; } }

  function focusables(container) {
    return $$("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])", container)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  function makeOverlay(root, panelSel, opts) {
    opts = opts || {};
    var lastFocus = null, keyHandler = null;
    function onKey(e) { if (e.key === "Escape") close(); if (e.key === "Tab") trap(e); }
    function trap(e) {
      var panel = $(panelSel, root); if (!panel) return;
      var f = focusables(panel); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function open() {
      if (root.classList.contains("is-open")) return;
      lastFocus = document.activeElement;
      root.hidden = false;
      requestAnimationFrame(function () { root.classList.add("is-open"); });
      lockScroll();
      keyHandler = onKey; document.addEventListener("keydown", keyHandler);
      setTimeout(function () {
        var panel = $(panelSel, root); var target = opts.initialFocus ? $(opts.initialFocus, root) : (panel && focusables(panel)[0]);
        if (target) try { target.focus(); } catch (e) {}
      }, 60);
      if (opts.onOpen) opts.onOpen();
    }
    function close() {
      if (!root.classList.contains("is-open")) return;
      root.classList.remove("is-open");
      unlockScroll();
      if (keyHandler) document.removeEventListener("keydown", keyHandler);
      setTimeout(function () { root.hidden = true; }, 360);
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
      if (opts.onClose) opts.onClose();
    }
    return { open: open, close: close, isOpen: function () { return root.classList.contains("is-open"); }, root: root };
  }

  /* ======================================================
     Toast
  ====================================================== */
  var toastEl = $("#toast");
  var toastTimer;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg>' + msg;
    toastEl.hidden = false;
    requestAnimationFrame(function () { toastEl.classList.add("is-show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-show");
      setTimeout(function () { toastEl.hidden = true; }, 320);
    }, 3400);
  }

  /* ======================================================
     Header scroll state
  ====================================================== */
  var header = $("#siteHeader");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ======================================================
     Smooth scroll with sticky-header offset
  ====================================================== */
  function scrollToHash(hash) {
    var target = hash === "#top" ? document.body : $(hash);
    if (!target) return;
    var top = hash === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute("href");
    if (hash.length < 2) return;
    if (!$(hash) && hash !== "#top") return;
    e.preventDefault();
    scrollToHash(hash);
    history.replaceState(null, "", hash === "#top" ? location.pathname : hash);
  });

  /* ======================================================
     Mobile nav
  ====================================================== */
  var mobileNav = $("#mobileNav");
  var navToggle = $("#navToggle");
  var mnav = mobileNav ? makeOverlay(mobileNav, ".mobile-nav__panel", {
    onOpen: function () { navToggle && navToggle.setAttribute("aria-expanded", "true"); },
    onClose: function () { navToggle && navToggle.setAttribute("aria-expanded", "false"); }
  }) : null;
  if (navToggle && mnav) navToggle.addEventListener("click", mnav.open);
  $$("[data-close-mobilenav]").forEach(function (el) { el.addEventListener("click", function () { mnav && mnav.close(); }); });

  /* ======================================================
     Services dropdown (desktop)
  ====================================================== */
  var dropdown = $(".nav__dropdown");
  if (dropdown) {
    var ddBtn = $(".nav__link--btn", dropdown);
    var openDd = function (v) { dropdown.setAttribute("data-open", v ? "true" : "false"); ddBtn.setAttribute("aria-expanded", v ? "true" : "false"); };
    ddBtn.addEventListener("click", function (e) { e.stopPropagation(); openDd(dropdown.getAttribute("data-open") !== "true"); });
    dropdown.addEventListener("mouseenter", function () { openDd(true); });
    dropdown.addEventListener("mouseleave", function () { openDd(false); });
    document.addEventListener("click", function () { openDd(false); });
    dropdown.addEventListener("keydown", function (e) { if (e.key === "Escape") openDd(false); });
  }

  /* ======================================================
     Reveal on scroll
  ====================================================== */
  var reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var sibs = el.parentElement ? $$(".reveal", el.parentElement).filter(function (n) { return n.parentElement === el.parentElement; }) : [el];
        var idx = sibs.indexOf(el);
        el.style.transitionDelay = Math.min(idx * 80, 320) + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ======================================================
     Number counters
  ====================================================== */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1500, start = null;
    function fmt(v) { return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US"); }
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target) + suffix;
    }
    requestAnimationFrame(tick);
  }
  var statsWrap = $(".about__stats");
  if (statsWrap) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      $$("[data-count]", statsWrap).forEach(function (el) {
        var d = parseInt(el.getAttribute("data-decimals") || "0", 10);
        var t = parseFloat(el.getAttribute("data-count"));
        el.textContent = (d ? t.toFixed(d) : t.toLocaleString("en-US")) + (el.getAttribute("data-suffix") || "");
      });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { $$("[data-count]", statsWrap).forEach(animateCount); cio.disconnect(); } });
      }, { threshold: 0.4 });
      cio.observe(statsWrap);
    }
  }

  /* ======================================================
     Testimonials carousel (mobile dots)
  ====================================================== */
  (function () {
    var track = $("#testimonialsTrack");
    var dotsWrap = $("#testimonialsDots");
    if (!track || !dotsWrap) return;
    var cards = $$(".testimonial", track);
    cards.forEach(function (_, i) {
      var b = document.createElement("button");
      b.setAttribute("aria-label", "Go to review " + (i + 1));
      if (i === 0) b.classList.add("is-active");
      b.addEventListener("click", function () {
        var card = cards[i];
        track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
      });
      dotsWrap.appendChild(b);
    });
    var dots = $$("button", dotsWrap);
    var raf;
    track.addEventListener("scroll", function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var center = track.scrollLeft + track.clientWidth / 2;
        var best = 0, bestDist = Infinity;
        cards.forEach(function (c, i) {
          var mid = c.offsetLeft - track.offsetLeft + c.clientWidth / 2;
          var d = Math.abs(mid - center);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        dots.forEach(function (d, i) { d.classList.toggle("is-active", i === best); });
      });
    }, { passive: true });
  })();

  /* ======================================================
     Form validation + submission
  ====================================================== */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function digits(s) { return (s || "").replace(/\D/g, ""); }

  function validateField(input) {
    var field = input.closest(".field");
    var errEl = field ? $("[data-error]", field) : null;
    var val = (input.value || "").trim();
    var msg = "";
    if (input.hasAttribute("required") && !val) msg = "This field is required.";
    else if (input.type === "email" && val && !EMAIL_RE.test(val)) msg = "Please enter a valid email address.";
    else if (input.type === "tel" && val && digits(val).length < 10) msg = "Please enter a valid phone number.";
    else if (input.tagName === "SELECT" && input.hasAttribute("required") && !val) msg = "Please select an option.";
    if (field) field.classList.toggle("is-invalid", !!msg);
    if (errEl) errEl.textContent = msg;
    return !msg;
  }

  function validateForm(form) {
    var ok = true, firstBad = null;
    $$("input, select, textarea", form).forEach(function (input) {
      if (input.name === "company" || input.name === "website") return; // honeypot
      if (!input.hasAttribute("required") && !(input.value || "").trim()) return;
      var valid = validateField(input);
      if (!valid && !firstBad) firstBad = input;
      ok = ok && valid;
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  function wireLiveValidation(form) {
    $$("input, select, textarea", form).forEach(function (input) {
      input.addEventListener("blur", function () { if ((input.value || "").trim() || input.hasAttribute("required")) validateField(input); });
      input.addEventListener("input", function () { var f = input.closest(".field"); if (f && f.classList.contains("is-invalid")) validateField(input); });
    });
  }

  // Submit gateway — swap in a real request when CONFIG.forms.endpoint is set.
  function submitForm(payload) {
    if (CONFIG.forms.endpoint) {
      var body = Object.assign({}, payload);
      if (CONFIG.forms.accessKey) body.access_key = CONFIG.forms.accessKey;
      // Google Apps Script can't answer a CORS preflight, so send the JSON as
      // text/plain — a "simple" request the browser dispatches without an
      // OPTIONS preflight. Apps Script reads it via e.postData.contents.
      var asText = CONFIG.forms.transport !== "json";
      return fetch(CONFIG.forms.endpoint, {
        method: "POST",
        headers: { "Content-Type": asText ? "text/plain;charset=utf-8" : "application/json" },
        body: JSON.stringify(body),
        redirect: "follow"
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json().catch(function () { return { result: "success" }; });
      });
    }
    // Demo mode: emulate latency, log payload for the developer.
    return new Promise(function (resolve) { console.info("[Apex demo] form submission:", payload); setTimeout(resolve, 1100); });
  }

  // Contact form
  (function () {
    var form = $("#contactForm");
    if (!form) return;
    wireLiveValidation(form);
    var successEl = $("[data-success]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if ($("input[name='company']", form).value) { showToast("Thanks!"); return; } // honeypot tripped
      if (!validateForm(form)) return;
      var btn = $("[data-submit]", form);
      btn.classList.add("is-loading"); btn.disabled = true;
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.formType = "contact";
      data.source = "Website contact form";
      data._subject = "New website inquiry — Apex Pest Solutions";
      submitForm(data).then(function () {
        btn.classList.remove("is-loading"); btn.disabled = false;
        form.reset();
        if (successEl) successEl.hidden = false;
        showToast("Message sent — we'll be in touch shortly!");
      }).catch(function () {
        btn.classList.remove("is-loading"); btn.disabled = false;
        showToast("Something went wrong. Please call us at " + CONFIG.phoneDisplay + ".");
      });
    });
  })();

  /* ======================================================
     BOOKING MODAL (multi-step)
  ====================================================== */
  (function () {
    var modalEl = $("#bookingModal");
    if (!modalEl) return;
    var overlay = makeOverlay(modalEl, ".modal__dialog");
    var state = { step: 1, service: null, date: null, time: null };
    var stepDots = $$("[data-step-dot]");
    var steps = $$(".bk-step", modalEl);
    var backBtn = $("#bkBack"), nextBtn = $("#bkNext"), doneBtn = $("#bkDone");
    var bkForm = $("#bookingForm");
    var calGrid = $("#calGrid"), calLabel = $("#calLabel");
    var calView = new Date(); calView.setDate(1);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var maxDate = new Date(today.getTime()); maxDate.setDate(maxDate.getDate() + 60);
    var SLOTS = ["8:00 AM", "9:30 AM", "11:00 AM", "12:30 PM", "2:00 PM", "3:30 PM", "5:00 PM"];

    wireLiveValidation(bkForm);

    function setStep(n) {
      state.step = n;
      steps.forEach(function (s) { s.classList.toggle("is-active", +s.getAttribute("data-step") === n); });
      stepDots.forEach(function (d) {
        var i = +d.getAttribute("data-step-dot");
        d.classList.toggle("is-active", i === n);
        d.classList.toggle("is-done", i < n);
      });
      backBtn.hidden = (n === 1 || n === 5);
      nextBtn.hidden = (n === 5);
      doneBtn.hidden = (n !== 5);
      nextBtn.querySelector(".btn__label").textContent = n === 4 ? "Confirm Booking" : "Continue";
      updateNextState();
      var body = $(".modal__body", modalEl); if (body) body.scrollTop = 0;
    }

    function updateNextState() {
      var ok = true;
      if (state.step === 1) ok = !!state.service;
      else if (state.step === 2) ok = !!state.date;
      else if (state.step === 3) ok = !!state.time;
      nextBtn.disabled = !ok;
    }

    // Step 1 — services
    $$(".bk-service", modalEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".bk-service", modalEl).forEach(function (b) { b.setAttribute("aria-checked", "false"); });
        btn.setAttribute("aria-checked", "true");
        state.service = btn.getAttribute("data-service");
        updateNextState();
      });
    });

    // Step 2 — calendar
    function fmtDate(d) { return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
    function sameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }
    function renderCalendar() {
      calLabel.textContent = calView.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      $("#calPrev").disabled = (calView <= minMonth);
      var lastNav = new Date(calView.getFullYear(), calView.getMonth(), 1);
      $("#calNext").disabled = (lastNav >= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));
      calGrid.innerHTML = "";
      var firstDow = new Date(calView.getFullYear(), calView.getMonth(), 1).getDay();
      var daysInMonth = new Date(calView.getFullYear(), calView.getMonth() + 1, 0).getDate();
      for (var i = 0; i < firstDow; i++) { var e = document.createElement("span"); e.className = "calendar__day is-empty"; calGrid.appendChild(e); }
      for (var d = 1; d <= daysInMonth; d++) {
        var dateObj = new Date(calView.getFullYear(), calView.getMonth(), d);
        var btn = document.createElement("button");
        btn.className = "calendar__day"; btn.type = "button"; btn.textContent = d;
        var disabled = dateObj < today || dateObj > maxDate;
        if (disabled) { btn.disabled = true; }
        if (sameDay(dateObj, state.date)) btn.classList.add("is-selected");
        (function (dObj, node) {
          node.addEventListener("click", function () {
            state.date = dObj; state.time = null;
            $$(".calendar__day", calGrid).forEach(function (x) { x.classList.remove("is-selected"); });
            node.classList.add("is-selected");
            updateNextState();
          });
        })(dateObj, btn);
        calGrid.appendChild(btn);
      }
    }
    $("#calPrev").addEventListener("click", function () { calView.setMonth(calView.getMonth() - 1); renderCalendar(); });
    $("#calNext").addEventListener("click", function () { calView.setMonth(calView.getMonth() + 1); renderCalendar(); });

    // Step 3 — time slots (deterministic availability per date)
    function renderSlots() {
      var wrap = $("#bkTimeSlots"); wrap.innerHTML = "";
      var hint = $("#bkTimeHint");
      hint.textContent = state.date ? "Available times for " + fmtDate(state.date) + "." : "Please pick a date first.";
      var seed = state.date ? state.date.getDate() : 0;
      SLOTS.forEach(function (slot, i) {
        var btn = document.createElement("button");
        btn.className = "time-slot"; btn.type = "button"; btn.textContent = slot;
        var unavailable = ((seed + i * 3) % 7 === 0) || ((seed + i) % 11 === 0);
        if (unavailable) { btn.disabled = true; }
        if (slot === state.time) btn.classList.add("is-selected");
        btn.addEventListener("click", function () {
          state.time = slot;
          $$(".time-slot", wrap).forEach(function (x) { x.classList.remove("is-selected"); });
          btn.classList.add("is-selected");
          updateNextState();
        });
        wrap.appendChild(btn);
      });
    }

    function makeRef() {
      var s = "APX-";
      var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }

    function confirmBooking() {
      var data = {}; new FormData(bkForm).forEach(function (v, k) { data[k] = v; });
      data.formType = "booking";
      data.source = "Website booking";
      data.service = state.service;
      data.date = state.date ? state.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";
      data.time = state.time;
      data._subject = "New inspection booking — Apex Pest Solutions";
      var ref = makeRef();
      $("#bkRef").textContent = ref;
      var summary = $("#bkSummary");
      summary.innerHTML = "";
      [["Service", state.service], ["Date", data.date], ["Time", state.time], ["Name", data.name]].forEach(function (row) {
        var div = document.createElement("div");
        div.innerHTML = "<dt>" + row[0] + "</dt><dd>" + (row[1] || "—") + "</dd>";
        summary.appendChild(div);
      });
      data.reference = ref;
      // Fire-and-forget: the sheet capture + auto-reply email happen server-side.
      submitForm(data).catch(function () {});
      setStep(5);
      showToast("Inspection booked — ref " + ref);
    }

    nextBtn.addEventListener("click", function () {
      if (state.step === 1 && !state.service) return;
      if (state.step === 2) { if (!state.date) return; renderSlots(); }
      if (state.step === 3 && !state.time) return;
      if (state.step === 4) {
        if (!validateForm(bkForm)) return;
        nextBtn.classList.add("is-loading"); nextBtn.disabled = true;
        setTimeout(function () { nextBtn.classList.remove("is-loading"); confirmBooking(); }, 900);
        return;
      }
      setStep(Math.min(5, state.step + 1));
    });
    backBtn.addEventListener("click", function () { setStep(Math.max(1, state.step - 1)); });

    function resetBooking() {
      state = { step: 1, service: null, date: null, time: null };
      $$(".bk-service", modalEl).forEach(function (b) { b.setAttribute("aria-checked", "false"); });
      bkForm.reset();
      $$(".field", bkForm).forEach(function (f) { f.classList.remove("is-invalid"); });
      calView = new Date(); calView.setDate(1);
      renderCalendar(); renderSlots(); setStep(1);
    }

    // Public opener (used by all [data-open-booking] triggers)
    window.__openBooking = function (service) {
      resetBooking();
      if (service) {
        var match = $$(".bk-service", modalEl).filter(function (b) { return b.getAttribute("data-service") === service; })[0];
        if (match) { match.click(); setStep(2); }
      }
      overlay.open();
    };
    $$("[data-close-booking]").forEach(function (el) { el.addEventListener("click", overlay.close); });

    renderCalendar(); renderSlots();
  })();

  // Global booking triggers
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-open-booking]");
    if (!t) return;
    e.preventDefault();
    if (window.__openBooking) window.__openBooking(t.getAttribute("data-service") || null);
  });

  /* ======================================================
     AI ASSISTANT
  ====================================================== */
  var AI = (function () {
    // ---- Local "brain" (mock). Replace by setting CONFIG.ai.endpoint. ----
    var PESTS = {
      termite: { name: "termites", range: "$850–$2,500", note: "We inspect for free and quote based on the type of treatment (liquid barrier or bait)." },
      "bed bug": { name: "bed bugs", range: "$600–$1,800", note: "Heat + residual treatments fully eradicate them, usually in 1–2 visits." },
      bedbug: { name: "bed bugs", range: "$600–$1,800", note: "Heat + residual treatments fully eradicate them." },
      rodent: { name: "rodents", range: "$250–$650", note: "Includes trapping and sealing entry points so they don't come back." },
      mouse: { name: "rodents", range: "$250–$650", note: "Includes trapping and exclusion work." },
      rat: { name: "rodents", range: "$250–$650", note: "Includes trapping and exclusion work." },
      mosquito: { name: "mosquitoes", range: "$75–$150 / month", note: "Seasonal misting keeps your yard usable all summer." },
      roach: { name: "cockroaches", range: "$120–$350", note: "Initial service plus follow-up to break the breeding cycle." },
      cockroach: { name: "cockroaches", range: "$120–$350", note: "Initial service plus follow-up." },
      ant: { name: "ants", range: "$120–$300", note: "We treat the colony at its source, not just the trails." },
      spider: { name: "spiders", range: "$120–$300", note: "Perimeter treatment plus web removal." }
    };
    function findPest(text) {
      var t = text.toLowerCase();
      var keys = Object.keys(PESTS);
      for (var i = 0; i < keys.length; i++) if (t.indexOf(keys[i]) !== -1) return PESTS[keys[i]];
      return null;
    }
    function reply(text, ctx) {
      var t = text.toLowerCase().trim();
      var r = { text: "", chips: null, action: null };

      if (ctx.pending === "estimate") {
        ctx.pending = null;
        var p = findPest(t);
        if (p) { r.text = "For " + p.name + ", most Houston homes fall around <strong>" + p.range + "</strong>. " + p.note + " Want to book a free inspection for an exact quote?"; r.chips = [{ label: "Book inspection", intent: "book" }, { label: "Talk to a human", intent: "human" }]; return r; }
        r.text = "No problem — a free inspection is the fastest way to an exact price. Should I book one for you?"; r.chips = [{ label: "Book inspection", intent: "book" }]; return r;
      }

      if (/\b(hi|hello|hey|howdy|yo)\b/.test(t)) { r.text = "Hey there! 👋 I can book an inspection, give you a price estimate, or answer any pest question. What's going on?"; r.chips = [{ label: "Book an inspection", intent: "book" }, { label: "Get a price estimate", intent: "estimate" }]; return r; }

      if (/(book|schedul|appointment|inspection|set up|come out)/.test(t)) { r.text = "Great — let's get you on the schedule. I'll open our quick booking form (takes under 30 seconds)."; r.action = "book"; return r; }

      if (/(price|cost|quote|estimate|how much|pricing|rate)/.test(t)) {
        var pest = findPest(t);
        if (pest) { r.text = "For " + pest.name + ", most Houston homes fall around <strong>" + pest.range + "</strong>. " + pest.note; r.chips = [{ label: "Book inspection", intent: "book" }]; return r; }
        ctx.pending = "estimate";
        r.text = "Happy to help with pricing! Which pest are you dealing with?"; r.chips = [{ label: "Termites", text: "termite" }, { label: "Roaches", text: "roach" }, { label: "Rodents", text: "rodent" }, { label: "Bed bugs", text: "bed bug" }, { label: "Mosquitoes", text: "mosquito" }]; return r;
      }

      if (/(human|agent|representative|person|someone|talk to|call me)/.test(t)) { r.text = "Of course. You can reach a live Apex specialist right now at <strong>" + CONFIG.phoneDisplay + "</strong> — we're staffed 24/7. Tap to call:"; r.chips = [{ label: "Call " + CONFIG.phoneDisplay, href: "tel:" + CONFIG.phone }, { label: "Book instead", intent: "book" }]; return r; }

      if (/(emergency|urgent|asap|right now|tonight|infestation)/.test(t)) { r.text = "We offer <strong>24/7 emergency service</strong> across Houston. For the fastest response, call <strong>" + CONFIG.phoneDisplay + "</strong> — or I can book the earliest slot."; r.chips = [{ label: "Call now", href: "tel:" + CONFIG.phone }, { label: "Book earliest slot", intent: "book" }]; return r; }

      if (/(hour|open|when|24|available)/.test(t)) { r.text = "We're available <strong>24/7</strong> for emergencies and bookings. Standard visits run Mon–Fri 7am–8pm and Sat 8am–6pm."; r.chips = [{ label: "Book an inspection", intent: "book" }]; return r; }

      if (/(area|serve|location|city|near|houston|katy|sugar|pearland|woodlands|cypress|spring|humble)/.test(t)) { r.text = "We serve Houston and nearby cities — Sugar Land, Katy, Pearland, The Woodlands, Cypress, Spring, Humble, Missouri City & Richmond. Want to check availability at your address?"; r.chips = [{ label: "Book an inspection", intent: "book" }]; return r; }

      if (/(safe|pet|dog|cat|child|kid|baby|family|eco|green)/.test(t)) { r.text = "Absolutely — we use <strong>family & pet safe</strong>, EPA-approved products and eco-friendly options. Your loved ones can stay home during most treatments."; r.chips = [{ label: "Book an inspection", intent: "book" }]; return r; }

      if (/(guarantee|warranty|come back|return)/.test(t)) { r.text = "Every service is backed by our <strong>100% satisfaction guarantee</strong>. If pests return between visits, so do we — free of charge."; r.chips = [{ label: "Book an inspection", intent: "book" }]; return r; }

      if (/(thank|thanks|great|awesome|cool|ok|okay)/.test(t)) { r.text = "Anytime! Anything else I can help with?"; r.chips = [{ label: "Book an inspection", intent: "book" }, { label: "Talk to a human", intent: "human" }]; return r; }

      var pestOnly = findPest(t);
      if (pestOnly) { r.text = "Got it — " + pestOnly.name + ". We handle those all the time. Typical range is <strong>" + pestOnly.range + "</strong>. " + pestOnly.note + " Want to lock in a free inspection?"; r.chips = [{ label: "Book inspection", intent: "book" }]; return r; }

      r.text = "I can help with booking, pricing, service areas, safety and more. Would you like to book a free inspection or talk to a specialist?";
      r.chips = [{ label: "Book an inspection", intent: "book" }, { label: "Get a price estimate", intent: "estimate" }, { label: "Talk to a human", intent: "human" }];
      return r;
    }

    // Backend gateway — swap to real API when configured.
    function getResponse(text, ctx, history) {
      if (CONFIG.ai.endpoint) {
        return fetch(CONFIG.ai.endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: history })
        }).then(function (r) { return r.json(); }).then(function (d) { return { text: d.reply, chips: d.chips || null, action: d.action || null }; });
      }
      return Promise.resolve(reply(text, ctx));
    }
    return { getResponse: getResponse };
  })();

  function mountAssistant(container, opts) {
    opts = opts || {};
    var tpl = $("#aiTemplate");
    if (!tpl || !container) return null;
    container.innerHTML = "";
    container.appendChild(tpl.content.cloneNode(true));
    var root = $(".ai", container);
    var body = $("[data-ai-body]", root);
    var quick = $("[data-ai-quick]", root);
    var form = $("[data-ai-form]", root);
    var textInput = $("[data-ai-text]", root);
    var mic = $("[data-ai-mic]", root);
    var micLabel = $("[data-ai-mic-label]", root);
    var closeBtn = $("[data-ai-close]", root);
    var ctx = { pending: null };
    var history = [];
    var voiceMode = false;

    if (opts.showClose && closeBtn) { closeBtn.hidden = false; closeBtn.addEventListener("click", function () { stopVoice(); if (opts.onClose) opts.onClose(); }); }

    function scrollDown() { body.scrollTop = body.scrollHeight; }

    function addUser(text) {
      var el = document.createElement("div");
      el.className = "ai__msg ai__msg--user";
      el.innerHTML = '<div class="ai__bubble"></div>';
      $(".ai__bubble", el).textContent = text;
      body.appendChild(el); scrollDown();
      history.push({ role: "user", content: text });
    }

    function addBot(resp) {
      var el = document.createElement("div");
      el.className = "ai__msg ai__msg--bot";
      el.innerHTML = '<span class="ai__msg-avatar" aria-hidden="true"><svg class="ic"><use href="#i-sparkle"/></svg></span><div class="ai__bubble"></div>';
      $(".ai__bubble", el).innerHTML = resp.text;
      body.appendChild(el);
      if (resp.chips && resp.chips.length) {
        var wrap = document.createElement("div");
        wrap.className = "ai__quick"; wrap.style.padding = "2px 0 2px 35px";
        resp.chips.forEach(function (c) {
          var b;
          if (c.href) { b = document.createElement("a"); b.href = c.href; }
          else { b = document.createElement("button"); b.type = "button"; }
          b.className = "ai__chip"; b.innerHTML = c.label;
          b.addEventListener("click", function () {
            if (c.href) return; // let the link navigate (tel:)
            if (c.intent) handleIntent(c.intent);
            else if (c.text) send(c.text);
          });
          wrap.appendChild(b);
        });
        el.appendChild(wrap);
      }
      scrollDown();
      history.push({ role: "assistant", content: resp.text });
      if (voiceMode) speak(resp.text);
      if (resp.action === "book") { setTimeout(function () { if (opts.onClose) opts.onClose(); if (window.__openBooking) window.__openBooking(null); }, 700); }
    }

    function typing() {
      var el = document.createElement("div");
      el.className = "ai__msg ai__msg--bot";
      el.innerHTML = '<span class="ai__msg-avatar" aria-hidden="true"><svg class="ic"><use href="#i-sparkle"/></svg></span><div class="ai__typing"><span></span><span></span><span></span></div>';
      body.appendChild(el); scrollDown();
      return function () { el.remove(); };
    }

    function send(text) {
      if (!text) return;
      addUser(text);
      var stop = typing();
      var delay = reduceMotion ? 250 : 500 + Math.random() * 500;
      AI.getResponse(text, ctx, history).then(function (resp) {
        setTimeout(function () { stop(); addBot(resp); }, delay);
      }).catch(function () { stop(); addBot({ text: "Sorry, I had trouble there. Please call us at <strong>" + CONFIG.phoneDisplay + "</strong>." }); });
    }

    function handleIntent(intent) {
      if (intent === "book") { addUser("Book an inspection"); var s1 = typing(); setTimeout(function () { s1(); addBot({ text: "Perfect — opening the booking form now. It only takes a few taps! 📅", action: "book" }); }, reduceMotion ? 200 : 500); return; }
      if (intent === "estimate") { send("I'd like a price estimate"); return; }
      if (intent === "question") { addBot({ text: "Sure — ask me anything! For example: \"Are treatments pet safe?\" or \"Do you handle termites?\"" }); textInput.focus(); return; }
      if (intent === "human") { send("I'd like to talk to a human"); return; }
    }

    // Quick chips
    $$(".ai__chip", quick).forEach(function (chip) {
      chip.addEventListener("click", function () { handleIntent(chip.getAttribute("data-intent")); });
    });

    // Text input
    form.addEventListener("submit", function (e) { e.preventDefault(); var v = textInput.value.trim(); if (!v) return; voiceMode = false; textInput.value = ""; send(v); });

    // ================= VOICE: speech-to-text + text-to-speech =================
    var voiceHint = $("[data-ai-voice-hint]", root);
    var muteBtn = $("[data-ai-mute]", root);
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recog = null, listening = false, finalTranscript = "";
    var ttsSupported = ("speechSynthesis" in window) && ("SpeechSynthesisUtterance" in window);
    var ttsMuted = false;
    try { ttsMuted = localStorage.getItem("apexVoiceMuted") === "1"; } catch (e) {}
    var HINT_DEFAULT = "Speak naturally — I can help you book, answer questions and more.";

    function setHint(msg, isError) { if (voiceHint) { voiceHint.textContent = msg; voiceHint.classList.toggle("is-error", !!isError); } }
    function micUI(on) {
      listening = on;
      mic.classList.toggle("is-listening", on);
      mic.setAttribute("aria-pressed", on ? "true" : "false");
      micLabel.textContent = on ? "Listening… tap to stop" : (SR ? "Tap to speak" : "Voice unavailable");
    }

    // Build the recognizer (feature-detected)
    if (SR) { try { recog = new SR(); recog.lang = "en-US"; recog.interimResults = true; recog.continuous = false; recog.maxAlternatives = 1; } catch (e) { recog = null; } }
    if (recog) {
      recog.addEventListener("result", function (e) {
        var interim = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTranscript += t; else interim += t;
        }
        var shown = (finalTranscript + interim).trim();
        if (shown) { textInput.value = shown; setHint("Listening… “" + shown + "”"); }
      });
      recog.addEventListener("speechend", function () { try { recog.stop(); } catch (e) {} });
      recog.addEventListener("end", function () {
        micUI(false);
        var text = (finalTranscript || textInput.value || "").trim();
        finalTranscript = "";
        if (text) { textInput.value = ""; setHint(HINT_DEFAULT); voiceMode = true; send(text); }
        else { setHint("I didn't catch that — tap the mic and try again."); }
      });
      recog.addEventListener("error", function (ev) {
        micUI(false); finalTranscript = "";
        var m;
        switch (ev && ev.error) {
          case "not-allowed":
          case "service-not-allowed":
            m = "Microphone blocked. Allow mic access in your browser's site settings, then tap again."; break;
          case "no-speech": m = "I didn't hear anything — tap the mic and speak clearly."; break;
          case "audio-capture": m = "No microphone found. Check your device and try again."; break;
          case "network": m = "Voice needs an internet connection right now."; break;
          case "aborted": m = null; break; // user stopped — no error message
          default: m = "Voice hit a snag — please type your message instead.";
        }
        if (m) { setHint(m, true); showToast(m); } else setHint(HINT_DEFAULT);
      });
    }

    function stopVoice() {
      if (recog && listening) { try { recog.abort(); } catch (e) {} }
      micUI(false);
      if (ttsSupported) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    }

    mic.addEventListener("click", function () {
      if (!window.isSecureContext && location.protocol !== "file:") { setHint("Voice needs a secure (https) connection.", true); showToast("Voice needs a secure (https) connection."); return; }
      if (!recog) { setHint("Voice input isn't supported in this browser — try Chrome or Edge, or type below.", true); showToast("Voice input isn't supported here — please type instead."); textInput.focus(); return; }
      if (listening) { try { recog.stop(); } catch (e) {} return; }
      if (ttsSupported) { try { window.speechSynthesis.cancel(); } catch (e) {} } // stop any bot speech first
      finalTranscript = ""; textInput.value = "";
      try { recog.start(); micUI(true); setHint("Listening… speak now"); }
      catch (e) { micUI(false); setHint("Couldn't start listening — tap to try again.", true); }
    });

    // ---- Text to speech (bot replies) ----
    var voices = [];
    function loadVoices() { if (ttsSupported) { try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } } }
    if (ttsSupported) {
      loadVoices();
      try { window.speechSynthesis.addEventListener("voiceschanged", loadVoices); }
      catch (e) { window.speechSynthesis.onvoiceschanged = loadVoices; }
    }
    function pickVoice() {
      if (!voices.length) loadVoices();
      var prefs = ["Google US English", "Samantha", "Microsoft Aria", "Microsoft Jenny", "Microsoft Zira", "Karen", "Moira", "Google UK English Female"];
      var i, p;
      for (p = 0; p < prefs.length; p++) for (i = 0; i < voices.length; i++) if (voices[i].name && voices[i].name.indexOf(prefs[p]) !== -1) return voices[i];
      for (i = 0; i < voices.length; i++) if (/^en[-_]US/i.test(voices[i].lang || "")) return voices[i];
      for (i = 0; i < voices.length; i++) if (/^en/i.test(voices[i].lang || "")) return voices[i];
      return null;
    }
    function speak(html) {
      if (!ttsSupported || ttsMuted) return;
      var tmp = document.createElement("div"); tmp.innerHTML = html;
      var text = (tmp.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      if (text.length > 320) text = text.slice(0, 320).replace(/\s\S*$/, "") + "…";
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        var v = pickVoice(); if (v) u.voice = v;
        u.rate = 1.0; u.pitch = 1.0; u.lang = "en-US";
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    // ---- Mute toggle for voice replies ----
    function renderMute() {
      if (!muteBtn) return;
      muteBtn.setAttribute("aria-pressed", ttsMuted ? "true" : "false");
      muteBtn.setAttribute("aria-label", ttsMuted ? "Turn voice replies on" : "Mute voice replies");
      muteBtn.title = ttsMuted ? "Voice replies off" : "Voice replies on";
      muteBtn.classList.toggle("is-muted", ttsMuted);
      var use = $("use", muteBtn); if (use) use.setAttribute("href", ttsMuted ? "#i-volume-off" : "#i-volume");
    }
    if (muteBtn) {
      if (!ttsSupported) { muteBtn.hidden = true; }
      else {
        renderMute();
        muteBtn.addEventListener("click", function () {
          ttsMuted = !ttsMuted;
          try { localStorage.setItem("apexVoiceMuted", ttsMuted ? "1" : "0"); } catch (e) {}
          if (ttsMuted) { try { window.speechSynthesis.cancel(); } catch (e) {} }
          renderMute();
          showToast(ttsMuted ? "Voice replies muted" : "Voice replies on");
        });
      }
    }

    micUI(false);
    if (!SR && mic) mic.title = "Voice input isn't supported in this browser";

    return { root: root, focusInput: function () { textInput.focus(); }, stopVoice: stopVoice };
  }

  // Mount hero (desktop) + sheet (mobile) instances
  var heroMount = $("#aiHeroMount");
  var heroAI = heroMount ? mountAssistant(heroMount, {}) : null;

  var sheetEl = $("#aiSheet");
  var sheetMount = $("#aiSheetMount");
  var aiSheet = sheetEl ? makeOverlay(sheetEl, ".ai-sheet__panel", {
    onOpen: function () { fab && fab.setAttribute("aria-expanded", "true"); },
    onClose: function () { fab && fab.setAttribute("aria-expanded", "false"); if (sheetAI) sheetAI.stopVoice(); }
  }) : null;
  var sheetAI = sheetMount ? mountAssistant(sheetMount, { showClose: true, onClose: function () { aiSheet && aiSheet.close(); } }) : null;

  var fab = $("#aiFab");
  if (fab && aiSheet) fab.addEventListener("click", aiSheet.open);
  $$("[data-close-aisheet]").forEach(function (el) { el.addEventListener("click", function () { aiSheet && aiSheet.close(); }); });

  // Stop speech recognition + voice replies when the tab is hidden
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (heroAI) heroAI.stopVoice(); if (sheetAI) sheetAI.stopVoice(); }
  });

  // "Ask our AI assistant" trigger
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-open-ai]");
    if (!t) return;
    e.preventDefault();
    if (isMobile() && aiSheet) aiSheet.open();
    else { scrollToHash("#top"); setTimeout(function () { heroAI && heroAI.focusInput(); }, 600); }
  });

  /* ======================================================
     Photo fallback — if a hotlinked photo fails to load,
     reveal the vector/gradient fallback beneath it.
  ====================================================== */
  $$(".js-photo").forEach(function (img) {
    function fail() { if (img.parentElement) img.parentElement.classList.add("is-failed"); }
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0) fail();
  });

  /* ======================================================
     Footer year
  ====================================================== */
  var yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
