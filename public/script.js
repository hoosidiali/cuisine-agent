// Global Variables
// NOTE: When running locally, you must provide your own API key in this script.
// The API key has been moved to a secure backend proxy.
// The frontend now calls our own server, which then calls the Gemini API.
const PROXY_API_URL = "/api/generate";

const recipeOutput = document.getElementById('recipe-output');
const combineButton = document.getElementById('combine-button'); // This is used in an onclick in HTML, so it's fine to keep it here if we don't refactor that.
const buttonText = document.getElementById('button-text');
const loadingSpinner = document.getElementById('loading-spinner');
const modalContainer = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title'); // Correctly a const
const modalBody = document.getElementById('modal-body'); // Correctly a const
const modalContent = document.getElementById('modal-content'); // Correctly a const
const copyRecipeButton = document.getElementById('copy-recipe-button');
const copyButtonText = document.getElementById('copy-button-text');
const printRecipeButton = document.getElementById('print-recipe-button');
const printButtonText = document.getElementById('print-button-text');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const historyContainer = document.getElementById('history-container');
const historyList = document.getElementById('history-list');
const tagEditorContainer = document.getElementById('tag-editor-container');
const tagModalContainer = document.getElementById('tag-modal-container');
const tagModalContent = document.getElementById('tag-modal-content');
const tagInput = document.getElementById('tag-input');
const suggestedTagsContainer = document.getElementById('suggested-tags');
const tagModalCancel = document.getElementById('tag-modal-cancel');
const tagModalSave = document.getElementById('tag-modal-save');

const exampleRecipes = [
    {
        name: "Tandoori Shepherd's Pie",
        recipe1: `Shepherd's Pie Ingredients:\n- 1 lb ground lamb\n- 1 large onion, chopped\n- 2 carrots, diced\n- 1 cup frozen peas\n- 2 tbsp tomato paste\n- 1 cup beef broth\n- 4 large potatoes, peeled and cubed\n- 1/4 cup milk\n- 2 tbsp butter`,
        recipe2: `Tandoori Marinade:\n- 1 cup plain yogurt\n- 2 tbsp lemon juice\n- 1 tbsp grated ginger\n- 1 tbsp minced garlic\n- 2 tsp garam masala\n- 1 tsp turmeric\n- 1 tsp cayenne pepper\n- 1 tsp ground cumin`
    },
    {
        name: "Kimchi Carbonara",
        recipe1: `Spaghetti Carbonara:\n- 200g spaghetti\n- 100g pancetta, diced\n- 2 large eggs\n- 50g grated Pecorino Romano cheese\n- Black pepper`,
        recipe2: `Kimchi & Gochujang:\n- 1/2 cup chopped kimchi\n- 1 tbsp gochujang (Korean chili paste)\n- 1 tsp sesame oil`
    }
];

// Theme Toggling Logic
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

