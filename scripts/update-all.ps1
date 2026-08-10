# Runs the full "Update All Data" pipeline locally: starts the dev server, waits for it to be
# ready, calls /api/update-all, logs the result, then shuts the server down again.
#
# Must run from this machine (not Vercel) - footywire's bot-protection blocks Vercel's IPs but
# not a normal home connection. Requires .env.local to be set up with real credentials.

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logFile = Join-Path $logDir "update-$stamp.log"

function Log($message) {
    $line = "$(Get-Date -Format 'HH:mm:ss')  $message"
    Write-Output $line
    Add-Content -Path $logFile -Value $line
}

Log "Starting dev server in $projectDir"
Set-Location $projectDir

$serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "dev-server-$stamp.log") `
    -RedirectStandardError (Join-Path $logDir "dev-server-$stamp.err.log")

try {
    Log "Waiting for http://localhost:3000 to respond..."
    $ready = $false

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $check = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing
            if ($check.StatusCode -eq 200) { $ready = $true; break }
        } catch {
            # not up yet, keep polling
        }
    }

    if (-not $ready) {
        Log "ERROR: dev server never became ready after 60s - check dev-server-$stamp.err.log"
        exit 1
    }

    Log "Server ready. Calling /api/update-all (this can take a few minutes for a full squad)..."

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/update-all" -Method POST `
            -Body "{}" -ContentType "application/json" -TimeoutSec 600 -UseBasicParsing

        Log "Update complete:"
        Add-Content -Path $logFile -Value $response.Content
        Write-Output $response.Content
    } catch {
        Log "ERROR calling /api/update-all: $($_.Exception.Message)"
        exit 1
    }
} finally {
    Log "Stopping dev server..."
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue

    # npm run dev spawns a child next process - make sure nothing is left holding port 3000
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

    Log "Done. Full log: $logFile"
}
