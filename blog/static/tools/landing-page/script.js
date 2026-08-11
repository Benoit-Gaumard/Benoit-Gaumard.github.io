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
    const text = encodeURIComponent(
      `Check out this collection of tools for Azure and Microsoft technologies: ${document.title}`,
    )
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank")
  }

  function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
  }

  function shareViaEmail() {
    const subject = encodeURIComponent(document.title)
    const body = encodeURIComponent(
      `I thought you might be interested in this collection of tools for Azure and Microsoft technologies: ${window.location.href}`,
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
    // Hide preloader
    setTimeout(() => {
      document.getElementById("preloader").classList.add("hidden")
    }, 500)

    // Set up theme toggle
    document.getElementById("themeToggle").addEventListener("click", toggleTheme)

    // Initialize theme
    initTheme()

    // Set up go to top button
    document.getElementById("goToTop").addEventListener("click", scrollToTop)
    window.addEventListener("scroll", handleScroll)
  })

