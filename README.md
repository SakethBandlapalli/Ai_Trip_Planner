# ai-trip-planner

> Plan smarter. Travel further.

A fully client-side AI trip planner built with vanilla HTML, CSS, and JavaScript. No build step, no npm, no backend - just open `index.html` and go.

## Features

- 3-step wizard form for destination, dates, and preferences
- AI-generated itineraries via Groq (`llama-3.3-70b`)
- 60+ activity picker with category filters
- Hotel recommendations with Booking.com links, ratings, sorting, and load more
- Events scoped to your travel dates
- Google Flights search handoff
- Maps and directions links throughout the trip plan
- Live USD exchange rates
- Pexels travel photography for hotels and activities
- PNG itinerary export with `html2canvas`
- Responsive layout for desktop and mobile

## Quick Start

1. Clone or download this repo.
2. Open `index.html` in any browser.
3. API keys are already embedded for demo use.

## API Keys

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Groq](https://console.groq.com) | AI trip generation | Yes |
| [Pexels](https://pexels.com/api) | Travel photos | Yes |
| [open.er-api.com](https://open.er-api.com) | Exchange rates | Yes |

## Tech Stack

- Vanilla HTML5 / CSS3 / JavaScript (ES2022)
- Groq API
- Pexels API
- `html2canvas`
- Google Maps and Google Flights deep links

## Project Structure

```text
ai-trip-planner/
|-- index.html
|-- person1/
|   |-- css/
|   |   `-- results.css
|   `-- js/
|       |-- results-ui.js
|       |-- activity-picker.js
|       `-- export.js
|-- person2/
|   |-- css/
|   |   |-- base.css
|   |   |-- landing.css
|   |   |-- wizard.css
|   |   `-- responsive.css
|   `-- js/
|       |-- app-core.js
|       `-- trip-planner.js
|-- README.md
|-- .gitignore
`-- .env.example
```

## Deployment

Netlify Drop: drag the folder to [netlify.com/drop](https://app.netlify.com/drop)

GitHub Pages: push to a repo and enable Pages on `main`
