/**
 * TRAVEL BUDDY WEATHER - DECISION ENGINE & PACKING ASSISTANT
 * Core JavaScript Application
 */

// CONFIGURATION & CONSTANTS
const CONFIG = {
  GEOCODING_API: 'https://geocoding-api.open-meteo.com/v1/search',
  FORECAST_API: 'https://api.open-meteo.com/v1/forecast',
  MAX_TRIP_DAYS: 14,
  MAX_FORECAST_DAYS_OUT: 15,
};

// GLOBAL APP STATE
const appState = {
  selectedCity: null,
  searchResults: [],
  startDate: null,
  endDate: null,
  tripForecast: null,
  currentState: 'empty' // 'empty' | 'loading' | 'error' | 'results'
};

// DOM ELEMENTS CACHE
const DOM = {
  form: document.getElementById('trip-search-form'),
  cityInput: document.getElementById('city-input'),
  startDateInput: document.getElementById('start-date'),
  endDateInput: document.getElementById('end-date'),
  submitBtn: document.getElementById('submit-search-btn'),
  suggestionsDropdown: document.getElementById('city-suggestions'),
  
  // Disambiguation
  disambigContainer: document.getElementById('disambiguation-container'),
  searchQueryLabel: document.getElementById('search-query-label'),
  disambigGrid: document.getElementById('disambiguation-grid'),
  presetChips: document.querySelectorAll('.preset-chip'),

  // UI States
  stateEmpty: document.getElementById('state-empty'),
  stateLoading: document.getElementById('state-loading'),
  stateError: document.getElementById('state-error'),
  stateResults: document.getElementById('state-results'),

  // Loading Labels
  loadingTitle: document.getElementById('loading-status-title'),
  loadingDetail: document.getElementById('loading-status-detail'),

  // Error Labels
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
  errorRetryBtn: document.getElementById('error-retry-btn'),
  errorPresetBtn: document.getElementById('error-preset-btn'),

  // Results Containers
  resCityName: document.getElementById('res-city-name'),
  resCountryBadge: document.getElementById('res-country-badge'),
  resCountry: document.getElementById('res-country'),
  resDateRange: document.getElementById('res-date-range'),
  resOverallVerdict: document.getElementById('res-overall-verdict'),
  resAvgHigh: document.getElementById('res-avg-high'),
  resRainDays: document.getElementById('res-rain-days'),
  resPeakUv: document.getElementById('res-peak-uv'),
  resMaxWind: document.getElementById('res-max-wind'),
  packingGrid: document.getElementById('packing-list-grid'),
  dailyCardsGrid: document.getElementById('daily-forecast-grid'),
  copyPackingBtn: document.getElementById('copy-packing-btn'),

  // Workflow Modal
  openWorkflowBtn: document.getElementById('open-workflow-btn'),
  closeWorkflowBtn: document.getElementById('close-workflow-btn'),
  workflowModal: document.getElementById('workflow-modal'),
  modalTabs: document.querySelectorAll('.tab-btn'),
  modalContents: document.querySelectorAll('.tab-content')
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initDateInputs();
  bindEvents();
});

// INITIALIZE DATE CONSTRAINTS
function initDateInputs() {
  const today = new Date();
  const minDateStr = formatDateForInput(today);

  // Max forecast date supported by Open-Meteo (~15 days out)
  const maxForecastDate = new Date();
  maxForecastDate.setDate(today.getDate() + CONFIG.MAX_FORECAST_DAYS_OUT);
  const maxDateStr = formatDateForInput(maxForecastDate);

  // Default start = tomorrow
  const defaultStart = new Date();
  defaultStart.setDate(today.getDate() + 1);
  const defaultStartStr = formatDateForInput(defaultStart);

  // Default end = start + 5 days
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultStart.getDate() + 5);
  const defaultEndStr = formatDateForInput(defaultEnd);

  DOM.startDateInput.min = minDateStr;
  DOM.startDateInput.max = maxDateStr;
  DOM.startDateInput.value = defaultStartStr;

  DOM.endDateInput.min = minDateStr;
  DOM.endDateInput.max = maxDateStr;
  DOM.endDateInput.value = defaultEndStr;
}

