# ============================================================
#  Athi 360 - Install Indian TTS voices (English India)
#  Double-click me (or right-click > Run with PowerShell).
#  Windows will ask "Allow this app to make changes?" -> YES
# ============================================================

# Self-elevate to Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "== Athi 360: Installing Indian speech voices ==" -ForegroundColor Cyan

# What capabilities exist for en-IN?
Write-Host "`n-- Available en-IN language capabilities on this machine --" -ForegroundColor Yellow
Get-WindowsCapability -Online -Name 'Language.*en-IN*' |
    Select-Object Name, State, DisplayVersion | Format-Table -AutoSize

# Install the ones that give us voices
$wanted = @(
    'Language.Speech~~~en-IN~0.0.1.0',
    'Language.TextToSpeech~~~en-IN~0.0.1.0',
    'Language.Basic~~~en-IN~0.0.1.0'
)

foreach ($name in $wanted) {
    $cap = Get-WindowsCapability -Online -Name $name -ErrorAction SilentlyContinue
    if (-not $cap) { Write-Host "SKIP (not offered): $name" -ForegroundColor DarkGray; continue }
    if ($cap.State -eq 'Installed') { Write-Host "ALREADY INSTALLED: $name" -ForegroundColor Green; continue }
    Write-Host "INSTALLING: $name (downloads from Microsoft, be patient)..." -ForegroundColor Yellow
    $res = Add-WindowsCapability -Online -Name $name
    if ($res.RestartNeeded) { Write-Host 'Restart needed later.' -ForegroundColor Magenta }
    Write-Host ("  -> " + $res.Online + " : " + $res.RestartNeeded) -ForegroundColor Green
}

Write-Host "`n-- Verify: en-IN speech voices now registered --" -ForegroundColor Yellow
Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens' -ErrorAction SilentlyContinue |
    Where-Object { $_.PSChildName -match 'enIN|EN-IN|Neerja|Swara|Heera' } |
    Select-Object -ExpandProperty PSChildName

Write-Host "`nDONE. If names like Neerja / Swara / Heera appear above, we're golden." -ForegroundColor Cyan
Write-Host "Next: CLOSE Chrome/Edge fully, reopen, and reload the Kathaa app." -ForegroundColor Cyan
Write-Host "(Keep this window open until you finish reading. You can close it now.)"