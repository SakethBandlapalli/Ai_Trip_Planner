function sanitizeHotel(hotel, dest) {
  const name = String(hotel?.name || '').trim();
  if (!name) return null;
  const location = String(hotel?.location || dest).trim() || dest;
  return {
    name,
    stars: Math.max(4, Math.min(5, Number(hotel?.stars || 4))),
    rating: Math.max(4, Math.min(5, Number(hotel?.rating || 4.5))),
    reviewCount: Math.max(0, Number(hotel?.reviewCount || 0)),
    location,
    pricePerNight: String(hotel?.pricePerNight || '$150').trim(),
    description: String(hotel?.description || `A comfortable stay in ${dest}.`).trim(),
    amenities: Array.isArray(hotel?.amenities) ? hotel.amenities.filter(Boolean) : ['WiFi'],
    bookingUrl: String(hotel?.bookingUrl || `https://www.booking.com/search.html?ss=${encodeURIComponent(name + ' ' + dest)}`).trim(),
  };
}

async function generate() {
  const dest = document.getElementById('f-dest').value.trim();
  const sv = document.getElementById('f-start').value;
  const ev = document.getElementById('f-end').value;
  const travelers = document.getElementById('f-travelers').value;
  const budget = document.querySelector('.bcard.on')?.dataset.val || 'moderate';
  const styles = 'Cultural, Adventure, Foodie, History';
  const notes = document.getElementById('f-notes').value.trim();
  const errEl = document.getElementById('err3');
  errEl.classList.add('hidden');

  const s = parseD(sv);
  const e = parseD(ev);
  const days = getDays();
  const months = getMonths();
  const dayLabels = getDayLabels();

  showPage('pg-loading');
  startLoad();

  let canonical = dest;
  try {
    const validation = await validateDest(dest);
    if (!validation.valid) {
      stopLoad();
      showPage('pg-wizard');
      goStep(1);
      document.getElementById('err1').textContent = `"${dest}" doesn't seem to be a real destination. ${validation.reason || 'Please enter a city or country.'}`;
      document.getElementById('err1').classList.remove('hidden');
      return;
    }
    if (validation.canonical) canonical = validation.canonical;
  } catch (_) {
    canonical = dest;
  }

  const startFmt = fmtLong(s);
  const endFmt = fmtLong(e);

  const promptTrip = `You are an expert travel planner. Generate a trip plan for "${canonical}".
IMPORTANT: Every place must be in "${canonical}" only.

Trip: Start ${startFmt}, End ${endFmt}, ${days} days, visiting ${months}.
Travelers: ${travelers}, Budget: ${budget}, Style: ${styles}. Notes: ${notes || 'None'}.
Day dates: ${dayLabels.join(', ')}

Return ONLY valid raw JSON:
{
  "destination": "${canonical}",
  "country": "country of ${canonical}",
  "tagline": "one vivid sentence about ${canonical}",
  "description": "A rich paragraph about ${canonical}",
  "bestTime": "best season",
  "currency": "currency with symbol",
  "currencyCode": "3-letter ISO code",
  "language": "primary language",
  "events": [
    {"name":"real event name","type":"Festival","emoji":"🎉","dates":"exact date range within or near ${startFmt} to ${endFmt}","description":"2 vivid sentences","location":"venue in ${canonical}","localTip":"one insider tip","searchUrl":"https://www.google.com/search?q=event+name+${canonical}+2026"}
  ],
  "itinerary": [
    {"day":1,"date":"${dayLabels[0] || 'Day 1'}","title":"day theme","activities":[{"time":"9:00 AM","name":"real place in ${canonical}","detail":"1-2 sentences"}]}
  ],
  "tips": [
    {"icon":"✈","label":"Getting There","text":"..."},
    {"icon":"🚇","label":"Getting Around","text":"..."},
    {"icon":"🌤","label":"Weather in ${months}","text":"..."},
    {"icon":"🏧","label":"Money","text":"..."},
    {"icon":"🌐","label":"Language","text":"..."},
    {"icon":"📱","label":"Must-Have Apps","text":"..."},
    {"icon":"🍽","label":"Food & Drink","text":"..."},
    {"icon":"🛡","label":"Safety","text":"..."}
  ]
}
Rules: ${days} days exactly. 4-5 events max. 3-4 activities per day. No placeholder text.`;

  const promptHotels = `You are a hotel expert. List exactly 4 highly-rated hotels in "${canonical}" sorted by rating descending.
Return ONLY a valid JSON array:
[
  {"name":"real hotel name","stars":5,"rating":4.6,"reviewCount":2840,"location":"exact neighborhood in ${canonical}","pricePerNight":"$XXX","description":"2 vivid sentences","amenities":["WiFi","Pool","Spa","Restaurant","Gym"],"bookingUrl":"https://www.booking.com/search.html?ss=HOTEL_NAME_ENCODED"}
]
Rules:
- All 4 hotels must physically exist in "${canonical}" and have minimum 4 stars
- Cover multiple price bands
- Spread across different neighborhoods
- No duplicates or placeholder text`;

  try {
    const [tripText, hotelsText] = await Promise.all([
      groqChat(promptTrip, { temperature: 0.65, maxTokens: 5000 }),
      groqChat(promptHotels, { temperature: 0.35, maxTokens: 1500 }),
    ]);

    const trip = parseGroqObject(tripText, null);
    if (!trip || !Array.isArray(trip.itinerary)) {
      throw new Error('Trip response was incomplete.');
    }

    const hotels = parseGroqArray(hotelsText, [])
      .map((hotel) => sanitizeHotel(hotel, canonical))
      .filter(Boolean);

    trip.destination = trip.destination || canonical;
    trip.currencyCode = normalizeCurrencyCode(trip.currencyCode || trip.currency);
    trip.events = Array.isArray(trip.events) ? trip.events : [];
    trip.itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];
    trip.tips = Array.isArray(trip.tips) ? trip.tips : [];
    trip.hotels = hotels.length ? hotels : [sanitizeHotel({ name: `${canonical} Hotel` }, canonical)];

    TRIP = trip;
    META = {
      dest: canonical,
      days,
      travelers,
      budget,
      months,
      startFmt,
      endFmt,
      sv,
      ev,
      from: document.getElementById('f-from').value.trim(),
    };

    stopLoad();
    renderResults(trip, META);
  } catch (ex) {
    stopLoad();
    showPage('pg-wizard');
    goStep(3);
    errEl.textContent = 'Error: ' + ex.message;
    errEl.classList.remove('hidden');
  }
}
