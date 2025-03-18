// Your RSS2JSON API key
const RSS2JSON_API_KEY = "yzkycign0wt3c7nnvsrriqffk6fcv1uk1bzsqtlz"

// Original feed URL
const originalFeedUrl = 'https://www.microsoft.com/releasecommunications/api/v2/azure/rss';
const rss2jsonUrl = 'https://api.rss2json.com/v1/api.json';
const feedItemsContainer = document.getElementById('feedItems');
const feedCountElement = document.getElementById('feedCount');
const dayFilterDropdown = document.getElementById('dayFilter');
const preloader = document.getElementById('preloader'); // Declare preloader

let allFeedItems = [];
let allCategories = new Set();
let hasRetirementCategory = false;

// Function to fetch and parse RSS feed using RSS2JSON
async function fetchRSSFeed() {
    try {
        // Use RSS2JSON service
        const response = await fetch(`${rss2jsonUrl}?rss_url=${encodeURIComponent(originalFeedUrl)}&api_key=${RSS2JSON_API_KEY}&count=1000`);
        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error('Failed to fetch RSS feed');
        }

        // Extract feed items from JSON response
        allFeedItems = data.items.map(item => {
            const title = item.title || '';
            const link = item.link || '';
            const description = item.description || '';
            const pubDate = new Date(item.pubDate);

            // Extract categories
            const categories = item.categories || [];

            // Check if this item has the Retirements category
            const hasRetirement = categories.some(cat =>
                cat.toLowerCase() === 'retirements' ||
                cat.toLowerCase() === 'retirement'
            );

            // Add categories to the set of all categories
            categories.forEach(category => {
                if (category) {
                    allCategories.add(category);

                    // Check if we have a retirement category
                    if (category.toLowerCase() === 'retirements' || category.toLowerCase() === 'retirement') {
                        hasRetirementCategory = true;
                    }
                }
            });

            return {
                title,
                link,
                description,
                pubDate,
                age: getDaysSincePublication(pubDate),
                categories,
                hasRetirement
            };
        });

        // Populate category multiselect
        populateCategoryMultiselect();

        // Update feed count
        feedCountElement.innerHTML = `<strong>${allFeedItems.length} updates found</strong>`;

        // Display feed items
        filterAndDisplayFeedItems();

        // Hide preloader
        preloader.classList.add('hidden');

        // If no retirement category exists, hide the retirement filter
        if (!hasRetirementCategory) {
            document.querySelector('.retirement-filter').style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
        feedItemsContainer.innerHTML = `<div class="loading">Error loading RSS feed. Please try again later.</div>`;
        feedCountElement.innerHTML = `<strong>Error loading feed</strong>`;

        // Hide preloader even on error
        preloader.classList.add('hidden');
    }
}

// Populate category multiselect
function populateCategoryMultiselect() {
    const multiselectOptions = document.querySelector('.multiselect-options');
    multiselectOptions.innerHTML = '';

    // Sort categories alphabetically
    const sortedCategories = Array.from(allCategories).sort();

    sortedCategories.forEach(category => {
        const optionId = `category-${category.replace(/\s+/g, '-').toLowerCase()}`;

        const optionDiv = document.createElement('div');
        optionDiv.className = 'multiselect-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = optionId;
        checkbox.value = category;
        checkbox.checked = true; // Default to all selected

        const label = document.createElement('label');
        label.htmlFor = optionId;
        label.textContent = category;

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);

        multiselectOptions.appendChild(optionDiv);

        // Add event listener to checkbox
        checkbox.addEventListener('change', function() {
            updateSelectedCount();
            filterAndDisplayFeedItems();
        });
    });

    // Update selected count
    updateSelectedCount();
}

