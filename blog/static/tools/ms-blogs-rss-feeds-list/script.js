// Your RSS2JSON API key
const RSS2JSON_API_KEY = "yzkycign0wt3c7nnvsrriqffk6fcv1uk1bzsqtlz" // Public Key restricted to this domain ;)

// JSON URL - fetching from GitHub repository
const BLOGS_DATA_URL =
  "https://raw.githubusercontent.com/Benoit-Gaumard/Benoit-Gaumard.github.io/refs/heads/main/static/tools/ms-blogs-list.json"

// Initialize DataTable
let dataTable

// Function to fetch and parse RSS feed using RSS2JSON
async function fetchRSSFeed(feedUrl) {
  try {
    // Clean and validate the feed URL
    const cleanFeedUrl = feedUrl.trim()
    if (!cleanFeedUrl || !cleanFeedUrl.startsWith("http")) {
      console.warn(`Invalid feed URL: ${feedUrl}`)
      return {
        lastItemDate: null,
        link: "",
      }
    }

    // Use a direct fetch with proper error handling
    const apiUrl = `https://api.rss2json.com/v1/api.json?api_key=${RSS2JSON_API_KEY}&count=1&rss_url=${encodeURIComponent(cleanFeedUrl)}`

    const response = await fetch(apiUrl)

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`HTTP error ${response.status} for feed ${cleanFeedUrl}: ${errorText}`)

      // For 422 errors, try an alternative approach
      if (response.status === 422) {
        console.log(`Trying alternative approach for feed: ${cleanFeedUrl}`)
        // Return empty data but don't fail completely
        return {
          lastItemDate: null,
          link: cleanFeedUrl, // Use the feed URL as a fallback link
        }
      }

      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === "ok" && data.items && data.items.length > 0) {
      console.log(`Feed ${cleanFeedUrl} has link: ${data.feed.link}`)
      return {
        lastItemDate: new Date(data.items[0].pubDate),
        link: data.feed.link || cleanFeedUrl,
      }
    } else {
      console.warn(`No items found for feed: ${cleanFeedUrl}`)
      return {
        lastItemDate: null,
        link: data.feed?.link || cleanFeedUrl,
      }
    }
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error)
    return {
      lastItemDate: null,
      link: feedUrl, // Use the feed URL as a fallback link
    }
  }
}

// Function to format date with indicator
function formatDate(date) {
  if (!date) return "N/A"

  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  let indicator = ""
  let colorClass = ""

  if (diffDays <= 7) {
    indicator = "●"
    colorClass = "recent"
  } else if (diffDays <= 30) {
    indicator = "●"
    colorClass = "medium"
  } else {
    indicator = "●"
    colorClass = "old"
  }

  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return {
    formattedDate: `<span class="${colorClass}" data-days="${diffDays}">${indicator}</span> ${formattedDate}`,
    diffDays: diffDays,
  }
}

// Function to initialize the DataTable
function initializeDataTable(data) {
  // Check if jQuery is loaded
  if (typeof $ === "undefined") {
    console.error("jQuery is not loaded. Please ensure jQuery is included in your project.")
    return // Exit the function if jQuery is not loaded
  }

  dataTable = $("#feedsTable").DataTable({
    data: data,
    columns: [
      {
        data: "name",
        className: "name-column",
        render: (data, type, row) => {
          if (type === "display") {
            // Add the link to the Name column - use the link property which contains the website URL
            return row.link
              ? `<a href="${row.link}" target="_blank" data-full-text="${data}">${data}</a>`
              : `<span data-full-text="${data}">${data}</span>`
          }
          return data
        },
      },
      {
        data: "category",
        className: "category-column",
        render: (data, type, row) => {
          if (type === "display") {
            return `<span class="category-badge" data-full-text="${data}">${data}</span>`
          }
          return data
        },
      },
      {
        data: "feed",
        className: "feed-column",
        render: (data, type, row) => {
          if (type === "display") {
            return data ? `<a href="${data}" target="_blank" data-full-text="${data}">RSS Feed</a>` : ""
          }
          return data
        },
      },
      {
        data: "lastDate",
        className: "date-column",
        render: (data, type, row) => {
          if (type === "display") {
            return data
          }
          // For sorting, extract the days ago value
          if (type === "sort") {
            // Extract days for sorting - lower number (more recent) should be first
            const match = data.match(/data-days="(\d+)"/)
            return match ? Number.parseInt(match[1], 10) : 9999 // Default to a high number for N/A
          }
          return data
        },
      },
      {
        data: "lastDay",
        className: "days-column",
        render: (data, type, row) => {
          if (type === "display") {
            if (data === "N/A") return data

            let colorClass = ""
            if (data <= 7) {
              colorClass = "recent"
            } else if (data <= 30) {
              colorClass = "medium"
            } else {
              colorClass = "old"
            }

            return `<span class="${colorClass}">${data} d ago</span>`
          }
          // For sorting, use the numeric value
          return data === "N/A" ? 9999 : Number.parseInt(data, 10)
        },
      },
    ],
    // Set default order to Last Day column (ascending by days - most recent first)
    order: [[4, "asc"]], // Order by Last Day with most recent first
    // Updated DataTable configuration for buttons and length menu
    dom: "Blfrtip", // Added 'l' for length menu
    buttons: [
      {
        extend: "copy",
        text: "Copy",
      },
      {
        extend: "excel",
        text: "Excel",
      },
      {
        extend: "colvis",
        text: "Columns",
      },
    ],
    lengthMenu: [
      [10, 25, 50, -1],
      [10, 25, 50, "All"],
    ],
    pageLength: -1, // Show all entries by default
    responsive: true,
    // Custom language settings
    language: {
      search: "🔍 Search:",
      lengthMenu: "Show _MENU_ entries",
      info: "Showing _START_ to _END_ of _TOTAL_ feeds",
      infoEmpty: "Showing 0 to 0 of 0 feeds",
      infoFiltered: "(filtered from _MAX_ total feeds)",
    },
    initComplete: () => {
      // Hide preloader
      document.getElementById("preloader").classList.add("hidden")
    },
  })
}

