let _allHotels = [];

function renderResults(trip, meta) {
  const dest = meta.dest;

  document.getElementById('trip-header').innerHTML = `
    <div class="trip-header anim-up">
      <div class="tdest">${trip.destination}</div>
      ${trip.description ? `
        <div class="city-desc-wrap">
          <div class="city-desc" id="city-desc">${trip.description}</div>
          <button class="city-desc-toggle" id="desc-toggle" data-action="toggle-desc">Read more ↓</button>
        </div>` : (trip.tagline ? `<div class="ttagline">${trip.tagline}</div>` : '')}
      <div class="tpills">
        <span class="tpill">✈ ${meta.startFmt}</span>
        <span class="tpill">🏠 ${meta.endFmt}</span>
        <span class="tpill">📅 ${meta.days} Days</span>
        <span class="tpill">👥 ${meta.travelers} ${String(meta.travelers) === '1' ? 'Guest' : 'Guests'}</span>
        <span class="tpill">💰 ${BL[meta.budget] || meta.budget}</span>
        <span class="tpill" id="rate-pill">💱 Loading rate...</span>
        ${trip.language ? `<span class="tpill">🗣 ${trip.language}</span>` : ''}
      </div>
    </div>`;

  const hotels = [...(trip.hotels || [])].sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
  _allHotels = [...hotels];

  window.renderHotels = function renderHotels(list) {
    document.getElementById('hotels-grid').innerHTML = list.map((h, hi) => `
      <div class="hcard anim-up anim-up-${(hi % 5) + 1}">
        <div class="hmosaic">
          <div class="hm-main">
            <div class="hm-ph loading" id="hph-main-${hi}"></div>
            <img id="himg-main-${hi}" src="" alt="${h.name}"/>
            <a class="hmap-btn" href="${mUrl(h.name, dest)}" target="_blank">📍 Map</a>
          </div>
          <div class="hm-s1">
            <div class="hm-ph loading" id="hph-s1-${hi}"></div>
            <img id="himg-s1-${hi}" src="" alt="${h.name}"/>
          </div>
          <div class="hm-s2">
            <div class="hm-ph loading" id="hph-s2-${hi}"></div>
            <img id="himg-s2-${hi}" src="" alt="${dest}"/>
          </div>
        </div>
        <div class="hbody">
          <div class="hrow">
            <div class="hleft">
              <div class="hstars">${'★'.repeat(Math.min(h.stars || 4, 5))} <span style="font-size:11px;color:var(--text-mid);margin-left:4px">${h.rating ? h.rating + '/5' : '4.5/5'} ${h.reviewCount ? '(' + h.reviewCount.toLocaleString() + ' reviews)' : ''}</span></div>
              <div class="hname">${h.name}</div>
              <div class="hloc">📍 ${h.location}</div>
            </div>
            <div class="hprice">
              <div class="hprice-num">${h.pricePerNight}</div>
              <div class="hprice-sub">per night</div>
            </div>
          </div>
          <div class="hdesc">${h.description}</div>
          ${h.amenities?.length ? `<div class="hamen">${h.amenities.map((a) => `<span class="amen">${a}</span>`).join('')}</div>` : ''}
          <div class="hlinks">
            <a class="hlink hlink-booking" href="${h.bookingUrl || 'https://www.booking.com/search.html?ss=' + encodeURIComponent(h.name + ' ' + dest)}" target="_blank">🏨 Booking.com</a>
            <a class="hlink hlink-maps" href="${mUrl(h.name, dest)}" target="_blank">📍 Google Maps</a>
            <a class="hlink hlink-search" href="https://www.google.com/search?q=${encodeURIComponent(h.name + ' ' + dest + ' reviews')}" target="_blank">⭐ Reviews</a>
          </div>
        </div>
      </div>`).join('');

    requestAnimationFrame(() => {
      list.forEach((hotel, hi) => setHotelMosaic(hi, hotel.name, dest));
    });
  };

  document.getElementById('tab-hotels').innerHTML = `
    <div class="sec-header anim-up" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div class="sec-eye">Where to Stay</div>
        <div class="sec-title" style="margin-bottom:0">Hotel Recommendations</div>
      </div>
      <div class="hotel-sort-wrap">
        <span style="font-size:11px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;font-family:var(--font-display)">Sort by</span>
        <select class="hotel-sort-sel" data-action="sort-hotels">
          <option value="rating">Rating</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="stars">Stars</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
    </div>
    <div class="hotels-list" id="hotels-grid"></div>
    <button class="load-more-btn" id="load-more-btn" data-action="load-more-hotels">Load More Hotels</button>`;
  window.renderHotels(hotels);

  document.getElementById('tab-events').innerHTML = `
    <div class="sec-header anim-up">
      <div class="sec-eye">Happening During Your Visit · ${meta.months}</div>
      <div class="sec-title">Local Events & Festivals</div>
    </div>
    <div class="events-grid">
      ${(trip.events || []).map((ev, ei) => `
        <div class="evcard anim-up anim-up-${(ei % 5) + 1}">
          <div class="evimg-wrap">
            <div class="ev-ph loading" id="evph-${ei}"></div>
            <img class="evimg" id="evimg-${ei}" src="" alt="${ev.name}"/>
            <div class="ev-date">${ev.dates}</div>
            <div class="ev-type">${ev.type}</div>
          </div>
          <div class="evbody">
            <div class="evname">${ev.emoji || ''} ${ev.name}</div>
            <div class="evdesc">${ev.description}</div>
            ${ev.localTip ? `<div class="evtip">💡 ${ev.localTip}</div>` : ''}
            <div class="evloc">📍 ${ev.location}</div>
            <div class="ev-actions">
              <a class="ev-action-btn ev-link" href="${ev.searchUrl || 'https://www.google.com/search?q=' + encodeURIComponent(ev.name + ' ' + dest)}" target="_blank">Find Tickets</a>
              <button class="ev-action-btn ev-add" id="evbtn-${ei}" data-action="add-event" data-event-index="${ei}">+ Add to Itinerary</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

  const itin = trip.itinerary || [];
  document.getElementById('tab-itinerary').innerHTML = `
    <div class="sec-header anim-up" style="margin-bottom:var(--sp-lg);display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
      <div>
        <div class="sec-eye">Build Your Itinerary</div>
        <div class="sec-title" style="margin-bottom:0">Plan Your Days</div>
      </div>
      <button class="export-icon-btn" id="export-btn" title="Export as PNG" data-action="export-png">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Export PNG</span>
      </button>
    </div>
    <div class="itin-layout">
      <div>
        <div class="day-tabs-row" id="day-tabs-row">
          ${itin.map((day, di) => `
            <button class="day-tab${di === 0 ? ' active' : ''}" id="dtab-${di}" data-action="switch-day" data-day-index="${di}">
              Day ${day.day} <span style="opacity:.6;font-weight:400;font-size:11px;margin-left:4px">${(day.date || '').split(',')[0] || ''}</span>
            </button>`).join('')}
        </div>
        <div id="day-slots-wrap">
          ${itin.map((day, di) => `
            <div class="day-slot${di === 0 ? '' : ' hidden'}" id="dslot-${di}">
              <div class="day-slot-head">
                <div>
                  <div class="day-slot-title">Day ${day.day} - ${day.title || ''}</div>
                  <div class="day-slot-date">📅 ${day.date || ''}</div>
                </div>
                <div class="day-slot-count" id="slotcount-${di}">0 activities</div>
              </div>
              <div class="day-slot-body" id="slotbody-${di}">
                <div class="day-slot-empty"><div class="day-slot-empty-icon">✦</div>Pick activities from the panel →</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="pool-panel">
        <div class="pool-head">
          <div class="pool-title">Activity Pool</div>
          <input class="pool-search" id="pool-search" placeholder="Search activities..."/>
          <div class="cat-filters" id="cat-filters"></div>
          <div class="pool-count" id="pool-count">Loading activities...</div>
        </div>
        <div class="pool-list" id="pool-list">
          <div class="pool-loading"><div class="pool-spin"></div><br>Loading activities...</div>
        </div>
      </div>
    </div>`;

  initActivityPool(dest, itin, meta);

  document.getElementById('tab-tips').innerHTML = `
    <div class="sec-header anim-up">
      <div class="sec-eye">Insider Knowledge</div>
      <div class="sec-title">Travel Tips</div>
    </div>
    <div class="tips-grid">
      ${(trip.tips || []).map((t, i) => `
        <div class="tipcard anim-up anim-up-${(i % 5) + 1}">
          <div class="tipicon">${t.icon}</div>
          <div class="tiplbl">${t.label}</div>
          <div class="tiptxt">${t.text}</div>
        </div>`).join('')}
    </div>`;

  const airportCity = (trip.destination || dest).split(',')[0].trim();
  const svISO = META.sv || '';
  const evISO = META.ev || '';
  document.getElementById('tab-flights').innerHTML = `
    <div class="sec-header anim-up">
      <div class="sec-eye">Get There</div>
      <div class="sec-title">Search Flights</div>
    </div>
    <div class="flight-wrap">
      <div class="flight-card anim-up">
        <h3>✈ Fly to ${airportCity}</h3>
        <p>Search and compare flights with your trip dates, passenger count, and cabin class already filled in.</p>
        <div class="flight-search-form">
          <div class="flight-row">
            <div class="flt-grp">
              <label class="flt-lbl">Flying From</label>
              <input class="flt-input" id="flt-from" placeholder="Your city or airport" type="text" value="${meta.from || ''}"/>
            </div>
            <div class="flt-grp">
              <label class="flt-lbl">Flying To</label>
              <input class="flt-input" id="flt-to" value="${airportCity}" type="text"/>
            </div>
          </div>
          <div class="flight-row">
            <div class="flt-grp">
              <label class="flt-lbl">Departure Date</label>
              <input class="flt-input" id="flt-dep" type="date" value="${svISO}"/>
            </div>
            <div class="flt-grp">
              <label class="flt-lbl">Return Date</label>
              <input class="flt-input" id="flt-ret" type="date" value="${evISO}"/>
            </div>
          </div>
          <div class="flight-row">
            <div class="flt-grp">
              <label class="flt-lbl">Passengers</label>
              <input class="flt-input" id="flt-pax" type="number" min="1" max="9" value="${meta.travelers || 2}"/>
            </div>
            <div class="flt-grp">
              <label class="flt-lbl">Cabin Class</label>
              <select class="flt-input" id="flt-class">
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business" ${meta.budget === 'luxury' || meta.budget === 'ultra-luxury' ? 'selected' : ''}>Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
          </div>
          <button class="flt-search-btn" type="button" id="flt-btn" data-action="search-flights">Search Flights</button>
        </div>
        <div class="flt-or" style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin:var(--sp-lg) 0;text-align:center">- or jump directly to -</div>
        <div class="flt-partners">
          <a class="flt-partner" id="partner-google" target="_blank">Google Flights</a>
          <a class="flt-partner" id="partner-skyscanner" target="_blank">Skyscanner</a>
          <a class="flt-partner" id="partner-kayak" target="_blank">Kayak</a>
          <a class="flt-partner" id="partner-expedia" target="_blank">Expedia</a>
        </div>
      </div>
    </div>`;

  showPage('pg-results');
  window.scrollTo(0, 0);
  switchTab('itinerary');
  fetchRate(trip.currencyCode || trip.currency);
  updateFlightPartnerLinks();

  requestAnimationFrame(() => {
    (trip.events || []).forEach((ev, ei) => {
      setImg(`evimg-${ei}`, `evph-${ei}`, ev.name + ' festival', ev.type + ' ' + dest);
    });
  });
}

function formatCabinClassLabel(value) {
  return String(value || 'economy').replace(/_/g, ' ');
}

function getFlightSearchQuery() {
  const from = (document.getElementById('flt-from')?.value || '').trim();
  const to = (document.getElementById('flt-to')?.value || '').trim();
  const dep = document.getElementById('flt-dep')?.value || '';
  const ret = document.getElementById('flt-ret')?.value || '';
  const pax = Math.max(1, Math.min(9, Number(document.getElementById('flt-pax')?.value || 1)));
  const cabin = document.getElementById('flt-class')?.value || 'economy';
  return {
    from,
    to,
    dep,
    ret,
    pax,
    cabin,
    query: `flights from ${from || 'your city'} to ${to || 'destination'}${dep ? ' departing ' + dep : ''}${ret ? ' returning ' + ret : ''} for ${pax} ${pax === 1 ? 'adult' : 'adults'} in ${formatCabinClassLabel(cabin)}`,
  };
}

function updateFlightPartnerLinks() {
  if (!document.getElementById('partner-google')) return;
  const { from, to, dep, ret, pax, cabin, query } = getFlightSearchQuery();
  const googleHref = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&hl=en`;
  const genericQuery = encodeURIComponent(`${query} ${from ? '' : 'from your city '}book`);

  document.getElementById('partner-google').href = googleHref;
  document.getElementById('partner-skyscanner').href = `https://www.google.com/search?q=${encodeURIComponent(`Skyscanner ${query}`)}`;
  document.getElementById('partner-kayak').href = `https://www.google.com/search?q=${encodeURIComponent(`Kayak ${query}`)}`;
  document.getElementById('partner-expedia').href = to
    ? `https://www.expedia.com/Flights-Search?trip=${ret ? 'roundtrip' : 'oneway'}&destination=${encodeURIComponent(to)}&startDate=${dep}&endDate=${ret}&passengers=adults:${pax}&options=cabinclass:${encodeURIComponent(cabin)}`
    : `https://www.google.com/search?q=${genericQuery}`;
}

