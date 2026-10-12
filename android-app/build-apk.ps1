# Build script for ARKA Sales CRM Android APK
$ErrorActionPreference = "Stop"

$workspaceRoot = "E:\ARKA-Internal-Sales-CRM-latest-source"
$appDir = Join-Path $workspaceRoot "android-app"
$buildDir = Join-Path $appDir "build"

$env:JAVA_HOME = "D:\amoraaa\New folder\jbr"
$sdkBuildTools = "C:\Users\dhuru\AppData\Local\Android\Sdk\build-tools\36.0.0"
$androidJar = "C:\Users\dhuru\AppData\Local\Android\Sdk\platforms\android-37.0\android.jar"

$env:PATH = "$env:JAVA_HOME\bin;$sdkBuildTools;$env:PATH"

Write-Host "=========================================="
Write-Host " Building ARKA Sales CRM Android APK"
Write-Host "=========================================="

# 1. Clean & recreate build directories
$compiledResZip = Join-Path $buildDir "res.zip"
$genDir = Join-Path $buildDir "gen"
$classesDir = Join-Path $buildDir "classes"
$dexDir = Join-Path $buildDir "dex"
$unalignedApk = Join-Path $buildDir "app-unaligned.apk"
$alignedApk = Join-Path $buildDir "app-aligned.apk"
$finalApk = Join-Path $workspaceRoot "ARKA-Sales-CRM.apk"
$keystore = Join-Path $appDir "debug.keystore"

@($genDir, $classesDir, $dexDir) | ForEach-Object {
    if (Test-Path $_) { Remove-Item $_ -Recurse -Force }
    New-Item -ItemType Directory -Path $_ -Force | Out-Null
}

# 2. AAPT2 Compile resources
Write-Host "`n[1/6] Compiling Android resources with aapt2..."
$resDir = Join-Path $appDir "src\main\res"
& aapt2 compile --dir $resDir -o $compiledResZip
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

# 3. AAPT2 Link resources and generate R.java
Write-Host "`n[2/6] Linking resources and generating R.java..."
$manifest = Join-Path $appDir "src\main\AndroidManifest.xml"
& aapt2 link -I $androidJar --manifest $manifest -o $unalignedApk --java $genDir $compiledResZip --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

# 4. Compile Java sources
Write-Host "`n[3/6] Compiling Java code with javac..."
$javaSources = @()
$javaSources += (Get-ChildItem -Path $genDir -Filter *.java -Recurse | Select-Object -ExpandProperty FullName)
$javaSources += (Get-ChildItem -Path (Join-Path $appDir "src\main\java") -Filter *.java -Recurse | Select-Object -ExpandProperty FullName)

Write-Host "Compiling $($javaSources.Count) Java source files..."
& javac -encoding UTF-8 --release 17 -cp "$androidJar;$genDir" -d $classesDir $javaSources
if ($LASTEXITCODE -ne 0) { throw "javac compilation failed" }

# 5. Dex with d8
Write-Host "`n[4/6] Converting Java bytecode to Dalvik dex with d8..."
$classFiles = (Get-ChildItem -Path $classesDir -Filter *.class -Recurse | Select-Object -ExpandProperty FullName)
& cmd.exe /c "d8.bat --release --lib `"$androidJar`" --output `"$dexDir`" $($classFiles -join ' ')"
if ($LASTEXITCODE -ne 0) { throw "d8 dexing failed" }

$dexFile = Join-Path $dexDir "classes.dex"
if (-not (Test-Path $dexFile)) { throw "classes.dex not found in $dexDir" }

# 6. Add classes.dex to the APK
Write-Host "`n[5/6] Packaging classes.dex into APK..."
& "$env:JAVA_HOME\bin\jar.exe" uf "$unalignedApk" -C "$dexDir" classes.dex
if ($LASTEXITCODE -ne 0) { throw "jar packaging classes.dex failed" }

# Align APK
Write-Host "Aligning APK with zipalign..."
if (Test-Path $alignedApk) { Remove-Item $alignedApk -Force }
& zipalign -p -f 4 $unalignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

# 7. Keystore & Sign
Write-Host "`n[6/6] Signing APK..."
if (-not (Test-Path $keystore)) {
    Write-Host "Creating debug keystore..."
    & keytool -genkeypair -v -keystore $keystore -alias androiddebugkey -keypass android -storepass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=ARKA Digital Media, OU=CRM, O=ARKA, L=Bangalore, ST=Karnataka, C=IN"
    if ($LASTEXITCODE -ne 0) { throw "keytool failed" }
}

if (Test-Path $finalApk) { Remove-Item $finalApk -Force }
& cmd.exe /c "apksigner.bat sign --ks `"$keystore`" --ks-pass pass:android --key-pass pass:android --out `"$finalApk`" `"$alignedApk`""
if ($LASTEXITCODE -ne 0) { throw "apksigner sign failed" }

# Verify signature
& cmd.exe /c "apksigner.bat verify --verbose `"$finalApk`""

$apkInfo = Get-Item $finalApk
Write-Host "`n========================================================"
Write-Host " SUCCESS! Android APK generated successfully!"
Write-Host " Path: $($apkInfo.FullName)"
Write-Host " Size: $([math]::Round($apkInfo.Length / 1KB, 2)) KB"
Write-Host "========================================================"
