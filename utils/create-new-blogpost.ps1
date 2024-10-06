Param(
    [Parameter(Mandatory=$true)]
    [string]$title
)

$date = Get-Date

$fileName = $date.ToString("yyyy-MM-dd-");
$temp = $title.ToLowerInvariant().Normalize([System.Text.NormalizationForm]::FormD)

$temp.ToCharArray() | %{ 
    $unicodeCategory = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_)
    
    $character = $_

    switch ( $unicodeCategory ) {
        LowercaseLetter { $fileName += $character }
        DecimalDigitNumber { $fileName += $character }
        SpaceSeparator { if ($fileName[$fileName.Length - 1] -ne '-') { $fileName += '-' }}
    }
}

if ($fileName[$fileName.Length - 1] -eq '-') {
    $fileName = $fileName.Remove($fileName.Length - 1, 1)
}

$fileName += ".md"

 
$newPost = "---
layout: post
title: $title
date: $($date.ToString('yyyy-MM-dd'))
categories: [  ]
githubcommentIdtoreplace: 
---

"

$filePath = "$PSScriptRoot\..\_posts\$fileName"

New-Item $filePath

$newPost | Out-File $filePath -Encoding utf8