function flashFlightButton(btn, message, { error = false, duration = 2200 } = {}) {
  const original = btn.dataset.defaultLabel || 'Search Flights';
  btn.style.borderColor = error ? 'rgba(224,92,74,0.5)' : '';
  btn.textContent = message;
  setTimeout(() => {
    btn.style.borderColor = '';
    btn.textContent = original;
  }, duration);
}

function animateAndSearch() {
  const btn = document.getElementById('flt-btn');
  if (!btn || btn.classList.contains('flying')) return;
  btn.dataset.defaultLabel = btn.dataset.defaultLabel || btn.textContent;

  const { from, to, dep, ret, pax, cabin, query } = getFlightSearchQuery();
  if (!from) {
    flashFlightButton(btn, 'Enter your departure city first', { error: true });
    return;
  }
  if (!to) {
    flashFlightButton(btn, 'Enter your destination first', { error: true });
    return;
  }
  if (dep && ret && ret < dep) {
    flashFlightButton(btn, 'Return date must be after departure', { error: true });
    return;
  }

  btn.classList.add('flying');
  btn.innerHTML = `
    <span class="flt-trail"></span>
    <span class="flt-plane">✈</span>
    <span class="flt-dest-text">Searching for ${pax} in ${formatCabinClassLabel(cabin)}...</span>
  `;

  setTimeout(() => {
    window.open(`https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&hl=en`, '_blank', 'noopener');
  }, 1400);

  setTimeout(() => {
    btn.classList.remove('flying');
    btn.textContent = btn.dataset.defaultLabel || 'Search Flights';
  }, 2200);
}

