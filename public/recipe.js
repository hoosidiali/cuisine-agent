// recipe.js

const recipeOutput = document.getElementById('recipe-output');
const copyRecipeButton = document.getElementById('copy-recipe-button');
const copyButtonText = document.getElementById('copy-button-text');
const printRecipeButton = document.getElementById('print-recipe-button');
const saveRecipeButton = document.getElementById('save-recipe-button');
const saveButtonText = document.getElementById('save-button-text');
const modalContainer = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalContent = document.getElementById('modal-content');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const tagEditorContainer = document.getElementById('tag-editor-container');
const tagModalContainer = document.getElementById('tag-modal-container');
const tagModalContent = document.getElementById('tag-modal-content');
const tagInput = document.getElementById('tag-input');
const suggestedTagsContainer = document.getElementById('suggested-tags');
const tagModalCancel = document.getElementById('tag-modal-cancel');
const tagModalSave = document.getElementById('tag-modal-save');

// A global variable to hold the currently displayed recipe object
let currentRecipe = null;

// Function to extract query parameters from the URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to load and display the recipe
function loadRecipe() {
    const recipeId = getQueryParam('id');
    if (!recipeId) {
        document.getElementById('recipe-output').innerHTML = '<p class="text-red-500">No recipe ID specified.</p>';
        return;
    }

    let isUserSaved = false;
    const savedRecipeData = localStorage.getItem(recipeId);

    if (savedRecipeData) {
        // It's a user-saved recipe
        currentRecipe = JSON.parse(savedRecipeData);
        isUserSaved = true;
    } else if (typeof curatedRecipes !== 'undefined') {
        // It might be a curated recipe, check the data.js source
        currentRecipe = curatedRecipes.find(r => r.id === recipeId);
    }

    if (currentRecipe && currentRecipe.content) {
        recipeOutput.innerHTML = currentRecipe.content;

        // Enable and show the action buttons
        copyRecipeButton.disabled = false;
        copyRecipeButton.classList.remove('hidden');
        printRecipeButton.disabled = false;
        printRecipeButton.classList.remove('hidden');

        // Only show the "Save" button if it's a curated recipe (not already saved by the user)
        if (!isUserSaved) {
            saveRecipeButton.disabled = false;
            saveRecipeButton.classList.remove('hidden');
        }

    } else {
        recipeOutput.innerHTML = '<p class="text-red-500 text-center">Recipe not found.</p>';
    }
}

// --- ACTION BUTTON LOGIC (Copied and adapted from script.js) ---

function showMessage(title, message, isError = true) {
    modalTitle.textContent = title;
    modalBody.textContent = message;
    const button = modalContent.querySelector('button');
    if (isError) {
        modalTitle.className = 'text-2xl font-bold mb-4 text-red-600';
        button.className = 'w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition';
    } else {
        modalTitle.className = 'text-2xl font-bold mb-4 text-blue-600';
        button.className = 'w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition';
    }
    modalContainer.classList.remove('opacity-0', 'pointer-events-none');
    modalContainer.classList.add('opacity-100', 'pointer-events-auto');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
}