// BIND ALL EVENT LISTENERS
function bindEvents() {
  // Form submission
  DOM.form.addEventListener('submit', handleFormSubmit);

  // Auto-suggest city search debounce
  let debounceTimer;
  DOM.cityInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.length < 2) {
      hideSuggestions();
      return;
    }
    debounceTimer = setTimeout(() => fetchCitySuggestions(query), 300);
  });

  // Hide dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!DOM.cityInput.contains(e.target) && !DOM.suggestionsDropdown.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Preset city chips
  DOM.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const city = chip.getAttribute('data-city');
      DOM.cityInput.value = city;
      handleCitySearch(city);
    });
  });

  // Error state retry buttons
  DOM.errorRetryBtn.addEventListener('click', () => {
    if (DOM.cityInput.value.trim()) {
      handleCitySearch(DOM.cityInput.value.trim());
    } else {
      switchState('empty');
    }
  });

  DOM.errorPresetBtn.addEventListener('click', () => {
    DOM.cityInput.value = 'Paris';
    handleCitySearch('Paris');
  });

  // Copy packing list
  DOM.copyPackingBtn.addEventListener('click', copyPackingListToClipboard);

  // Modal events
  DOM.openWorkflowBtn.addEventListener('click', () => DOM.workflowModal.classList.remove('hidden'));
  DOM.closeWorkflowBtn.addEventListener('click', () => DOM.workflowModal.classList.add('hidden'));
  DOM.workflowModal.addEventListener('click', (e) => {
    if (e.target === DOM.workflowModal) DOM.workflowModal.classList.add('hidden');
  });

  // Modal tab switching
  DOM.modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.modalTabs.forEach(t => t.classList.remove('active'));
      DOM.modalContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// STATE MANAGER
function switchState(stateName) {
  appState.currentState = stateName;
  DOM.stateEmpty.classList.add('hidden');
  DOM.stateLoading.classList.add('hidden');
  DOM.stateError.classList.add('hidden');
  DOM.stateResults.classList.add('hidden');

  if (stateName === 'empty') DOM.stateEmpty.classList.remove('hidden');
  if (stateName === 'loading') DOM.stateLoading.classList.remove('hidden');
  if (stateName === 'error') DOM.stateError.classList.remove('hidden');
  if (stateName === 'results') DOM.stateResults.classList.remove('hidden');
}

// DATE VALIDATION
function validateDates(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: "Please select valid start and end dates." };
  }

  if (end < start) {
    return { valid: false, message: "Trip End Date cannot be earlier than Start Date." };
  }

  const durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (durationDays > CONFIG.MAX_TRIP_DAYS) {
    return { valid: false, message: `Maximum trip forecast allowed is ${CONFIG.MAX_TRIP_DAYS} days. Your selected range is ${durationDays} days.` };
  }

  const maxDate = new Date();
  maxDate.setDate(today.getDate() + CONFIG.MAX_FORECAST_DAYS_OUT);
  if (start > maxDate || end > maxDate) {
    return { valid: false, message: `Open-Meteo public API limits forecasts to ${CONFIG.MAX_FORECAST_DAYS_OUT} days ahead. Please select dates within this window.` };
  }

  return { valid: true, durationDays };
}

// FORM SUBMISSION HANDLER
function handleFormSubmit(e) {
  e.preventDefault();
  const query = DOM.cityInput.value.trim();
  if (!query) return;

  const dateCheck = validateDates(DOM.startDateInput.value, DOM.endDateInput.value);
  if (!dateCheck.valid) {
    showError("Invalid Trip Dates", dateCheck.message);
    return;
  }

  hideDisambiguation();
  handleCitySearch(query);
}

