// DOM Elements
const blogListElement = document.getElementById("blogList")
const preloader = document.getElementById("preloader")
const goToTopButton = document.getElementById("goToTop")
const lightThemeButton = document.getElementById("lightTheme")
const darkThemeButton = document.getElementById("darkTheme")
const currentYearElement = document.getElementById("currentYear")
const sortBySelect = document.getElementById("sortBy")
const categoryFilterDiv = document.getElementById("categoryFilter")
const categorySelect = document.getElementById("categorySelect")

// Category menu elements
const categoryMenu = document.getElementById("categoryMenu")
const categoryMenuToggle = document.getElementById("categoryMenuToggle")

// Category emoji mapping
const categoryEmojis = {
  Architecture: "🏗️",
  ARM: "🅰",
  "Analytics and monitoring": "👀",
  "Entra Id (Azure Active Directory)": "🟦",
  Bicep: "💪",
  Certifications: "🏅",
  "Cloud Services Comparison": "⛅",
  Compliance: "🚨",
  DNS: "📊",
  Data: "📚",
  DashBoards: "📈",
  DevOps: "🚀",
  "DevOps News": "🚀",
  Events: "📅",
  FinOps: "💵",
  Fun: "🤣",
  GitHub: "🐙",
  Governance: "🏛️",
  "Graph KQL": "🔍",
  Graph: "🔍",
  "HA and DR": "💥",
  Informations: "📢",
  LightHouse: "🔍",
  Licensing: "🔍",
  "Mind Maps": "📌",
  Misc: "📌",
  "Move or migration": "⏩",
  Network: "🌐",
  Policies: "👮",
  Portals: "🌐",
  Powershell: "🅿",
  "Routing and NVA": "🧱",
  Services: "📝",
  "Stencils and icons": "✍",
  Sustainability: "🪴",
  Support: "🧑‍🚒",
  Tags: "🔖",
  Terraform: "🟪",
  "Terraform Deployment": "🛫",
  "Virtual machines": "💻",
  "Virtual Machines Scale Set": "↗",
  Web: "🌍",
  Youtube: "🎥",
  "Wiki JS": "📒",
  Photos: "📸",
}

// Remote JSON URL
const BLOG_DATA_URL =
  "https://raw.githubusercontent.com/Benoit-Gaumard/Benoit-Gaumard.github.io/refs/heads/main/static/tools/blogroll.json"

// Current sort and filter state
let currentSort = "default"
let currentCategory = "all"
let selectedCategories = [] // Will store active categories
let blogData = [] // Will be populated from JSON
let activeCategory = null // Currently active category in the menu
let linkStatusCache = {} // Cache for link status checks
const linkCheckingEnabled = false // Flag to enable/disable link checking

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  // Set current year in footer
  currentYearElement.textContent = new Date().getFullYear()

  // Load blog data
  loadBlogData()

  // Add scroll event listener for "Go to Top" button
  window.addEventListener("scroll", toggleGoToTopButton)

  // Add event listeners for sorting and filtering
  sortBySelect.addEventListener("change", handleSortChange)
  categorySelect.addEventListener("change", handleCategoryChange)

  // Initialize category menu toggle
  initCategoryMenuToggle()

  // Initialize theme
  initTheme()

  // Load cached link statuses from localStorage
  loadLinkStatusCache()
})

// Initialize category menu toggle for mobile
function initCategoryMenuToggle() {
  categoryMenuToggle.addEventListener("click", function () {
    categoryMenu.classList.toggle("show")
    this.classList.toggle("active")
  })
}

// Load link status cache from localStorage
function loadLinkStatusCache() {
  const cachedStatuses = localStorage.getItem("blogroll_link_statuses")
  if (cachedStatuses) {
    linkStatusCache = JSON.parse(cachedStatuses)
    console.log("Loaded link status cache:", Object.keys(linkStatusCache).length, "entries")
  }
}

// Save link status cache to localStorage
function saveLinkStatusCache() {
  localStorage.setItem("blogroll_link_statuses", JSON.stringify(linkStatusCache))
}

