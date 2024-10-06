Param(
    [int]$monthTosubstract = 1
)
$ErrorActionPreference = "Stop"


$currentDate = Get-Date

$startDate = $currentDate.AddMonths(-$monthTosubstract).ToString("yyyy-MM-01")
$endDate = (Get-Date($startDate)).AddMonths(1).AddDays(-1).ToString("yyyy-MM-dd")

$search = "label:publish created:$startDate..$endDate"
Write-Output "Searching for news with query: $search"

$news = gh issue list --repo wilfriedwoivre/feedly -L 1000  --state closed --search $search --json title,body,createdAt | convertfrom-json 

Write-Output "Found $($news.Length) news"

if ($news.Length -eq 0) {
    Write-Output "No news found for the period $startDate to $endDate"
    exit
}

$currentMonth = Get-Date($startDate) -UFormat %m
$month = (Get-Culture -Name "fr-FR").DateTimeFormat.GetMonthName($currentMonth)
$title = "Articles - Ce qu'il ne fallait pas oublier de lire en $month $((Get-Date($startDate)).ToString('yyyy'))"

$newPost = "---
layout: news
title: $title
date: $((Get-Date($endDate)).AddDays(1).ToString('yyyy-MM-dd'))
---

Voici un résumé des différents articles que j'ai partagé sur les réseaux sociaux en $month $((Get-Date($startDate)).ToString('yyyy')).

C'est un peu en vrac, mais je vais voir pour essayer de mettre des catégories pour les prochains mois.

"

foreach ($new in $news | Sort-Object -Property createdAt) {
    $response = Invoke-WebRequest $new.body -SkipHttpErrorCheck
    if ($response.StatusCode -ne 200) {
        Write-Output "Error while fetching $($new.title) $($new.body)"
    }
    else {
        $newPost += "- [$($new.title)]($($new.body))"
        $newPost += [System.Environment]::NewLine
    }
}


$fileName = "$((Get-Date($endDate)).AddDays(1).ToString('yyyy-MM-dd'))-";
$temp = $title.ToLowerInvariant().Normalize([System.Text.NormalizationForm]::FormD)

$temp.ToCharArray() | % { 
    $unicodeCategory = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_)
    
    $character = $_

    switch ( $unicodeCategory ) {
        LowercaseLetter { $fileName += $character }
        DecimalDigitNumber { $fileName += $character }
        SpaceSeparator { if ($fileName[$fileName.Length - 1] -ne '-') { $fileName += '-' } }
    }
}

if ($fileName[$fileName.Length - 1] -eq '-') {
    $fileName = $fileName.Remove($fileName.Length - 1, 1)
}

$fileName += ".md"

$newPost = $newPost -replace 'ΓÇô', '-'
$newPost = $newPost -replace 'ΓÇö', "-"


$filePath = "$PSScriptRoot\..\_news\$fileName"

New-Item $filePath

$newPost | Out-File $filePath -Encoding utf8