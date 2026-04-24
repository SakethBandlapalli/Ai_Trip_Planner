/* Keys */
function _gk() { return ['gsk_waYG1kRDafrl', 'ObB2ClCDWGdyb3FY', '2XyfBpbbQ9UjAVB7zed9eZiu'].join(''); }
function _pk() { return ['UeJ4FTX7ihAJmsGJ', 'S9L3LRi2Wz4C9E32', 'S1dLvINE1fzv0ltvC0sdEMFA'].join(''); }

/* State */
let TRIP = null;
let META = null;

const BL = {
  budget: 'Budget',
  moderate: 'Moderate',
  luxury: 'Luxury',
  'ultra-luxury': 'Ultra Luxury',
};

const LMSGS = [
  'Validating destination...',
  'Searching local events...',
  'Building your itinerary...',
  'Curating hotels...',
  'Fetching travel photos...',
  'Almost ready...',
];

const COMMON_CURRENCY_CODES = {
  usd: 'USD',
  dollar: 'USD',
  'us dollar': 'USD',
  eur: 'EUR',
  euro: 'EUR',
  gbp: 'GBP',
  pound: 'GBP',
  'british pound': 'GBP',
  inr: 'INR',
  rupee: 'INR',
  'indian rupee': 'INR',
  jpy: 'JPY',
  yen: 'JPY',
  cny: 'CNY',
  yuan: 'CNY',
  renminbi: 'CNY',
  aed: 'AED',
  dirham: 'AED',
  cad: 'CAD',
  'canadian dollar': 'CAD',
  aud: 'AUD',
  'australian dollar': 'AUD',
  sgd: 'SGD',
  'singapore dollar': 'SGD',
  chf: 'CHF',
  franc: 'CHF',
  thb: 'THB',
  baht: 'THB',
  krw: 'KRW',
  won: 'KRW',
  idr: 'IDR',
  rupiah: 'IDR',
  vnd: 'VND',
  dong: 'VND',
  myr: 'MYR',
  ringgit: 'MYR',
  zar: 'ZAR',
  rand: 'ZAR',
  brl: 'BRL',
  real: 'BRL',
};

let lTimer = null;
let bindingsReady = false;
const pxCache = {};

/* Shared helpers */
function stripCodeFences(text) {
  return String(text || '').replace(/```json|```/gi, '').trim();
}

function parseJsonCandidate(candidate) {
  const attempts = [candidate];
  attempts.push(candidate.replace(/,\s*([}\]])/g, '$1').replace(/\u0000/g, ''));

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (_) {
      // Try the next repair strategy.
    }
  }

  return null;
}

function extractWrappedJson(text, openChar, closeChar) {
  const start = text.indexOf(openChar);
  const end = text.lastIndexOf(closeChar);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function parseGroqArray(text, fallback = []) {
  const cleaned = stripCodeFences(text);
  const candidates = [cleaned, extractWrappedJson(cleaned, '[', ']')].filter(Boolean);
  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);
    if (Array.isArray(parsed)) return parsed;
  }
  return fallback;
}

function parseGroqObject(text, fallback = null) {
  const cleaned = stripCodeFences(text);
  const candidates = [cleaned, extractWrappedJson(cleaned, '{', '}')].filter(Boolean);
  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') return parsed;
  }
  return fallback;
}

async function groqChat(prompt, { temperature = 0.4, maxTokens = 1200 } = {}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + _gk(),
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    let errorMessage = 'Groq request failed';
    try {
      const errorJson = await res.json();
      errorMessage = errorJson.error?.message || errorMessage;
    } catch (_) {
      // Keep the generic message.
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function normalizeCurrencyCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const directCode = raw.match(/\b[A-Z]{3}\b/);
  if (directCode) return directCode[0];

  const normalized = raw.toLowerCase();
  if (normalized.includes('₹')) return 'INR';
  if (normalized.includes('€')) return 'EUR';
  if (normalized.includes('£')) return 'GBP';
  if (normalized.includes('¥')) return normalized.includes('china') ? 'CNY' : 'JPY';
  if (normalized.includes('$')) return normalized.includes('canadian') ? 'CAD' : normalized.includes('australian') ? 'AUD' : normalized.includes('singapore') ? 'SGD' : 'USD';

  for (const [label, code] of Object.entries(COMMON_CURRENCY_CODES)) {
    if (normalized.includes(label)) return code;
  }

  return '';
}

async function fetchUsdRate(code) {
  const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!rateRes.ok) throw new Error('Exchange rate request failed.');
  const rateData = await rateRes.json();
  const rate = rateData.rates?.[code];
  if (!rate) throw new Error('Rate unavailable.');
  return rate;
}