// Check if a URL is accessible - IMPROVED VERSION
async function checkLinkStatus(url) {
  // If we already have a cached result and it's less than 24 hours old, use it
  if (linkStatusCache[url] && Date.now() - linkStatusCache[url].timestamp < 86400000) {
    return linkStatusCache[url].status
  }

  // For most URLs, we can't reliably check status from the browser due to CORS
  // So we'll just assume the link is valid unless we have specific evidence otherwise

  // We can check if the URL is valid format
  try {
    new URL(url)
  } catch (e) {
    // Invalid URL format
    const status = false
    linkStatusCache[url] = {
      status: status,
      timestamp: Date.now(),
    }
    saveLinkStatusCache()
    return status
  }

  // For now, we'll just mark all properly formatted URLs as valid
  // A more accurate check would require a server-side component
  const status = true
  linkStatusCache[url] = {
    status: status,
    timestamp: Date.now(),
  }
  saveLinkStatusCache()
  return status
}

// Manually verify a link
function manuallyVerifyLink(url, isValid) {
  linkStatusCache[url] = {
    status: isValid,
    timestamp: Date.now(),
    manual: true, // Flag to indicate this was manually verified
  }
  saveLinkStatusCache()

  // Update UI for all instances of this URL
  blogData.forEach((blog) => {
    if (blog.url === url) {
      blog.status = isValid
      updateBlogStatusUI(blog.id, isValid)
    }
  })
}

