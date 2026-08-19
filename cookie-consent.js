/*
  Hayso — cookie consent + gated analytics
  ========================================
  Drop this file at the root of the site and add ONE line to every page,
  including index.html, just before </body>:

      <script src="/cookie-consent.js" defer></script>

  It injects its own banner markup and styles, so there is nothing to paste
  into each page. Anything in the footer with id="cookie-settings-link"
  automatically reopens the banner.

  BEFORE THIS WORKS: set POSTHOG_KEY below.
  NEVER put a PostHog snippet in <head> — that fires before consent and
  defeats the entire banner.
*/

(function () {
  'use strict';

  var POSTHOG_KEY  = '[YOUR_POSTHOG_PROJECT_API_KEY]';
  var POSTHOG_HOST = 'https://eu.i.posthog.com';   // EU Cloud (Frankfurt). Not us.i.posthog.com.
  var STORAGE_KEY  = 'hayso_cookie_consent';
  var REASK_DAYS   = 180;

  /* ---------- consent state ---------- */

  function readChoice() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if ((Date.now() - saved.at) / 86400000 > REASK_DAYS) return null;
      return saved.choice;
    } catch (e) { return null; }
  }

  function saveChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: choice, at: Date.now() }));
    } catch (e) {}
  }

  /* ---------- analytics, gated ---------- */

  function loadAnalytics() {
    if (window.__haysoAnalytics) return;
    if (!POSTHOG_KEY || POSTHOG_KEY.charAt(0) === '[') return;  // not configured yet
    window.__haysoAnalytics = true;

    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset group identify".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document, window.posthog || []);

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'never',          // no identified profiles at waitlist stage
      autocapture: false,                // capture named events deliberately
      capture_pageview: true,
      disable_session_recording: true,   // see note at the bottom of this file
      mask_all_text: true,
      mask_all_element_attributes: true
    });
  }

  /* ---------- banner ---------- */

  var CSS = [
    '.hayso-cc{position:fixed;inset:auto 20px 20px 20px;z-index:100;max-width:520px;',
    'margin-inline:auto;padding:20px 22px;background:var(--surface,#fff);',
    'border:1px solid var(--line,#e0e0e0);border-radius:24px;',
    'box-shadow:rgba(0,0,0,.06) 0 8px 30px 0;font-size:13px;line-height:1.55;',
    "color:var(--ink,#000);font-family:'Manrope',ui-sans-serif,system-ui,sans-serif;",
    'letter-spacing:-.012em}',
    '.hayso-cc[hidden]{display:none}',
    '.hayso-cc p{margin:0 0 14px;color:var(--ink-soft,#2e2e2e)}',
    '.hayso-cc a{color:var(--purple,#5d48db)}',
    '.hayso-cc div{display:flex;gap:10px}',
    '.hayso-cc button{flex:1;padding:11px 16px;font:inherit;font-size:14px;',
    'border-radius:30px;border:1px solid var(--line,#e0e0e0);background:#fff;',
    'color:var(--ink,#000);cursor:pointer}',
    '.hayso-cc button:hover{border-color:var(--ink,#000)}',
    '.hayso-cc button[data-choice="accepted"]{background:var(--purple,#5d48db);',
    'border-color:var(--purple,#5d48db);color:#fff}',
    '.hayso-cc button[data-choice="accepted"]:hover{background:#4c3ac2;border-color:#4c3ac2}',
    '.hayso-cc button:focus-visible{outline:2px solid var(--purple,#5d48db);outline-offset:3px}',
    '@media (max-width:768px){.hayso-cc{inset:auto 12px 12px 12px;padding:18px}}',
    '@media (prefers-reduced-motion:no-preference){',
    '.hayso-cc{animation:hayso-cc-rise 240ms ease-out}',
    '@keyframes hayso-cc-rise{from{transform:translateY(12px);opacity:0}}}'
  ].join('');

  var HTML = [
    '<p>We\'d like to use analytics cookies to understand how clinics find this site. ',
    'Your data stays in the EU, and nothing here affects joining the waiting list. ',
    '<a href="/cookies">Cookie Policy</a>.</p>',
    '<div>',
    '<button type="button" data-choice="rejected">Reject</button>',
    '<button type="button" data-choice="accepted">Accept</button>',
    '</div>'
  ].join('');

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'hayso-cc';
    banner.id = 'hayso-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie choices');
    banner.hidden = true;
    banner.innerHTML = HTML;
    document.body.appendChild(banner);

    banner.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-choice]');
      if (!btn) return;
      var choice = btn.getAttribute('data-choice');
      saveChoice(choice);
      banner.hidden = true;
      if (choice === 'accepted') loadAnalytics();
      // Rejecting is permanent until changed — the tag is never loaded.
    });

    var settings = document.getElementById('cookie-settings-link');
    if (settings) {
      settings.addEventListener('click', function () { banner.hidden = false; });
    }

    var existing = readChoice();
    if (existing === 'accepted') loadAnalytics();
    else if (existing === null) banner.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/*
  SESSION RECORDING — deliberately off.
  A replay of someone typing their email on a page about weight-loss medication
  is a recording of health-adjacent behaviour tied to an identifiable person.
  Turning it on moves you from low-risk waitlist analytics to something that
  needs a DPIA. Revisit with your clinical advisor, not before.

  person_profiles:'never' stops PostHog building identified profiles. If you
  ever call posthog.identify() with an email address, that changes — and so do
  sections 3, 4 and 7 of the privacy policy.
*/
