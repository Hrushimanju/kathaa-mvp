# ============================================================
#  Athi 360 - Bridge OneCore Indian voices into SAPI (browsers)
#  Run the SAME way as before:
#    powershell -ExecutionPolicy Bypass -File "D:\Athi 360\apps\kathaa-mvp\copy-onecore-voices.ps1"
#  Approve the UAC prompt.
# ============================================================

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$src = 'HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens'
$dst = 'HKLM:\SOFTWARE\Microsoft\Speech\Voices\Tokens'

Write-Host "== Athi 360: Bridging OneCore voices -> SAPI (browser-visible) ==" -ForegroundColor Cyan

# Find Indian voices in OneCore
$indian = Get-ChildItem $src -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match 'enIN|EN-IN' }

if (-not $indian) {
    Write-Host "No en-IN voice tokens found in OneCore?! Listing everything present:" -ForegroundColor Red
    Get-ChildItem $src -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PSChildName
    exit
}

foreach ($voice in $indian) {
    $name = $voice.PSChildName
    $target = Join-Path $dst $name
    if (Test-Path $target) { Write-Host "ALREADY BRIDGED: $name" -ForegroundColor Green; continue }

    # Mirror the whole token key tree (attributes included) via reg.exe
    $srcKey = "HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\$name"
    $dstKey = "HKLM\SOFTWARE\Microsoft\Speech\Voices\Tokens\$name"
    reg copy $srcKey $dstKey /s /f | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "BRIDGED: $name" -ForegroundColor Green }
    else { Write-Host "FAILED: $name (exit $LASTEXITCODE)" -ForegroundColor Red }
}

Write-Host ""
Write-Host "-- Indian voices now visible on the SAPI shelf (what Chrome reads) --" -ForegroundColor Yellow
Get-ChildItem $dst -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match 'enIN|EN-IN' } | Select-Object -ExpandProperty PSChildName

Write-Host ""
Write-Host "DONE. Now: fully CLOSE Chrome (all windows) -> reopen -> reload the app." -ForegroundColor Cyan
Write-Host "The warning banner should be gone and Heera/Ravi will speak." -ForegroundColor Cyan