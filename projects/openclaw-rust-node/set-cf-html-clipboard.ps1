param(
    [Parameter(Mandatory = $true)]
    [string]$HtmlPath
)

$html = Get-Content -Raw -LiteralPath $HtmlPath
$bodyMatch = [regex]::Match($html, '(?is)<body[^>]*>(.*)</body>')
$fragment = if ($bodyMatch.Success) { $bodyMatch.Groups[1].Value.Trim() } else { $html.Trim() }
$document = "<html><body><!--StartFragment-->$fragment<!--EndFragment--></body></html>"
$headerTemplate = "Version:1.0`r`nStartHTML:{0:D10}`r`nEndHTML:{1:D10}`r`nStartFragment:{2:D10}`r`nEndFragment:{3:D10}`r`n"
$placeholder = $headerTemplate -f 0, 0, 0, 0
$utf8 = [System.Text.Encoding]::UTF8
$startHtml = $utf8.GetByteCount($placeholder)
$startMarker = '<!--StartFragment-->'
$endMarker = '<!--EndFragment-->'
$startFragment = $startHtml + $utf8.GetByteCount($document.Substring(0, $document.IndexOf($startMarker) + $startMarker.Length))
$endFragment = $startHtml + $utf8.GetByteCount($document.Substring(0, $document.IndexOf($endMarker)))
$endHtml = $startHtml + $utf8.GetByteCount($document)
$cfHtml = ($headerTemplate -f $startHtml, $endHtml, $startFragment, $endFragment) + $document
$plain = ([regex]::Replace($fragment, '(?is)<li[^>]*>', "`r`n- ") -replace '(?is)</li>', '' -replace '(?is)<br\s*/?>', "`r`n" -replace '(?is)</p>|</h2>|</div>', "`r`n" -replace '(?is)<[^>]+>', '')
$plain = [System.Net.WebUtility]::HtmlDecode($plain)
$plain = [regex]::Replace($plain, '(\r?\n\s*){3,}', "`r`n`r`n").Trim()

Add-Type -AssemblyName System.Windows.Forms
$data = New-Object System.Windows.Forms.DataObject
$data.SetData('HTML Format', $cfHtml)
$data.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plain)
[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)

Write-Output "cf_html_chars=$($cfHtml.Length) plain_chars=$($plain.Length)"
