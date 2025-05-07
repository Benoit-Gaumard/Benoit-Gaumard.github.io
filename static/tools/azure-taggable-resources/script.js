// CSV parsing function
function parseCSV(csv) {
    const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split(',');

    console.log("CSV Headers:", headers);

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj = {};
        const currentLine = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            const headerName = headers[j].trim();
            obj[headerName] = currentLine[j] ? currentLine[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}

// Format tag support for display
function formatTagSupport(value) {
    if (!value) return '<span class="tag-no">No</span>';

    const lowerValue = String(value).toLowerCase();
    if (lowerValue === 'true') {
        return '<span class="tag-yes">Yes</span>';
    } else if (lowerValue === 'false') {
        return '<span class="tag-no">No</span>';
    } else if (lowerValue === 'partial') {
        return '<span class="tag-partial">Partial</span>';
    }
    return value;
}

// Update statistics
function updateStats(data) {
    console.log("Updating stats with data:", data.slice(0, 3));

    let taggableCount = 0;
    let notTaggableCount = 0;
    let costReportCount = 0;
    let noCostReportCount = 0;

    // Find the exact column names from the first data item
    if (data.length > 0) {
        const sampleItem = data[0];
        const columnNames = Object.keys(sampleItem);
        console.log("Actual column names in data:", columnNames);

        // Find the supportsTags and costReport columns (case insensitive)
        const supportsTagsColumn = columnNames.find(col =>
            col.toLowerCase() === 'supportstags');
        const costReportColumn = columnNames.find(col =>
            col.toLowerCase() === 'costreport');

        console.log("Using columns:", { supportsTagsColumn, costReportColumn });

        if (supportsTagsColumn && costReportColumn) {
            data.forEach(item => {
                const supportsTagsValue = item[supportsTagsColumn];
                const costReportValue = item[costReportColumn];

                // Check for TRUE/FALSE values
                if (supportsTagsValue && String(supportsTagsValue).toLowerCase() === 'true') {
                    taggableCount++;
                } else if (supportsTagsValue && String(supportsTagsValue).toLowerCase() === 'false') {
                    notTaggableCount++;
                }

                if (costReportValue && String(costReportValue).toLowerCase() === 'true') {
                    costReportCount++;
                } else {
                    // Count resources that don't pass tags to cost reports
                    noCostReportCount++;
                }
            });
        } else {
            console.error("Could not find required columns in data");
        }
    }

    console.log("Stats calculated:", { taggableCount, notTaggableCount, costReportCount, noCostReportCount });

    document.getElementById('taggableCount').textContent = taggableCount;
    document.getElementById('notTaggableCount').textContent = notTaggableCount;
    document.getElementById('costReportCount').textContent = costReportCount;
    document.getElementById('noCostReportCount').textContent = noCostReportCount;
}

// Initialize DataTable
function initializeDataTable(data) {
    // Find the exact column names from the first data item
    if (data.length > 0) {
        const sampleItem = data[0];
        const columnNames = Object.keys(sampleItem);

        // Find the column names (case insensitive)
        const providerNameColumn = columnNames.find(col =>
            col.toLowerCase() === 'providername');
        const resourceTypeColumn = columnNames.find(col =>
            col.toLowerCase() === 'resourcetype');
        const supportsTagsColumn = columnNames.find(col =>
            col.toLowerCase() === 'supportstags');
        const costReportColumn = columnNames.find(col =>
            col.toLowerCase() === 'costreport');

        console.log("DataTable using columns:", {
            providerNameColumn,
            resourceTypeColumn,
            supportsTagsColumn,
            costReportColumn
        });

        // Ensure jQuery is loaded
        if (typeof $ === 'undefined') {
            console.error('jQuery is not loaded. Please ensure jQuery is included in your HTML.');
            return;
        }

        $(document).ready(function() {
            $('#resourceTable').DataTable({
                data: data,
                columns: [
                    {
                        data: providerNameColumn,
                        defaultContent: ''
                    },
                    {
                        data: resourceTypeColumn,
                        defaultContent: ''
                    },
                    {
                        data: supportsTagsColumn,
                        render: function(data) {
                            return formatTagSupport(data);
                        },
                        defaultContent: '<span class="tag-no">No</span>'
                    },
                    {
                        data: costReportColumn,
                        render: function(data) {
                            return formatTagSupport(data);
                        },
                        defaultContent: '<span class="tag-no">No</span>'
                    }
                ],
                responsive: true,
                dom: 'Bfrtip',
                buttons: [
                    'copy', 'csv', 'excel', 'pdf'
                ],
                pageLength: 25,
                order: [[0, 'asc'], [1, 'asc']]
            });
        });
    } else {
        console.error("No data available to initialize DataTable");
    }
}

// Fetch and process CSV data
async function fetchData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/tfitzmac/resource-capabilities/refs/heads/main/tag-support.csv');
        const csvData = await response.text();

        // Log the first few lines to debug
        console.log("CSV first lines:", csvData.split('\n').slice(0, 5));

        const data = parseCSV(csvData);

        // Log the first few parsed objects to debug
        console.log("Parsed data sample:", data.slice(0, 3));

        // Check column names
        if (data.length > 0) {
            console.log("Available columns:", Object.keys(data[0]));

            // Log some sample values to verify TRUE/FALSE format
            const sampleItem = data[0];
            const columnNames = Object.keys(sampleItem);
            const supportsTagsColumn = columnNames.find(col =>
                col.toLowerCase() === 'supportstags');
            const costReportColumn = columnNames.find(col =>
                col.toLowerCase() === 'costreport');

            if (supportsTagsColumn && costReportColumn) {
                console.log("Sample values:", {
                    supportsTags: sampleItem[supportsTagsColumn],
                    costReport: sampleItem[costReportColumn]
                });
            }
        }

        // Update stats
        updateStats(data);

        // Initialize DataTable
        initializeDataTable(data);

        // Hide preloader
        document.getElementById('preloader').style.display = 'none';
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="4" style="color: red;">Error loading data: ${error.message}. Please try again later.</td>
            </tr>
        `;
        document.getElementById('preloader').style.display = 'none';
    }
}

// Social sharing functions
function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out this Azure Taggable Resources tool:');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareOnReddit() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank');
}

function shareViaEmail() {
    const subject = encodeURIComponent(document.title);
    const body = encodeURIComponent(`Check out this Azure Taggable Resources tool: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const tooltip = document.getElementById('copyTooltip');
        tooltip.classList.add('show');
        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 2000);
    });
}

