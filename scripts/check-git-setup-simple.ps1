# Git Setup Verification Script (PowerShell)
# Usage: .\scripts\check-git-setup-simple.ps1

Write-Host "=== Git Repository Configuration Check ===" -ForegroundColor Cyan
Write-Host ""

# Expected configuration
$EXPECTED_REMOTE = "https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git"
$EXPECTED_BRANCH = "main"

# Check if we're in a git repository
try {
    git rev-parse --git-dir | Out-Null
} catch {
    Write-Host "[ERROR] Not in a Git repository!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory."
    exit 1
}

Write-Host "Current directory: $(Get-Location)"
Write-Host ""

# Check current remote URL
Write-Host "Checking remote URL..."
$CURRENT_REMOTE = git config --get remote.origin.url 2>$null

if (-not $CURRENT_REMOTE) {
    Write-Host "[ERROR] No remote 'origin' configured!" -ForegroundColor Red
    Write-Host "Setting up remote..."
    git remote add origin $EXPECTED_REMOTE
    Write-Host "[SUCCESS] Remote added: $EXPECTED_REMOTE" -ForegroundColor Green
} elseif ($CURRENT_REMOTE -ne $EXPECTED_REMOTE) {
    Write-Host "[WARNING] Incorrect remote URL:" -ForegroundColor Yellow
    Write-Host "   Current:  $CURRENT_REMOTE"
    Write-Host "   Expected: $EXPECTED_REMOTE"
    Write-Host ""
    Write-Host "Fixing remote URL..."
    git remote set-url origin $EXPECTED_REMOTE
    Write-Host "[SUCCESS] Remote URL updated!" -ForegroundColor Green
} else {
    Write-Host "[SUCCESS] Remote URL is correct: $CURRENT_REMOTE" -ForegroundColor Green
}

Write-Host ""

# Check current branch
Write-Host "Checking branch..."
$CURRENT_BRANCH = git branch --show-current 2>$null

if ($CURRENT_BRANCH -ne $EXPECTED_BRANCH) {
    Write-Host "[WARNING] Current branch: $CURRENT_BRANCH (expected: $EXPECTED_BRANCH)" -ForegroundColor Yellow
    
    # Check if main branch exists
    try {
        git rev-parse --verify main | Out-Null
        Write-Host "Switching to main branch..."
        git checkout main
        Write-Host "[SUCCESS] Switched to main branch" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Main branch doesn't exist locally" -ForegroundColor Red
        Write-Host "Creating and switching to main branch..."
        git checkout -b main
        Write-Host "[SUCCESS] Created and switched to main branch" -ForegroundColor Green
    }
} else {
    Write-Host "[SUCCESS] On correct branch: $CURRENT_BRANCH" -ForegroundColor Green
}

Write-Host ""

# Check working directory status
Write-Host "Checking working directory status..."
$STATUS_OUTPUT = git status --porcelain

if ($STATUS_OUTPUT) {
    Write-Host "[WARNING] You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    Write-Host "TIP: Commit your changes before pushing:"
    Write-Host "   git add ."
    Write-Host "   git commit -m `"feat: beschrijving van wijziging`""
    Write-Host "   git push origin main"
} else {
    Write-Host "[SUCCESS] Working directory is clean" -ForegroundColor Green
}

Write-Host ""

# Final verification
Write-Host "=== Final Verification ===" -ForegroundColor Cyan
Write-Host "Current remote: $(git config --get remote.origin.url)"
Write-Host "Current branch: $(git branch --show-current)"

Write-Host ""
Write-Host "Pre-push checklist:"
Write-Host "- Remote URL is correct: YES"
Write-Host "- On main branch: YES"

if (-not $STATUS_OUTPUT) {
    Write-Host "- Working directory clean: YES"
    Write-Host ""
    Write-Host "[READY] You can now push! Use: git push origin main" -ForegroundColor Green
} else {
    Write-Host "- Working directory clean: NO"
    Write-Host ""
    Write-Host "[WARNING] Commit your changes first, then push" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For more details, see: docs/GIT_SETUP.md" 