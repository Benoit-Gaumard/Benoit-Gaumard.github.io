// Declare Papa variable (no longer needed for blog list, but keeping for compatibility)
const Papa = window.Papa

// Preloader functionality
const preloader = document.getElementById("preloader")

// Theme toggle functionality
const themeToggle = document.getElementById("themeToggle")
const themeIcon = document.getElementById("themeIcon")
const themeTooltip = document.getElementById("themeTooltip")
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)")

// Function to toggle theme
function toggleTheme() {
  if (document.documentElement.hasAttribute("data-theme")) {
    // Currently dark, switch to light
    document.documentElement.removeAttribute("data-theme")
    localStorage.setItem("theme", "light")

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
        `
    themeTooltip.textContent = "Dark Mode"
  } else {
    // Currently light, switch to dark
    document.documentElement.setAttribute("data-theme", "dark")
    localStorage.setItem("theme", "dark")

    // Change to moon icon
    themeIcon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `
    themeTooltip.textContent = "Light Mode"
  }
}

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem("theme")

  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark")
    // Set moon icon
    themeIcon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `
    themeTooltip.textContent = "Light Mode"
  } else {
    document.documentElement.removeAttribute("data-theme")
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
        `
    themeTooltip.textContent = "Dark Mode"
  }
}

// Search toggle functionality
const searchToggle = document.getElementById("searchToggle")
const searchInput = document.getElementById("searchInput")

// Toggle search input when search icon is clicked
searchToggle.addEventListener("click", (event) => {
  event.stopPropagation() // Prevent event from bubbling up
  searchInput.classList.toggle("active")
  if (searchInput.classList.contains("active")) {
    // Focus the search input when opened
    setTimeout(() => {
      searchInput.focus()
    }, 300)
  }
})

// Close search input when clicking outside
document.addEventListener("click", (event) => {
  if (!searchInput.contains(event.target) && event.target !== searchToggle) {
    searchInput.classList.remove("active")
  }
})

// Close search input when pressing Escape key
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.classList.remove("active")
    searchToggle.focus()
  }
})

// Go to top button functionality
const goToTopButton = document.getElementById("goToTop")

// Show/hide button based on scroll position
window.addEventListener("scroll", () => {
  if (window.pageYOffset > 300) {
    goToTopButton.classList.add("visible")
  } else {
    goToTopButton.classList.remove("visible")
  }
})

// Category multiselect functionality
const categoryMultiselect = document.getElementById("categoryMultiselect")
const categoryToggle = categoryMultiselect.querySelector(".multiselect-toggle")
const categoryDropdown = categoryMultiselect.querySelector(".multiselect-dropdown")
const categoryOptions = categoryMultiselect.querySelector(".multiselect-options")
const categorySelectedCount = categoryMultiselect.querySelector(".multiselect-selected-count")
const selectAllCategoriesBtn = document.getElementById("selectAllCategories")
const clearAllCategoriesBtn = document.getElementById("clearAllCategories")

// Source multiselect functionality
const sourceMultiselect = document.getElementById("sourceMultiselect")
const sourceToggle = sourceMultiselect.querySelector(".multiselect-toggle")
const sourceDropdown = sourceMultiselect.querySelector(".multiselect-dropdown")
const sourceOptions = sourceMultiselect.querySelector(".multiselect-options")
const sourceSelectedCount = sourceMultiselect.querySelector(".multiselect-selected-count")
const selectAllSourcesBtn = document.getElementById("selectAllSources")
const clearAllSourcesBtn = document.getElementById("clearAllSources")

// Toggle category dropdown
categoryToggle.addEventListener("click", () => {
  categoryDropdown.classList.toggle("show")
  sourceDropdown.classList.remove("show") // Close other dropdown
})

// Toggle source dropdown
sourceToggle.addEventListener("click", () => {
  sourceDropdown.classList.toggle("show")
  categoryDropdown.classList.remove("show") // Close other dropdown
})

// Close dropdowns when clicking outside
document.addEventListener("click", (event) => {
  if (!categoryMultiselect.contains(event.target)) {
    categoryDropdown.classList.remove("show")
  }
  if (!sourceMultiselect.contains(event.target)) {
    sourceDropdown.classList.remove("show")
  }
})