// FETCH CITY AUTO-SUGGESTIONS (STEP 1)
async function fetchCitySuggestions(query) {
  try {
    const url = `${CONFIG.GEOCODING_API}?name=${encodeURIComponent(query)}&count=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      renderSuggestions(data.results);
    } else {
      hideSuggestions();
    }
  } catch (err) {
    hideSuggestions();
  }
}

function renderSuggestions(results) {
  DOM.suggestionsDropdown.innerHTML = '';
  results.forEach(loc => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    const adminStr = loc.admin1 ? `${loc.admin1}, ` : '';
    item.innerHTML = `
      <span class="suggestion-name">${loc.name}</span>
      <span class="suggestion-meta">${adminStr}${loc.country || ''}</span>
    `;
    item.addEventListener('click', () => {
      DOM.cityInput.value = loc.name;
      hideSuggestions();
      selectLocationAndFetchForecast(loc);
    });
    DOM.suggestionsDropdown.appendChild(item);
  });
  DOM.suggestionsDropdown.classList.remove('hidden');
}

function hideSuggestions() {
  DOM.suggestionsDropdown.classList.add('hidden');
}

// STEP 1: GEOCODING & DISAMBIGUATION LOGIC
async function handleCitySearch(query) {
  switchState('loading');
  DOM.loadingTitle.textContent = `Searching "${query}"...`;
  DOM.loadingDetail.textContent = 'Resolving city coordinates via Open-Meteo Geocoding API...';

  try {
    const url = `${CONFIG.GEOCODING_API}?name=${encodeURIComponent(query)}&count=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      showError("City Not Found", `We couldn't find any location named "${query}". Please check spelling or try a larger nearby city.`);
      return;
    }

    const matches = data.results;

    // Disambiguation check: If multiple places exist with exact or similar names (e.g., Springfield)
    if (matches.length > 1) {
      renderDisambiguationBanner(query, matches);
      switchState('empty');
    } else {
      selectLocationAndFetchForecast(matches[0]);
    }
  } catch (err) {
    showError("Network / API Error", "Failed to connect to Open-Meteo Geocoding API. Please check your network connection and try again.");
  }
}

// RENDER DISAMBIGUATION BANNER
function renderDisambiguationBanner(query, matches) {
  DOM.searchQueryLabel.textContent = query;
  DOM.disambigGrid.innerHTML = '';

  matches.forEach(loc => {
    const card = document.createElement('div');
    card.className = 'disambig-card';
    const adminStr = loc.admin1 ? `${loc.admin1}, ` : '';
    const popStr = loc.population ? ` • Pop. ${(loc.population / 1000).toFixed(0)}k` : '';

    card.innerHTML = `
      <span class="disambig-title">${loc.name}, ${loc.country || ''}</span>
      <span class="disambig-sub">${adminStr}${loc.country || ''}${popStr}</span>
      <span class="disambig-coords">Lat: ${loc.latitude.toFixed(2)}, Lon: ${loc.longitude.toFixed(2)}</span>
    `;

    card.addEventListener('click', () => {
      hideDisambiguation();
      selectLocationAndFetchForecast(loc);
    });

    DOM.disambigGrid.appendChild(card);
  });

  DOM.disambigContainer.classList.remove('hidden');
}

function hideDisambiguation() {
  DOM.disambigContainer.classList.add('hidden');
}

// STEP 2: FETCH FORECAST FOR SELECTED LOCATION
async function selectLocationAndFetchForecast(location) {
  appState.selectedCity = location;
  appState.startDate = DOM.startDateInput.value;
  appState.endDate = DOM.endDateInput.value;

  switchState('loading');
  DOM.loadingTitle.textContent = `Fetching Forecast for ${location.name}...`;
  DOM.loadingDetail.textContent = `Analyzing daily metrics from ${appState.startDate} to ${appState.endDate}...`;

  const lat = location.latitude;
  const lon = location.longitude;

  const forecastUrl = `${CONFIG.FORECAST_API}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,weather_code&timezone=auto&start_date=${appState.startDate}&end_date=${appState.endDate}`;

  try {
    const res = await fetch(forecastUrl);
    const data = await res.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      showError("Forecast Unavailable", `Open-Meteo returned no daily forecast records for ${location.name} between ${appState.startDate} and ${appState.endDate}.`);
      return;
    }

    appState.tripForecast = data.daily;
    processAndRenderResults(location, data.daily);
  } catch (err) {
    showError("Forecast Fetch Failed", "Failed to retrieve live weather data from Open-Meteo API. Please try again.");
  }
}

// SHOW ERROR STATE
function showError(title, message) {
  DOM.errorTitle.textContent = title;
  DOM.errorMessage.textContent = message;
  switchState('error');
}

