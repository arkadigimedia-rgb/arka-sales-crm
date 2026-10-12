Add-Type -AssemblyName System.Drawing

$iconsDir = "public\icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

function Make-Icon([int]$s, [string]$outPath, [bool]$isFavicon = $false) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $pad = [Math]::Max(1, [int]($s / 18))
    $r = [Math]::Max(2, [int]($s / 5))
    $d = $r * 2
    $rect = New-Object System.Drawing.Rectangle $pad, $pad, ($s - $pad * 2), ($s - $pad * 2)

    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $gp.AddArc(($rect.Right - $d), $rect.Y, $d, $d, 270, 90)
    $gp.AddArc(($rect.Right - $d), ($rect.Bottom - $d), $d, $d, 0, 90)
    $gp.AddArc($rect.X, ($rect.Bottom - $d), $d, $d, 90, 90)
    $gp.CloseFigure()

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(22, 99, 75))
    $g.FillPath($bgBrush, $gp)

    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(38, 142, 109)), ([Math]::Max(1, [float]($s / 64)))
    $g.DrawPath($borderPen, $gp)

    $goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 196, 141))
    $fontSize = [float]($s * 0.58)
    $font = New-Object System.Drawing.Font "Arial", $fontSize, "Bold", "Pixel"
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $yOffset = [float]($s * 0.49)
    $letter = "A"
    $g.DrawString($letter, $font, $goldBrush, [float]($s * 0.5), $yOffset, $sf)

    if ($isFavicon) {
        $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
        $fs = [System.IO.File]::Create($outPath)
        $icon.Save($fs)
        $fs.Close()
    } else {
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $g.Dispose()
    $bmp.Dispose()
}

Make-Icon 192 "public\icons\icon-192x192.png"
Make-Icon 512 "public\icons\icon-512x512.png"
Make-Icon 180 "public\icons\apple-touch-icon.png"
Make-Icon 64 "public\favicon.ico" $true
Write-Host "PWA icons generated successfully!"
