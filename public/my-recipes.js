// Elements specific to the my-recipes page
const confirmModalContainer = document.getElementById('confirm-modal-container');
const confirmModalContent = document.getElementById('confirm-modal-content');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalBody = document.getElementById('confirm-modal-body');
const confirmOkButton = document.getElementById('confirm-ok-button');
const confirmCancelButton = document.getElementById('confirm-cancel-button');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

// --- THEME LOGIC (Shared across pages) ---
const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleIcon.classList.remove('fa-sun');
        themeToggleIcon.classList.add('fa-moon');
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

themeToggle.addEventListener('click', toggleTheme);

// --- SAVED RECIPES LOGIC ---

// Function to show a custom confirmation dialog
function showConfirmation(title, message, onConfirm) {
    confirmModalTitle.textContent = title;
    confirmModalBody.textContent = message;

    const hideConfirm = () => {
        confirmModalContainer.classList.remove('opacity-100', 'pointer-events-auto');
        confirmModalContainer.classList.add('opacity-0', 'pointer-events-none');
        confirmModalContent.classList.remove('scale-100');
        confirmModalContent.classList.add('scale-95');
    };

    confirmOkButton.onclick = () => {
        onConfirm();
        hideConfirm();
    };
    confirmCancelButton.onclick = hideConfirm;

    confirmModalContainer.classList.remove('opacity-0', 'pointer-events-none');
    confirmModalContainer.classList.add('opacity-100', 'pointer-events-auto');
    confirmModalContent.classList.remove('scale-95');
    confirmModalContent.classList.add('scale-100');
}

// Function to remove a saved recipe from local storage
function removeRecipe(key) {
    const elementToRemove = document.querySelector(`.saved-recipe-item[data-key="${key}"]`);
    showConfirmation("Confirm Deletion", "Are you sure you want to remove this recipe? This action cannot be undone.", () => {
        if (elementToRemove) {
            elementToRemove.classList.add('removing');
            // Wait for the animation to finish before removing from DOM and localStorage
            setTimeout(() => {
                localStorage.removeItem(key);
                displaySavedRecipes(); // Redraw the list to handle the "no saved recipes" message
            }, 400); // Match the transition duration
        }
    });
}

// Function to display saved recipes in the list
function displaySavedRecipes(filterTag = null) {
    const savedRecipesList = document.getElementById('saved-recipes-list');
    const filterTagsContainer = document.getElementById('filter-tags');
    const filterContainer = document.getElementById('filter-container');
    savedRecipesList.innerHTML = ''; // Clear existing list

    const recipes = [];
    const allTags = new Set();

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('recipe-')) {
            const data = JSON.parse(localStorage.getItem(key));
            recipes.push({ key, data });
            // Collect all tags for the filter UI
            if (data.tags && data.tags.length > 0) {
                data.tags.forEach(tag => allTags.add(tag));
            }
        }
    }

    // Sort recipes by date, newest first
    recipes.sort((a, b) => b.key.localeCompare(a.key));

    // --- Build Filter UI ---
    filterTagsContainer.innerHTML = ''; // Clear old tags
    if (allTags.size > 0) {
        filterContainer.style.display = 'block';

        // "All" button
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.className = `px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${!filterTag ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        allButton.onclick = () => displaySavedRecipes(null);
        filterTagsContainer.appendChild(allButton);

        // Buttons for each tag
        allTags.forEach(tag => {
            const tagButton = document.createElement('button');
            tagButton.textContent = tag;
            tagButton.className = `px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 capitalize ${filterTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
            tagButton.onclick = () => displaySavedRecipes(tag);
            filterTagsContainer.appendChild(tagButton);
        });
    } else {
        filterContainer.style.display = 'none';
    }

    // --- Filter and Display Recipes ---
    const filteredRecipes = filterTag ? recipes.filter(r => r.data.tags && r.data.tags.includes(filterTag)) : recipes;

    if (filteredRecipes.length === 0) {
        if (recipes.length === 0) {
            savedRecipesList.innerHTML = '<p class="text-gray-500 text-center py-4">You have no saved recipes yet. Go to the Generator to create and save one!</p>';
        } else {
            savedRecipesList.innerHTML = `<p class="text-gray-500 text-center py-4">No recipes found with the tag "${filterTag}".</p>`;
        }
        return;
    }

    filteredRecipes.forEach(recipe => {
        const recipeElement = document.createElement('div');
        recipeElement.dataset.key = recipe.key;
        recipeElement.className = 'saved-recipe-item p-4 rounded-lg bg-gray-100 border border-gray-200';

        const tagsHtml = (recipe.data.tags && recipe.data.tags.length > 0)
            ? `<div class="flex flex-wrap gap-2 mt-3">${recipe.data.tags.map(tag => `<span class="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full capitalize">${tag}</span>`).join('')}</div>`
            : '';

        recipeElement.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-700">${recipe.data.title}</span>
                <div class="space-x-2 flex-shrink-0">
                    <a href="recipe.html?id=${recipe.key}" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 text-sm">View</a>
                    <button onclick="removeRecipe('${recipe.key}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 text-sm">Remove</button>
                </div>
            </div>
            ${tagsHtml}
        `;
        savedRecipesList.appendChild(recipeElement);
    });
}

// --- INITIALIZATION ---
window.onload = () => {
    initializeTheme();
    displaySavedRecipes();
    document.getElementById('current-year').textContent = new Date().getFullYear();
};