// STEP 3: DECISION ENGINE (PERSONA: OUTDOOR SIGHTSEER)
function processAndRenderResults(location, daily) {
  const dates = daily.time;
  const count = dates.length;

  const dailyProcessed = [];
  let totalHigh = 0;
  let rainDaysCount = 0;
  let maxUvOverall = 0;
  let maxWindOverall = 0;

  for (let i = 0; i < count; i++) {
    const item = {
      dateStr: dates[i],
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i],
      feelsMax: daily.apparent_temperature_max[i],
      feelsMin: daily.apparent_temperature_min[i],
      precipProb: daily.precipitation_probability_max[i],
      precipSum: daily.precipitation_sum[i],
      uvMax: daily.uv_index_max[i],
      windMax: daily.wind_speed_10m_max[i],
      wmoCode: daily.weather_code[i]
    };

    totalHigh += item.maxTemp;
    if (item.precipProb > 40 || item.precipSum > 2.0) rainDaysCount++;
    if (item.uvMax > maxUvOverall) maxUvOverall = item.uvMax;
    if (item.windMax > maxWindOverall) maxWindOverall = item.windMax;

    item.verdict = computeDailyVerdict(item);
    dailyProcessed.push(item);
  }

  const avgHigh = (totalHigh / count).toFixed(1);

  const overallVerdict = computeOverallTripVerdict(count, rainDaysCount, avgHigh, maxUvOverall, maxWindOverall);
  const packingList = computeDeduplicatedPackingList(dailyProcessed);

  renderResultsHero(location, appState.startDate, appState.endDate, count, overallVerdict, avgHigh, rainDaysCount, maxUvOverall, maxWindOverall);
  renderPackingList(packingList);
  renderDailyCards(dailyProcessed);

  switchState('results');
}

// COMPUTE DAILY PLAIN-LANGUAGE VERDICT
function computeDailyVerdict(day) {
  const { maxTemp, minTemp, precipProb, precipSum, uvMax, windMax, wmoCode } = day;

  // Rule 1: Severe Storm / Downpour
  if (wmoCode >= 80 || windMax > 42) {
    return {
      text: "Weather alert: Heavy rain or strong winds expected — stay indoors or keep plans flexible.",
      type: "hazard",
      icon: "fa-cloud-showers-heavy"
    };
  }

  // Rule 2: Rain Risk
  if (precipProb > 55 || precipSum > 4.5) {
    return {
      text: "Rain likely — carry a compact umbrella/raincoat and plan indoor activities during peak hours.",
      type: "rain",
      icon: "fa-umbrella"
    };
  }

  // Rule 3: Intense Heat & High UV
  if (maxTemp > 32 || uvMax > 7.5) {
    return {
      text: `Hot & intense sun (${maxTemp}°C) — do outdoor sightseeing before 11 AM or after 4 PM; wear SPF 50.`,
      type: "heat",
      icon: "fa-sun"
    };
  }

  // Rule 4: Chilly & Wind
  if (minTemp < 12 || windMax > 25) {
    return {
      text: `Chilly & breezy (low of ${minTemp}°C) — layer up with a fleece sweater or windbreaker for outdoor walks.`,
      type: "cold",
      icon: "fa-wind"
    };
  }

  // Rule 5: Unremarkable Pleasant Day
  if (maxTemp >= 18 && maxTemp <= 28 && precipProb < 25 && uvMax < 6.5) {
    return {
      text: "Pleasant & comfortable — great weather for strolling, sightseeing, and outdoor terrace dining.",
      type: "pleasant",
      icon: "fa-face-smile"
    };
  }

  // Rule 6: Mild Warm Day
  return {
    text: `Mild & clear day (${maxTemp}°C max) — comfortable for exploring with sunglasses and light clothing.`,
    type: "mild",
    icon: "fa-cloud-sun"
  };
}

// COMPUTE OVERALL TRIP VERDICT SUMMARY
function computeOverallTripVerdict(totalDays, rainDays, avgHigh, maxUv, maxWind) {
  if (rainDays === 0 && avgHigh >= 20 && avgHigh <= 29) {
    return `"Picture-perfect trip! ${totalDays} days of pleasant, sunny weather — ideal for outdoor sightseeing and walking everywhere."`;
  }

  if (rainDays > 0) {
    const rainText = rainDays === 1 ? '1 rainy day' : `${rainDays} rainy days`;
    return `"Mostly pleasant with ${rainText} — overall great for travel if you keep an umbrella in your bag."`;
  }

  if (avgHigh > 31) {
    return `"Hot & sunny trip ahead (avg high ${avgHigh}°C) — pack lightweight breathable clothes and schedule outdoor walking for morning/evening hours."`;
  }

  if (avgHigh < 14) {
    return `"Chilly trip expected (avg high ${avgHigh}°C) — bring warm layers, a cozy jacket, and comfortable walking shoes."`;
  }

  return `"Good weather overall for your ${totalDays}-day trip — standard seasonal clothing and walking gear recommended."`;
}