// Load blog data from remote JSON file
async function loadBlogData() {
  try {
    const response = await fetch(BLOG_DATA_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()
    console.log("Fetched data:", data) // Log the data structure

    // Check if data is an array directly or if it's nested in a property
    let rawBlogData = []
    if (Array.isArray(data)) {
      // The JSON is a direct array of blogs
      rawBlogData = data
    } else if (data.blogs && Array.isArray(data.blogs)) {
      // The JSON has a "blogs" property that is an array
      rawBlogData = data.blogs
    } else {
      // Try to find any array in the data
      const possibleArrays = Object.values(data).filter((val) => Array.isArray(val))
      if (possibleArrays.length > 0) {
        rawBlogData = possibleArrays[0]
      } else {
        throw new Error("Could not find blog data in the JSON response")
      }
    }

    // Process the first blog entry to determine the structure
    if (rawBlogData.length > 0) {
      const sampleBlog = rawBlogData[0]
      console.log("Sample blog entry:", sampleBlog)

      // Check for common category field names
      let categoryField = null
      const possibleCategoryFields = ["category", "categories", "tags", "type", "section", "group"]

      for (const field of possibleCategoryFields) {
        if (sampleBlog[field] !== undefined) {
          categoryField = field
          console.log(`Found category field: ${field}`)
          break
        }
      }

      // Process all blogs with the identified category field
      blogData = rawBlogData.map((blog, index) => {
        let category = "Uncategorized"

        // Try to get category from the identified field
        if (categoryField && blog[categoryField] !== undefined) {
          // Handle if it's an array (like tags)
          if (Array.isArray(blog[categoryField])) {
            category = blog[categoryField][0] || "Uncategorized"
          } else {
            category = blog[categoryField]
          }
        }

        // Check if we have a cached status for this URL
        let status = null
        if (linkStatusCache[blog.url]) {
          status = linkStatusCache[blog.url].status
        }

        return {
          ...blog,
          id: (index + 1).toString(),
          category: category,
          normalizedCategory: normalizeCategory(category),
          status: status, // Use cached status if available
        }
      })
    } else {
      blogData = []
    }

    console.log("Processed blog data:", blogData) // Log the processed data

    // Populate category filters
    populateCategoryFilter()
    populateCategoryMenu()

    // Initialize all categories as selected
    selectedCategories = getAllCategories()

    // Render blogs
    renderBlogs()

    // Hide preloader after content loads
    setTimeout(() => {
      preloader.classList.add("hidden")
    }, 500)

    // Only check URLs that have invalid format
    validateUrlFormats()
  } catch (error) {
    console.error("Error loading blog data:", error)
    blogListElement.innerHTML = `
            <div class="error-message">
                <p>Failed to load blog data. Please try refreshing the page.</p>
                <p>Error: ${error.message}</p>
                <p>If this error persists, there might be a CORS issue or the remote file might be unavailable.</p>
            </div>
        `

    // Hide preloader even if there's an error
    preloader.classList.add("hidden")
  }
}

// Just validate URL formats without trying to fetch them
function validateUrlFormats() {
  console.log("Validating URL formats for", blogData.length, "blogs")

  blogData.forEach((blog) => {
    try {
      new URL(blog.url)
      // Valid URL format
      blog.status = true
    } catch (e) {
      // Invalid URL format
      blog.status = false
      updateBlogStatusUI(blog.id, false)
    }
  })
}

// Update the UI to reflect a blog's link status
function updateBlogStatusUI(blogId, status) {
  const blogElement = document.querySelector(`.feed-item[data-id="${blogId}"]`)
  if (!blogElement) return // Blog not currently displayed

  const titleElement = blogElement.querySelector(".feed-item-title a")
  if (!titleElement) return

  // Remove any existing status classes
  titleElement.classList.remove("link-broken", "link-unknown")

  // Add appropriate class based on status
  if (status === false) {
    titleElement.classList.add("link-broken")
    titleElement.setAttribute("title", "This link may have an invalid format")

    // Add broken link indicator
    if (!titleElement.querySelector(".broken-link-indicator")) {
      const indicator = document.createElement("span")
      indicator.className = "broken-link-indicator"
      indicator.textContent = " ⚠️"
      indicator.setAttribute("aria-label", "Possible invalid link format")
      titleElement.appendChild(indicator)
    }
  } else if (status === null) {
    titleElement.classList.add("link-unknown")
    titleElement.setAttribute("title", "Link status could not be determined")
  }
}

// Get all unique categories
function getAllCategories() {
  const allCategories = blogData.map((blog) => ({
    original: blog.category || "Uncategorized",
    normalized: blog.normalizedCategory,
  }))

  // Create a map to deduplicate categories while preserving original casing
  const categoryMap = new Map()
  allCategories.forEach((cat) => {
    if (!categoryMap.has(cat.normalized)) {
      categoryMap.set(cat.normalized, cat.original)
    }
  })

  // Convert map to array and sort
  return Array.from(categoryMap.values()).sort()
}

// Normalize category for consistent comparison
function normalizeCategory(category) {
  if (!category) return "uncategorized"
  return category.toString().trim().toLowerCase()
}

// Populate category filter dropdown (original)
function populateCategoryFilter() {
  // Get all categories from blog data
  const categories = getAllCategories()

  console.log("Available categories:", categories) // Log the categories

  // Clear existing options except "All Categories"
  while (categorySelect.options.length > 1) {
    categorySelect.remove(1)
  }

  // Add options to select
  categories.forEach((category) => {
    const option = document.createElement("option")
    option.value = category
    option.textContent = category
    categorySelect.appendChild(option)
  })
}

// Modify the populateCategoryMenu function to include counts

// Replace the populateCategoryMenu function with this updated version:
function populateCategoryMenu() {
  // Get all categories
  const categories = getAllCategories()

  // Count blogs in each category
  const categoryCounts = {}
  blogData.forEach((blog) => {
    const category = blog.category
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  // Count total blogs for "All" category
  const totalBlogs = blogData.length

  // Clear existing menu
  categoryMenu.innerHTML = ""

  // Add "All" option with count
  const allItem = document.createElement("div")
  allItem.className = "category-menu-item"
  allItem.innerHTML = `
        <a href="#" class="category-menu-link active" data-category="all">All <span class="category-count">${totalBlogs}</span></a>
    `
  categoryMenu.appendChild(allItem)

  // Add separator after "All"
  const firstSeparator = document.createElement("div")
  firstSeparator.className = "category-menu-separator"
  firstSeparator.textContent = "•"
  categoryMenu.appendChild(firstSeparator)

  // Add each category with emoji and count
  categories.forEach((category, index) => {
    const item = document.createElement("div")
    item.className = "category-menu-item"

    // Get emoji for category or use a default
    const emoji = categoryEmojis[category] || "📁"

    // Get count for this category
    const count = categoryCounts[category] || 0

    item.innerHTML = `
            <a href="#" class="category-menu-link" data-category="${category}">
                ${emoji} ${category} <span class="category-count">${count}</span>
            </a>
        `
    categoryMenu.appendChild(item)

    // Add separator after each item except the last one
    if (index < categories.length - 1) {
      const separator = document.createElement("div")
      separator.className = "category-menu-separator"
      separator.textContent = "•"
      categoryMenu.appendChild(separator)
    }
  })

  // Add event listeners to category links
  const categoryLinks = categoryMenu.querySelectorAll(".category-menu-link")
  categoryLinks.forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault()

      // Remove active class from all links
      categoryLinks.forEach((l) => l.classList.remove("active"))

      // Add active class to clicked link
      this.classList.add("active")

      // Set active category
      activeCategory = this.dataset.category

      // Filter blogs by the selected category
      filterBlogsByMenuCategory(activeCategory)
    })
  })
}

