[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$HtmlPath,

  [string]$PlainTextPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  throw "CF_HTML clipboard publishing requires Windows."
}

if ([System.Threading.Thread]::CurrentThread.ApartmentState -ne "STA") {
  throw "Run this script with powershell.exe -STA so Windows Forms can access the clipboard."
}

$resolvedHtmlPath = (Resolve-Path -LiteralPath $HtmlPath).Path
$html = Get-Content -LiteralPath $resolvedHtmlPath -Raw

$startMarker = "<!--StartFragment-->"
$endMarker = "<!--EndFragment-->"
$startMarkerIndex = $html.IndexOf($startMarker, [System.StringComparison]::Ordinal)
$endMarkerIndex = $html.IndexOf($endMarker, [System.StringComparison]::Ordinal)

if ($startMarkerIndex -lt 0 -or $endMarkerIndex -lt 0) {
  throw "HTML must contain <!--StartFragment--> and <!--EndFragment--> markers."
}

$startFragmentChar = $startMarkerIndex + $startMarker.Length
if ($endMarkerIndex -le $startFragmentChar) {
  throw "CF_HTML fragment markers are empty or out of order."
}

if ($PlainTextPath) {
  $resolvedTextPath = (Resolve-Path -LiteralPath $PlainTextPath).Path
  $plainText = Get-Content -LiteralPath $resolvedTextPath -Raw
} else {
  $fragment = $html.Substring($startFragmentChar, $endMarkerIndex - $startFragmentChar)
  $fragment = [regex]::Replace(
    $fragment,
    '<a\s+[^>]*href=(["''])(?<url>.*?)\1[^>]*>(?<text>.*?)</a>',
    {
      param($match)
      $label = [regex]::Replace($match.Groups["text"].Value, "<[^>]+>", "")
      "$label ($($match.Groups["url"].Value))"
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  $fragment = [regex]::Replace(
    $fragment,
    "<br\s*/?>",
    "`r`n",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  $fragment = [regex]::Replace(
    $fragment,
    "</(h1|h2|h3|h4|p|li|section|article|header|footer)>",
    "`r`n`r`n",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  $fragment = [regex]::Replace($fragment, "<[^>]+>", "")
  $fragment = [System.Net.WebUtility]::HtmlDecode($fragment)
  $fragment = [regex]::Replace($fragment, "[ `t]+", " ")
  $fragment = [regex]::Replace($fragment, " *`r?`n *", "`r`n")
  $plainText = [regex]::Replace($fragment, "(`r`n){3,}", "`r`n`r`n").Trim()
}

$sourceUrl = ([System.Uri]$resolvedHtmlPath).AbsoluteUri
$headerTemplate = @"
Version:1.0`r
StartHTML:{0:D10}`r
EndHTML:{1:D10}`r
StartFragment:{2:D10}`r
EndFragment:{3:D10}`r
SourceURL:{4}`r

"@

$utf8 = [System.Text.Encoding]::UTF8
$emptyHeader = $headerTemplate -f 0, 0, 0, 0, $sourceUrl
$startHtml = $utf8.GetByteCount($emptyHeader)
$endHtml = $startHtml + $utf8.GetByteCount($html)
$startFragment = $startHtml + $utf8.GetByteCount($html.Substring(0, $startFragmentChar))
$endFragment = $startHtml + $utf8.GetByteCount($html.Substring(0, $endMarkerIndex))
$header = $headerTemplate -f $startHtml, $endHtml, $startFragment, $endFragment, $sourceUrl
$payload = $header + $html

Add-Type -AssemblyName System.Windows.Forms

$data = New-Object System.Windows.Forms.DataObject
$data.SetData([System.Windows.Forms.DataFormats]::Html, $payload)
$data.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plainText)
$data.SetData([System.Windows.Forms.DataFormats]::Text, $plainText)
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)

$clipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
$htmlPresent = $clipboard.GetDataPresent([System.Windows.Forms.DataFormats]::Html)
$unicodePresent = $clipboard.GetDataPresent([System.Windows.Forms.DataFormats]::UnicodeText)
$textPresent = $clipboard.GetDataPresent([System.Windows.Forms.DataFormats]::Text)

if (-not $htmlPresent -or -not $unicodePresent -or -not $textPresent) {
  throw "Clipboard verification failed: HTML=$htmlPresent Unicode=$unicodePresent Text=$textPresent"
}

[pscustomobject]@{
  HtmlPath = $resolvedHtmlPath
  HtmlBytes = $utf8.GetByteCount($html)
  FragmentBytes = $endFragment - $startFragment
  PlainTextCharacters = $plainText.Length
  CfHtml = $htmlPresent
  UnicodeText = $unicodePresent
  Text = $textPresent
}