// COMPUTE DEDUPLICATED PACKING LIST
function computeDeduplicatedPackingList(dailyList) {
  const itemsSet = new Set();
  const categories = {
    clothing: [],
    gear: [],
    essentials: []
  };

  let hasRain = false;
  let hasHeat = false;
  let hasCold = false;
  let hasWind = false;
  let hasHighUv = false;

  dailyList.forEach(d => {
    if (d.precipProb > 35 || d.precipSum > 2.0) hasRain = true;
    if (d.maxTemp > 27) hasHeat = true;
    if (d.minTemp < 15) hasCold = true;
    if (d.windMax > 22) hasWind = true;
    if (d.uvMax > 5.5) hasHighUv = true;
  });

  addPackingItem(categories.essentials, itemsSet, "Comfortable Walking Shoes", "Always Needed");
  addPackingItem(categories.essentials, itemsSet, "Reusable Water Bottle", "Hydration");
  addPackingItem(categories.essentials, itemsSet, "Universal Power Adapter", "Tech");

  if (hasRain) {
    addPackingItem(categories.gear, itemsSet, "Compact Travel Umbrella", "Rain Forecasted");
    addPackingItem(categories.gear, itemsSet, "Lightweight Waterproof Jacket", "Rain Shell");
  }

  if (hasHighUv || hasHeat) {
    addPackingItem(categories.gear, itemsSet, "Broad Spectrum Sunscreen (SPF 50)", "UV Protection");
    addPackingItem(categories.gear, itemsSet, "UV Polarized Sunglasses", "Sun Protection");
  }

  if (hasHeat) {
    addPackingItem(categories.gear, itemsSet, "Breathable Sun Hat / Cap", "Heat Protection");
    addPackingItem(categories.clothing, itemsSet, "Light Linen & Cotton Tops", "Warm Days");
    addPackingItem(categories.clothing, itemsSet, "Breathable Shorts / Light Pants", "Warm Days");
  }

  if (hasCold) {
    addPackingItem(categories.clothing, itemsSet, "Warm Fleece Sweater / Pullover", "Cool Nights");
    addPackingItem(categories.clothing, itemsSet, "Long Pants / Denim", "Cool Days");
  }

  if (hasWind) {
    addPackingItem(categories.gear, itemsSet, "Windbreaker Outer Layer", "Breezy Days");
  }

  return categories;
}

function addPackingItem(categoryArr, itemsSet, name, reason) {
  if (!itemsSet.has(name)) {
    itemsSet.add(name);
    categoryArr.push({ name, reason });
  }
}

// RENDER RESULTS HERO CARD
function renderResultsHero(location, startStr, endStr, durationDays, verdict, avgHigh, rainDays, peakUv, maxWind) {
  DOM.resCityName.textContent = location.name;
  DOM.resCountry.textContent = location.country || 'Global';
  DOM.resDateRange.textContent = `${formatDisplayDate(startStr)} - ${formatDisplayDate(endStr)} (${durationDays} Days)`;
  DOM.resOverallVerdict.textContent = verdict;

  DOM.resAvgHigh.textContent = `${avgHigh}°C`;
  DOM.resRainDays.textContent = `${rainDays} of ${durationDays}`;
  DOM.resPeakUv.textContent = `${peakUv.toFixed(1)} (${getUvLabel(peakUv)})`;
  DOM.resMaxWind.textContent = `${maxWind.toFixed(1)} km/h`;
}

