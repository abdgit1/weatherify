const cityInput = document.getElementById('city-input');
const searchButton = document.getElementById('search-btn');
const mylocationButton = document.getElementById('location-btn');
const themeToggle = document.getElementById('theme-toggle');
const currentTime = document.getElementById('current-time');
const greetingMessage = document.getElementById('greeting-message');
const addFavButton = document.getElementById('add-fav');
const favoritesList = document.getElementById('favorites-list');
const forecastContainer = document.getElementById('forecast-container');

const MAX_TOASTS = 4;


// -------------------------
// TOAST SYSTEM
// -------------------------

const TOAST_CONFIG = {
    success: { icon: '✓', bg: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'rgba(74,222,128,0.3)' },
    error:   { icon: '✕', bg: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'rgba(248,113,113,0.3)' },
    info:    { icon: 'ℹ', bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'rgba(96,165,250,0.3)'  },
    warning: { icon: '⚠', bg: 'linear-gradient(135deg, #d97706, #b45309)', border: 'rgba(251,191,36,0.3)'  },
};


function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');

    // Enforce max stack — remove oldest if over limit
    const existing = container.querySelectorAll('.toast-item');
    if (existing.length >= MAX_TOASTS) {
        dismissToast(existing[0]);
    }

    const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 50px;
        border: 1px solid ${cfg.border};
        background: ${cfg.bg};
        color: #fff;
        font-size: 0.875rem;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        backdrop-filter: blur(12px);
        cursor: pointer;
        max-width: 320px;
        opacity: 0;
        transform: translateY(12px) scale(0.96);
        transition: opacity 0.25s ease, transform 0.25s ease;
        user-select: none;
    `;

    toast.innerHTML = `
        <span style="font-size:1rem; flex-shrink:0; width:20px; text-align:center;">${cfg.icon}</span>
        <span style="flex:1; line-height:1.4;">${message}</span>
        <span style="opacity:0.6; font-size:1rem; flex-shrink:0; margin-left:4px;">✕</span>
    `;

    // Click to dismiss early
    toast.addEventListener('click', () => dismissToast(toast));

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Auto-dismiss
    const timer = setTimeout(() => dismissToast(toast), 3500);
    toast._timer = timer;
}

function dismissToast(toast) {
    if (!toast || toast._dismissing) return;
    toast._dismissing = true;
    clearTimeout(toast._timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.95)';
    setTimeout(() => toast.remove(), 280);
}


// Theme toggle functionality with localStorage and system preference awareness
const themeIcon = document.getElementById('theme-icon');

function updateThemeIcon(isDark) {
    if (themeIcon) {
        themeIcon.innerHTML = isDark 
            ? '<i class="fa-solid fa-moon text-sky-400 text-[1rem]"></i>' 
            : '<i class="fa-solid fa-sun text-amber-500 text-[1.05rem]"></i>';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (savedTheme === null && systemPrefersDark);

    document.documentElement.classList.toggle('dark', isDark);
    updateThemeIcon(isDark);
}

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    if (currentHoursData) {
        initChart(currentHoursData);
    }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const isDark = e.matches;
        document.documentElement.classList.toggle('dark', isDark);
        updateThemeIcon(isDark);
        if (currentHoursData) {
            initChart(currentHoursData);
        }
    }
});

initTheme();

// Greeting according to the selected city's local time
function getGreetingByHour(hour) {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
}

function updateGreeting(localtime) {
    // WeatherAPI localtime format: "YYYY-MM-DD HH:mm"
    const date = localtime ? new Date(localtime.replace(' ', 'T')) : new Date();
    const hour = Number.isNaN(date.getTime()) ? new Date().getHours() : date.getHours();

    if (greetingMessage) {
        greetingMessage.innerText = `${getGreetingByHour(hour)}, User!`;
    }
}

function showSkeletons() {
    // 1. Current Weather Skeletons
    document.getElementById('temp').innerHTML = '<div class="skeleton h-12 w-28 rounded-xl my-1"></div>';
    document.getElementById('condition').innerHTML = '<div class="skeleton h-6 w-36 rounded-md my-1.5"></div>';
    document.getElementById('feelslike').innerHTML = '<div class="skeleton h-4 w-24 rounded-md my-1"></div>';
    document.getElementById('location').innerHTML = '<div class="skeleton h-4 w-40 rounded-md"></div>';
    document.getElementById('weather-icon').innerHTML = '<div class="skeleton skeleton-circle absolute inset-0 w-full h-full"></div>';

    // 2. Stats Skeletons
    const statSkeleton = '<div class="skeleton h-4 w-12 rounded-sm mt-1"></div>';
    document.getElementById('humidity').innerHTML = '<div class="skeleton h-4 w-8 rounded-sm mt-1"></div>';
    document.getElementById('wind').innerHTML = statSkeleton;
    document.getElementById('sunrise').innerHTML = statSkeleton;
    document.getElementById('sunset').innerHTML = statSkeleton;

    // 2.5 Current Time Skeleton
    document.getElementById('current-time').innerHTML = '<div class="skeleton h-3 w-24 rounded-full"></div>';

    // 3. Forecast Skeletons
    if (forecastContainer) {
        forecastContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const row = document.createElement('div');
            row.className = 'fc-skeleton-row';
            row.innerHTML = `
                <div class="skeleton skeleton-circle w-9 h-9 shrink-0"></div>
                <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div class="skeleton skeleton-sm w-20"></div>
                    <div class="skeleton skeleton-sm w-16 opacity-60"></div>
                </div>
                <div class="flex gap-1.5">
                    <div class="skeleton skeleton-sm w-6"></div>
                    <div class="skeleton skeleton-sm w-6 opacity-40"></div>
                </div>
            `;
            forecastContainer.appendChild(row);
        }
    }

    // 4. Chart Skeleton (hides canvas to show shimmer behind it)
    const chartCanvas = document.getElementById('hourly-chart');
    if (chartCanvas) chartCanvas.style.opacity = '0';
}

updateGreeting();

mylocationButton.addEventListener('click', () => {

    showToast('Fetching your location...', 'info');
    //fetching Location Toast should be here 
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
            testconnection(`${latitude},${longitude}`);
            showToast('Location fetched successfully!', 'success');

            //location fetching success toast should be here
        }, error => {
            console.error('Error getting location:', error);
            showToast('Error fetching location. Please try again.', 'error');
            //location fetching error toast should be here
            alert('Unable to retrieve your location. Please allow location access and try again.');
        });
    } else {
        // toast for geolocation not supported should be here
        alert('Geolocation is not supported by this browser.');
    }
});

function debounce(func, delay = 500) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


function triggerSearch() {
    const city = cityInput.value.trim();
    if (city) {
        testconnection(city);
    }
}

cityInput.addEventListener('input', debounce((e) => {
    const city = e.target.value.trim();
    if (city) {
        testconnection(city);
    }
}));

cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        triggerSearch();
    }
});

if (searchButton) {
    searchButton.addEventListener('click', triggerSearch);
}

let hourlyChart = null; // Variable to store the chart instance
let currentHoursData = null; // Store hours data globally to redraw on theme switch

function initChart(hours) {
    const canvas = document.getElementById('hourly-chart');
    const ctx = canvas.getContext('2d');
    canvas.style.opacity = '1';

    // Destroy existing chart if it exists
    if (hourlyChart) {
        hourlyChart.destroy();
    }

    // Extract labels (time) and data (temperature)
    const labels = hours.map(h => h.time.split(' ')[1]); 
    const data = hours.map(h => h.temp_c);

    const isDark = document.documentElement.classList.contains('dark');
    ctx.canvas.style.backgroundColor = isDark ? 'rgba(8, 16, 34, 0.95)' : 'rgba(248, 252, 255, 0.95)';
    const primaryTextColor = isDark ? '#94a3b8' : '#3d6578'; // Match theme's muted/secondary text color
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(2, 132, 199, 0.08)';
    const accentColor = isDark ? '#38bdf8' : '#0284c7';

    // Create a beautiful gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 240);
    if (isDark) {
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
        gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.06)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(2, 132, 199, 0.18)');
        gradient.addColorStop(0.5, 'rgba(2, 132, 199, 0.05)');
        gradient.addColorStop(1, 'rgba(2, 132, 199, 0)');
    }

    // Create new chart
    hourlyChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels.map((time) => time.replace(':00', 'h')), // Format time to "1h", "2h", etc.   
            datasets: [{
                label: 'Temperature (°C)',
                data: data,
                borderColor: accentColor,
                borderWidth: 2.5,
                pointBackgroundColor: accentColor,
                pointBorderColor: isDark ? '#0b1527' : '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: 3,
                pointHoverRadius: 5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { 
                    display: true, 
                    labels: { 
                        color: primaryTextColor,
                        font: { family: 'Inter', size: 11, weight: '600' }
                    } 
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(13, 22, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDark ? '#f1f5f9' : '#07202f',
                    bodyColor: isDark ? '#cbd5e1' : '#14405e',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(2, 132, 199, 0.15)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                y: { 
                    grid: { color: gridColor },
                    border: { display: false },
                    ticks: { 
                        color: primaryTextColor,
                        font: { family: 'Inter', size: 10, weight: '500' }
                    } 
                },
                x: { 
                    grid: { display: false },
                    border: { display: false },
                    ticks: { 
                        color: primaryTextColor,
                        font: { family: 'Inter', size: 10, weight: '500' },
                        autoSkip: true,
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        minRotation: 0
                    } 
                }
            }
        }
    });
}


function firstload() {
    let defaultCity = 'Karachi';
    testconnection(defaultCity);

}
firstload(); 


async function testconnection(city) {
        
        if (!city) {
            console.error('City name is required to fetch weather data.');
            return;
        }

        showSkeletons();

            try {
                const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=5&aqi=yes&alerts=no` );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
            // Error handling toast should be here
        }
        const data = await response.json();
        console.log(data);
        updateUI(data);
        renderFavCities();

    } catch (error) {
        showToast('Error fetching weather data. Please try again.', 'error');

        console.error('Error fetching weather data:', error);
        // Error handling toast should be here
    }

    
    
}