// Function to load data - updated to use JSON instead of CSV
async function loadData() {
  try {
    // Show loading message
    const tableContainer = document.querySelector(".table-container")
    tableContainer.innerHTML = '<div class="loading">Loading RSS feeds... This may take a moment.</div>'

    // Fetch JSON data
    const response = await fetch(BLOGS_DATA_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const blogsData = await response.json()

    // Process each feed to get the last item date and link
    const processedData = []
    const batchSize = 5 // Process feeds in batches to avoid overwhelming the server

    for (let i = 0; i < blogsData.length; i += batchSize) {
      const batch = blogsData.slice(i, i + batchSize)
      const batchPromises = batch.map(async (item) => {
        if (item.feed) {
          try {
            const feedData = await fetchRSSFeed(item.feed)

            // Format the date and get days ago
            const dateInfo = feedData.lastItemDate
              ? formatDate(feedData.lastItemDate)
              : { formattedDate: "N/A", diffDays: "N/A" }

            return {
              name: item.name || "",
              category: item.category || "",
              feed: item.feed || "",
              link: feedData.link || "", // This should be the website URL from the RSS feed
              lastDate: dateInfo.formattedDate,
              lastDay: dateInfo.diffDays,
            }
          } catch (error) {
            console.error(`Error processing feed ${item.feed}:`, error)
            return {
              name: item.name || "",
              category: item.category || "",
              feed: item.feed || "",
              link: "",
              lastDate: "N/A",
              lastDay: "N/A",
            }
          }
        } else {
          return {
            name: item.name || "",
            category: item.category || "",
            feed: "",
            link: "",
            lastDate: "N/A",
            lastDay: "N/A",
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      processedData.push(...batchResults)

      // Update loading message with progress
      const progress = Math.min(100, Math.round(((i + batchSize) / blogsData.length) * 100))
      tableContainer.innerHTML = `<div class="loading">Loading RSS feeds... ${progress}% complete</div>`
    }

    // Restore table container and initialize DataTable
    tableContainer.innerHTML =
      '<table id="feedsTable" class="display" style="width:100%"><thead><tr><th>Name</th><th>Category</th><th>Feed</th><th>Last Date</th><th>Last Day</th></tr></thead><tbody></tbody></table>'
    initializeDataTable(processedData)
  } catch (error) {
    console.error("Error loading data:", error)
    document.getElementById("preloader").classList.add("hidden")
    document.querySelector(".table-container").innerHTML =
      `<div class="loading">Error loading data: ${error.message}. Please try again later.</div>`
  }
}

// Theme handling
function toggleTheme() {
  const themeIcon = document.getElementById("themeIcon")
  const themeTooltip = document.getElementById("themeTooltip")

  if (document.body.hasAttribute("data-theme")) {
    // Currently dark, switch to light
    document.body.removeAttribute("data-theme")
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
    document.body.setAttribute("data-theme", "dark")
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
  const themeIcon = document.getElementById("themeIcon")
  const themeTooltip = document.getElementById("themeTooltip")
  const savedTheme = localStorage.getItem("theme")

  if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark")
    // Set moon icon
    themeIcon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `
    themeTooltip.textContent = "Light Mode"
  } else {
    document.body.removeAttribute("data-theme")
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

// Social sharing functions
function shareOnLinkedIn() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent(document.title)
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank")
}

function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent(`Check out this Microsoft blogs RSS feeds list: ${document.title}`)
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank")
}

function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
}

function shareOnReddit() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent(document.title)
  window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, "_blank")
}

function shareViaEmail() {
  const subject = encodeURIComponent(document.title)
  const body = encodeURIComponent(
    `I thought you might be interested in this Microsoft blogs RSS feeds list: ${window.location.href}`,
  )
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const tooltip = document.getElementById("copyTooltip")
    tooltip.classList.add("show")
    setTimeout(() => {
      tooltip.classList.remove("show")
    }, 2000)
  })
}

// Go to top button functionality
function handleScroll() {
  const goToTopBtn = document.getElementById("goToTop")
  if (window.scrollY > 300) {
    goToTopBtn.classList.add("visible")
  } else {
    goToTopBtn.classList.remove("visible")
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  })
}

// Initialize on document ready
document.addEventListener("DOMContentLoaded", () => {
  // Load data
  loadData()

  // Set up theme toggle
  document.getElementById("themeToggle").addEventListener("click", toggleTheme)

  // Initialize theme
  initTheme()

  // Set up go to top button
  document.getElementById("goToTop").addEventListener("click", scrollToTop)
  window.addEventListener("scroll", handleScroll)
})
