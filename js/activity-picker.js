let _pool = [];
let _selectedActs = {};
let _curDaySlot = 0;
let _activeCat = 'All';
let _searchQ = '';
let _poolCtx = null;
let _poolModeNote = '';

const ACTIVITY_CATEGORIES = [
  'Cultural',
  'Food',
  'Nature',
  'Shopping',
  'Nightlife',
  'History',
  'Adventure',
  'Relaxation',
  'Art',
  'Sport',
  'Religious',
  'Transport',
];

const CAT_EMOJIS = {
  Cultural: '🏛',
  Food: '🍜',
  Nature: '🌿',
  Shopping: '🛍',
  Nightlife: '🎶',
  History: '📜',
  Adventure: '🧗',
  Relaxation: '🏖',
  Art: '🎨',
  Sport: '⚽',
  Religious: '🙏',
  Transport: '🚌',
  All: '✦',
};

function switchDaySlot(i) {
  _curDaySlot = i;
  document.querySelectorAll('.day-tab').forEach((t, idx) => t.classList.toggle('active', idx === i));
  document.querySelectorAll('[id^="dslot-"]').forEach((s, idx) => s.classList.toggle('hidden', idx !== i));
  renderPool();
}

function normalizeCategory(raw, name, detail) {
  const value = String(raw || '').trim();
  const match = ACTIVITY_CATEGORIES.find((cat) => cat.toLowerCase() === value.toLowerCase());
  if (match) return match;

  const text = `${name || ''} ${detail || ''} ${value}`.toLowerCase();
  if (/temple|church|mosque|shrine|pilgr/.test(text)) return 'Religious';
  if (/museum|heritage|fort|palace|monument|history/.test(text)) return 'History';
  if (/food|eat|restaurant|cafe|market|street food|dinner|lunch/.test(text)) return 'Food';
  if (/park|zoo|lake|garden|beach|hill|nature|wildlife/.test(text)) return 'Nature';
  if (/mall|shopping|bazaar|marketplace/.test(text)) return 'Shopping';
  if (/night|club|bar|music|live/.test(text)) return 'Nightlife';
  if (/art|gallery|craft/.test(text)) return 'Art';
  if (/adventure|trek|hike|climb|ride|kayak/.test(text)) return 'Adventure';
  if (/spa|relax|leisure|sunset/.test(text)) return 'Relaxation';
  if (/sport|stadium|cricket|football/.test(text)) return 'Sport';
  if (/bus|train|metro|ferry|station/.test(text)) return 'Transport';
  return 'Cultural';
}

function normalizeActivity(activity, idSeed) {
  const name = String(activity?.name || '').trim();
  if (!name) return null;
  const detail = String(activity?.detail || activity?.description || '').trim();
  const category = normalizeCategory(activity?.category, name, detail);
  const rating = Number(activity?.tripadvisorRating || activity?.rating || 0);

  return {
    id: String(idSeed),
    sourceId: String(activity?.sourceId || idSeed),
    name,
    category,
    emoji: String(activity?.emoji || '').trim() || CAT_EMOJIS[category] || '📍',
    duration: String(activity?.duration || '').trim(),
    detail,
    bestTime: String(activity?.bestTime || activity?.time || '').trim(),
    entryFee: String(activity?.entryFee || '').trim(),
    tripadvisorRating: rating >= 4 && rating <= 5 ? Number(rating.toFixed(1)) : null,
  };
}

function dedupeActivities(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.name) return false;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneActivityForDay(activity, dayIdx) {
  return {
    ...activity,
    id: createSelectionId(`day${dayIdx}`),
    sourceId: activity.sourceId || activity.id,
  };
}

function isActivitySelectedInDay(dayIdx, activity) {
  return (_selectedActs[dayIdx] || []).some((selected) => selected.name.toLowerCase() === activity.name.toLowerCase());
}

function seedSelectedActsFromItinerary(itin) {
  const seeded = {};
  (itin || []).forEach((day, dayIdx) => {
    seeded[dayIdx] = (day.activities || [])
      .map((activity, actIdx) => normalizeActivity({
        ...activity,
        category: day.title || 'Cultural',
        duration: activity.duration || '1-2 hrs',
        bestTime: activity.time || activity.bestTime || '',
      }, `seed_${dayIdx}_${actIdx}`))
      .filter(Boolean)
      .map((activity) => cloneActivityForDay(activity, dayIdx));
  });
  return seeded;
}

