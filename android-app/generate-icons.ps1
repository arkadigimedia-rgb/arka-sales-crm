Add-Type -AssemblyName System.Drawing

$srcPath = "E:\ARKA-Internal-Sales-CRM-latest-source\public\icons\icon-512x512.png"
if (-not (Test-Path $srcPath)) {
    $srcPath = "E:\ARKA-Internal-Sales-CRM-latest-source\public\icons\icon-192x192.png"
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

$targets = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $targets.Keys) {
    $size = $targets[$folder]
    $destDir = "E:\ARKA-Internal-Sales-CRM-latest-source\android-app\src\main\res\$folder"
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    $destPath = Join-Path $destDir "ic_launcher.png"
    
    $destBitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $graphics.DrawImage($srcImg, 0, 0, $size, $size)
    $graphics.Dispose()
    
    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Dispose()
    Write-Host "Generated $destPath ($size x $size)"
}

$srcImg.Dispose()
Write-Host "Icons generation complete."