function createSelectionId(prefix = 'sel') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* Screen management */
function showPage(id) {
  ['pg-land', 'pg-wizard', 'pg-loading', 'pg-results'].forEach((pageId) => {
    const node = document.getElementById(pageId);
    if (node) node.classList.toggle('hidden', pageId !== id);
  });
}

function showLand() { showPage('pg-land'); }
function showWizard() { showPage('pg-wizard'); goStep(1); }

/* Wizard state */
let currentStep = 1;

function goStep(n) {
  document.querySelectorAll('.wstep').forEach((step) => step.classList.remove('active'));
  document.getElementById('step' + n)?.classList.add('active');
  currentStep = n;

  for (let i = 1; i <= 3; i += 1) {
    const sc = document.getElementById('sc' + i);
    const sl = document.getElementById('sl' + i);
    if (!sc || !sl) continue;
    sc.classList.remove('active', 'done');
    sl.classList.remove('active');
    if (i < n) {
      sc.classList.add('done');
      sc.textContent = '✓';
    } else if (i === n) {
      sc.classList.add('active');
      sl.classList.add('active');
      sc.textContent = String(i);
    } else {
      sc.textContent = String(i);
    }
  }

  for (let i = 1; i <= 2; i += 1) {
    document.getElementById('line' + i)?.classList.toggle('done', i < n);
  }

  if (n === 3) buildSummary();
}

function nextStep(n) {
  if (n === 2) {
    const dest = document.getElementById('f-dest').value.trim();
    const sv = document.getElementById('f-start').value;
    const ev = document.getElementById('f-end').value;
    const err = document.getElementById('err1');
    err.classList.add('hidden');

    if (!dest) {
      err.textContent = 'Please enter a destination.';
      err.classList.remove('hidden');
      return;
    }
    if (!sv || !ev) {
      err.textContent = 'Please select both start and end dates.';
      err.classList.remove('hidden');
      return;
    }
    const s = parseD(sv);
    const e = parseD(ev);
    if (e <= s) {
      err.textContent = 'End date must be after start date.';
      err.classList.remove('hidden');
      return;
    }
  }

  goStep(n);
}

function setBudget(el) {
  document.querySelectorAll('.bcard').forEach((b) => b.classList.remove('on'));
  el.classList.add('on');
}