// Calculate days since publication - improved version
function getDaysSincePublication(pubDate) {
    const now = new Date();

    // Reset the time portion to compare dates only
    const pubDateOnly = new Date(pubDate);
    pubDateOnly.setHours(0, 0, 0, 0);

    const nowDateOnly = new Date(now);
    nowDateOnly.setHours(0, 0, 0, 0);

    // Calculate the difference in days
    const diffTime = Math.abs(nowDateOnly - pubDateOnly);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

// Get indicator based on age
function getAgeIndicator(age) {
    if (age <= 2) return '🟢';
    if (age <= 30) return '🔵';
    return '🔴';
}

// Get selected categories
function getSelectedCategories() {
    const checkboxes = document.querySelectorAll('.multiselect-options input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

// Update selected count
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.multiselect-options input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
    const multiselectSelectedCount = document.querySelector('.multiselect-selected-count');
    const multiselectToggle = document.querySelector('.multiselect-toggle');

    if (selectedCount > 0) {
        multiselectSelectedCount.textContent = selectedCount;
        multiselectSelectedCount.style.display = 'inline-flex';
        multiselectToggle.querySelector('span:first-child').textContent = 'Categories';
    } else {
        multiselectSelectedCount.style.display = 'none';
        multiselectToggle.querySelector('span:first-child').textContent = 'All Categories';
    }
}

// Toggle feed item expansion
function setupFeedItemToggle() {
    const feedItems = document.querySelectorAll('.feed-item');

    feedItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Don't toggle if clicking on a link
            if (e.target.tagName === 'A') {
                return;
            }

            this.classList.toggle('expanded');
        });
    });
}

// Filter and display feed items
function filterAndDisplayFeedItems() {
    const dayFilter = parseInt(dayFilterDropdown.value);
    const selectedCategories = getSelectedCategories();
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const retirementFilter = document.getElementById('retirementFilter');
    const showRetirementsOnly = retirementFilter.checked;

    let filteredItems = allFeedItems;

    // Apply day filter
    if (dayFilter && dayFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.age <= dayFilter);
    }

    // Apply retirement filter if checked
    if (showRetirementsOnly) {
        filteredItems = filteredItems.filter(item => item.hasRetirement);
    }
    // Otherwise apply normal category filter (if any categories are selected)
    else if (selectedCategories.length > 0) {
        filteredItems = filteredItems.filter(item =>
            item.categories && item.categories.some(cat => selectedCategories.includes(cat))
        );
    }

    // Apply search filter
    if (searchTerm) {
        filteredItems = filteredItems.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm)
        );
    }

    // Update feed count
    feedCountElement.innerHTML = `<strong>${filteredItems.length} updates found</strong>`;

    // Display items
    if (filteredItems.length === 0) {
        feedItemsContainer.innerHTML = `<div class="loading">No updates found matching your criteria.</div>`;
        return;
    }

    feedItemsContainer.innerHTML = filteredItems.map(item => {
        const formattedDate = item.pubDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Display "Today" instead of "0 days ago"
        const ageDisplay = item.age === 0 ? "Today" : `${item.age} days ago`;

        // Create category tags
        const categoryTags = item.categories && item.categories.length > 0
            ? `<div>${item.categories.map(cat => {
                const isRetirement = cat.toLowerCase() === 'retirements' || cat.toLowerCase() === 'retirement';
                return `<span class="feed-item-category ${isRetirement ? 'retirement' : ''}">${cat}</span>`;
            }).join('')}</div>`
            : '';

        return `
            <div class="feed-item">
                <div class="feed-item-indicator">${getAgeIndicator(item.age)}</div>
                <div class="feed-item-content">
                    <div class="feed-item-title">
                        <span class="feed-item-date">${formattedDate} (${ageDisplay})</span>
                        <a href="${item.link}" target="_blank">${item.title}</a>
                    </div>
                    <div class="feed-item-description">${item.description} ...
                        ${categoryTags}</div>
                </div>
                <div class="feed-item-toggle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
        `;
    }).join('');

    // Set up click handlers for the feed items
    setupFeedItemToggle();
}

// Social sharing functionality
function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(shareUrl, '_blank');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    const shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    window.open(shareUrl, '_blank');
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(shareUrl, '_blank');
}