// RENDER DEDUPLICATED PACKING LIST
function renderPackingList(categories) {
  DOM.packingGrid.innerHTML = '';

  const catConfigs = [
    { key: 'clothing', title: 'Clothing & Footwear', icon: 'fa-shirt', items: categories.clothing },
    { key: 'gear', title: 'Weather Gear & Protection', icon: 'fa-umbrella', items: categories.gear },
    { key: 'essentials', title: 'Travel Essentials', icon: 'fa-bag-shopping', items: categories.essentials }
  ];

  catConfigs.forEach(cat => {
    if (cat.items.length === 0) return;

    const card = document.createElement('div');
    card.className = 'packing-category-card';

    let itemsHtml = cat.items.map(item => `
      <li class="packing-item-row">
        <div class="item-left">
          <input type="checkbox" id="pack-${slugify(item.name)}">
          <label for="pack-${slugify(item.name)}" class="item-name">${item.name}</label>
        </div>
        <span class="item-badge">${item.reason}</span>
      </li>
    `).join('');

    card.innerHTML = `
      <h3 class="category-title"><i class="fa-solid ${cat.icon}"></i> ${cat.title}</h3>
      <ul class="packing-items-list">${itemsHtml}</ul>
    `;

    DOM.packingGrid.appendChild(card);
  });
}

// RENDER DAILY FORECAST CARDS
function renderDailyCards(dailyList) {
  DOM.dailyCardsGrid.innerHTML = '';

  dailyList.forEach(day => {
    const card = document.createElement('div');
    card.className = 'daily-card';

    const dateObj = new Date(day.dateStr);
    const dow = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const weatherInfo = getWmoInfo(day.wmoCode);

    card.innerHTML = `
      <div class="daily-card-header">
        <div class="daily-date-group">
          <div class="daily-date-box">
            <div class="daily-dow">${dow}</div>
            <div class="daily-daynum">${dayNum}</div>
          </div>
          <div>
            <strong>${weatherInfo.label}</strong>
          </div>
        </div>
        <div class="weather-icon-large">${weatherInfo.icon}</div>
      </div>

      <div class="verdict-box">
        <span class="verdict-tag">DAILY VERDICT</span>
        <div class="verdict-text">${day.verdict.text}</div>
      </div>

      <div class="metrics-row">
        <div class="metric-item">
          <span>High / Low</span>
          <strong>${day.maxTemp}°C / ${day.minTemp}°C</strong>
        </div>
        <div class="metric-item">
          <span>Feels Like</span>
          <strong>${day.feelsMax}°C</strong>
        </div>
        <div class="metric-item">
          <span>Rain Chance</span>
          <strong>${day.precipProb}% (${day.precipSum}mm)</strong>
        </div>
        <div class="metric-item">
          <span>Max UV Index</span>
          <strong>${day.uvMax.toFixed(1)}</strong>
        </div>
        <div class="metric-item">
          <span>Max Wind</span>
          <strong>${day.windMax} km/h</strong>
        </div>
      </div>
    `;

    DOM.dailyCardsGrid.appendChild(card);
  });
}

// COPY PACKING LIST TO CLIPBOARD
function copyPackingListToClipboard() {
  const checkboxes = DOM.packingGrid.querySelectorAll('.item-name');
  if (checkboxes.length === 0) return;

  let text = `🎒 TRAVEL BUDDY PACKING LIST for ${appState.selectedCity ? appState.selectedCity.name : 'Trip'}\n`;
  text += `Dates: ${appState.startDate} to ${appState.endDate}\n\n`;

  checkboxes.forEach((item, index) => {
    text += `[ ] ${item.textContent}\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    const originalText = DOM.copyPackingBtn.innerHTML;
    DOM.copyPackingBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied to Clipboard!`;
    setTimeout(() => {
      DOM.copyPackingBtn.innerHTML = originalText;
    }, 2500);
  });
}

// UTILITY HELPERS
function formatDateForInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getUvLabel(uv) {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  return 'Very High';
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
}

function getWmoInfo(code) {
  switch(code) {
    case 0: return { label: 'Clear Sky', icon: '☀️' };
    case 1:
    case 2:
    case 3: return { label: 'Partly Cloudy', icon: '🌤️' };
    case 45:
    case 48: return { label: 'Foggy', icon: '🌫️' };
    case 51:
    case 53:
    case 55: return { label: 'Light Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65: return { label: 'Rain Showers', icon: '🌧️' };
    case 71:
    case 73:
    case 75: return { label: 'Snowfall', icon: '❄️' };
    case 80:
    case 81:
    case 82: return { label: 'Heavy Downpour', icon: '🌩️' };
    case 95:
    case 96:
    case 99: return { label: 'Thunderstorm', icon: '⚡' };
    default: return { label: 'Overcast', icon: '☁️' };
  }
}