function buildStarterActivities(itin, events) {
  const starters = [];
  (itin || []).forEach((day, dayIdx) => {
    (day.activities || []).forEach((activity, actIdx) => {
      starters.push(normalizeActivity({
        ...activity,
        category: day.title || 'Cultural',
        duration: activity.duration || '1-2 hrs',
        bestTime: activity.time || activity.bestTime || '',
      }, `starter_${dayIdx}_${actIdx}`));
    });
  });

  (events || []).forEach((event, idx) => {
    starters.push(normalizeActivity({
      sourceId: `event_${idx}`,
      name: event.name,
      category: event.type || 'Event',
      emoji: event.emoji || '🎉',
      duration: 'Evening',
      detail: event.description || event.localTip,
      bestTime: event.dates,
      entryFee: 'Check event website',
    }, `event_${idx}`));
  });

  return dedupeActivities(starters.filter(Boolean));
}

function getActivityImageQuery(activity) {
  const dest = _poolCtx?.dest || META?.dest || '';
  return `${activity.name} ${dest}`.trim();
}

function getActivityImageFallback(activity) {
  const dest = _poolCtx?.dest || META?.dest || '';
  return `${activity.category || 'travel'} ${dest}`.trim();
}

function loadPoolImages(activities) {
  requestAnimationFrame(() => {
    activities.forEach((activity) => {
      setImg(`acimg-${activity.id}`, `acph-${activity.id}`, getActivityImageQuery(activity), getActivityImageFallback(activity));
    });
  });
}

function loadSelectedDayImages(activities) {
  requestAnimationFrame(() => {
    activities.forEach((activity) => {
      setImg(`simg-${activity.id}`, `sph-${activity.id}`, getActivityImageQuery(activity), getActivityImageFallback(activity));
    });
  });
}

function resetActivityPicker(itin) {
  _pool = [];
  _selectedActs = seedSelectedActsFromItinerary(itin);
  _curDaySlot = 0;
  _activeCat = 'All';
  _searchQ = '';
  _poolModeNote = '';
  _poolCtx = itin ? { ..._poolCtx, itin } : _poolCtx;
  const search = document.getElementById('pool-search');
  if (search) search.value = '';
  document.getElementById('cat-filters').innerHTML = '';
  (itin || []).forEach((_, idx) => renderDaySlot(idx));
  switchDaySlot(0);
}

function setPoolEmptyState(message, actionsHtml = '') {
  const list = document.getElementById('pool-list');
  if (!list) return;
  list.innerHTML = `
    <div class="pool-error">
      <div class="pool-error-copy">${message}</div>
      ${actionsHtml}
    </div>`;
}

function renderPoolError(message, canUseStarter) {
  setPoolEmptyState(
    message,
    `<div class="pool-error-actions">
      <button class="cat-btn active" data-action="retry-activity-pool">Retry</button>
      ${canUseStarter ? '<button class="cat-btn" data-action="use-starter-activities">Use Starter Activities</button>' : ''}
    </div>`,
  );
}

function hydratePool(items, modeLabel = '') {
  _poolModeNote = modeLabel;
  _pool = dedupeActivities(items.map((item, idx) => normalizeActivity(item, item?.id || `act_${idx}`)).filter(Boolean));
  buildCatFilters();
  renderPool();
}