/* Dates */
function fmtISO(d) { return d.toISOString().split('T')[0]; }
function parseD(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmtLong(d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }
function fmtShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtMonth(d) { return d.toLocaleDateString('en-US', { month: 'long' }); }
function nightsBetween(a, b) { return Math.round((b - a) / (1000 * 60 * 60 * 24)); }

function onDates() {
  const prev = document.getElementById('date-prev');
  if (!prev) return;

  const sv = document.getElementById('f-start').value;
  const ev = document.getElementById('f-end').value;
  if (!sv || !ev) {
    prev.style.display = 'none';
    return;
  }

  const s = parseD(sv);
  const e = parseD(ev);
  if (e <= s) {
    prev.style.display = 'block';
    prev.innerHTML = 'End date must be after start date';
    return;
  }

  const n = nightsBetween(s, e);
  const months = [...new Set([fmtMonth(s), fmtMonth(e)])].join(' - ');
  prev.style.display = 'block';
  prev.innerHTML = `<strong>${fmtLong(s)}</strong> → <strong>${fmtLong(e)}</strong> <span class="nights-badge">${n} night${n !== 1 ? 's' : ''}</span><br>Visiting in <strong>${months}</strong>`;
}

function getDays() {
  const sv = document.getElementById('f-start').value;
  const ev = document.getElementById('f-end').value;
  if (!sv || !ev) return 5;
  return Math.max(1, nightsBetween(parseD(sv), parseD(ev)));
}

function getMonths() {
  const sv = document.getElementById('f-start').value;
  const ev = document.getElementById('f-end').value;
  if (!sv) return fmtMonth(new Date());
  const s = parseD(sv);
  const e = ev ? parseD(ev) : s;
  return [...new Set([fmtMonth(s), fmtMonth(e)])].join(' and ');
}

function getDayLabels() {
  const sv = document.getElementById('f-start').value;
  const days = getDays();
  const labels = [];
  for (let i = 0; i < days; i += 1) {
    const d = parseD(sv);
    d.setDate(d.getDate() + i);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }
  return labels;
}

function buildSummary() {
  const dest = document.getElementById('f-dest').value;
  const sv = document.getElementById('f-start').value;
  const ev = document.getElementById('f-end').value;
  const travelers = document.getElementById('f-travelers').value;
  const budget = document.querySelector('.bcard.on')?.dataset.val || 'moderate';
  const s = parseD(sv);
  const e = parseD(ev);
  document.getElementById('summary-box').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px">
      <div><span style="color:var(--text-dim);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:var(--font-display)">Flying From</span><br><span style="color:var(--text);font-weight:500">${document.getElementById('f-from').value || 'Not set'}</span></div>
      <div><span style="color:var(--text-dim);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:var(--font-display)">Destination</span><br><span style="color:var(--text);font-weight:500">${dest}</span></div>
      <div><span style="color:var(--text-dim);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:var(--font-display)">Duration</span><br><span style="color:var(--text);font-weight:500">${getDays()} nights</span></div>
      <div><span style="color:var(--text-dim);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:var(--font-display)">Dates</span><br><span style="color:var(--text);font-weight:500">${fmtShort(s)} → ${fmtShort(e)}</span></div>
      <div><span style="color:var(--text-dim);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:var(--font-display)">Travelers</span><br><span style="color:var(--text);font-weight:500">${travelers} ${travelers === '1' ? 'person' : 'people'}</span></div>
      <div><span style="color:var(--text-dim);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:var(--font-display)">Budget</span><br><span style="color:var(--accent);font-weight:500">${BL[budget]}</span></div>
    </div>`;
}

/* Exchange rate */
async function fetchRate(currencyHint) {
  const pill = document.getElementById('rate-pill');
  if (!pill) return;

  const code = normalizeCurrencyCode(currencyHint);
  if (!code) {
    pill.textContent = currencyHint ? `💱 ${currencyHint}` : '💱 Rate unavailable';
    return;
  }

  try {
    const rate = await fetchUsdRate(code);
    const formatted = rate >= 100 ? Math.round(rate).toLocaleString() : rate.toFixed(2);
    pill.textContent = `💱 1 USD = ${formatted} ${code}`;
    pill.title = `Live rate · Updated ${new Date().toLocaleTimeString()}`;
  } catch (_) {
    pill.textContent = `💱 ${code}`;
  }
}

/* Loading */
function startLoad() {
  let i = 0;
  const el = document.getElementById('load-msg');
  const dotsEl = document.getElementById('loader-dots');
  dotsEl.innerHTML = LMSGS.map((_, j) => `<div class="ldot" id="ld${j}"></div>`).join('');
  document.getElementById('ld0')?.classList.add('active');
  lTimer = setInterval(() => {
    i = (i + 1) % LMSGS.length;
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = LMSGS[i];
      el.style.opacity = 1;
    }, 200);
    document.querySelectorAll('.ldot').forEach((d) => d.classList.remove('active'));
    document.getElementById('ld' + i)?.classList.add('active');
  }, 1800);
}

function stopLoad() {
  clearInterval(lTimer);
}

/* Tabs */
function switchTab(name) {
  document.querySelectorAll('.rtab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelector(`.rtab[data-tab="${name}"]`)?.classList.add('active');
  document.getElementById('tab-' + name)?.classList.add('active');
  const header = document.getElementById('trip-header');
  if (header) window.scrollTo({ top: header.offsetTop - 60, behavior: 'smooth' });
}

/* Pexels */
async function pexels(query, n = 1) {
  if (pxCache[query]) return pxCache[query];
  try {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${n}&orientation=landscape`, {
      headers: { Authorization: _pk() },
    });
    const d = await r.json();
    const photos = (d.photos || []).map((p) => p.src.large || p.src.medium);
    pxCache[query] = photos;
    return photos;
  } catch (_) {
    pxCache[query] = [];
    return [];
  }
}

async function setImg(imgId, phId, q, fallback) {
  const img = document.getElementById(imgId);
  const ph = document.getElementById(phId);
  if (!img) return;
  let photos = await pexels(q, 1);
  if (!photos.length && fallback) photos = await pexels(fallback, 1);
  if (photos.length) {
    img.onload = () => {
      img.style.opacity = 1;
      if (ph) {
        ph.classList.remove('loading');
        ph.style.display = 'none';
      }
    };
    img.src = photos[0];
  } else if (ph) {
    ph.classList.remove('loading');
    ph.style.display = 'flex';
  }
}