// Theme toggle functionality
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeTooltip = document.getElementById('themeTooltip');

    // SVG paths for sun and moon icons
    const sunIconPath = `
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

    const moonIconPath = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;

    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial state
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (isDark) {
        document.body.classList.add('dark');
        themeIcon.innerHTML = sunIconPath;
        themeTooltip.textContent = 'Light Mode';
    } else {
        themeIcon.innerHTML = moonIconPath;
        themeTooltip.textContent = 'Dark Mode';
    }

    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark');

        // Update icon and tooltip
        if (isDarkMode) {
            themeIcon.innerHTML = sunIconPath;
            themeTooltip.textContent = 'Light Mode';
        } else {
            themeIcon.innerHTML = moonIconPath;
            themeTooltip.textContent = 'Dark Mode';
        }

        // Save preference
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

// Go to top functionality
function initGoToTop() {
    const goToTopButton = document.getElementById('goToTop');

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300 || document.documentElement.scrollTop > 300) {
            goToTopButton.classList.add('visible');
        } else {
            goToTopButton.classList.remove('visible');
        }
    });

    // Scroll to top when button is clicked
    goToTopButton.addEventListener('click', (e) => {
        // If it's an anchor tag, prevent default behavior
        if (goToTopButton.tagName.toLowerCase() === 'a') {
            e.preventDefault();
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialize on document ready
$(document).ready(function() {
    fetchData();
    initTheme();
    initGoToTop();

    // Trigger scroll event to check if go-to-top button should be visible initially
    window.dispatchEvent(new Event('scroll'));
});