// Select all categories
selectAllCategoriesBtn.addEventListener("click", () => {
  const checkboxes = categoryOptions.querySelectorAll('input[type="checkbox"]')
  checkboxes.forEach((checkbox) => {
    checkbox.checked = true
  })
  updateSelectedCategoryCount()
  filterAndDisplayFeedItems()
})

// Clear all categories
clearAllCategoriesBtn.addEventListener("click", () => {
  const checkboxes = categoryOptions.querySelectorAll('input[type="checkbox"]')
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false
  })
  updateSelectedCategoryCount()
  filterAndDisplayFeedItems()
})

// Select all sources
selectAllSourcesBtn.addEventListener("click", () => {
  const checkboxes = sourceOptions.querySelectorAll('input[type="checkbox"]')
  checkboxes.forEach((checkbox) => {
    checkbox.checked = true
  })
  updateSelectedSourceCount()
  filterAndDisplayFeedItems()
})

// Clear all sources
clearAllSourcesBtn.addEventListener("click", () => {
  const checkboxes = sourceOptions.querySelectorAll('input[type="checkbox"]')
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false
  })
  updateSelectedSourceCount()
  filterAndDisplayFeedItems()
})

// Update selected category count
function updateSelectedCategoryCount() {
  const checkboxes = categoryOptions.querySelectorAll('input[type="checkbox"]')
  const selectedCount = Array.from(checkboxes).filter((checkbox) => checkbox.checked).length

  if (selectedCount > 0) {
    categorySelectedCount.textContent = selectedCount
    categorySelectedCount.style.display = "inline-flex"
    categoryToggle.querySelector("span:first-child").textContent = "Categories"
  } else {
    categorySelectedCount.style.display = "none"
    categoryToggle.querySelector("span:first-child").textContent = "All Categories"
  }
}

// Update selected source count
function updateSelectedSourceCount() {
  const checkboxes = sourceOptions.querySelectorAll('input[type="checkbox"]')
  const selectedCount = Array.from(checkboxes).filter((checkbox) => checkbox.checked).length

  if (selectedCount > 0) {
    sourceSelectedCount.textContent = selectedCount
    sourceSelectedCount.style.display = "inline-flex"
    sourceToggle.querySelector("span:first-child").textContent = "Sources"
  } else {
    sourceSelectedCount.style.display = "none"
    sourceToggle.querySelector("span:first-child").textContent = "All Sources"
  }
}

// Social sharing functionality
function shareOnLinkedIn() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent(document.title)
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
  window.open(shareUrl, "_blank")
}

function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent(document.title)
  const shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`
  window.open(shareUrl, "_blank")
}

function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href)
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
  window.open(shareUrl, "_blank")
}

function shareOnReddit() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent(document.title)
  const shareUrl = `https://www.reddit.com/submit?url=${url}&title=${title}`
  window.open(shareUrl, "_blank")
}

