// ========================================
// WEATHER APP - JavaScript
// ========================================
// API: Open-Meteo (Free, no API key needed!)
// Docs: https://open-meteo.com/en/docs

// ========================================
// Animated Space Background
// ========================================

function initializeSpaceBackground() {
  const canvas = document.getElementById("spaceCanvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();

  // Star class for animation
  class Star {
    constructor() {
      this.reset();
      this.twinkleRate = Math.random() * 0.03 + 0.01;
      this.twinklePhase = Math.random() * Math.PI * 2;
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.opacity = Math.random() * 0.7 + 0.3;
    }

    update() {
      this.twinklePhase += this.twinkleRate;
      this.opacity =
        Math.sin(this.twinklePhase) * 0.5 + 0.5 * (Math.random() * 0.5 + 0.5);
    }

    draw() {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Create stars
  const stars = [];
  const starCount = 200;
  for (let i = 0; i < starCount; i++) {
    stars.push(new Star());
  }

  // Animation loop
  function animate() {
    // Create nebula-like background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#000814");
    gradient.addColorStop(0.3, "#001233");
    gradient.addColorStop(0.6, "#000814");
    gradient.addColorStop(0.8, "#0a0e27");
    gradient.addColorStop(1, "#000814");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add nebula clouds with colors
    ctx.fillStyle = "rgba(138, 43, 226, 0.03)"; // Purple nebula
    ctx.beginPath();
    ctx.arc(canvas.width * 0.3, canvas.height * 0.4, 400, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(30, 144, 255, 0.03)"; // Blue nebula
    ctx.beginPath();
    ctx.arc(canvas.width * 0.7, canvas.height * 0.6, 350, 0, Math.PI * 2);
    ctx.fill();

    // Update and draw stars
    stars.forEach((star) => {
      star.update();
      star.draw();
    });

    requestAnimationFrame(animate);
  }

  // Handle window resize
  window.addEventListener("resize", resizeCanvas);

  // Start animation
  animate();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSpaceBackground);
} else {
  initializeSpaceBackground();
}

const API_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

// DOM Elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const geolocationBtn = document.getElementById("geolocationBtn");
const tempToggleBtn = document.getElementById("tempToggleBtn");
const refreshBtn = document.getElementById("refreshBtn");
const weatherContainer = document.getElementById("weatherContainer");
const errorMessage = document.getElementById("errorMessage");
const forecastContainer = document.getElementById("forecastContainer");
const hourlyContainer = document.getElementById("hourlyContainer");
const hourlySection = document.getElementById("hourlySection");
const favoritesList = document.getElementById("favoritesList");
const noFavoritesMsg = document.getElementById("noFavoritesMsg");
const loadingSpinner = document.getElementById("loadingSpinner");

// Temperature unit state
let isCelsius = true;
let currentWeatherData = null;

// Event Listeners
searchBtn.addEventListener("click", handleSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSearch();
});
geolocationBtn.addEventListener("click", handleGeolocation);
tempToggleBtn.addEventListener("click", toggleTemperature);
refreshBtn.addEventListener("click", handleRefresh);

// ========================================
// Main Functions
// ========================================

async function handleSearch() {
  const city = searchInput.value.trim();
  if (!city) {
    showError("Please enter a city name");
    return;
  }

  await fetchAndDisplayWeather(city);
}

async function handleGeolocation() {
  geolocationBtn.disabled = true;
  showLoadingSpinner();

  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser");
    geolocationBtn.disabled = false;
    hideLoadingSpinner();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        // Reverse geocode to get city name
        const response = await fetch(
          `${GEOCODING_URL}?latitude=${latitude}&longitude=${longitude}&format=json`,
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const cityName = data.results[0].name;
          searchInput.value = cityName;
          await fetchAndDisplayWeather(cityName);
        }
      } catch (error) {
        showError("Failed to get location name");
      }
      geolocationBtn.disabled = false;
      hideLoadingSpinner();
    },
    (error) => {
      showError("Unable to access your location");
      geolocationBtn.disabled = false;
      hideLoadingSpinner();
    },
  );
}

async function handleRefresh() {
  if (currentWeatherData && searchInput.value) {
    await fetchAndDisplayWeather(searchInput.value);
  } else {
    showError("Please search for a city first");
  }
}

function toggleTemperature() {
  isCelsius = !isCelsius;
  tempToggleBtn.textContent = isCelsius ? "°C" : "°F";
  tempToggleBtn.title = `Switch to ${isCelsius ? "°F" : "°C"}`;

  // Save preference
  localStorage.setItem("tempUnit", isCelsius ? "C" : "F");

  // Update displayed weather
  if (currentWeatherData) {
    updateTemperatureDisplay();
  }
}

async function fetchAndDisplayWeather(city) {
  try {
    showLoadingSpinner();
    clearError();
    show(weatherContainer);

    const weather = await fetchWeatherData(city);
    currentWeatherData = weather;

    displayCurrentWeather(weather);
    await displayForecast(weather.coord.lat, weather.coord.lon);
    await displayHourlyForecast(weather.coord.lat, weather.coord.lon);
    loadFavorites();

    // Save to search history
    saveSearchHistory(city);
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoadingSpinner();
  }
}

