Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starting server (:3000) and client (:5173)..." -ForegroundColor Green
npm run dev