function shareViaEmail() {
  const url = window.location.href
  const title = document.title
  const subject = encodeURIComponent(`Check out this RSS Feed Reader: ${title}`)
  const body = encodeURIComponent(`I thought you might be interested in this collection of RSS feeds: ${url}`)
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`
  window.location.href = mailtoUrl
}

function copyLink() {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    const tooltip = document.getElementById("copyTooltip")
    tooltip.classList.add("show")
    setTimeout(() => {
      tooltip.classList.remove("show")
    }, 2000)
  })
}

// RSS Feed functionality
const jsonUrl =
  "https://raw.githubusercontent.com/Benoit-Gaumard/Benoit-Gaumard.github.io/refs/heads/main/static/tools/ms-blogs-list.json"
const rss2jsonUrl = "https://api.rss2json.com/v1/api.json"
const apiKey = "yzkycign0wt3c7nnvsrriqffk6fcv1uk1bzsqtlz" // Can be used by to this domain only ;)
const feedItemsContainer = document.getElementById("feedItems")
const feedCountElement = document.getElementById("feedCount")
const dayFilterDropdown = document.getElementById("dayFilter")

let allFeedItems = []
const allCategories = new Set()
const allSources = new Set()
let feedSources = []

// Initialize fallback data
useFallbackData()

// Fallback data in case the JSON fetch fails
function useFallbackData() {
  // Sample data with a few Microsoft blogs
  const fallbackData = [
    {
      name: "Microsoft Azure Blog",
      category: "Azure",
      url: "https://azure.microsoft.com/en-us/blog/feed/",
    },
    {
      name: "Microsoft 365 Blog",
      category: "Microsoft 365",
      url: "https://www.microsoft.com/en-us/microsoft-365/blog/feed/",
    },
    {
      name: "Windows Blog",
      category: "Windows",
      url: "https://blogs.windows.com/feed/",
    },
    {
      name: "Microsoft Developer Blog",
      category: "Developer",
      url: "https://devblogs.microsoft.com/feed/",
    },
  ]

  // Process the fallback data
  feedSources = fallbackData.map((item) => {
    // Add to categories set
    if (item.category) {
      allCategories.add(item.category)
    }

    // Add to sources set
    if (item.name) {
      allSources.add(item.name)
    }

    return {
      name: item.name,
      url: item.url,
      category: item.category,
    }
  })

  console.log("Using fallback data:", feedSources)
}

// Function to fetch and parse JSON file
async function fetchBlogList() {
  try {
    // First, let's directly fetch and log the JSON to see its structure
    console.log("Fetching blog list from:", jsonUrl)

    const response = await fetch(jsonUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch blog list: ${response.status} ${response.statusText}`)
    }

    const responseText = await response.text()
    console.log("Raw response:", responseText.substring(0, 500) + "...") // Log first 500 chars

    let blogData
    try {
      blogData = JSON.parse(responseText)
      console.log("Blog data parsed successfully")
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError)
      throw new Error("Failed to parse JSON response")
    }

    console.log("Blog data structure:", blogData)

    // Check if blogData is an array
    if (!Array.isArray(blogData)) {
      console.error("Expected blog data to be an array, but got:", typeof blogData)

      // If it's an object with a data property that's an array, use that instead
      if (blogData && Array.isArray(blogData.data)) {
        console.log("Using blogData.data instead")
        blogData = blogData.data
      } else {
        throw new Error("Blog data is not in the expected format")
      }
    }

    // Process the JSON data
    feedSources = processBlogData(blogData)

    // Filter out entries with empty URLs
    feedSources = feedSources.filter((source) => source.url && source.url.trim() !== "")

    console.log("Processed feed sources:", feedSources)
    console.log("Categories:", allCategories)
    console.log("Sources:", allSources)

    // If we still have no categories or sources, use a fallback
    if (allCategories.size === 0 || allSources.size === 0) {
      console.warn("No categories or sources found, using fallback data")
      //useFallbackData() // Removed conditional call
    }

    // Populate category and source multiselects
    populateCategoryMultiselect()
    populateSourceMultiselect()

    // Fetch RSS feeds
    fetchAllRSSFeeds()
  } catch (error) {
    console.error("Error fetching blog list:", error)
    feedItemsContainer.innerHTML = `<div class="loading">Error loading blog list data. Using fallback data.</div>`

    // Use fallback data if the fetch fails
    //useFallbackData() // Removed conditional call

    // Populate category and source multiselects
    populateCategoryMultiselect()
    populateSourceMultiselect()

    // Fetch RSS feeds
    fetchAllRSSFeeds()

    // Hide preloader
    preloader.classList.add("hidden")
  }
}

// Helper function to process blog data
function processBlogData(data) {
  return data.map((item) => {
    // Check the structure of each item and log it
    console.log("Processing item:", item)

    // Extract the values - handle different possible property names
    const nameValue = item.Name || item.name || ""
    const categoryValue = item.Category || item.category || ""
    const feedValue = item.Feed || item.feed || item.url || ""

    // Add to categories set if not empty
    if (categoryValue) {
      console.log("Adding category:", categoryValue)
      allCategories.add(categoryValue)
    }

    // Add to sources set if not empty
    if (nameValue) {
      console.log("Adding source:", nameValue)
      allSources.add(nameValue)
    }

    return {
      name: nameValue,
      url: feedValue,
      category: categoryValue,
    }
  })
}

// Populate category multiselect
function populateCategoryMultiselect() {
  categoryOptions.innerHTML = ""

  // Sort categories alphabetically
  const sortedCategories = Array.from(allCategories).sort()

  sortedCategories.forEach((category) => {
    const optionId = `category-${category.replace(/\s+/g, "-").toLowerCase()}`

    const optionDiv = document.createElement("div")
    optionDiv.className = "multiselect-option"

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.id = optionId
    checkbox.value = category
    checkbox.checked = true // Default to all selected

    const label = document.createElement("label")
    label.htmlFor = optionId
    label.textContent = category

    optionDiv.appendChild(checkbox)
    optionDiv.appendChild(label)

    categoryOptions.appendChild(optionDiv)

    // Add event listener to checkbox
    checkbox.addEventListener("change", () => {
      updateSelectedCategoryCount()
      filterAndDisplayFeedItems()
    })
  })

  // Update selected count
  updateSelectedCategoryCount()
}