function hideMessage() {
    modalContainer.classList.remove('opacity-100', 'pointer-events-auto');
    modalContainer.classList.add('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
}

async function copyRecipe() {
    const recipeText = recipeOutput.textContent;
    if (!recipeText.trim()) return;
    try {
        await navigator.clipboard.writeText(recipeText);
        copyButtonText.textContent = 'Copied!';
        copyRecipeButton.classList.add('bg-blue-500', 'text-white');
        setTimeout(() => {
            copyButtonText.textContent = 'Copy';
            copyRecipeButton.classList.remove('bg-blue-500', 'text-white');
        }, 2000);
    } catch (err) {
        showMessage("Copy Failed", "Could not copy the recipe to clipboard.", true);
    }
}

function printRecipe() {
    if (!recipeOutput.textContent.trim()) return;
    window.print();
}

// Helper function to auto-generate tags from recipe content
function generateTags(title, content) {
    const tags = new Set();
    const fullText = `${title.toLowerCase()} ${content.toLowerCase()}`;

    // Define keyword-to-tag mappings
    const tagMap = {
        'vegetarian': ['vegetarian', 'veggie', 'plant-based'],
        'vegan': ['vegan'],
        'spicy': ['spicy', 'chili', 'cayenne', 'hot'],
        'dessert': ['dessert', 'sweet', 'cake', 'pie', 'cookie'],
        'quick-meal': ['quick', 'easy', '15-minute', '30-minute'],
        'chicken': ['chicken'], 'beef': ['beef'], 'pork': ['pork'], 'lamb': ['lamb'], 'fish': ['fish', 'salmon']
    };

    for (const [tag, keywords] of Object.entries(tagMap)) {
        if (keywords.some(keyword => fullText.includes(keyword))) tags.add(tag);
    }
    return Array.from(tags);
}

// --- Tag Editor Logic ---
let currentTags = new Set();

function renderTags() {
    // Clear all children except the input field
    while (tagEditorContainer.firstChild && tagEditorContainer.firstChild !== tagInput) {
        tagEditorContainer.removeChild(tagEditorContainer.firstChild);
    }

    currentTags.forEach(tag => {
        const tagPill = document.createElement('span');
        tagPill.className = 'flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full';
        tagPill.innerHTML = `
            ${tag}
            <button type="button" class="ml-2 text-blue-600 hover:text-blue-800" onclick="removeTag('${tag}')">
                <i class="fas fa-times-circle text-xs"></i>
            </button>
        `;
        tagEditorContainer.insertBefore(tagPill, tagInput);
    });
}

function addTag(tag) {
    const cleanedTag = tag.trim().toLowerCase();
    if (cleanedTag && !currentTags.has(cleanedTag)) {
        currentTags.add(cleanedTag);
        renderTags();
    }
    tagInput.value = '';
}

function removeTag(tag) {
    currentTags.delete(tag);
    renderTags();
}
// --- End Tag Editor Logic ---

// Function to initiate the save process by showing the tag modal
function showTagModal() {
    if (!currentRecipe) {
        showMessage("Cannot Save", "There is no recipe data to save.", true);
        return;
    }

    // Check if this exact recipe content is already saved
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('recipe-')) {
            const savedRecipe = JSON.parse(localStorage.getItem(key));
            if (savedRecipe && savedRecipe.content === currentRecipe.content) {
                showMessage("Already Saved", "This recipe is already in your favorites.", false);
                return;
            }
        }
    }

    // Auto-generate tag suggestions
    const suggestedTags = generateTags(currentRecipe.title, recipeOutput.textContent);

    // Populate and show the modal
    currentTags.clear();
    renderTags();
    suggestedTagsContainer.innerHTML = '';
    suggestedTags.forEach(tag => {
        const tagButton = document.createElement('button');
        tagButton.textContent = tag;
        tagButton.className = 'px-3 py-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors duration-200 text-sm capitalize';
        tagButton.onclick = () => addTag(tag);
        suggestedTagsContainer.appendChild(tagButton);
    });

    tagModalContainer.classList.remove('opacity-0', 'pointer-events-none');
    tagModalContainer.classList.add('opacity-100', 'pointer-events-auto');
    tagModalContent.classList.remove('scale-95');
    tagModalContent.classList.add('scale-100');

    // Set up the save button for this specific recipe
    tagModalSave.onclick = finalizeSave;
}

function hideTagModal() {
    tagModalContainer.classList.remove('opacity-100', 'pointer-events-auto');
    tagModalContainer.classList.add('opacity-0', 'pointer-events-none');
    tagModalContent.classList.remove('scale-100');
    tagModalContent.classList.add('scale-95');
}

// Finalizes the save process after user input from the modal
function finalizeSave() {
    // Add any final text in the input as a tag
    addTag(tagInput.value);
    
    const recipeKey = 'recipe-' + Date.now();
    const recipeData = {
        title: currentRecipe.title,
        content: currentRecipe.content,
        tags: Array.from(currentTags) // Use the state from the tag editor
    };
    localStorage.setItem(recipeKey, JSON.stringify(recipeData));
    hideTagModal();

    saveButtonText.textContent = 'Saved!';
    saveRecipeButton.disabled = true;
    saveRecipeButton.classList.add('bg-blue-500', 'text-white');

    // Optional: Redirect to My Recipes page after saving
    setTimeout(() => {
        window.location.href = '/my-recipes.html';
    }, 1000);
}

// --- THEME LOGIC ---

// Function to apply the theme from local storage
function applyTheme(theme) {
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
}

// Function to initialize the theme based on local storage or system preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    let theme = 'light'; // Default theme
    if (savedTheme) {
        theme = savedTheme;
    } else if (prefersDark) {
        theme = 'dark';
    }

    applyTheme(theme);
}

const toggleTheme = () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
};

// Load current year to the footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// On page load, initialize the theme and load the correct recipe
window.onload = () => {
    initializeTheme();
    loadRecipe();

    // Add event listener for theme toggle after functions are defined
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Add event listeners for new modal
    if (tagModalCancel) {
        tagModalCancel.addEventListener('click', hideTagModal);
    }
    if (saveRecipeButton) {
        saveRecipeButton.addEventListener('click', showTagModal);
    }

    tagInput.addEventListener('keydown', (e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission or typing a comma
            addTag(tagInput.value);
        } else if (e.key === 'Backspace' && tagInput.value === '' && currentTags.size > 0) {
            // Remove the last tag on backspace if input is empty
            const lastTag = Array.from(currentTags).pop();
            removeTag(lastTag);
        }
    });
};