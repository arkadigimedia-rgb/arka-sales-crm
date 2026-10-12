$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ExePath = Join-Path (Split-Path -Parent $PSScriptRoot) "ARKA-Sales-CRM.exe"

if (-not (Test-Path $ExePath)) {
    $ExePath = (Resolve-Path "..\ARKA-Sales-CRM.exe" -ErrorAction SilentlyContinue).Path
}

if (-not (Test-Path $ExePath)) {
    Write-Error "Could not locate ARKA-Sales-CRM.exe"
    exit 1
}

$ShortcutPath = Join-Path $DesktopPath "ARKA Sales CRM.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = Split-Path -Parent $ExePath
$Shortcut.Description = "ARKA Internal Sales Command Center"
$Shortcut.IconLocation = "$ExePath, 0"
$Shortcut.Save()

Write-Host "Created Desktop Shortcut: $ShortcutPath"