// Filter blogs by menu category
function filterBlogsByMenuCategory(category) {
  if (category === "all") {
    // Show all categories
    selectedCategories = getAllCategories()
  } else {
    // Show only the selected category
    selectedCategories = [category]
  }

  // Render blogs with the new filter
  renderBlogs()
}

// Handle sort change
function handleSortChange() {
  currentSort = sortBySelect.value

  // Show/hide category filter based on sort selection
  if (currentSort === "category") {
    categoryFilterDiv.style.display = "flex"
  } else {
    categoryFilterDiv.style.display = "none"
    // Reset category filter when not sorting by category
    currentCategory = "all"
    categorySelect.value = "all"
  }

  renderBlogs()
}

// Handle category change
function handleCategoryChange() {
  currentCategory = categorySelect.value
  console.log("Category changed to:", currentCategory) // Log the category change
  renderBlogs()
}

// Render blogs function
function renderBlogs() {
  // Clear loading message
  blogListElement.innerHTML = ""

  // Get blogs from localStorage or use default data
  let blogs = getBlogs()

  console.log("Blogs before filtering:", blogs.length) // Log the number of blogs before filtering

  // Apply sorting
  blogs = sortBlogs(blogs)

  // Apply category filtering if needed
  if (currentSort === "category" && currentCategory !== "all") {
    const normalizedSelectedCategory = normalizeCategory(currentCategory)
    console.log("Normalized selected category:", normalizedSelectedCategory)

    blogs = blogs.filter((blog) => {
      const matches = blog.normalizedCategory === normalizedSelectedCategory
      console.log(`Blog category: ${blog.category}, normalized: ${blog.normalizedCategory}, matches: ${matches}`)
      return matches
    })
  }

  // Apply category menu filtering
  if (selectedCategories.length > 0 && activeCategory !== "all") {
    const normalizedSelectedCategories = selectedCategories.map((cat) => normalizeCategory(cat))
    blogs = blogs.filter((blog) => normalizedSelectedCategories.includes(blog.normalizedCategory))
  }

  console.log("Blogs after filtering:", blogs.length) // Log the number of blogs after filtering

  // Render each blog
  if (blogs.length === 0) {
    blogListElement.innerHTML = '<div class="no-results">No blogs found matching your criteria.</div>'
  } else {
    blogs.forEach((blog) => {
      const blogElement = createBlogElement(blog)
      blogListElement.appendChild(blogElement)
    })
  }
}

// Sort blogs based on current sort selection
function sortBlogs(blogs) {
  switch (currentSort) {
    case "favorites":
      // Sort by favorites first, then alphabetically by title
      return [...blogs].sort((a, b) => {
        if (a.favorite === b.favorite) {
          return a.title.localeCompare(b.title)
        }
        return a.favorite ? -1 : 1
      })

    case "category":
      // Sort by category, then by favorites, then by title
      return [...blogs].sort((a, b) => {
        if (a.normalizedCategory === b.normalizedCategory) {
          if (a.favorite === b.favorite) {
            return a.title.localeCompare(b.title)
          }
          return a.favorite ? -1 : 1
        }
        return a.normalizedCategory.localeCompare(b.normalizedCategory)
      })

    default:
      // Default sort (by ID)
      return [...blogs]
  }
}

