#!/bin/bash
# Git Setup Verification & Fix Script
# Usage: ./scripts/check-git-setup.sh

echo "🔍 Checking Git repository configuration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Expected configuration
EXPECTED_REMOTE="https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git"
EXPECTED_BRANCH="main"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a Git repository!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Check current remote URL
echo "🔗 Checking remote URL..."
CURRENT_REMOTE=$(git config --get remote.origin.url 2>/dev/null)

if [ -z "$CURRENT_REMOTE" ]; then
    echo -e "${RED}❌ No remote 'origin' configured!${NC}"
    echo "Setting up remote..."
    git remote add origin $EXPECTED_REMOTE
    echo -e "${GREEN}✅ Remote added: $EXPECTED_REMOTE${NC}"
elif [ "$CURRENT_REMOTE" != "$EXPECTED_REMOTE" ]; then
    echo -e "${YELLOW}⚠️  Incorrect remote URL:${NC}"
    echo "   Current:  $CURRENT_REMOTE"
    echo "   Expected: $EXPECTED_REMOTE"
    echo ""
    echo "Fixing remote URL..."
    git remote set-url origin $EXPECTED_REMOTE
    echo -e "${GREEN}✅ Remote URL updated!${NC}"
else
    echo -e "${GREEN}✅ Remote URL is correct: $CURRENT_REMOTE${NC}"
fi

echo ""

# Check current branch
echo "🌿 Checking branch..."
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo -e "${YELLOW}⚠️  Current branch: $CURRENT_BRANCH (expected: $EXPECTED_BRANCH)${NC}"
    
    # Check if main branch exists
    if git rev-parse --verify main >/dev/null 2>&1; then
        echo "Switching to main branch..."
        git checkout main
        echo -e "${GREEN}✅ Switched to main branch${NC}"
    else
        echo -e "${RED}❌ Main branch doesn't exist locally${NC}"
        echo "Creating and switching to main branch..."
        git checkout -b main
        echo -e "${GREEN}✅ Created and switched to main branch${NC}"
    fi
else
    echo -e "${GREEN}✅ On correct branch: $CURRENT_BRANCH${NC}"
fi

echo ""

# Check git user configuration
echo "👤 Checking user configuration..."
GIT_USER_NAME=$(git config --get user.name 2>/dev/null)
GIT_USER_EMAIL=$(git config --get user.email 2>/dev/null)

if [ -z "$GIT_USER_NAME" ]; then
    echo -e "${YELLOW}⚠️  Git user.name not configured${NC}"
    echo "Please run: git config user.name \"Your Name\""
else
    echo -e "${GREEN}✅ Git user.name: $GIT_USER_NAME${NC}"
fi

if [ -z "$GIT_USER_EMAIL" ]; then
    echo -e "${YELLOW}⚠️  Git user.email not configured${NC}"
    echo "Please run: git config user.email \"your.email@example.com\""
else
    echo -e "${GREEN}✅ Git user.email: $GIT_USER_EMAIL${NC}"
fi

echo ""

# Check working directory status
echo "📊 Checking working directory status..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo ""
    echo "💡 Tip: Commit your changes before pushing:"
    echo "   git add ."
    echo "   git commit -m \"feat: beschrijving van wijziging\""
    echo "   git push origin main"
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
fi

echo ""

# Final verification
echo "🎯 Final verification..."
echo "Current remote: $(git config --get remote.origin.url)"
echo "Current branch: $(git branch --show-current)"

echo ""
echo "📋 Pre-push checklist:"
echo "- [✓] Remote URL is correct"
echo "- [✓] On main branch"
if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
    echo "- [✓] User configuration set"
else
    echo "- [❌] User configuration needs setup"
fi

if [ -z "$(git status --porcelain)" ]; then
    echo "- [✓] Working directory clean"
    echo ""
    echo -e "${GREEN}🚀 Ready to push! Use: git push origin main${NC}"
else
    echo "- [❌] Uncommitted changes exist"
    echo ""
    echo -e "${YELLOW}💡 Commit your changes first, then push${NC}"
fi

echo ""
echo "📖 For more details, see: docs/GIT_SETUP.md" 