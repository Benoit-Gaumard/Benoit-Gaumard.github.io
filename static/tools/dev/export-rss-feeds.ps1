# Read the content of links.html file
$content = Get-Content -Path "links.html" -Raw

# Use regex pattern to find all href links
$pattern = "(?i)href=[`"']([^`"']+)[`"']"
$urlMatches = [regex]::Matches($content, $pattern)

# Create an array of feed objects
$feeds = $urlMatches | ForEach-Object {
    $url = $_.Groups[1].Value
    if ($url -match "techcommunity\.microsoft\.com/category/(.+)/blog/(.+)$") {
        $boardId = $matches[2]
        $feedUrl = "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=$boardId"

        # Enhanced category mapping
        $category = switch -Regex ($matches[2]) {
            "Cloud|Storage|Cluster|Clustering|Infra|Infrastructure|Stack|Virtualization|Compute|Confidential Computin" { "Cloud Infrastructure" }
            "Network" { "Cloud Infrastructure" }
            "Architecture" { "Architecture" }
            "Containers" { "Containers" }
            "Analytics" { "Analytics" }
            "Partner" { "Partner" }
            "Finops" { "Finops" }
            "Security|Identity|Compliance|Defender|Threat|Purview|Sentinel" { "Security" }
            "Identity|Access|entra|Entra" { "Identity" }
            "Fast Track|Fast|FastTrack" { "Fast Track" }
            "ITOps" { "ITOps" }
            "Outlook" { "Outlook" }
            "Green" { "Sustainability" }
            "Endpoint Manager|Intune" { "Endpoints" }
            "Italy" { "Italy" }
            "Novidades|Portugal" { "Portugal" }
            "Kumppanifoorumi" { "Finland" }
            "Denmark" { "Denmark" }
            "Norway" { "Norway" }
            "Office" { "Office" }
            "Azure Arc" { "Arc" }
            "HPC" { "HPC" }
            "Copilot" { "Copilot" }
            "Microsoft 365|M365|365" { "Microsoft 365" }
            "Storage|Access" { "Storage" }
            "Virtualization" { "Virtualization" }
            "Identity|Access" { "Identity" }
            "Developer|DevOps|GitHub|Visual-Studio|Code" { "Development Tools" }
            "Teams|Office|Microsoft365|SharePoint|Exchange|Skype|OneDrive|Bing|Forms|Sharepoint" { "Productivity" }
            "AI|Machine-Learning|Cognitive|Machine Learning" { "AI" }
            "Fabrics|MySQL|SQL|Synapse|Data Factory|Data|SSIS|Database|Cosmos|Fabric" { "Data" }
            "Windows|Surface|Edge|Desktop" { "Windows" }
            "Viva|Surface|Edge|Desktop" { "Collaboration" }
            default { "Others" }
        }

        @{
            name = [regex]::Replace($boardId, '([a-z])([A-Z])', '$1 $2').Replace('-',' ').Replace('_',' ')
            url = $feedUrl
            category = $category
        }
    }
}

# Output in the desired format
$feeds | ForEach-Object {
    "{ name: `"$($_.name)`", url: `"$($_.url)`", category: `"$($_.category)`" },"
} | Set-Content -Path "feeds.txt"


$feeds.count
