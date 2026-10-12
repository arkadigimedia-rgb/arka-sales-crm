# Build script for ARKA-Sales-CRM.exe
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

$icoPath = Join-Path $scriptDir "arka.ico"
$csPath = Join-Path $scriptDir "ArkaSalesCRM.cs"
$assemblyInfo = Join-Path $scriptDir "AssemblyInfo.cs"
$outExe = Join-Path $projectRoot "ARKA-Sales-CRM.exe"

Write-Host "Compiling ARKA-Sales-CRM.exe..."
& $cscPath /target:winexe /win32icon:$icoPath /out:$outExe $csPath $assemblyInfo

if (Test-Path $outExe) {
    Write-Host "Successfully built: $outExe"
    $fileInfo = Get-Item $outExe
    Write-Host "Size: $([math]::Round($fileInfo.Length / 1KB, 1)) KB"
} else {
    Write-Error "Build failed."
}