async function fetchActivityPoolFromAI(dest, dayCount) {
  const targetCount = Math.min(42, Math.max(24, dayCount * 7));
  const prompts = [
    {
      prompt: `You are a travel planner for ${dest}. Return exactly ${targetCount} real activities in ${dest} as a valid JSON array.
Each item must be:
{"name":"Specific real place","category":"Cultural","duration":"2 hrs","emoji":"🏛","detail":"One vivid sentence","bestTime":"Morning","entryFee":"Free or price","tripadvisorRating":4.6}
Use only these categories: ${ACTIVITY_CATEGORIES.join(', ')}.
Rules:
- Use real, popular places and experiences only
- Keep detail under 20 words
- No markdown, no commentary, no duplicate places`,
      temperature: 0.35,
      maxTokens: 3600,
    },
    {
      prompt: `List 20 real visitor activities in ${dest}. Return only a valid JSON array with keys:
name, category, duration, emoji, detail, bestTime, entryFee, tripadvisorRating.`,
      temperature: 0.2,
      maxTokens: 2200,
    },
  ];

  let lastError = new Error('Unable to build activity pool.');

  for (const attempt of prompts) {
    try {
      const text = await groqChat(attempt.prompt, { temperature: attempt.temperature, maxTokens: attempt.maxTokens });
      const parsed = parseGroqArray(text, []);
      const normalized = dedupeActivities(parsed.map((item, idx) => normalizeActivity(item, `ai_${idx}`)).filter(Boolean));
      if (normalized.length >= 8) return normalized;
      throw new Error('Activity response was incomplete.');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function initActivityPool(dest, itin, meta) {
  _poolCtx = {
    dest,
    itin,
    meta,
    starter: buildStarterActivities(itin, TRIP?.events || []),
  };

  resetActivityPicker(itin);
  setPoolEmptyState('<div class="pool-loading"><div class="pool-spin"></div><br>Loading activities...</div>');

  try {
    const aiPool = await fetchActivityPoolFromAI(dest, itin.length);
    hydratePool([...aiPool, ..._poolCtx.starter], '');
  } catch (_) {
    if (_poolCtx.starter.length) {
      hydratePool(_poolCtx.starter, 'starter picks shown');
    } else {
      renderPoolError('We could not load activities right now.', false);
      const countEl = document.getElementById('pool-count');
      if (countEl) countEl.textContent = 'Activity suggestions unavailable';
    }
  }
}

function retryActivityPool() {
  if (!_poolCtx) return;
  initActivityPool(_poolCtx.dest, _poolCtx.itin, _poolCtx.meta);
}

function useStarterActivities() {
  if (!_poolCtx?.starter?.length) return;
  hydratePool(_poolCtx.starter, 'starter picks shown');
}

function buildCatFilters() {
  const cats = ['All', ...new Set(_pool.map((a) => a.category).filter(Boolean))];
  document.getElementById('cat-filters').innerHTML = cats.map((cat) => `
    <button class="cat-btn${cat === 'All' ? ' active' : ''}" data-action="set-category" data-category="${cat}">${CAT_EMOJIS[cat] || '📌'} ${cat}</button>`).join('');
}

function setCat(cat) {
  _activeCat = cat;
  document.querySelectorAll('.cat-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.category === cat));
  renderPool();
}

function filterPool() {
  _searchQ = document.getElementById('pool-search').value.toLowerCase();
  renderPool();
}

function renderPool() {
  const filtered = _pool.filter((activity) => {
    const matchCat = _activeCat === 'All' || activity.category === _activeCat;
    const matchQ = !_searchQ || activity.name.toLowerCase().includes(_searchQ) || activity.detail?.toLowerCase().includes(_searchQ);
    return matchCat && matchQ;
  });

  const list = document.getElementById('pool-list');
  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = '<div class="pool-loading">No activities match.</div>';
    return;
  }

  document.getElementById('pool-count').textContent = `${filtered.length} of ${_pool.length} activities${_poolModeNote ? ' · ' + _poolModeNote : ''}`;
  list.innerHTML = filtered.map((activity) => `
    <div class="act-card${isActivitySelectedInDay(_curDaySlot, activity) ? ' selected' : ''}" id="acard-${activity.id}" data-action="toggle-activity" data-activity-id="${activity.id}">
      <div class="act-card-media">
        <div class="act-card-ph loading" id="acph-${activity.id}"></div>
        <img class="act-card-img" id="acimg-${activity.id}" src="" alt="${activity.name}"/>
        <div class="act-card-emoji">${activity.emoji || CAT_EMOJIS[activity.category] || '📌'}</div>
      </div>
      <div class="act-card-body">
        <div class="act-card-name">${activity.name}</div>
        <div class="act-card-meta">
          <span class="act-card-cat">${activity.category}</span>
          ${activity.duration ? `<span class="act-card-dur">⏱ ${activity.duration}</span>` : ''}
          ${activity.bestTime ? `<span class="act-card-dur">☀ ${activity.bestTime}</span>` : ''}
          ${activity.tripadvisorRating ? `<span class="act-card-dur" style="color:#e8a94a">★ ${activity.tripadvisorRating}</span>` : ''}
        </div>
        ${activity.detail ? `<div class="act-card-detail">${activity.detail}</div>` : ''}
        ${activity.entryFee ? `<div class="act-card-detail" style="color:#f0c06a;margin-top:3px">🎟 ${activity.entryFee}</div>` : ''}
      </div>
      <div class="act-card-add">${isActivitySelectedInDay(_curDaySlot, activity) ? '✓' : '+'}</div>
    </div>`).join('');
  loadPoolImages(filtered);
}

function addExternalActivityToDay(dayIdx, activity) {
  if (!_selectedActs[dayIdx]) _selectedActs[dayIdx] = [];
  if ((_selectedActs[dayIdx] || []).some((selected) => selected.name.toLowerCase() === String(activity.name || '').toLowerCase())) {
    return false;
  }
  const normalized = normalizeActivity(activity, activity.sourceId || createSelectionId('ext'));
  if (!normalized) return false;
  _selectedActs[dayIdx].push(cloneActivityForDay(normalized, dayIdx));
  renderDaySlot(dayIdx);
  renderPool();
  return true;
}

function toggleActivity(id) {
  const activity = _pool.find((item) => item.id === id);
  if (!activity) return;
  if (!_selectedActs[_curDaySlot]) _selectedActs[_curDaySlot] = [];

  const existing = (_selectedActs[_curDaySlot] || []).find((selected) => selected.name.toLowerCase() === activity.name.toLowerCase());
  if (existing) {
    removeActFromDay(_curDaySlot, existing.id);
    return;
  }

  _selectedActs[_curDaySlot].push(cloneActivityForDay(activity, _curDaySlot));
  renderPool();
  renderDaySlot(_curDaySlot);
}

function removeActFromDay(dayIdx, id) {
  const removed = (_selectedActs[dayIdx] || []).find((activity) => activity.id === id);
  if (_selectedActs[dayIdx]) {
    _selectedActs[dayIdx] = _selectedActs[dayIdx].filter((activity) => activity.id !== id);
  }

  if (removed?.sourceId?.startsWith('event_')) {
    const eventIndex = removed.sourceId.split('_')[1];
    const btn = document.getElementById('evbtn-' + eventIndex);
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('added');
      btn.textContent = '+ Add to Itinerary';
    }
  }

  renderPool();
  renderDaySlot(dayIdx);
}

function renderDaySlot(di) {
  const acts = _selectedActs[di] || [];
  const body = document.getElementById('slotbody-' + di);
  const count = document.getElementById('slotcount-' + di);
  if (!body) return;

  count.textContent = acts.length + ' ' + (acts.length === 1 ? 'activity' : 'activities');
  if (!acts.length) {
    body.innerHTML = '<div class="day-slot-empty"><div class="day-slot-empty-icon">✦</div>Select activities from the right to build this day</div>';
    return;
  }

  body.innerHTML = acts.map((activity, idx) => `
    <div class="sel-act">
      <div class="sel-act-media">
        <div class="sel-act-ph loading" id="sph-${activity.id}"></div>
        <img class="sel-act-img" id="simg-${activity.id}" src="" alt="${activity.name}"/>
        <div class="sel-act-num">${idx + 1}</div>
      </div>
      <div class="sel-act-info">
        <div class="sel-act-name">${activity.emoji || ''} ${activity.name}</div>
        <div class="sel-act-cat">${activity.category}${activity.duration ? ' · ' + activity.duration : ''}${activity.entryFee ? ' · 🎟 ' + activity.entryFee : ''}</div>
      </div>
      <button class="sel-act-remove" data-action="remove-activity" data-day-index="${di}" data-activity-id="${activity.id}" title="Remove">×</button>
    </div>`).join('');
  loadSelectedDayImages(acts);
}
