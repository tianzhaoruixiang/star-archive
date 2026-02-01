# Save all images from docker-compose.yml to docker/images/
# Usage:
#   Export only (images must exist): .\save-images.ps1
#   Pull/build then export:         .\save-images.ps1 -PullAndBuild
# Run from docker/ or project root: .\docker\save-images.ps1

param([switch]$PullAndBuild)

$ErrorActionPreference = "Stop"
$composePath = $PSScriptRoot
if (-not (Test-Path (Join-Path $composePath "docker-compose.yml"))) {
    $composePath = Join-Path $PSScriptRoot "docker"
    if (-not (Test-Path (Join-Path $composePath "docker-compose.yml"))) {
        Write-Error "docker-compose.yml not found"
    }
}

$imagesDir = Join-Path $composePath "images"
if (-not (Test-Path $imagesDir)) {
    New-Item -ItemType Directory -Path $imagesDir -Force | Out-Null
    Write-Host "Created: $imagesDir"
}

$yml = Get-Content (Join-Path $composePath "docker-compose.yml") -Raw -Encoding UTF8
$imageLines = [regex]::Matches($yml, '(?m)^\s+image:\s+(.+)$') | ForEach-Object { $_.Groups[1].Value.Trim() }
$uniqueImages = $imageLines | Sort-Object -Unique

Write-Host "Found $($uniqueImages.Count) unique image(s):"
foreach ($img in $uniqueImages) { Write-Host "  - $img" }
Write-Host ""

if ($PullAndBuild) {
    Write-Host "Pulling/building images..."
    Push-Location $composePath
    try {
        docker-compose pull 2>$null
        docker-compose build --pull backend frontend 2>$null
    } finally {
        Pop-Location
    }
    Write-Host ""
}

foreach ($img in $uniqueImages) {
    $safeName = $img -replace '[/:]', '-'
    $outFile = Join-Path $imagesDir "$safeName.tar"
    Write-Host "Saving: $img -> $outFile"
    try {
        docker save -o $outFile $img 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0 -and (Test-Path $outFile)) {
            $sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
            Write-Host "  Done ($sizeMB MB)"
        } else {
            Write-Host "  Skipped (image not found, run docker-compose pull or build first)"
        }
    } catch {
        Write-Host "  Error: $_"
    }
}
Write-Host "Done. Files in: $imagesDir"