// Populate source multiselect
function populateSourceMultiselect() {
  sourceOptions.innerHTML = ""

  // Sort sources alphabetically
  const sortedSources = Array.from(allSources).sort()

  sortedSources.forEach((source) => {
    const optionId = `source-${source.replace(/\s+/g, "-").toLowerCase()}`

    const optionDiv = document.createElement("div")
    optionDiv.className = "multiselect-option"

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.id = optionId
    checkbox.value = source
    checkbox.checked = true // Default to all selected

    const label = document.createElement("label")
    label.htmlFor = optionId
    label.textContent = source

    optionDiv.appendChild(checkbox)
    optionDiv.appendChild(label)

    sourceOptions.appendChild(optionDiv)

    // Add event listener to checkbox
    checkbox.addEventListener("change", () => {
      updateSelectedSourceCount()
      filterAndDisplayFeedItems()
    })
  })

  // Update selected count
  updateSelectedSourceCount()
}

// Function to fetch all RSS feeds using rss2json
async function fetchAllRSSFeeds() {
  try {
    // Show initial loading message
    feedItemsContainer.innerHTML = `<div class="loading">Loading RSS feeds... This may take a moment.</div>`

    // Prepare all feed sources
    const totalFeeds = feedSources.length
    let processedFeeds = 0

    // Fetch feeds in batches to show progress
    const batchSize = 5 // Process 5 feeds at a time
    const results = []

    for (let i = 0; i < totalFeeds; i += batchSize) {
      // Get current batch
      const batch = feedSources.slice(i, i + batchSize)

      // Update loading message with progress
      const progress = Math.min(100, Math.round((processedFeeds / totalFeeds) * 100))
      feedItemsContainer.innerHTML = `<div class="loading">Loading RSS feeds... ${progress}% complete</div>`

      // Process batch in parallel
      const batchPromises = batch.map(async (source) => {
        try {
          const params = new URLSearchParams({
            rss_url: source.url,
            api_key: apiKey,
            count: 50, // Limit to 50 items per feed
          })

          const response = await fetch(`${rss2jsonUrl}?${params}`)
          const data = await response.json()

          if (data.status !== "ok") {
            console.error(`Failed to fetch RSS feed for ${source.name}: ${data.message || "Unknown error"}`)
            return []
          }

          // Process feed items
          return data.items.map((item) => {
            const pubDate = new Date(item.pubDate)

            return {
              title: item.title || "",
              link: item.link || "",
              description: stripHtml(item.description || ""),
              pubDate: pubDate,
              age: getDaysSincePublication(pubDate),
              source: source.name,
              category: source.category,
              blogUrl: data.feed?.link || source.url, // Add the blog URL from the feed data
            }
          })
        } catch (error) {
          console.error(`Error fetching RSS feed for ${source.name}:`, error)
          return []
        }
      })

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Update processed count
      processedFeeds += batch.length
    }

    // Final loading message before processing results
    feedItemsContainer.innerHTML = `<div class="loading">Processing feed data...</div>`

    // Combine all feed items
    allFeedItems = results.flat()

    // Sort by publication date (newest first)
    allFeedItems.sort((a, b) => b.pubDate - a.pubDate)

    // Update feed count
    feedCountElement.innerHTML = `<strong>${allFeedItems.length} items found</strong>`

    // Display feed items
    filterAndDisplayFeedItems()

    // Hide preloader
    preloader.classList.add("hidden")
  } catch (error) {
    console.error("Error fetching RSS feeds:", error)
    feedItemsContainer.innerHTML = `<div class="loading">Error loading RSS feeds. Please try again later.</div>`
    feedCountElement.innerHTML = `<strong>Error loading feeds</strong>`

    // Hide preloader even on error
    preloader.classList.add("hidden")
  }
}

// Helper function to strip HTML tags
function stripHtml(html) {
  const temp = document.createElement("div")
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ""
}