async function setHotelMosaic(hi, name, dest) {
  const [p1, p2, p3] = await Promise.all([
    pexels(name + ' hotel', 1),
    pexels(dest + ' luxury hotel', 2),
    pexels(dest + ' cityscape', 3),
  ]);
  const pool = [...(p1 || []), ...(p2 || []), ...(p3 || [])];
  ['main', 's1', 's2'].forEach((slot, i) => {
    const img = document.getElementById(`himg-${slot}-${hi}`);
    const ph = document.getElementById(`hph-${slot}-${hi}`);
    const src = pool[i] || pool[0];
    if (img && src) {
      img.onload = () => {
        img.style.opacity = 1;
        if (ph) {
          ph.classList.remove('loading');
          ph.style.display = 'none';
        }
      };
      img.src = src;
    } else if (ph) {
      ph.classList.remove('loading');
      ph.style.display = 'flex';
    }
  });
}

function mUrl(p, d) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p + ' ' + d)}`; }
function dUrl(p, d) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p + ' ' + d)}`; }

/* Validation */
async function validateDest(dest) {
  const text = await groqChat(
    `Is "${dest}" a real travel destination (city, region, or country)?
Answer ONLY with JSON:
If valid: {"valid":true,"canonical":"Properly capitalized name with country if useful"}
If not valid: {"valid":false,"reason":"brief reason"}`,
    { temperature: 0, maxTokens: 80 },
  );

  const parsed = parseGroqObject(text, { valid: true, canonical: dest });
  if (parsed.valid && parsed.canonical) {
    const inputLower = dest.toLowerCase().replace(/[^a-z]/g, '');
    const canonLower = parsed.canonical.toLowerCase().replace(/[^a-z]/g, '');
    const inputFirst = inputLower.slice(0, 4);
    if (inputFirst.length >= 3 && !canonLower.includes(inputFirst)) {
      parsed.canonical = dest.charAt(0).toUpperCase() + dest.slice(1);
    }
  }
  return parsed;
}

/* Event bindings */
function handleActionClick(target) {
  switch (target.dataset.action) {
    case 'show-wizard':
      showWizard();
      break;
    case 'show-land':
      showLand();
      break;
    case 'next-step':
      nextStep(Number(target.dataset.step));
      break;
    case 'go-step':
      goStep(Number(target.dataset.step));
      break;
    case 'set-budget':
      setBudget(target.closest('.bcard'));
      break;
    case 'generate-trip':
      generate();
      break;
    case 'switch-tab':
      switchTab(target.dataset.tab);
      break;
    case 'toggle-desc':
      toggleDesc();
      break;
    case 'load-more-hotels':
      loadMoreHotels(META?.dest || '');
      break;
    case 'add-event':
      addEventToItinerary(Number(target.dataset.eventIndex));
      break;
    case 'export-png':
      exportPNG();
      break;
    case 'switch-day':
      switchDaySlot(Number(target.dataset.dayIndex));
      break;
    case 'search-flights':
      animateAndSearch();
      break;
    case 'retry-activity-pool':
      retryActivityPool();
      break;
    case 'use-starter-activities':
      useStarterActivities();
      break;
    case 'set-category':
      setCat(target.dataset.category);
      break;
    case 'toggle-activity':
      toggleActivity(target.dataset.activityId);
      break;
    case 'remove-activity':
      removeActFromDay(Number(target.dataset.dayIndex), target.dataset.activityId);
      break;
    default:
      break;
  }
}

function initEventBindings() {
  if (bindingsReady) return;
  bindingsReady = true;

  document.addEventListener('click', (event) => {
    const actionTarget = event.target.closest('[data-action]');
    if (actionTarget) handleActionClick(actionTarget);
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.id === 'f-start' || target.id === 'f-end') onDates();
    if (target.dataset.action === 'sort-hotels') sortHotels(target.value);
    if (target.closest('#tab-flights')) window.updateFlightPartnerLinks?.();
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.id === 'pool-search') filterPool();
    if (target.closest('#tab-flights')) window.updateFlightPartnerLinks?.();
  });
}

/* Init */
(() => {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 5);
  document.getElementById('f-start').value = fmtISO(now);
  document.getElementById('f-end').value = fmtISO(end);
  onDates();
  initEventBindings();
})();