function updateUI(data) {
    const isDark = document.documentElement.classList.contains('dark');

    // 1. Update Temperature and Condition
    document.getElementById('temp').innerText = `${Math.round(data.current.temp_c)}°C`;
    document.getElementById('feelslike').innerText = `Feels like ${Math.round(data.current.feelslike_c)}°C`;
    document.getElementById('condition').innerText = data.current.condition.text;
    document.getElementById('location').innerText = `${data.location.name}, ${data.location.country}`;
    
    // 2. Update Weather Stats (Humidity, Wind, etc.)
    document.getElementById('humidity').innerText = `${data.current.humidity}%`;
    document.getElementById('wind').innerText = `${data.current.wind_kph} km/h`;
    document.getElementById('sunrise').innerText = data.forecast.forecastday[0].astro.sunrise;
    document.getElementById('sunset').innerText = data.forecast.forecastday[0].astro.sunset;
    document.getElementById('current-time').innerText = data.location.localtime;
    updateGreeting(data.location.localtime);

    // Sync heart icon favorite state for loaded city
    const cityName = data.location.name.trim().toLowerCase();
    isFavorite = favcities.includes(cityName);
    if (isFavorite) {
        heartIcon.classList.remove("fa-regular");
        heartIcon.classList.add("fa-solid", "text-red-500");
    } else {
        heartIcon.classList.remove("fa-solid", "text-red-500");
        heartIcon.classList.add("fa-regular");
    }

    // 3. Update Forecast list
    forecastContainer.innerHTML = ""; // Clear previous forecast including skeletons
    data.forecast.forecastday.forEach(day => {
        const forecastCard = document.createElement('div');
        forecastCard.className = 'flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-stat)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)] hover:translate-x-1 transition-all duration-200';
        forecastCard.innerHTML = `
            <img src="https:${day.day.condition.icon.replace('64x64', '128x128')}" alt="${day.day.condition.text}" class="w-9 h-9 shrink-0 drop-shadow-[0_3px_6px_rgba(2,132,199,0.15)] dark:drop-shadow-[0_3px_6px_rgba(56,189,248,0.15)]">
            <div class="flex flex-col flex-1 min-w-0 gap-0.5">
                <span class="text-[0.8rem] font-bold text-[var(--text-secondary)]">
                    ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span class="text-[0.72rem] text-[var(--text-muted)] font-medium truncate">
                    ${day.day.condition.text}
                </span>
            </div>
            <div class="flex items-center gap-2 text-right shrink-0">
                <span class="text-xs font-extrabold text-[var(--text-primary)] min-w-[28px]">${Math.round(day.day.maxtemp_c)}°</span>
                <span class="text-[0.65rem] font-semibold text-[var(--text-muted)] min-w-[24px]">${Math.round(day.day.mintemp_c)}°</span>
            </div>
        `;
        forecastContainer.appendChild(forecastCard);
    });
    
    // 4. Update Main Weather Icon (image from the API with glow filter)
    const iconUrl = data.current.condition.icon.replace('64x64', '128x128');
    const shadowClass = isDark ? 'drop-shadow-[0_8px_24px_rgba(56,189,248,0.4)]' : 'drop-shadow-[0_8px_24px_rgba(2,132,199,0.3)]';
    document.getElementById('weather-icon').innerHTML = `
        <img src="https:${iconUrl}" alt="weather" class="w-full h-full object-contain filter ${shadowClass} transition-all duration-300 hover:scale-105">
    `;

    currentHoursData = data.forecast.forecastday[0].hour;
    initChart(currentHoursData);

    // Smoothly scroll back to the top of the dashboard on mobile/tablet viewports
    if (window.innerWidth < 1024) {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}
let favcities = JSON.parse(localStorage.getItem('favcities')) || [];

// -------------------------
// SAVE TO LOCALSTORAGE
// -------------------------
function saveFavCities() {
    localStorage.setItem('favcities', JSON.stringify(favcities));
    // You can also add a toast here to indicate that the favorites have been updated
}

// -------------------------
// ADD CITY (LOGIC ONLY)
// -------------------------
function addCity(city, silent = false) {
    city = city.trim().toLowerCase();

    if (!city) {
        showToast('Please enter a valid city name.', 'warning');
        return;
    }
    if (favcities.includes(city)) {
        if (!silent) showToast(`${city.charAt(0).toUpperCase() + city.slice(1)} is already in favorites.`, 'info');
        return;
    }

    favcities.push(city);
    if (!silent) showToast(`${city.charAt(0).toUpperCase() + city.slice(1)} added to favorites!`, 'success');
    saveFavCities();
    renderFavCities();
}

// -------------------------
// REMOVE CITY (LOGIC ONLY)
// -------------------------
function removeCity(city) {
    favcities = favcities.filter(c => c !== city);
    const label = city.charAt(0).toUpperCase() + city.slice(1);
    showToast(`${label} removed from favorites.`, 'info');
    saveFavCities();
    renderFavCities();
}

// -------------------------
// CREATE CHIP (UI ONLY)
// -------------------------
function addFavoriteChip(city) {
    const chip = document.createElement("div");

    chip.className = "relative flex items-center gap-2 pl-3.5 pr-2.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-stat)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm group hover:shadow-[var(--shadow-glow)]";

    const formattedCityName = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    chip.innerHTML = `
        <!-- Heart Icon -->
        <i class="fa-solid fa-heart text-red-500 text-[10px] flex-shrink-0 opacity-80 group-hover:scale-110 transition-transform"></i>

        <!-- City Name (click queries the API) -->
        <span
            class="text-xs font-semibold select-none pr-1 truncate max-w-[120px]"
            onclick="testconnection('${city.replace(/'/g, "\\'")}')"
        >
            ${formattedCityName}
        </span>

        <!-- Remove Button -->
        <button
            class="remove-btn
                   w-4 h-4
                   rounded-full
                   bg-[var(--border-strong)]
                   text-[var(--text-secondary)]
                   hover:bg-red-500 hover:text-white
                   text-[9px]
                   flex items-center justify-center
                   opacity-70 hover:opacity-100
                   transition-all duration-150"
            title="Remove ${formattedCityName}"
        >
            ✕
        </button>
    `;

    const removeBtn = chip.querySelector(".remove-btn");
    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        chip.style.opacity = "0";
        chip.style.transform = "scale(0.9)";
        chip.style.transition = "all 0.2s ease";

        setTimeout(() => {
            removeCity(city);
        }, 180);
    });

    favoritesList.appendChild(chip);
}

// -------------------------
// RENDER UI FROM STORAGE
// -------------------------
function renderFavCities() {
    favoritesList.innerHTML = "";

    favcities.forEach(city => {
        addFavoriteChip(city);
    });
}

// -------------------------
// ADD BUTTON (PROMPT)
// -------------------------
addFavButton.addEventListener('click', () => {
    const favoriteCity = prompt('Enter city name:').trim().toLowerCase();

    if (favoriteCity) {
        addCity(favoriteCity);
    }
});




const heartIcon = document.getElementById("heart-icon");

let isFavorite = false;

heartIcon.addEventListener("click", () => {
    isFavorite = !isFavorite;
    const cityName = document.getElementById('location').innerText.split(',')[0].trim();

    if (isFavorite) {
        heartIcon.classList.remove("fa-regular");
        heartIcon.classList.add("fa-solid", "text-red-500");
        addCity(cityName); // toast handled inside addCity
    } else {
        heartIcon.classList.remove("fa-solid", "text-red-500");
        heartIcon.classList.add("fa-regular");
        removeCity(cityName.toLowerCase()); // toast handled inside removeCity
    }
});

