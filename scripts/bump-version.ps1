# ============================================================
# GasAgency Version Bump Script
# Usage:
#   .\scripts\bump-version.ps1 patch   → 1.0.0 → 1.0.1
#   .\scripts\bump-version.ps1 minor   → 1.0.0 → 1.1.0
#   .\scripts\bump-version.ps1 major   → 1.0.0 → 2.0.0
# ============================================================

param(
    [ValidateSet("patch","minor","major")]
    [string]$BumpType = "patch"
)

$ErrorActionPreference = "Stop"

# Read current version from package.json
$pkg = Get-Content "package.json" | ConvertFrom-Json
$current = $pkg.version
$parts = $current -split "\."
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# Calculate new version
switch ($BumpType) {
    "major" { $major++; $minor = 0; $patch = 0 }
    "minor" { $minor++; $patch = 0 }
    "patch" { $patch++ }
}

$newVersion = "$major.$minor.$patch"

# Update package.json
$pkg.version = $newVersion
$pkg | ConvertTo-Json -Depth 100 | Set-Content "package.json"

Write-Host "✅ package.json: $current → $newVersion" -ForegroundColor Green

# Update versionName in build.gradle (versionCode is auto-bumped by GitHub Actions)
$gradle = Get-Content "android/app/build.gradle" -Raw
$gradle = $gradle -replace 'versionName ".*"', "versionName `"$newVersion`""
Set-Content "android/app/build.gradle" $gradle

Write-Host "✅ build.gradle versionName: $newVersion" -ForegroundColor Green

# Git commit the version bump
git add package.json android/app/build.gradle
git commit -m "chore(release): bump version to v$newVersion"
git tag -a "v$newVersion" -m "Version $newVersion"

Write-Host ""
Write-Host "🚀 Version bumped to v$newVersion" -ForegroundColor Cyan
Write-Host "📌 Git tag created: v$newVersion" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now push to trigger the build:" -ForegroundColor Yellow
Write-Host "  git push origin new-full-mearge --tags" -ForegroundColor White