function searchFlights() { animateAndSearch(); }

function addEventToItinerary(ei) {
  const ev = TRIP.events?.[ei];
  if (!ev) return;
  const btn = document.getElementById('evbtn-' + ei);
  const added = addExternalActivityToDay(_curDaySlot, {
    sourceId: `event_${ei}`,
    name: ev.name,
    category: ev.type || 'Event',
    emoji: ev.emoji || '🎉',
    duration: 'Evening',
    detail: ev.description,
    bestTime: ev.dates,
    entryFee: 'Check event website',
  });

  if (!added) {
    if (btn) {
      btn.textContent = 'Already Added';
      setTimeout(() => { btn.textContent = '+ Add to Itinerary'; }, 1500);
    }
    return;
  }

  if (btn) {
    btn.textContent = `✓ Added to Day ${_curDaySlot + 1}`;
    btn.disabled = true;
    btn.classList.add('added');
  }
}

function toggleDesc() {
  const el = document.getElementById('city-desc');
  const btn = document.getElementById('desc-toggle');
  if (!el || !btn) return;
  el.classList.toggle('expanded');
  btn.textContent = el.classList.contains('expanded') ? 'Read less ↑' : 'Read more ↓';
}

function parsePriceNum(str) {
  return parseInt((str || '0').replace(/[^0-9]/g, ''), 10) || 0;
}

