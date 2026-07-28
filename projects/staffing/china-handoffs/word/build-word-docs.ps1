$ErrorActionPreference = 'Stop'

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$documents = @(
    @{
        Source = 'extensibility-feeds-executive.html'
        Output = 'Extensibility-and-Feeds-Collaboration-Opportunities.docx'
        Title  = 'Extensibility and Feeds — Collaboration Opportunities'
    },
    @{
        Source = 'admin-governance-executive.html'
        Output = 'Admin-and-Governance-Collaboration-Opportunities.docx'
        Title  = 'Admin and Governance — Collaboration Opportunities'
    },
    @{
        Source = 'policy-compliance-executive.html'
        Output = 'Policy-and-Compliance-Collaboration-Opportunities.docx'
        Title  = 'Policy and Compliance — Collaboration Opportunities'
    },
    @{
        Source = 'openclaw-feeds-expert-review.html'
        Output = 'OpenClaw-Feeds-Expert-Review.docx'
        Title  = 'OpenClaw Feeds — Expert Review and Collaboration Brief'
    }
)

$word = $null
$document = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    foreach ($item in $documents) {
        $sourcePath = Join-Path $sourceDir $item.Source
        $outputPath = Join-Path $sourceDir $item.Output

        $document = $word.Documents.Open($sourcePath, $false, $true)
        $document.TrackRevisions = $false

        foreach ($section in $document.Sections) {
            $section.PageSetup.TopMargin = 46.8
            $section.PageSetup.BottomMargin = 46.8
            $section.PageSetup.LeftMargin = 46.8
            $section.PageSetup.RightMargin = 46.8
            $footer = $section.Footers.Item(1)
            $footer.Range.Text = 'Prepared 2026-07-27 • Collaboration brief • Dated PR state must be refreshed'
            $footer.Range.Font.Name = 'Aptos'
            $footer.Range.Font.Size = 8
            $footer.Range.Font.Color = 8421504
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($footer)
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($section)
        }

        $document.SaveAs2($outputPath, 16)
        $document.Close(0)
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
        $document = $null
        Write-Output $outputPath
    }
}
finally {
    if ($null -ne $document) {
        try { $document.Close(0) } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
    }
    if ($null -ne $word) {
        try { $word.Quit() } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
