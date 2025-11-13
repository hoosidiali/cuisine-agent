// Elements specific to the our-recipes page
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

// --- THEME LOGIC (Shared across pages) ---
const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (themeToggleIcon) {
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    } else {
        document.documentElement.classList.remove('dark');
        if (themeToggleIcon) {
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
        }
    }
    localStorage.setItem('theme', theme);
};

const toggleTheme = () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
};

const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
};

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// --- CURATED RECIPES LOGIC ---

function displayCuratedRecipes() {
    const grid = document.getElementById('curated-recipes-grid');
    if (!grid) return;

    grid.innerHTML = ''; // Clear placeholder content

    curatedRecipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col group';

        card.innerHTML = `
            <div class="p-6 flex-grow">
                <h3 class="text-xl font-bold text-gray-800 mb-2">${recipe.title}</h3>
                <p class="text-gray-600 text-sm flex-grow">${recipe.description}</p>
            </div>
            <div class="p-6 bg-gray-50">
                <a href="recipe.html?id=${recipe.id}" class="w-full text-center block bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200">View Recipe</a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- INITIALIZATION ---
window.onload = () => {
    initializeTheme();
    displayCuratedRecipes();
    document.getElementById('current-year').textContent = new Date().getFullYear();
};