function shareOnReddit() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    const shareUrl = `https://www.reddit.com/submit?url=${url}&title=${title}`;
    window.open(shareUrl, '_blank');
}

function shareViaEmail() {
    const url = window.location.href;
    const title = document.title;
    const subject = encodeURIComponent(`Check out this Azure Updates page: ${title}`);
    const body = encodeURIComponent(`I thought you might be interested in this Azure Updates page: ${url}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const tooltip = document.getElementById('copyTooltip');
        tooltip.classList.add('show');
        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 2000);
    });
}

// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeTooltip = document.getElementById('themeTooltip');

// Function to toggle theme
function toggleTheme() {
    if (document.documentElement.hasAttribute('data-theme')) {
        // Currently dark, switch to light
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');

        // Change to sun icon
        themeIcon.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
        themeTooltip.textContent = 'Dark Mode';
    } else {
        // Currently light, switch to dark
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');

        // Change to moon icon
        themeIcon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
        themeTooltip.textContent = 'Light Mode';
    }
}

// Initialize theme from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        // Set moon icon
        themeIcon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
        themeTooltip.textContent = 'Light Mode';
    } else {
        document.documentElement.removeAttribute('data-theme');
        // Set sun icon
        themeIcon.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
        themeTooltip.textContent = 'Dark Mode';
    }
}

// Go to top button functionality
const goToTopButton = document.getElementById('goToTop');

// Show/hide button based on scroll position
window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
        goToTopButton.classList.add('visible');
    } else {
        goToTopButton.classList.remove('visible');
    }
});

// Multiselect dropdown functionality
const multiselect = document.getElementById('categoryMultiselect');
const multiselectToggle = multiselect.querySelector('.multiselect-toggle');
const multiselectDropdown = multiselect.querySelector('.multiselect-dropdown');
const selectAllBtn = document.getElementById('selectAllCategories');
const clearAllBtn = document.getElementById('clearAllCategories');
const retirementFilter = document.getElementById('retirementFilter');

// Toggle dropdown
multiselectToggle.addEventListener('click', function() {
    multiselectDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    if (!multiselect.contains(event.target)) {
        multiselectDropdown.classList.remove('show');
    }
});

// Select all categories
selectAllBtn.addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.multiselect-options input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedCount();
    filterAndDisplayFeedItems();
});

// Clear all categories
clearAllBtn.addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.multiselect-options input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedCount();
    filterAndDisplayFeedItems();
});

// Search toggle functionality
const searchToggle = document.getElementById('searchToggle');
const searchInput = document.getElementById('searchInput');

// Toggle search input when search icon is clicked
searchToggle.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent event from bubbling up
    searchInput.classList.toggle('active');
    if (searchInput.classList.contains('active')) {
        // Focus the search input when opened
        setTimeout(() => {
            searchInput.focus();
        }, 300);
    }
});

// Close search input when clicking outside
document.addEventListener('click', function(event) {
    if (!searchInput.contains(event.target) && event.target !== searchToggle) {
        searchInput.classList.remove('active');
    }
});

// Close search input when pressing Escape key
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        searchInput.classList.remove('active');
        searchToggle.focus();
    }
});

// Event listeners
dayFilterDropdown.addEventListener('change', filterAndDisplayFeedItems);
searchInput.addEventListener('input', filterAndDisplayFeedItems);
retirementFilter.addEventListener('change', function() {
    // When retirement filter is checked, disable the category multiselect
    if (this.checked) {
        multiselect.style.opacity = '0.5';
        multiselect.style.pointerEvents = 'none';
    } else {
        multiselect.style.opacity = '1';
        multiselect.style.pointerEvents = 'auto';
    }
    filterAndDisplayFeedItems();
});

// Add event listener to theme toggle button
themeToggle.addEventListener('click', toggleTheme);

// Initialize theme
initTheme();

// Initial fetch
document.addEventListener('DOMContentLoaded', function() {
    fetchRSSFeed();
});