// Create blog element
function createBlogElement(blog) {
  const blogElement = document.createElement("div")
  blogElement.className = "feed-item"
  blogElement.dataset.id = blog.id

  // Debug the blog object to see what properties are available
  console.log("Creating element for blog:", blog)

  // Get emoji for category
  const emoji = categoryEmojis[blog.category] || "📁"

  // Determine link status class
  let linkStatusClass = ""
  let linkStatusTitle = ""
  let brokenLinkIndicator = ""

  if (blog.status === false) {
    linkStatusClass = "link-broken"
    linkStatusTitle = 'title="This link may have an invalid format"'
    brokenLinkIndicator = '<span class="broken-link-indicator" aria-label="Possible invalid link format"> ⚠️</span>'
  } else if (blog.status === null) {
    linkStatusClass = "link-unknown"
    linkStatusTitle = 'title="Link status could not be determined"'
  }

  blogElement.innerHTML = `
        <div class="feed-item-content">
            <div class="feed-item-header">
                <div>
                    <div class="feed-item-title">
                        <a href="${blog.url}" target="_blank" rel="noopener noreferrer" class="${linkStatusClass}" ${linkStatusTitle}>
                            ${blog.title}${brokenLinkIndicator}
                        </a>
                    </div>
                    <div class="feed-item-author">${blog.author !== "NA" ? blog.author : "Unknown Author"}</div>
                </div>
                <button class="star-button ${blog.favorite ? "favorite" : ""}" aria-label="${blog.favorite ? "Remove from favorites" : "Add to favorites"}">
                    ⭐
                </button>
            </div>
            <p class="feed-item-description">${blog.description !== "NA" ? blog.description : "No description available"}</p>
            <div class="feed-item-categories">
                <span class="feed-item-category">${emoji} ${blog.category}</span>
            </div>
        </div>
    `

  // Add event listener to star button
  const starButton = blogElement.querySelector(".star-button")
  starButton.addEventListener("click", () => toggleFavorite(blog.id))

  return blogElement
}

// Toggle favorite status
function toggleFavorite(id) {
  const blogs = getBlogs()
  const updatedBlogs = blogs.map((blog) => (blog.id === id ? { ...blog, favorite: !blog.favorite } : blog))

  // Save to localStorage
  localStorage.setItem("blogroll_blogs", JSON.stringify(updatedBlogs))

  // Update UI
  const starButton = document.querySelector(`.feed-item[data-id="${id}"] .star-button`)
  starButton.classList.toggle("favorite")
  starButton.setAttribute(
    "aria-label",
    starButton.classList.contains("favorite") ? "Remove from favorites" : "Add to favorites",
  )

  // Re-render if sorting by favorites
  if (currentSort === "favorites") {
    renderBlogs()
  }
}

// Get blogs from localStorage or use default data
function getBlogs() {
  const storedBlogs = localStorage.getItem("blogroll_blogs")
  if (storedBlogs) {
    // Make sure stored blogs have normalized categories
    const parsedBlogs = JSON.parse(storedBlogs)
    return parsedBlogs.map((blog) => ({
      ...blog,
      normalizedCategory: normalizeCategory(blog.category),
    }))
  }
  return blogData
}

// Toggle "Go to Top" button visibility
function toggleGoToTopButton() {
  if (window.pageYOffset > 300) {
    goToTopButton.classList.add("visible")
  } else {
    goToTopButton.classList.remove("visible")
  }
}

// Theme functions
function initTheme() {
  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem("blogroll_theme")
  if (savedTheme) {
    setTheme(savedTheme)
  } else {
    // Check system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setTheme(prefersDark ? "dark" : "light")
  }

  // Add event listeners to theme buttons
  lightThemeButton.addEventListener("click", () => setTheme("light"))
  darkThemeButton.addEventListener("click", () => setTheme("dark"))
}

function setTheme(theme) {
  if (theme === "dark") {
    document.body.setAttribute("data-theme", "dark")
    lightThemeButton.classList.remove("active")
    darkThemeButton.classList.add("active")
  } else {
    document.body.removeAttribute("data-theme")
    lightThemeButton.classList.add("active")
    darkThemeButton.classList.remove("active")
  }

  // Save preference
  localStorage.setItem("blogroll_theme", theme)
}

// Social sharing functions
function shareOnLinkedIn() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent("My Blogroll")
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank")
}

function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent("Check out my blogroll!")
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank")
}

function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
}

function shareViaEmail() {
  const subject = encodeURIComponent("My Blogroll")
  const body = encodeURIComponent(`Check out my blogroll: ${window.location.href}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
  const copyTooltip = document.getElementById("copyTooltip")
  copyTooltip.classList.add("show")
  setTimeout(() => {
    copyTooltip.classList.remove("show")
  }, 2000)
}