// Function to show custom message box (instead of alert)
const saveRecipeButton = document.getElementById('save-recipe-button');
const saveButtonText = document.getElementById('save-button-text');
function showMessage(title, message, isError = true) {
    modalTitle.textContent = title;
    modalBody.textContent = message;

    const button = modalContent.querySelector('button');
    if (isError) {
        modalTitle.className = 'text-xl font-bold mb-3 text-red-600';
        button.className = 'w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition';
    } else {
        modalTitle.className = 'text-xl font-bold mb-3 text-green-600';
        button.className = 'w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition'; // Use brand color for success
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

// Function to copy the generated recipe to clipboard
async function copyRecipe() {
    const recipeText = recipeOutput.textContent; // Get plain text content
    if (!recipeText.trim()) {
        showMessage("Nothing to Copy", "There is no recipe generated yet to copy.", false); // Not an error, just info
        return;
    }

    try {
        await navigator.clipboard.writeText(recipeText);
        copyButtonText.textContent = 'Copied!';
        copyRecipeButton.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        copyRecipeButton.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600');
        setTimeout(() => {
            copyButtonText.textContent = 'Copy';
            copyRecipeButton.classList.remove('bg-blue-500', 'text-white', 'hover:bg-blue-600');
            copyRecipeButton.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy recipe: ', err);
        showMessage("Copy Failed", "Could not copy the recipe to clipboard. Please try again or copy manually.", true);
    }
}

// Function to print the generated recipe
function printRecipe() {
    if (!recipeOutput.textContent.trim()) {
        showMessage("Nothing to Print", "There is no recipe generated yet to print.", false);
        return;
    }

    // Trigger browser print dialog
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
    const recipeTitle = document.querySelector('#recipe-output h1')?.textContent;
    const recipeContent = recipeOutput.innerHTML;

    if (!recipeTitle || !recipeContent) {
        showMessage("Cannot Save", "No recipe has been generated yet.", true);
        return;
    }

    // Check if this exact recipe content is already saved
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('recipe-')) {
            const savedRecipe = JSON.parse(localStorage.getItem(key));
            if (savedRecipe && savedRecipe.content === recipeContent) {
                showMessage("Already Saved", "This recipe is already in your favorites.", false);
                return; // Exit the function to prevent re-saving
            }
        }
    }

    // Auto-generate tag suggestions
    const suggestedTags = generateTags(recipeTitle, recipeOutput.textContent);
    
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
    tagModalSave.onclick = () => finalizeSave(recipeTitle, recipeContent);
}

function hideTagModal() {
    tagModalContainer.classList.remove('opacity-100', 'pointer-events-auto');
    tagModalContainer.classList.add('opacity-0', 'pointer-events-none');
    tagModalContent.classList.remove('scale-100');
    tagModalContent.classList.add('scale-95');
}

// Finalizes the save process after user input from the modal
function finalizeSave(recipeTitle, recipeContent) {
    // Add any final text in the input as a tag
    addTag(tagInput.value);
    
    const recipeKey = 'recipe-' + Date.now(); // Unique key
    const recipeData = {
        title: recipeTitle,
        content: recipeContent,
        tags: Array.from(currentTags) // Use the state from the tag editor
    };
    localStorage.setItem(recipeKey, JSON.stringify(recipeData));
    hideTagModal();

    saveButtonText.textContent = 'Saved!';
    saveRecipeButton.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
    saveRecipeButton.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600');
    setTimeout(() => {
        saveButtonText.textContent = 'Save';
        saveRecipeButton.classList.remove('bg-blue-500', 'text-white', 'hover:bg-blue-600');
        saveRecipeButton.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
    }, 2000); // The visual feedback is on the button, not its text

    // We no longer display saved recipes on this page
}

// --- HISTORY LOGIC ---
const MAX_HISTORY_ITEMS = 5;

function addToHistory(recipeData) {
    let history = JSON.parse(sessionStorage.getItem('recipeHistory')) || [];
    // Add new recipe to the beginning of the array
    history.unshift(recipeData);
    // Keep the history list to a maximum size
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }
    sessionStorage.setItem('recipeHistory', JSON.stringify(history));
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(sessionStorage.getItem('recipeHistory')) || [];
    if (history.length === 0) {
        historyContainer.classList.add('hidden');
        return;
    }

    historyContainer.classList.remove('hidden');
    historyList.innerHTML = '';

    history.forEach((recipe, index) => {
        const item = document.createElement('button');
        item.className = 'w-full text-left text-sm text-blue-600 hover:underline';
        item.innerHTML = `<i class="fas fa-caret-right mr-2"></i> ${recipe.title}`;
        item.onclick = () => loadFromHistory(index);
        historyList.appendChild(item);
    });
}

function loadFromHistory(index) {
    const history = JSON.parse(sessionStorage.getItem('recipeHistory')) || [];
    const recipeData = history[index];

    if (recipeData) {
        recipeOutput.innerHTML = recipeData.content;

        // Restore the original input recipes
        document.getElementById('recipe1').value = recipeData.recipe1;
        document.getElementById('recipe2').value = recipeData.recipe2;

        // Enable and show action buttons
        copyRecipeButton.disabled = false;
        copyRecipeButton.classList.remove('hidden');
        printRecipeButton.disabled = false;
        printRecipeButton.classList.remove('hidden');
        saveRecipeButton.disabled = false;
        saveRecipeButton.classList.remove('hidden');

        recipeOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Function to load a saved recipe from local storage
function loadRecipe(key) {
    const recipeData = JSON.parse(localStorage.getItem(key));
    if (recipeData) {
        recipeOutput.innerHTML = recipeData.content;
        copyRecipeButton.disabled = false;
        copyRecipeButton.classList.remove('hidden');
        printRecipeButton.disabled = false;
        printRecipeButton.classList.remove('hidden');
        saveRecipeButton.disabled = false;
        saveRecipeButton.classList.remove('hidden');
        // shareRecipeButton.disabled = false;
        // shareRecipeButton.classList.remove('hidden');
        recipeOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        showMessage("Error Loading", "Could not load the saved recipe.", true);
    }
}

// Function to load an example recipe into the textareas
function loadExample(index) {
    if (exampleRecipes[index]) {
        document.getElementById('recipe1').value = exampleRecipes[index].recipe1;
        document.getElementById('recipe2').value = exampleRecipes[index].recipe2;
    }
}

// Function to display example recipe buttons
function displayExampleRecipes() {
    const exampleList = document.getElementById('example-recipes-list');
    exampleList.innerHTML = '';
    exampleRecipes.forEach((recipe, index) => {
        const button = document.createElement('button');
        button.textContent = recipe.name;
        button.className = 'px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200 text-sm font-medium';
        button.onclick = () => loadExample(index);
        exampleList.appendChild(button);
    });
}

// Function to load the initial example recipe on page load
function loadInitialView() {
    // Use the first recipe from our curated data source as the initial view
    const initialRecipe = curatedRecipes[0];

    // Pre-fill the text areas
    document.getElementById('recipe1').value = initialRecipe.recipe1;
    document.getElementById('recipe2').value = initialRecipe.recipe2;

    // Display the pre-generated recipe
    recipeOutput.innerHTML = initialRecipe.content;

    // Enable and show the action buttons
    copyRecipeButton.disabled = false;
    copyRecipeButton.classList.remove('hidden');
    printRecipeButton.disabled = false;
    printRecipeButton.classList.remove('hidden');
    saveRecipeButton.disabled = false;
    saveRecipeButton.classList.remove('hidden');
}

// Event Listeners for new modal
tagModalCancel.addEventListener('click', hideTagModal);
saveRecipeButton.addEventListener('click', showTagModal);
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

// On page load, initialize features for the main page
document.addEventListener('DOMContentLoaded', () => {
    displayExampleRecipes();
    displayHistory();
    initializeTheme();

    // Check if we need to load a recipe from the 'My Recipes' page
    const recipeKeyToLoad = sessionStorage.getItem('loadRecipeKey');
    if (recipeKeyToLoad) {
        loadRecipe(recipeKeyToLoad);
        sessionStorage.removeItem('loadRecipeKey'); // Clean up after loading
    } else {
        // Otherwise, load the default initial view
        loadInitialView();
    }
    document.getElementById('current-year').textContent = new Date().getFullYear();
});

/**
 * Parses the generated Markdown, extracts a custom metadata block,
 * and converts the rest of the Markdown to HTML using the 'marked' library.
 */
function markdownToHtml(markdown) {
    let remainingMarkdown = markdown;

    let metadataHtml = '';
    // Regex to find the "Recipe Overview" paragraph and extract it.
    const metadataRegex = /^(Prep Time:.*?Cook Time:.*?Servings:.*?)$/im;
    const metadataMatch = markdown.match(metadataRegex);

    if (metadataMatch) {
        const metadataBlock = metadataMatch[0];
        // Extract details for structured HTML
        const prepTimeMatch = metadataBlock.match(/Prep Time:? *([\s\S]*?)(Cook Time:|Servings:|$)/i);
        const cookTimeMatch = metadataBlock.match(/Cook Time:? *([\s\S]*?)(Servings:|$)/i);
        const servingsMatch = metadataBlock.match(/Servings:? *([\s\S]*?)$/i);

        const metadataItems = [
            { label: 'Prep', icon: 'hourglass-start', value: prepTimeMatch ? prepTimeMatch[1].trim().replace(/,$/, '') : 'N/A' },
            { label: 'Cook', icon: 'hourglass-half', value: cookTimeMatch ? cookTimeMatch[1].trim().replace(/,$/, '') : 'N/A' },
            { label: 'Servings', icon: 'users', value: servingsMatch ? servingsMatch[1].trim() : 'N/A' },
        ];

        metadataHtml = `
            <div class="flex flex-wrap justify-around p-4 my-6 rounded-lg bg-blue-50 border border-blue-200 text-center">
                ${metadataItems.map(item => `
                    <div class="flex flex-col items-center justify-center p-2 w-1/3">
                        <i class="fas fa-${item.icon} text-blue-500 text-lg mb-1"></i>
                        <span class="text-xs font-semibold text-blue-700 uppercase tracking-wider">${item.label}</span>
                        <span class="text-sm font-bold text-blue-900">${item.value.replace(/\*\*/g, '')}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Remove the metadata paragraph from the markdown to avoid it being rendered twice.
        remainingMarkdown = markdown.replace(metadataRegex, '');
    }

    // Use the 'marked' library to convert the rest of the markdown to HTML.
    let contentHtml = marked.parse(remainingMarkdown);

    // Wrap Ingredients and Instructions in a grid container
    contentHtml = contentHtml.replace(
        /(<h2>Ingredients<\/h2>[\s\S]*?)(<h2>Instructions<\/h2>[\s\S]*)/,
        '<div class="recipe-content-grid"><div>$1</div><div>$2</div></div>'
    );

    // Inject the custom metadata HTML after the first H1 tag.
    contentHtml = contentHtml.replace(/(<h1.*?>.*?<\/h1>)/, `$1${metadataHtml}`);

    // Add onclick handlers for ingredient list items for checkbox functionality
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHtml;
    tempDiv.querySelectorAll('ul li').forEach(li => {
        li.setAttribute('onclick', 'this.classList.toggle("checked")');
    });

    return tempDiv.innerHTML;
    return contentHtml;
}

// Core function to call the Gemini API
async function callGemini(userPrompt, systemPrompt) {
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            // Call our backend proxy instead of the Gemini API directly
            const response = await fetch(PROXY_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userPrompt, systemPrompt })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Request failed: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
                return text;
            } else {
                throw new Error("API response was missing generated text content.");
            }

        } catch (error) {
            lastError = error;
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Failed to call Gemini API after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

async function combineRecipes() {
    const recipe1 = document.getElementById('recipe1').value.trim();
    const recipe2 = document.getElementById('recipe2').value.trim();

    if (!recipe1 || !recipe2) {
        showMessage("Input Required", "Please paste content for both Recipe 1 and Recipe 2 to combine them.", true);
        return;
    }

    // UI State: Loading
    combineButton.disabled = true;
    buttonText.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    recipeOutput.innerHTML = '<div class="text-center p-12"><i class="fas fa-spinner fa-spin text-5xl text-blue-600"></i><p class="mt-4 text-xl text-gray-600 font-semibold">Creating the ultimate fusion dish...</p><p class="text-sm text-gray-500 mt-2">This may take a moment as the AI chef crafts your unique recipe.</p></div>';

    const systemPrompt = `
        You are a world-class culinary scientist and creative chef. Your task is to combine the two provided recipes into a single, cohesive, innovative, and delicious new recipe. Generate the output **strictly** in Markdown format following this structure:
        1. A single H1 title (preceded by #). 
        2. A concise, descriptive introductory paragraph (2-3 sentences).
        3. A 'Recipe Overview' section **formatted as a single paragraph** listing **Prep Time**, **Cook Time**, and **Servings**. Example: Prep Time: 20 minutes, Cook Time: 45 minutes, Servings: 4-6 people.
        4. A H2 heading 'Ingredients' (preceded by ##) followed by a detailed, organized bulleted list.
        5. A H2 heading 'Instructions' (preceded by ##) followed by clear, step-by-step numbered instructions.
        Ensure the tone is professional, creative, and uses precise culinary terminology.
    `;

    const userQuery = `
        Please combine the following two recipes into a single, integrated recipe:

        --- RECIPE 1 (Base/Main) ---
        ${recipe1}

        --- RECIPE 2 (Flavor/Twist) ---
        ${recipe2}
    `;

    try {
        const generatedMarkdown = await callGemini(userQuery, systemPrompt);
        
        // Convert the generated Markdown text to HTML for display
        const generatedHtml = markdownToHtml(generatedMarkdown);
        
        // Add to session history
        const recipeData = {
            title: generatedHtml.match(/<h1>(.*?)<\/h1>/)?.[1] || 'Untitled Recipe',
            content: `<div class="p-2">${generatedHtml}</div>`,
            recipe1: recipe1,
            recipe2: recipe2
        };
        addToHistory(recipeData);

        recipeOutput.innerHTML = `<div class="p-2">${generatedHtml}</div>`;
        copyRecipeButton.disabled = false;
        copyRecipeButton.classList.remove('hidden');
        printRecipeButton.disabled = false;
        printRecipeButton.classList.remove('hidden');
        saveRecipeButton.disabled = false;
        saveRecipeButton.classList.remove('hidden');
        
        // Scroll to the new recipe
        recipeOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error("Fusion failed:", error);
        // Re-display initial message or error message
        recipeOutput.innerHTML = `
            <div class="text-center p-12 bg-red-50 rounded-lg border-2 border-red-300">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl"></i>
                <p class="text-gray-500 mt-4 text-lg">Input two recipes on the left to create a new one.</p>
                <p class="mt-4 text-red-700 font-semibold">Fusion Error: The AI chef encountered a problem.</p>
                <p class="mt-2 text-red-600 text-sm">Please try again or simplify the input recipes. Error details: ${error.message}</p>
            </div>
        `;
        copyRecipeButton.disabled = true; // Keep copy button disabled on error
        printRecipeButton.disabled = true; // Keep print button disabled on error
        copyRecipeButton.classList.add('hidden'); // Hide buttons on error
        printRecipeButton.classList.add('hidden'); // Hide buttons on error
        saveRecipeButton.disabled = true;
        saveRecipeButton.classList.add('hidden');
    } finally {
        // UI State: Finished
        combineButton.disabled = false;
        buttonText.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
    }
}