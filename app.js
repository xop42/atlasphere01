/**
 * Atlasphere — Interactive World Explorer & Plumped Culture Atlas
 * Zero-label basemaps, harmonious bright palette, and non-linear Culture Bento Grid.
 */

(function () {
  'use strict';

  // --- State Variables ---
  let map;
  let geojsonLayer;
  let baseLayers = {};
  let currentBaseLayer = 'dark';
  let currentMode = 'explore'; // 'explore' | 'choropleth' | 'quiz'
  let currentChoroplethMetric = 'temp';
  let currentTempUnit = 'C'; // 'population' | 'area'
  let selectedCountryFeature = null;
  let selectedLayer = null;
  let currentContinentFilter = 'all';
  let audioCtx = null;
  // --- Spoken Language Audio Player State ---
  let currentAudioData = null;
  let isAudioPlaying = false;


  // Quiz State
  let quizState = {
    active: false,
    currentTarget: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    round: 1,
    maxRounds: 10,
    pool: [],
    answered: new Set()
  };

  // Base Tile Layer Definitions (100% Zero-Label & Free)
  const TILE_PROVIDERS = {
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; Surface Elevation',
      maxZoom: 13,
      className: 'tile-dark-relief',
      noWrap: true,
      bounds: [[-85, -180], [85, 180]]
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
      noWrap: true,
      bounds: [[-85, -180], [85, 180]]
    },
    relief: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; Esri, USGS',
      maxZoom: 13,
      noWrap: true,
      bounds: [[-85, -180], [85, 180]]
    },
    ocean: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; GEBCO, NOAA, National Geographic',
      maxZoom: 13,
      noWrap: true,
      bounds: [[-85, -180], [85, 180]]
    }
  };

  // --- DOM Elements ---
  const el = {
    logoHome: document.getElementById('logo-home'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    searchDropdown: document.getElementById('search-results-dropdown'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    basemapToggle: document.getElementById('basemap-toggle-btn'),
    basemapMenu: document.getElementById('basemap-menu'),
    basemapItems: document.querySelectorAll('#basemap-menu .menu-item'),
    filterPills: document.querySelectorAll('.filter-pill'),
    choroplethControls: document.getElementById('choropleth-controls'),
    tempUnitToggle: document.getElementById('temp-unit-toggle'),
    tempUnitBtns: document.querySelectorAll('.unit-btn'),
    metricBtns: document.querySelectorAll('.metric-btn'),
    choroplethLegend: document.getElementById('choropleth-legend'),
    legendTitle: document.getElementById('legend-title'),
    legendScale: document.getElementById('legend-scale'),
    quizHud: document.getElementById('quiz-hud'),
    quizTargetName: document.getElementById('quiz-target-name'),
    quizHint: document.getElementById('quiz-hint'),
    quizScoreVal: document.getElementById('quiz-score-val'),
    quizStreakVal: document.getElementById('quiz-streak-val'),
    quizRoundVal: document.getElementById('quiz-round-val'),
    quizSkipBtn: document.getElementById('quiz-skip-btn'),
    quizEndBtn: document.getElementById('quiz-end-btn'),
    detailDrawer: document.getElementById('detail-drawer'),
    drawerCloseBtn: document.getElementById('drawer-close-btn'),
    drawerFlagImg: document.getElementById('country-flag-img'),
    drawerFlag: document.getElementById('country-flag-display'),
    drawerName: document.getElementById('country-name-display'),
    drawerOfficialName: document.getElementById('country-official-name'),
    drawerTabBtns: document.querySelectorAll('.drawer-tab-btn'),
    tabOverview: document.getElementById('tab-overview'),
    tabCulture: document.getElementById('tab-culture'),
    valCapital: document.getElementById('val-capital'),
    capitalImg: document.getElementById('capital-img'),
    capitalPhotoFrame: document.getElementById('capital-photo-frame'),
    capitalPhotoFallback: document.getElementById('capital-photo-fallback'),
    valPopulation: document.getElementById('val-population'),
    valGdp: document.getElementById('val-gdp'),
    valGdpCapita: document.getElementById('val-gdp-capita'),
    valCurrency: document.getElementById('val-currency'),
    valLanguages: document.getElementById('val-languages'),
    valFunFact: document.getElementById('val-fun-fact'),
    cultureDish: document.getElementById('culture-dish'),
    cultureLandmark: document.getElementById('culture-landmark'),
    cultureDrink: document.getElementById('culture-drink'),
    cultureFestivals: document.getElementById('culture-festivals'),
    cultureFact: document.getElementById('culture-fact'),
    cultureFilterBtns: document.querySelectorAll('.culture-tag-btn'),
    bentoBoxes: document.querySelectorAll('.bento-box'),
    languageAudioBox: document.getElementById('language-audio-box'),
    btnPlayLangAudio: document.getElementById('btn-play-lang-audio'),
    langAudioIconWrap: document.getElementById('lang-audio-icon-wrap'),
    langAudioBtnLabel: document.getElementById('lang-audio-btn-label'),
    audioWaveAnim: document.getElementById('audio-wave-anim'),
        langAudioBadge: document.getElementById('lang-audio-badge'),
    audioPhraseNative: document.getElementById('audio-phrase-native'),
    audioPhraseSub: document.getElementById('audio-phrase-sub'),
    btnWiki: document.getElementById('btn-wiki-link'),
    btnGmaps: document.getElementById('btn-gmaps-link'),
    quizModal: document.getElementById('quiz-modal'),
    quizModalTitle: document.getElementById('quiz-modal-title'),
    quizModalDesc: document.getElementById('quiz-modal-desc'),
    modalFinalScore: document.getElementById('modal-final-score'),
    modalBestStreak: document.getElementById('modal-best-streak'),
    quizPlayAgainBtn: document.getElementById('quiz-play-again-btn'),
    quizCloseModalBtn: document.getElementById('quiz-close-modal-btn')
  };

  // --- Ensure Essential Datasets are Loaded ---
  async function ensureDataLoaded() {
    // Fast path: already present in window
    if (window.WORLD_DATA && window.WORLD_DATA.features) return true;

    // 1. Wait briefly (up to 1.5s) in case scripts are in-flight or being evaluated
    for (let i = 0; i < 30; i++) {
      if (window.WORLD_DATA && window.WORLD_DATA.features) return true;
      await new Promise(r => setTimeout(r, 50));
    }

    // 2. Dynamic Fallback: load missing datasets via script injection with both absolute & relative paths
    const datasets = [
      { name: 'WORLD_DATA', check: () => window.WORLD_DATA && window.WORLD_DATA.features, paths: ['/data/world-data.js', './data/world-data.js', 'data/world-data.js'] },
      { name: 'CULTURE_DATA', check: () => window.CULTURE_DATA, paths: ['/data/culture-data.js', './data/culture-data.js', 'data/culture-data.js'] },
      { name: 'LANGUAGE_AUDIO_DATA', check: () => window.LANGUAGE_AUDIO_DATA, paths: ['/data/language-audio-data.js', './data/language-audio-data.js', 'data/language-audio-data.js'] },
      { name: 'CAPITAL_LANDMARKS', check: () => window.CAPITAL_LANDMARKS, paths: ['/data/capital-landmarks.js', './data/capital-landmarks.js', 'data/capital-landmarks.js'] },
      { name: 'CAPITAL_IMAGES', check: () => window.CAPITAL_IMAGES, paths: ['/data/capital-images.js', './data/capital-images.js', 'data/capital-images.js'] },
      { name: 'COUNTRY_FUN_FACTS', check: () => window.COUNTRY_FUN_FACTS, paths: ['/data/fun-facts.js', './data/fun-facts.js', 'data/fun-facts.js'] },
    ];

    for (const ds of datasets) {
      if (!ds.check()) {
        for (const p of ds.paths) {
          try {
            const ok = await new Promise(resolve => {
              const script = document.createElement('script');
              script.src = p;
              script.onload = () => resolve(true);
              script.onerror = () => { script.remove(); resolve(false); };
              document.head.appendChild(script);
            });
            if (ok && ds.check()) break;
          } catch (err) {}
        }
      }
    }

    return !!(window.WORLD_DATA && window.WORLD_DATA.features);
  }

  // --- Initialize Application ---
  async function init() {
    const isReady = await ensureDataLoaded();
    if (!isReady) {
      console.error('World data not loaded!');
      return;
    }

    initMap();
    renderGeoJson();
    setupEventListeners();
    updateCountryCount();
  }

  // Calculate minimum zoom so the world map fills the screen with zero blank/uncolored side margins
  function calculateFitZoom() {
    const w = (map && map.getSize && map.getSize().x > 0) ? map.getSize().x : (window.innerWidth || 1400);
    // World width at zoom z is 256 * 2^z. Ensure width >= container width
    return Math.max(2.2, Math.ceil(Math.log2(w / 256) * 10) / 10);
  }

  // --- Map Setup ---
  function initMap() {
    const minZ = calculateFitZoom();
    map = L.map('map', {
      preferCanvas: false,    // Hardware-accelerated SVG renderer ensures seamless vector retention without uncoloured voids on zoom-out
      center: [20, 0],
      zoom: minZ,
      minZoom: minZ,          // Clamps zoom so uncolored sides can NEVER appear
      maxZoom: 9,
      scrollWheelZoom: true,  // Fast, instant, responsive zoom
      zoomAnimation: true,    // Smooth CSS 3D compositor zoom transition
      fadeAnimation: true,
      zoomControl: false,
      attributionControl: true,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0, // Solid bounds: prevents panning outside actual map
      worldCopyJump: false
    });

    Object.keys(TILE_PROVIDERS).forEach(key => {
      const cfg = TILE_PROVIDERS[key];
      baseLayers[key] = L.tileLayer(cfg.url, {
        attribution: cfg.attrib,
        maxZoom: cfg.maxZoom || 19,
        className: cfg.className || '',
        noWrap: true,
        keepBuffer: 8,
        updateInterval: 100,
        bounds: [[-85, -180], [85, 180]]
      });
    });

    baseLayers[currentBaseLayer].addTo(map);
  }

  // --- Harmonious Bright & Non-glaring Palette ---
  function getBorderColorForBasemap() {
    return '#ffffff'; // Clean white border on dark / relief / satellite / ocean
  }

  // --- Geographically & Geopolitically Accurate Island & Continent Classifier ---
  function getCountryContinent(props) {
    const name = props.name || '';
    const sub = props.subregion || '';
    const cont = props.continent || '';

    // African Islands (Indian Ocean & Atlantic)
    if (name === 'Seychelles' || name === 'Mauritius' || name === 'Saint Helena, Ascension and Tristan da Cunha' || 
        name === 'Comoros' || name === 'Cape Verde' || name === 'Madagascar' || name === 'São Tomé and Príncipe' ||
        name === 'Mayotte' || name === 'Reunion') {
      return 'Africa';
    }

    // Asian Islands (Indian Ocean & Pacific)
    if (name === 'Maldives' || name === 'Sri Lanka' || name === 'British Indian Ocean Territory' || 
        name === 'Taiwan' || name === 'Japan' || name === 'Philippines' || name === 'Indonesia' || 
        name === 'Singapore' || name === 'Timor-Leste' || name === 'Brunei') {
      return 'Asia';
    }

    // European Islands & Mediterranean
    if (name === 'Cyprus' || name === 'Southern Cyprus' || name === 'N. Cyprus' || name === 'Northern Cyprus' || name === 'Malta' || name === 'Iceland' || 
        name === 'Faroe Islands' || name === 'Isle of Man' || name === 'Jersey' || name === 'Guernsey' || 
        name === 'Åland Islands' || name === 'Aland') {
      return 'Europe';
    }

    // South American Islands (South Atlantic & Pacific)
    if (name === 'Falkland Islands' || name === 'South Georgia') {
      return 'South America';
    }

    // Oceania Islands (Subantarctic & Pacific)
    if (name === 'Heard Island and McDonald Islands' || name === 'French Southern and Antarctic Lands') {
      return 'Oceania';
    }

    // Americas Split (Northern America, Central America & Caribbean vs South America)
    if (cont === 'Americas') {
      return sub === 'South America' ? 'South America' : 'North America';
    }

    // Subregion fallbacks for any overseas or unassigned territories
    if (cont === 'Other') {
      if (sub.includes('Africa')) return 'Africa';
      if (sub.includes('Asia')) return 'Asia';
      if (sub.includes('Europe')) return 'Europe';
      if (sub.includes('Oceania') || sub === 'Melanesia' || sub === 'Micronesia' || sub === 'Polynesia') return 'Oceania';
      if (sub.includes('America')) return sub.includes('South') ? 'South America' : 'North America';
    }

    return cont || 'Other';
  }

  function countryMatchesFilter(props, filter) {
    if (!filter || filter === 'all') return true;
    const countryContinent = getCountryContinent(props);
    if (filter === 'Americas') {
      return countryContinent === 'North America' || countryContinent === 'South America';
    }
    return countryContinent === filter;
  }

  function getContinentColor(props) {
    const continent = getCountryContinent(props);
    switch (continent) {
      case 'Europe': return '#38bdf8';        // Vibrant Azure Sky (UK, Ireland, Iceland, Cyprus, Malta...)
      case 'Asia': return '#f43f5e';          // Vibrant Coral Rose (Japan, Philippines, Indonesia, Maldives, Sri Lanka...)
      case 'Africa': return '#f59e0b';        // Warm Golden Amber (Madagascar, Mauritius, Seychelles, Cape Verde...)
      case 'Oceania': return '#a855f7';       // Vibrant Lavender Orchid (New Zealand, Fiji, Samoa, Hawaii/Pacific...)
      case 'North America': return '#10b981'; // Lush Emerald Green (Cuba, Jamaica, Bahamas, Caribbean, Greenland...)
      case 'South America': return '#ea580c'; // Rich Sunset Coral / Tangerine (Falklands, South Georgia...)
      default: return '#64748b';              // Neutral Slate (Antarctica)
    }
  }

  // --- Vibrant Choropleth Color Engine (100% Populated & Eye-Popping) ---
  function getChoroplethColor(props) {
    if (!props) return '#38bdf8';

    // 1. Temperature - User Palette: Canary -> Golden -> Amber -> Coral -> Crimson
    // The color represents physical climate and remains 100% identical whether viewing in °C or °F
    if (currentChoroplethMetric === 'temp') {
      const tc = props.temp_c !== undefined ? props.temp_c : (props.temp_f !== undefined ? (props.temp_f - 32) * 5 / 9 : 20);
      if (tc < 5)   return '#fff33b'; // Canary Yellow (< 5°C / < 41°F)
      if (tc < 12)  return '#fdc70c'; // Golden Yellow (5°C - 12°C / 41°F - 54°F)
      if (tc < 20)  return '#f3903f'; // Amber Orange (12°C - 20°C / 54°F - 68°F)
      if (tc < 25)  return '#ed683c'; // Coral Orange (20°C - 25°C / 68°F - 77°F)
      return '#e93e3a';                // Crimson Red (>= 25°C / >= 77°F)
    }

    // 2. Total GDP ($) - User's Exact Wikimedia Blue Palette with Darkest Blue Top Tier
    if (currentChoroplethMetric === 'gdp') {
      const val = props.gdp_total || (props.gdp ? props.gdp * 1000000 : 0);
      if (val >= 10e12)  return '#08306b'; // Mega Titans: USA, China (>= $10T) - Obvious Darkest Blue
      if (val >= 3e12)   return '#004e83'; // Major Powers: Japan, Germany, India ($3T - $10T)
      if (val >= 1e12)   return '#0071bd'; // Very High: UK, France, Brazil, Canada, Australia ($1T - $3T)
      if (val >= 350e9)  return '#109eff'; // High: Turkey, Poland, Saudi Arabia, Sweden ($350B - $1T)
      if (val >= 100e9)  return '#47b4ff'; // Upper-Middle: Greece, Portugal, Qatar, New Zealand ($100B - $350B)
      if (val >= 25e9)   return '#9dd7ff'; // Middle: Croatia, Costa Rica, Bulgaria ($25B - $100B)
      return '#ceebff';                    // Lower: (< $25B)
    }

    // 3. GDP per Capita ($) - User's Exact Wikimedia Blue-to-Black Palette
    if (currentChoroplethMetric === 'gdp_capita') {
      const val = props.gdp_capita || (props.population > 0 ? (props.gdp * 1000000) / props.population : 0);
      if (val >= 80000) return '#000203'; // Wealthiest: Switzerland, Norway, Singapore, Ireland, USA (>= $80K)
      if (val >= 55000) return '#004e83'; // Very High: Germany, Australia, Canada, Netherlands ($55K - $80K)
      if (val >= 35000) return '#0071bd'; // High: UK, France, Japan, Italy, South Korea ($35K - $55K)
      if (val >= 18000) return '#109eff'; // Upper-Middle: Spain, Portugal, Greece, Poland, Chile ($18K - $35K)
      if (val >= 8000)  return '#47b4ff'; // Middle: Mexico, Brazil, China, South Africa ($8K - $18K)
      if (val >= 2500)  return '#9dd7ff'; // Lower-Middle: India, Vietnam, Indonesia, Egypt ($2.5K - $8K)
      return '#ceebff';                   // Developing: (< $2.5K)
    }

    // 4. Total Population - User's Exact Cream-to-Maroon Palette
    const pop = props.population || 0;
    if (pop >= 500000000) return '#7f0000'; // Deep Maroon / Wine Red (>= 500M: India, China)
    if (pop >= 200000000) return '#990000'; // Dark Crimson (200M - 500M: USA, Indonesia, Pakistan, Brazil, Nigeria)
    if (pop >= 100000000) return '#b30000'; // Rich Red (100M - 200M: Bangladesh, Russia, Mexico, Ethiopia, Japan)
    if (pop >= 50000000)  return '#d7301f'; // Coral Red (50M - 100M: Germany, UK, France, Italy, Turkey, Thailand)
    if (pop >= 20000000)  return '#fc8d59'; // Warm Apricot (20M - 50M: Canada, Australia, Poland, Saudi Arabia, Spain)
    if (pop >= 10000000)  return '#fdbb84'; // Light Peach (10M - 20M: Sweden, Portugal, Greece, Czechia, UAE)
    if (pop >= 3000000)   return '#fdd49e'; // Soft Sand (3M - 10M: Ireland, New Zealand, Norway, Finland, Denmark)
    if (pop >= 1000000)   return '#fee8c8'; // Pale Ivory (1M - 3M: Estonia, Cyprus, Bahrain, Mauritius)
    return '#fff7ec';                      // Ultra Light Cream (< 1M: Iceland, Luxembourg, Malta, Brunei)
  }

  function getCountryStyle(feature) {
    const matchesFilter = countryMatchesFilter(feature.properties, currentContinentFilter);

    const borderColor = getBorderColorForBasemap();
    const borderWeight = 1.2;

    if (currentMode === 'choropleth') {
      const color = getChoroplethColor(feature.properties);
      return {
        fillColor: color,
        weight: borderWeight,
        opacity: matchesFilter ? 0.9 : 0.2,
        color: borderColor,
        fillOpacity: matchesFilter ? 0.78 : 0.15,
        className: 'country-polygon'
      };
    }

    // Explore / Quiz Mode (North America: Emerald #10b981, South America: Sunset Coral #ea580c)
    return {
      fillColor: getContinentColor(feature.properties),
      weight: borderWeight,
      opacity: matchesFilter ? 0.8 : 0.2,
      color: borderColor,
      fillOpacity: matchesFilter ? 0.72 : 0.1,
      className: 'country-polygon'
    };
  }

  // --- Render GeoJSON ---
  function renderGeoJson() {
    if (geojsonLayer) {
      map.removeLayer(geojsonLayer);
    }

    geojsonLayer = L.geoJSON(window.WORLD_DATA, {
      style: getCountryStyle,
      onEachFeature: function (feature, layer) {
        layer.on({
          mouseover: function (e) {
            handleCountryHover(e, feature, layer);
          },
          mouseout: function (e) {
            handleCountryHoverOut(e, feature, layer);
          },
          click: function (e) {
            handleCountryClick(e, feature, layer);
          }
        });
      }
    }).addTo(map);

    updateChoroplethLegend();
  }

  // --- Hover Interaction (No text on the map) ---
  function handleCountryHover(e, feature, layer) {
    if (currentMode === 'quiz') return;

    if (layer !== selectedLayer) {
      layer.setStyle({
        weight: 2.2,
        color: '#ffffff',
        fillOpacity: 0.88
      });
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
    }
  }

  function handleCountryHoverOut(e, feature, layer) {
    if (currentMode === 'quiz') return;

    if (layer !== selectedLayer) {
      layer.setStyle(getCountryStyle(feature));
    }
  }

  // --- Click Interaction ---
  function handleCountryClick(e, feature, layer) {
    if (currentMode === 'quiz') {
      evaluateQuizAnswer(feature, layer);
      return;
    }

    selectCountry(feature, layer, true);
  }

  function selectCountry(feature, layer, zoomIn = true) {
    try {
      if (selectedLayer && selectedLayer !== layer && selectedCountryFeature) {
        selectedLayer.setStyle(getCountryStyle(selectedCountryFeature));
      }

      selectedCountryFeature = feature;
      selectedLayer = layer;

      if (layer) {
        layer.setStyle({
          weight: 2.8,
          color: '#fbbf24',
          fillOpacity: 0.92
        });
        if (typeof layer.bringToFront === 'function') {
          try { layer.bringToFront(); } catch (e) {}
        }

        if (zoomIn && typeof layer.getBounds === 'function') {
          try {
            map.fitBounds(layer.getBounds(), {
              paddingTopLeft: [50, 50],
              paddingBottomRight: [window.innerWidth > 900 ? 520 : 50, 50],
              maxZoom: 6,
              duration: 1.2
            });
          } catch (zoomErr) {
            console.warn('fitBounds error ignored:', zoomErr);
          }
        }
      }

      showCountryDrawer(feature.properties);
    } catch (err) {
      console.error('Error selecting country:', err);
      if (feature && feature.properties) {
        showCountryDrawer(feature.properties);
      }
    }
  }

  // --- Plumped Country Drawer & Culture Bento Populator ---
  function showCountryDrawer(props) {
    // 1. National Flag
    if (props.flag_img) {
      el.drawerFlagImg.src = props.flag_img.startsWith('/') ? props.flag_img : '/' + props.flag_img;
      el.drawerFlagImg.onerror = function () {
        el.drawerFlagImg.classList.add('hidden');
        el.drawerFlag.classList.remove('hidden');
        el.drawerFlag.textContent = props.iso_a2 || props.iso_a3 || '';
      };
      el.drawerFlagImg.classList.remove('hidden');
      el.drawerFlag.classList.add('hidden');
    } else if (props.iso_a2 && props.iso_a2.length === 2) {
      el.drawerFlagImg.src = `https://flagcdn.com/w320/${props.iso_a2.toLowerCase()}.png`;
      el.drawerFlagImg.onerror = function () {
        el.drawerFlagImg.classList.add('hidden');
        el.drawerFlag.classList.remove('hidden');
        el.drawerFlag.textContent = props.iso_a2 || props.iso_a3 || '';
      };
      el.drawerFlagImg.classList.remove('hidden');
      el.drawerFlag.classList.add('hidden');
    } else {
      el.drawerFlagImg.classList.add('hidden');
      el.drawerFlag.classList.remove('hidden');
      el.drawerFlag.textContent = props.iso_a2 || props.iso_a3 || '';
    }

    // 2. Title & Badges
    el.drawerName.textContent = props.name || 'Unknown';
    el.drawerOfficialName.textContent = props.officialName || props.name || '';

    // 3. Tab 1 Overview Data (Clean, no subregion, no progress bar, no UTC)
    el.valCapital.textContent = props.capital || 'N/A';
    updateCapitalCard(props.iso_a3, props.capital, props.name);
    el.valPopulation.textContent = props.population ? formatCompactNumber(props.population) : 'N/A';
    el.valGdp.textContent = props.gdp_total ? formatGdp(props.gdp_total) : 'N/A';
    el.valGdpCapita.textContent = props.gdp_capita ? `$${props.gdp_capita.toLocaleString()}` : 'N/A';
    el.valCurrency.textContent = formatCurrency(props.currencies);
    el.valLanguages.textContent = props.languages || 'N/A';

    // Fun Fact for Every Country
    const funFact = (window.COUNTRY_FUN_FACTS && (window.COUNTRY_FUN_FACTS[props.iso_a3] || window.COUNTRY_FUN_FACTS[props.name])) || 'A captivating nation steeped in timeless cultural traditions and geographical wonder.';
    if (el.valFunFact) el.valFunFact.textContent = funFact;

        // 4. Tab 2 Culture Bento Content (No greeting section)
    const culture = (window.getCultureForCountry && (window.getCultureForCountry(props.iso_a3, props.continent) || window.getCultureForCountry(props.name, props.continent))) || {};
    if (el.cultureDish) el.cultureDish.textContent = culture.nationalDish || 'Regional culinary heritage & traditional cooking';
    if (el.cultureLandmark) el.cultureLandmark.textContent = culture.iconicLandmark || 'Historic cultural monuments & natural heritage';
    if (el.cultureDrink) el.cultureDrink.textContent = culture.nationalDrink || 'Traditional teas, coffees & regional beverages';
    if (el.cultureFestivals) el.cultureFestivals.textContent = culture.festivals || 'Cultural festivals & annual seasonal gatherings';
    if (el.cultureFact) el.cultureFact.textContent = funFact;

    // 5. Spoken Language Audio Sample
    stopLanguageAudio();
    const audioData = (window.getLanguageAudioForCountry && window.getLanguageAudioForCountry(props.iso_a3, props.continent, props.name, props.languages)) || null;
    currentAudioData = audioData;
    if (audioData) {
      if (el.langAudioBadge) el.langAudioBadge.textContent = audioData.langName || 'Native Sample';
      if (el.audioPhraseNative) el.audioPhraseNative.textContent = `"${audioData.phrase}"`;
      if (el.audioPhraseSub) el.audioPhraseSub.textContent = `"${audioData.translation}"`;
      if (el.languageAudioBox) el.languageAudioBox.classList.remove('hidden');
    } else {
      if (el.languageAudioBox) el.languageAudioBox.classList.add('hidden');
    }

    el.bentoBoxes.forEach(box => box.classList.remove('hidden'));

    // Default to Overview tab
    switchDrawerTab('overview');

    // External Navigation Links
    const wikiQuery = props.wiki || (props.name === 'Southern Cyprus' ? 'Cyprus' : props.name);
    el.btnWiki.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiQuery)}`;
    el.btnGmaps.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.name)}`;

    el.detailDrawer.classList.remove('hidden');
  }

    function switchDrawerTab(tabKey) {
    stopLanguageAudio();
    el.drawerTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.drawerTab === tabKey);
    });

    if (tabKey === 'overview') {
      el.tabOverview.classList.remove('hidden');
      el.tabCulture.classList.add('hidden');
    } else {
      el.tabOverview.classList.add('hidden');
      el.tabCulture.classList.remove('hidden');
    }
  }

  function hideCountryDrawer() {
    stopLanguageAudio();
    el.detailDrawer.classList.add('hidden');
    if (selectedLayer) {
      geojsonLayer.resetStyle(selectedLayer);
      selectedLayer = null;
      selectedCountryFeature = null;
    }
  }

  // --- Capital City Landmark Photo Populator (User: Landmark photo only, no oval/description) ---
  function updateCapitalCard(iso, capital, countryName) {
    if (!capital || capital === 'N/A') {
      if (el.capitalPhotoFrame) el.capitalPhotoFrame.classList.add('hidden');
      return;
    }

    // 1. Check CAPITAL_LANDMARKS dataset first (iconic landmarks of that capital city)
    const landmarkData = (window.CAPITAL_LANDMARKS && (window.CAPITAL_LANDMARKS[iso] || window.CAPITAL_LANDMARKS[countryName])) || null;
    const generalData = (window.CAPITAL_IMAGES && (window.CAPITAL_IMAGES[iso] || window.CAPITAL_IMAGES[countryName])) || null;

    if (landmarkData && landmarkData.image) {
      if (el.capitalPhotoFrame) el.capitalPhotoFrame.classList.remove('hidden');
      el.capitalImg.src = landmarkData.image;
      el.capitalImg.alt = `${landmarkData.landmark}, ${capital}`;
      el.capitalImg.title = `${landmarkData.landmark} (${capital})`;
      el.capitalImg.classList.remove('hidden');
      if (el.capitalPhotoFallback) el.capitalPhotoFallback.classList.add('hidden');

      el.capitalImg.onerror = function () {
        el.capitalImg.classList.add('hidden');
        if (el.capitalPhotoFallback) el.capitalPhotoFallback.classList.remove('hidden');
      };
      return;
    }

    // 2. Fallback to general capital image dataset
    if (generalData && generalData.image) {
      if (el.capitalPhotoFrame) el.capitalPhotoFrame.classList.remove('hidden');
      el.capitalImg.src = generalData.image;
      el.capitalImg.alt = `${capital}, ${countryName}`;
      el.capitalImg.title = `${capital}, ${countryName}`;
      el.capitalImg.classList.remove('hidden');
      if (el.capitalPhotoFallback) el.capitalPhotoFallback.classList.add('hidden');
      return;
    }

    // 3. Dynamic API query fallback for the landmark
    const queryTerm = landmarkData ? landmarkData.landmark : capital;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(queryTerm)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.thumbnail && data.thumbnail.source) {
          if (el.capitalPhotoFrame) el.capitalPhotoFrame.classList.remove('hidden');
          el.capitalImg.src = data.thumbnail.source;
          el.capitalImg.alt = `${queryTerm}, ${capital}`;
          el.capitalImg.title = `${queryTerm} (${capital})`;
          el.capitalImg.classList.remove('hidden');
          if (el.capitalPhotoFallback) el.capitalPhotoFallback.classList.add('hidden');
        } else {
          el.capitalImg.classList.add('hidden');
          if (el.capitalPhotoFallback) el.capitalPhotoFallback.classList.remove('hidden');
        }
      })
      .catch(() => {
        el.capitalImg.classList.add('hidden');
        if (el.capitalPhotoFallback) el.capitalPhotoFallback.classList.remove('hidden');
      });
  }

  // --- Search Autocomplete ---
  function handleSearchInput(query) {
    query = query.trim().toLowerCase();
    if (!query) {
      el.searchDropdown.classList.add('hidden');
      el.searchClearBtn.classList.add('hidden');
      return;
    }

    el.searchClearBtn.classList.remove('hidden');

    const matches = window.WORLD_DATA.features.filter(f => {
      const p = f.properties;
      return (p.name && p.name.toLowerCase().includes(query)) ||
             (p.capital && p.capital.toLowerCase().includes(query)) ||
             (p.iso_a2 && p.iso_a2.toLowerCase() === query) ||
             (p.iso_a3 && p.iso_a3.toLowerCase() === query);
    }).slice(0, 8);

    renderSearchResults(matches);
  }

  function renderSearchResults(results) {
    if (!results.length) {
      el.searchDropdown.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 0.82rem; text-align: center;">No countries found</div>';
      el.searchDropdown.classList.remove('hidden');
      return;
    }

    el.searchDropdown.innerHTML = results.map((f, i) => {
      const p = f.properties;
      const flagHtml = (p.iso_a2 && p.iso_a2.length === 2)
        ? `<img class="search-item-flag" src="https://flagcdn.com/w40/${p.iso_a2.toLowerCase()}.png" alt="" width="20" height="14" style="object-fit:cover; border-radius:2px; vertical-align:middle;">`
        : `<span class="search-item-flag">${p.iso_a2 || ''}</span>`;
      return `
        <div class="search-item ${i === 0 ? 'selected' : ''}" data-country-id="${p.id}">
          <div class="search-item-left">
            ${flagHtml}
            <div>
              <div class="search-item-name">${p.name}</div>
              <div class="search-item-capital">${p.capital !== 'N/A' ? `Capital: ${p.capital}` : p.continent}</div>
            </div>
          </div>
          <span class="search-item-badge">${getCountryContinent(p)}</span>
        </div>
      `;
    }).join('');

    el.searchDropdown.classList.remove('hidden');

    el.searchDropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.countryId;
        findAndFocusCountry(id);
        el.searchDropdown.classList.add('hidden');
      });
    });
  }

  function findAndFocusCountry(id) {
    let foundLayer = null;
    let foundFeature = null;

    geojsonLayer.eachLayer(layer => {
      if (layer.feature.properties.id === id) {
        foundLayer = layer;
        foundFeature = layer.feature;
      }
    });

    if (foundLayer && foundFeature) {
      selectCountry(foundFeature, foundLayer, true);
    }
  }

  // --- Random Country ---
  function pickRandomCountry() {
    const features = window.WORLD_DATA.features;
    if (!features.length) return;
    const rand = features[Math.floor(Math.random() * features.length)];
    findAndFocusCountry(rand.properties.id);
  }

  // --- Continent Filter ---
  function applyContinentFilter(continent) {
    currentContinentFilter = continent;
    el.filterPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.continent === continent);
    });

    geojsonLayer.eachLayer(layer => {
      geojsonLayer.resetStyle(layer);
    });

    updateCountryCount();

    if (continent !== 'all') {
      const bounds = L.latLngBounds([]);
      geojsonLayer.eachLayer(layer => {
        if (countryMatchesFilter(layer.feature.properties, continent)) {
          bounds.extend(layer.getBounds());
        }
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], duration: 1.0 });
      }
    } else {
      map.flyTo([22, 12], 2.3, { duration: 1.0 });
    }
  }

  function updateCountryCount() {
    let count = 0;
    window.WORLD_DATA.features.forEach(f => {
      if (countryMatchesFilter(f.properties, currentContinentFilter)) {
        count++;
      }
    });
    if (el.countryCountBadge) {
      el.countryCountBadge.textContent = `${count} Countries & Territories`;
    }
  }

  // --- Choropleth Mode Update ---
  function updateChoroplethLegend() {
    if (currentMode !== 'choropleth') {
      el.choroplethLegend.classList.add('hidden');
      return;
    }

    el.choroplethLegend.classList.remove('hidden');

    if (currentChoroplethMetric === 'temp') {
      const isC = (currentTempUnit === 'C');
      el.legendTitle.textContent = isC ? 'Mean Annual Temperature (°C)' : 'Mean Annual Temperature (°F)';
      el.legendScale.innerHTML = isC ? `
        <div class="legend-scale-bar" style="background: linear-gradient(to right, #fff33b, #fdc70c, #f3903f, #ed683c, #e93e3a);"></div>
        <div class="legend-labels">
          <span>&lt; 5°C</span>
          <span>12°C</span>
          <span>20°C</span>
          <span>25°C</span>
          <span>&gt; 25°C</span>
        </div>
      ` : `
        <div class="legend-scale-bar" style="background: linear-gradient(to right, #fff33b, #fdc70c, #f3903f, #ed683c, #e93e3a);"></div>
        <div class="legend-labels">
          <span>&lt; 41°F</span>
          <span>54°F</span>
          <span>68°F</span>
          <span>77°F</span>
          <span>&gt; 77°F</span>
        </div>
      `;
    } else if (currentChoroplethMetric === 'gdp') {
      el.legendTitle.textContent = 'Total Gross Domestic Product (USD)';
      el.legendScale.innerHTML = `
        <div class="legend-scale-bar" style="background: linear-gradient(to right, #ceebff, #9dd7ff, #47b4ff, #109eff, #0071bd, #004e83, #08306b);"></div>
        <div class="legend-labels">
          <span>&lt; $25B</span>
          <span>$100B</span>
          <span>$350B</span>
          <span>$1T</span>
          <span>$3T</span>
          <span>&gt; $10T</span>
        </div>
      `;
    } else if (currentChoroplethMetric === 'gdp_capita') {
      el.legendTitle.textContent = 'GDP per Capita (USD)';
      el.legendScale.innerHTML = `
        <div class="legend-scale-bar" style="background: linear-gradient(to right, #ceebff, #9dd7ff, #47b4ff, #109eff, #0071bd, #004e83, #000203);"></div>
        <div class="legend-labels">
          <span>&lt; $2.5K</span>
          <span>$8K</span>
          <span>$18K</span>
          <span>$35K</span>
          <span>$55K</span>
          <span>&gt; $80K</span>
        </div>
      `;
    } else {
      el.legendTitle.textContent = 'Total Population';
      el.legendScale.innerHTML = `
        <div class="legend-scale-bar" style="background: linear-gradient(to right, #fff7ec, #fee8c8, #fdd49e, #fdbb84, #fc8d59, #d7301f, #b30000, #990000, #7f0000);"></div>
        <div class="legend-labels">
          <span>&lt; 1M</span>
          <span>5M</span>
          <span>20M</span>
          <span>50M</span>
          <span>100M</span>
          <span>200M</span>
          <span>&gt; 500M</span>
        </div>
      `;
    }
  }

  // --- Quiz Mode Engine ---
  function startQuiz() {
    quizState.pool = window.WORLD_DATA.features.filter(f => f.properties.name && f.properties.population > 500000);
    quizState.score = 0;
    quizState.streak = 0;
    quizState.bestStreak = 0;
    quizState.round = 1;
    quizState.answered.clear();
    quizState.active = true;

    hideCountryDrawer();
    if (el.continentFilterBar) el.continentFilterBar.classList.add('hidden');
    el.choroplethControls.classList.add('hidden');
    el.choroplethLegend.classList.add('hidden');
    el.quizHud.classList.remove('hidden');
    map.flyTo([22, 12], 2.3, { duration: 0.8 });

    nextQuizRound();
  }

  function nextQuizRound() {
    if (quizState.round > quizState.maxRounds) {
      finishQuiz();
      return;
    }

    const available = quizState.pool.filter(f => !quizState.answered.has(f.properties.id));
    if (!available.length) {
      finishQuiz();
      return;
    }

    const target = available[Math.floor(Math.random() * available.length)];
    quizState.currentTarget = target;
    quizState.answered.add(target.properties.id);

    el.quizTargetName.textContent = target.properties.name;
    el.quizHint.textContent = `Hint: Continent: ${getCountryContinent(target.properties)}`;
    el.quizScoreVal.textContent = quizState.score;
    el.quizStreakVal.textContent = quizState.streak;
    el.quizRoundVal.textContent = `${quizState.round} / ${quizState.maxRounds}`;

    geojsonLayer.eachLayer(layer => {
      geojsonLayer.resetStyle(layer);
    });
  }

  function evaluateQuizAnswer(feature, layer) {
    if (!quizState.active || !quizState.currentTarget) return;

    const isCorrect = feature.properties.id === quizState.currentTarget.properties.id ||
                      feature.properties.name === quizState.currentTarget.properties.name;

    if (isCorrect) {
      playSynthesizedSound('success');
      quizState.score++;
      quizState.streak++;
      if (quizState.streak > quizState.bestStreak) {
        quizState.bestStreak = quizState.streak;
      }

      layer.setStyle({
        fillColor: '#10b981',
        weight: 2.8,
        color: '#ffffff',
        fillOpacity: 0.95
      });

      setTimeout(() => {
        quizState.round++;
        nextQuizRound();
      }, 900);
    } else {
      playSynthesizedSound('miss');
      quizState.streak = 0;
      el.quizStreakVal.textContent = '0';

      layer.setStyle({
        fillColor: '#f43f5e',
        weight: 2.4,
        color: '#ffffff',
        fillOpacity: 0.88
      });

      el.quizHint.textContent = `That was ${feature.properties.name}! Look in ${getCountryContinent(feature.properties)}`;

      setTimeout(() => {
        geojsonLayer.resetStyle(layer);
      }, 1200);
    }
  }

  function skipQuizQuestion() {
    if (!quizState.active) return;
    playSynthesizedSound('miss');
    quizState.streak = 0;
    quizState.round++;
    nextQuizRound();
  }

  function endQuiz() {
    quizState.active = false;
    el.quizHud.classList.add('hidden');
    switchMode('explore');
  }

  function finishQuiz() {
    quizState.active = false;
    el.quizHud.classList.add('hidden');

    el.modalFinalScore.textContent = `${quizState.score} / ${quizState.maxRounds}`;
    el.modalBestStreak.textContent = quizState.bestStreak;

    if (quizState.score >= 8) {
      el.quizModalTitle.textContent = 'Master Geographer!';
      el.quizModalDesc.textContent = 'Incredible knowledge of world geography!';
    } else if (quizState.score >= 5) {
      el.quizModalTitle.textContent = 'Great Effort!';
      el.quizModalDesc.textContent = 'Solid performance! Keep exploring the world!';
    } else {
      el.quizModalTitle.textContent = 'Explorer in Training';
      el.quizModalDesc.textContent = 'Practice makes perfect. Explore the map to learn more!';
    }

    el.quizModal.classList.remove('hidden');
    playSynthesizedSound('fanfare');
  }

  // --- Spoken Language Audio Sample Player ---
  function stopLanguageAudio() {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    isAudioPlaying = false;
    if (el.languageAudioBox) el.languageAudioBox.classList.remove('is-playing');
    if (el.btnPlayLangAudio) el.btnPlayLangAudio.classList.remove('active');
    if (el.langAudioBtnLabel) el.langAudioBtnLabel.textContent = 'Listen to Sample';
    if (el.langAudioIconWrap) {
      const p = el.langAudioIconWrap.querySelector('.icon-play');
      const s = el.langAudioIconWrap.querySelector('.icon-stop');
      if (p) p.classList.remove('hidden');
      if (s) s.classList.add('hidden');
    }
  }

  function playLanguageAudio() {
    if (!currentAudioData || !currentAudioData.phrase) return;

    if (isAudioPlaying) {
      stopLanguageAudio();
      return;
    }

    stopLanguageAudio();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentAudioData.phrase);
      utterance.lang = currentAudioData.langCode || 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.0;

      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length) {
          const targetLang = (currentAudioData.langCode || '').toLowerCase().replace('_', '-');
          const prefix = targetLang.split('-')[0];
          const matchedVoice = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-') === targetLang) ||
                               voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }
      } catch (err) {}

      utterance.onstart = () => {
        isAudioPlaying = true;
        if (el.languageAudioBox) el.languageAudioBox.classList.add('is-playing');
        if (el.btnPlayLangAudio) el.btnPlayLangAudio.classList.add('active');
        if (el.langAudioBtnLabel) el.langAudioBtnLabel.textContent = 'Stop';
        if (el.langAudioIconWrap) {
          const p = el.langAudioIconWrap.querySelector('.icon-play');
          const s = el.langAudioIconWrap.querySelector('.icon-stop');
          if (p) p.classList.add('hidden');
          if (s) s.classList.remove('hidden');
        }
      };

      utterance.onend = () => {
        stopLanguageAudio();
      };

      utterance.onerror = () => {
        stopLanguageAudio();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      isAudioPlaying = true;
      if (el.languageAudioBox) el.languageAudioBox.classList.add('is-playing');
      setTimeout(stopLanguageAudio, 3000);
    }
  }

  // --- Web Audio Synth Sound FX ---
  function playSynthesizedSound(type) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'miss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(146.83, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'fanfare') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'intro') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (err) {
      // fallback
    }
  }

  // --- Mode Switching ---
  function switchMode(newMode) {
    if (quizState.active && newMode !== 'quiz') {
      quizState.active = false;
    }

    currentMode = newMode;

    el.modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    hideCountryDrawer();
    el.quizHud.classList.add('hidden');
    el.quizModal.classList.add('hidden');
    el.choroplethControls.classList.add('hidden');
    el.choroplethLegend.classList.add('hidden');

    if (newMode === 'explore') {
      if (el.continentFilterBar) el.continentFilterBar.classList.remove('hidden');
      geojsonLayer.setStyle(getCountryStyle);
    } else if (newMode === 'choropleth') {
      if (el.continentFilterBar) el.continentFilterBar.classList.remove('hidden');
      el.choroplethControls.classList.remove('hidden');
      el.choroplethLegend.classList.remove('hidden');
      geojsonLayer.setStyle(getCountryStyle);
      updateChoroplethLegend();
    } else if (newMode === 'quiz') {
      if (el.continentFilterBar) el.continentFilterBar.classList.add('hidden');
      startQuiz();
    }
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    if (el.logoHome) {
      el.logoHome.addEventListener('click', () => {
        map.flyTo([22, 12], 2.3, { duration: 1.0 });
        hideCountryDrawer();
      });
    }

    // Drawer Tabs (Overview vs Culture)
    el.drawerTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchDrawerTab(btn.dataset.drawerTab);
      });
    });

    // Spoken Language Audio Sample Button
    if (el.btnPlayLangAudio) {
      el.btnPlayLangAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        playLanguageAudio();
      });
    }

    // Warm up speech synthesis voices on first user interaction
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        try { window.speechSynthesis.getVoices(); } catch (e) {}
      };
    }

    // Mode Buttons
    el.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchMode(btn.dataset.mode);
      });
    });

    // Metric Toggles (Choropleth)
    el.metricBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.metricBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentChoroplethMetric = btn.dataset.metric;

        // Show/hide unit options for temperature
        if (currentChoroplethMetric === 'temp') {
          if (el.tempUnitToggle) el.tempUnitToggle.classList.remove('hidden');
        } else {
          if (el.tempUnitToggle) el.tempUnitToggle.classList.add('hidden');
        }

        geojsonLayer.setStyle(getCountryStyle);
        updateChoroplethLegend();
      });
    });

    // Temperature Unit Toggles (°C vs °F)
    el.tempUnitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.tempUnitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTempUnit = btn.dataset.tempUnit;
        geojsonLayer.setStyle(getCountryStyle);
        updateChoroplethLegend();
      });
    });

    // Basemap Layer Toggle
    el.basemapToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      el.basemapMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      el.basemapMenu.classList.add('hidden');
      el.searchDropdown.classList.add('hidden');
    });

    el.basemapItems.forEach(item => {
      item.addEventListener('click', () => {
        const layerKey = item.dataset.layer;
        if (layerKey && baseLayers[layerKey]) {
          map.removeLayer(baseLayers[currentBaseLayer]);
          baseLayers[layerKey].addTo(map);
          currentBaseLayer = layerKey;

          el.basemapItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          geojsonLayer.setStyle(getCountryStyle);
        }
      });
    });

    // Continent Filter Pills
    el.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        applyContinentFilter(pill.dataset.continent);
      });
    });

    // Search Box with 60ms debounce for instant input responsiveness
    let searchDebounce = null;
    el.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        handleSearchInput(e.target.value);
      }, 60);
    });

    el.searchClearBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      el.searchClearBtn.classList.add('hidden');
      el.searchDropdown.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== el.searchInput) {
        e.preventDefault();
        el.searchInput.focus();
        el.searchInput.select();
      } else if (e.key === 'Escape') {
        el.searchDropdown.classList.add('hidden');
        el.searchInput.blur();
        hideCountryDrawer();
      }
    });

    // Dynamically maintain minimum zoom on screen resize to guarantee zero uncolored margins
    window.addEventListener('resize', () => {
      if (!map) return;
      const minZ = calculateFitZoom();
      map.setMinZoom(minZ);
      if (map.getZoom() < minZ) {
        map.setZoom(minZ);
      }
    });

    // Drawer Close
    el.drawerCloseBtn.addEventListener('click', hideCountryDrawer);

    // Quiz Controls
    el.quizSkipBtn.addEventListener('click', skipQuizQuestion);
    el.quizEndBtn.addEventListener('click', endQuiz);
    el.quizPlayAgainBtn.addEventListener('click', () => {
      el.quizModal.classList.add('hidden');
      startQuiz();
    });
    el.quizCloseModalBtn.addEventListener('click', () => {
      el.quizModal.classList.add('hidden');
      switchMode('explore');
    });
  }

  // --- Compact Number Formatter ---
  function formatCompactNumber(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000000) return parseFloat((num / 1000000000).toFixed(2)) + 'B';
    if (num >= 1000000) return parseFloat((num / 1000000).toFixed(1)) + 'M';
    if (num >= 1000) return parseFloat((num / 1000).toFixed(1)) + 'K';
    return num.toLocaleString();
  }

  // --- GDP Currency Formatter ---
  function formatGdp(num) {
    if (!num || isNaN(num)) return 'N/A';
    if (num >= 1e12) return `$${parseFloat((num / 1e12).toFixed(2))}T`;
    if (num >= 1e9) return `$${parseFloat((num / 1e9).toFixed(1))}B`;
    if (num >= 1e6) return `$${parseFloat((num / 1e6).toFixed(1))}M`;
    return `$${num.toLocaleString()}`;
  }

  // --- Currency Formatter (Keeps symbol e.g. €, but deletes abbreviation e.g. EUR) ---
  function formatCurrency(raw) {
    if (!raw || raw === 'N/A') return 'N/A';
    return raw
      .replace(/\b[A-Z]{3},\s*/g, '')
      .replace(/\s*\([A-Z]{3}\)/g, '')
      .replace(/\s*,\s*/g, ', ')
      .trim() || 'N/A';
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