// Calculate days since publication
function getDaysSincePublication(pubDate) {
  const now = new Date()

  // Reset hours, minutes, seconds, and milliseconds to compare dates only
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const pubDateTime = new Date(pubDate.getFullYear(), pubDate.getMonth(), pubDate.getDate())

  // Calculate difference in days
  const diffTime = Math.abs(nowDate - pubDateTime)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// Get indicator based on age
function getAgeIndicator(age) {
  if (age <= 2) return "🟢"
  if (age <= 30) return "🔵"
  return "🔴"
}

// Get selected categories
function getSelectedCategories() {
  const checkboxes = categoryOptions.querySelectorAll('input[type="checkbox"]:checked')
  return Array.from(checkboxes).map((checkbox) => checkbox.value)
}

// Get selected sources
function getSelectedSources() {
  const checkboxes = sourceOptions.querySelectorAll('input[type="checkbox"]:checked')
  return Array.from(checkboxes).map((checkbox) => checkbox.value)
}

// Toggle feed item expansion
function setupFeedItemToggle() {
  const feedItems = document.querySelectorAll(".feed-item")

  feedItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      // Don't toggle if clicking on a link
      if (e.target.tagName === "A") {
        return
      }

      this.classList.toggle("expanded")
    })
  })
}

// Filter and display feed items
function filterAndDisplayFeedItems() {
  const dayFilter = Number.parseInt(dayFilterDropdown.value)
  const selectedCategories = getSelectedCategories()
  const selectedSources = getSelectedSources()
  const searchTerm = searchInput.value.toLowerCase()

  let filteredItems = allFeedItems

  // Apply day filter
  if (dayFilter && dayFilter !== "all") {
    filteredItems = filteredItems.filter((item) => item.age <= dayFilter)
  }

  // Apply category filter
  if (selectedCategories.length > 0) {
    filteredItems = filteredItems.filter((item) => selectedCategories.includes(item.category))
  }

  // Apply source filter
  if (selectedSources.length > 0) {
    filteredItems = filteredItems.filter((item) => selectedSources.includes(item.source))
  }

  // Apply search filter
  if (searchTerm) {
    filteredItems = filteredItems.filter(
      (item) => item.title.toLowerCase().includes(searchTerm) || item.description.toLowerCase().includes(searchTerm),
    )
  }

  // Update feed count
  feedCountElement.innerHTML = `<strong>${filteredItems.length} items found</strong>`

  // Display items
  if (filteredItems.length === 0) {
    feedItemsContainer.innerHTML = `<div class="loading">No items found matching your criteria.</div>`
    return
  }

  feedItemsContainer.innerHTML = filteredItems
    .map((item) => {
      const formattedDate = item.pubDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      // Truncate description
      const maxLength = 200
      let truncatedDescription = item.description
      if (truncatedDescription.length > maxLength) {
        truncatedDescription = truncatedDescription.substring(0, maxLength) + "..."
      }

      // Display "Today" instead of "0 days ago"
      const ageDisplay = item.age === 0 ? "Today" : `${item.age} days ago`

      return `
            <div class="feed-item">
                <div class="feed-item-indicator">${getAgeIndicator(item.age)}</div>
                <div class="feed-item-content">
                    <div class="feed-item-title">
                        <span class="feed-item-date">${formattedDate} (${ageDisplay})</span>
                        <a href="${item.link}" target="_blank">${item.title}</a>
                        <span class="feed-item-source-label">From: <strong><a href="${item.blogUrl}" target="_blank">${item.source}</a></strong></span>
                    </div>
                    <div class="feed-item-description">${truncatedDescription}
                        <div>
                            <span class="feed-item-category">${item.category}</span>
                            <span class="feed-item-source"><a href="${item.blogUrl}" target="_blank">${item.source}</a></span>
                        </div>
                    </div>
                </div>
                <div class="feed-item-toggle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
        `
    })
    .join("")

  // Set up click handlers for the feed items
  setupFeedItemToggle()
}

// Event listeners
dayFilterDropdown.addEventListener("change", filterAndDisplayFeedItems)
searchInput.addEventListener("input", filterAndDisplayFeedItems)
themeToggle.addEventListener("click", toggleTheme)

// Initialize theme
initTheme()

// Initial fetch
fetchBlogList()

// Make social sharing functions globally available
window.shareOnLinkedIn = shareOnLinkedIn
window.shareOnTwitter = shareOnTwitter
window.shareOnFacebook = shareOnFacebook
window.shareOnReddit = shareOnReddit
window.shareViaEmail = shareViaEmail
window.copyLink = copyLink