async function fetchWeatherData(city) {
  try {
    // First, geocode the city to get coordinates
    const geoResponse = await fetch(
      `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
    );

    if (!geoResponse.ok) throw new Error("City not found");

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found");
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Now fetch weather data using coordinates
    const weatherResponse = await fetch(
      `${API_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`,
    );

    if (!weatherResponse.ok) throw new Error("Failed to fetch weather data");

    const weatherData = await weatherResponse.json();

    // Transform Open-Meteo data to match our app's expected format
    return transformWeatherData(weatherData, name, country);
  } catch (error) {
    throw error;
  }
}

function transformWeatherData(data, cityName, country) {
  const current = data.current_weather;
  const daily = data.daily;
  const hourly = data.hourly;

  // Convert weather code to description
  const weatherDescriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Heavy rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return {
    name: cityName,
    sys: { country: country },
    main: {
      temp: Math.round(current.temperature),
      feels_like: Math.round(current.temperature), // Approximation
      humidity: hourly.relative_humidity_2m
        ? Math.round(hourly.relative_humidity_2m[0])
        : null,
      pressure: null, // Not available in free tier
    },
    weather: [
      {
        main: getWeatherMain(current.weathercode),
        description: weatherDescriptions[current.weathercode] || "Unknown",
        icon: getWeatherIcon(current.weathercode),
      },
    ],
    wind: {
      speed: current.windspeed,
    },
    clouds: { all: null },
    coord: {
      lat: data.latitude,
      lon: data.longitude,
    },
    dt: Date.now() / 1000,
    forecast: daily.time.slice(1, 6).map((date, index) => ({
      dt: new Date(date).getTime() / 1000,
      main: {
        temp_max: Math.round(daily.temperature_2m_max[index + 1]),
        temp_min: Math.round(daily.temperature_2m_min[index + 1]),
      },
      weather: [
        {
          main: getWeatherMain(daily.weathercode[index + 1]),
          icon: getWeatherIcon(daily.weathercode[index + 1]),
        },
      ],
    })),
  };
}

function getWeatherMain(code) {
  if (code === 0 || code === 1) return "Clear";
  if (code >= 2 && code <= 3) return "Clouds";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain";
  if (code >= 85 && code <= 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

function getWeatherIcon(code) {
  // Map weather codes to OpenWeatherMap-style icons
  if (code === 0 || code === 1) return "01d"; // Clear
  if (code === 2) return "02d"; // Partly cloudy
  if (code === 3) return "03d"; // Overcast
  if (code >= 45 && code <= 48) return "50d"; // Fog
  if (code >= 51 && code <= 57) return "09d"; // Drizzle
  if (code >= 61 && code <= 67) return "10d"; // Rain
  if (code >= 71 && code <= 77) return "13d"; // Snow
  if (code >= 80 && code <= 82) return "09d"; // Rain showers
  if (code >= 85 && code <= 86) return "13d"; // Snow showers
  if (code >= 95) return "11d"; // Thunderstorm
  return "01d"; // Default
}

async function fetchForecastData(lat, lon) {
  const response = await fetch(
    `${API_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`,
  );

  if (!response.ok) throw new Error("Failed to fetch forecast data");
  return response.json();
}

function displayCurrentWeather(data) {
  const { main, weather, wind, clouds, visibility, sys } = data;
  const city = data.name;
  const country = data.sys.country;

  // Update DOM
  document.getElementById("cityName").textContent = `${city}, ${country}`;
  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  updateTemperatureDisplay();

  document.getElementById("description").textContent = weather[0].description;
  document.getElementById("humidity").textContent = `${main.humidity}%`;
  document.getElementById("windSpeed").textContent = `${wind.speed} m/s`;
  document.getElementById("visibility").textContent =
    `${(visibility / 1000).toFixed(1)} km`;
  document.getElementById("pressure").textContent = `${main.pressure} hPa`;

  // Weather icon
  const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@4x.png`;
  document.getElementById("weatherIcon").src = iconUrl;

  // Dynamic background based on weather
  updateBackgroundByWeather(weather[0].main);
}

function updateTemperatureDisplay() {
  if (!currentWeatherData) return;

  const { main } = currentWeatherData;
  const tempUnit = document.querySelector(".temp-unit");
  const feelsLike = document.getElementById("feelsLike");

  if (isCelsius) {
    document.getElementById("temperature").textContent = Math.round(main.temp);
    tempUnit.textContent = "°C";
    feelsLike.textContent = `Feels like ${Math.round(main.feels_like)}°C`;
  } else {
    // Convert to Fahrenheit
    const tempF = Math.round((main.temp * 9) / 5 + 32);
    const feelsF = Math.round((main.feels_like * 9) / 5 + 32);
    document.getElementById("temperature").textContent = tempF;
    tempUnit.textContent = "°F";
    feelsLike.textContent = `Feels like ${feelsF}°F`;
  }
}

async function displayForecast(lat, lon) {
  try {
    const data = await fetchForecastData(lat, lon);
    const forecastList = data.list
      .filter((item, index) => index % 8 === 0)
      .slice(0, 5);

    forecastContainer.innerHTML = forecastList
      .map(
        (day) => `
      <div class="forecast-card">
        <div class="forecast-date">${new Date(day.dt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="Weather icon">
        <div class="forecast-temp">
          <div>${Math.round(day.main.temp_max)}°</div>
          <small>${Math.round(day.main.temp_min)}°</small>
        </div>
        <small>${day.weather[0].main}</small>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Forecast error:", error);
  }
}

async function displayHourlyForecast(lat, lon) {
  try {
    const response = await fetch(
      `${API_URL}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code&timezone=auto`,
    );
    const data = await response.json();

    // Get next 24 hours
    const now = new Date();
    const hourlyData = data.hourly.time.slice(0, 12).map((time, index) => ({
      time: new Date(time),
      temp: data.hourly.temperature_2m[index],
      code: data.hourly.weather_code[index],
    }));

    // Create hourly cards
    hourlyContainer.innerHTML = hourlyData
      .map(
        (hour) => `
      <div class="hourly-card">
        <p class="hourly-time">${hour.time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
        <img src="https://openweathermap.org/img/wn/${getWeatherIcon(hour.code)}@2x.png" alt="Weather icon">
        <p class="hourly-temp">${isCelsius ? Math.round(hour.temp) : Math.round((hour.temp * 9) / 5 + 32)}°</p>
      </div>
    `,
      )
      .join("");

    hourlySection.style.display = "block";
  } catch (error) {
    console.error("Hourly forecast error:", error);
    hourlySection.style.display = "none";
  }
}

// ========================================
// Favorites Management
// ========================================

function saveFavorite() {
  const city = document.getElementById("cityName").textContent.split(",")[0];
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];

  if (!favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
    loadFavorites();
    showToast(`Added ${city} to favorites`);
  } else {
    showToast(`${city} is already in favorites`);
  }
}

function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];

  if (favorites.length === 0) {
    favoritesList.innerHTML = "";
    show(noFavoritesMsg);
    return;
  }

  hide(noFavoritesMsg);
  favoritesList.innerHTML = favorites
    .map(
      (city) => `
    <div class="favorite-card">
      <p>${city}</p>
      <button onclick="loadFavoriteCity('${city}')">Load</button>
      <button onclick="removeFavorite('${city}')">Remove</button>
    </div>
  `,
    )
    .join("");
}

function loadFavoriteCity(city) {
  searchInput.value = city;
  handleSearch();
}

function removeFavorite(city) {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  favorites = favorites.filter((fav) => fav !== city);
  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  loadFavorites();
  showToast(`Removed ${city} from favorites`);
}

// ========================================
// UI Utilities
// ========================================

function updateBackgroundByWeather(condition) {
  // Background is now handled by animated space canvas
  // This function is kept for future enhancements (e.g., weather-based overlays)
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add("show");
  hide(weatherContainer);
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.classList.remove("show");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toastIcon");
  const toastMessage = document.getElementById("toastMessage");

  // Set message
  toastMessage.textContent = message;

  // Set icon and type
  if (type === "success") {
    toastIcon.className = "fas fa-check-circle";
    toast.className = "toast success";
  } else if (type === "error") {
    toastIcon.className = "fas fa-exclamation-triangle";
    toast.className = "toast error";
  }

  // Show toast
  toast.classList.remove("hidden");

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function show(element) {
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
}

function showLoadingSpinner() {
  loadingSpinner.classList.remove("hidden");
}

function hideLoadingSpinner() {
  loadingSpinner.classList.add("hidden");
}

function saveSearchHistory(city) {
  let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
  // Remove duplicate if exists
  history = history.filter((c) => c.toLowerCase() !== city.toLowerCase());
  // Add to beginning
  history.unshift(city);
  // Keep only last 10 searches
  history = history.slice(0, 10);
  localStorage.setItem("weatherHistory", JSON.stringify(history));
}

function loadLastSearchedCity() {
  const history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
  if (history.length > 0) {
    searchInput.value = history[0];
    // Uncomment to auto-load last city
    // fetchAndDisplayWeather(history[0]);
  }
}

// Load temperature preference
function loadTemperaturePreference() {
  const savedUnit = localStorage.getItem("tempUnit");
  if (savedUnit === "F") {
    isCelsius = false;
    tempToggleBtn.textContent = "°F";
  } else {
    isCelsius = true;
    tempToggleBtn.textContent = "°C";
  }
}

// ========================================
// Initialize on Page Load
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  loadTemperaturePreference();
  loadLastSearchedCity();
  loadFavorites();
  // Auto-load default city
  // searchInput.value = 'London';
  // handleSearch();
});

// ========================================
// TODO / Enhancement Ideas
// ========================================
/*
✅ 1. Add save favorite button to current weather
2. Add temperature unit toggle (C to F)
3. Add geolocation detection on load
4. Add hourly forecast
5. Add UV index and air quality
6. Add weather alerts
7. Add dark mode toggle
8. Add animation transitions
9. Cache API responses
10. Add PWA support for offline
*/
