<#
.SYNOPSIS
  Publishes a PowerPoint deck to the /slideshow/ tool.

.DESCRIPTION
  Opens the deck with the locally installed PowerPoint (read-only), exports every visible slide
  as WebP images (full size + thumbnail), extracts slide titles, chapters and visible text
  (used as alt text and for search) and adds or replaces the deck in decks.json.
  Speaker notes are never exported. Requires Windows, PowerPoint and Python with Pillow.

.EXAMPLE
  .\slideshow\build-decks.ps1 -Path .\deck.pptx -Id github-copilot-basics -Title "GitHub Copilot" -Description "..."
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $Path,
  [Parameter(Mandatory)] [ValidatePattern('^[a-z0-9][a-z0-9-]*$')] [string] $Id,
  [Parameter(Mandatory)] [string] $Title,
  [string] $Description = '',
  [string] $Language = 'en',
  [string] $Author = 'Benoit Gaumard',
  [string] $Date = (Get-Date -Format 'yyyy-MM-dd'),
  [string[]] $Tags = @(),
  [int] $Width = 1600,
  [int] $ThumbWidth = 360
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$deckDir = Join-Path $root "decks\$Id"
$manifestPath = Join-Path $root 'decks.json'
$source = (Resolve-Path -LiteralPath $Path).Path
$tmp = Join-Path ([IO.Path]::GetTempPath()) "slideshow-$Id-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

function Get-Texts($slide) {
  $texts = New-Object System.Collections.Generic.List[string]
  foreach ($shape in $slide.Shapes) {
    $items = if ($shape.Type -eq 6) { @($shape.GroupItems) } else { @($shape) }
    foreach ($item in $items) {
      if ($item.HasTextFrame -and $item.TextFrame.HasText) {
        $value = ($item.TextFrame.TextRange.Text -replace '[\r\n\v]+', ' ' -replace '\s+', ' ').Trim()
        if ($value) { $texts.Add($value) }
      }
    }
  }
  return ,$texts
}

$powerPoint = New-Object -ComObject PowerPoint.Application
try {
  $deck = $powerPoint.Presentations.Open($source, $true, $false, $false)
  $ratio = $deck.PageSetup.SlideHeight / $deck.PageSetup.SlideWidth
  $height = [int][Math]::Round($Width * $ratio)
  $slides = @()
  $chapters = @()
  foreach ($slide in $deck.Slides) {
    if ($slide.SlideShowTransition.Hidden) { continue }
    $slide.Export((Join-Path $tmp ('{0:D3}.png' -f ($slides.Count + 1))), 'PNG', $Width * 2, $height * 2)
    $texts = Get-Texts $slide
    $first = if ($texts.Count) { $texts[0] } else { '' }
    $slideTitle = $first
    if ($first -match '^(\d{1,2}|[A-Z])$' -and $texts.Count -ge 3) {
      $slideTitle = $texts[2]
      $chapters += [ordered]@{ label = $first; title = $texts[2]; slide = $slides.Count + 1 }
    } elseif ($first.StartsWith('//') -and $texts.Count -ge 2) {
      $slideTitle = $texts[1]
    }
    if ($slideTitle.Length -gt 90) { $slideTitle = $slideTitle.Substring(0, 87).TrimEnd() + '...' }
    $text = ($texts -join ' · ')
    if ($text.Length -gt 600) { $text = $text.Substring(0, 597).TrimEnd() + '...' }
    $slides += [ordered]@{ title = $slideTitle; text = $text }
  }
  $deck.Close()
} finally {
  $powerPoint.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
}

if (Test-Path $deckDir) { Remove-Item -Recurse -Force $deckDir }
New-Item -ItemType Directory -Force -Path $deckDir | Out-Null
$convert = @'
import sys, pathlib
from PIL import Image
src, dst, width, thumb = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
for png in sorted(src.glob("*.png")):
    with Image.open(png) as im:
        im = im.convert("RGB")
        im.resize((width, round(im.height * width / im.width)), Image.LANCZOS).save(dst / f"{png.stem}.webp", "WEBP", quality=84, method=6)
        im.resize((thumb, round(im.height * thumb / im.width)), Image.LANCZOS).save(dst / f"{png.stem}-thumb.webp", "WEBP", quality=72, method=6)
'@
$convert | python - $tmp $deckDir $Width $ThumbWidth
if ($LASTEXITCODE) { throw "Image conversion failed ($LASTEXITCODE)" }
Remove-Item -Recurse -Force $tmp

$manifest = if (Test-Path $manifestPath) { Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json } else { [pscustomobject]@{ decks = @() } }
$entry = [pscustomobject][ordered]@{
  id = $Id
  title = $Title
  description = $Description
  language = $Language
  author = $Author
  date = $Date
  tags = @($Tags)
  width = $Width
  height = $height
  slideCount = $slides.Count
  chapters = @($chapters)
  slides = @($slides)
}
$decks = @(@($manifest.decks | Where-Object { $_.id -ne $Id }) + $entry |
  Sort-Object -Property @{ Expression = 'date'; Descending = $true }, @{ Expression = 'id'; Descending = $true })
$json = [ordered]@{ generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); decks = $decks } | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($manifestPath, $json + "`n", (New-Object Text.UTF8Encoding($false)))
Write-Host "Published $Id : $($slides.Count) slides, $($chapters.Count) chapters -> $deckDir"