function sortHotels(by) {
  if (!_allHotels.length) return;
  const sorted = [..._allHotels];
  if (by === 'rating') sorted.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
  else if (by === 'price_asc') sorted.sort((a, b) => parsePriceNum(a.pricePerNight) - parsePriceNum(b.pricePerNight));
  else if (by === 'price_desc') sorted.sort((a, b) => parsePriceNum(b.pricePerNight) - parsePriceNum(a.pricePerNight));
  else if (by === 'stars') sorted.sort((a, b) => (b.stars || 4) - (a.stars || 4));
  else if (by === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  renderHotels(sorted);
}

async function loadMoreHotels(dest) {
  const btn = document.getElementById('load-more-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Loading more hotels...';
  btn.classList.add('loading');

  const existingSet = new Set(_allHotels.map((hotel) => hotel.name.toLowerCase()));
  const prompt = `Hotel expert. List 4 more highly-rated hotels in "${dest}" not in this list: ${_allHotels.map((hotel) => hotel.name).join(', ')}.
Return only a valid JSON array with fields:
name, stars, rating, reviewCount, location, pricePerNight, description, amenities, bookingUrl.`;

  try {
    const text = await groqChat(prompt, { temperature: 0.35, maxTokens: 1500 });
    const more = parseGroqArray(text, [])
      .map((hotel) => sanitizeHotel(hotel, dest))
      .filter((hotel) => hotel && !existingSet.has(hotel.name.toLowerCase()));

    if (!more.length) throw new Error('No new hotels were returned.');

    more.forEach((hotel) => _allHotels.push(hotel));
    renderHotels(_allHotels);
    btn.disabled = false;
    btn.textContent = 'Load More Hotels';
    btn.classList.remove('loading');
  } catch (_) {
    btn.disabled = false;
    btn.textContent = 'Failed - try again';
    btn.classList.remove('loading');
    setTimeout(() => { btn.textContent = 'Load More Hotels'; }, 2000);
  }
}
