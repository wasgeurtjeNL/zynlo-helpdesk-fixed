# Git Repository Setup & Deployment Guide

## 🎯 Correct Repository Configuration

### Primary Repository
- **GitHub**: https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed
- **Vercel**: https://zynlo-helpdesk-fixed-dashboard-fjrm.vercel.app
- **Branch**: `main`

## ⚙️ Initial Setup (Eenmalig)

### 1. Clone Repository
```bash
git clone https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git
cd zynlo-helpdesk-fixed
```

### 2. Verify Remote Configuration
```bash
# Check current remote
git remote -v

# Should show:
# origin  https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git (fetch)
# origin  https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git (push)
```

### 3. Fix Remote if Incorrect
```bash
# If remote URL is wrong, fix it:
git remote set-url origin https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git

# Verify the fix:
git remote -v
```

## 🚀 Daily Development Workflow

### 1. Before Starting Work
```bash
# Check you're on the right branch and remote
git status
git remote -v

# Pull latest changes
git pull origin main
```

### 2. Make Changes & Commit
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: beschrijving van wijziging"

# Push to correct repository
git push origin main
```

### 3. Verify Deployment
- **GitHub**: Check commits appear at https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed/commits/main
- **Vercel**: Automatic deployment starts (~2-3 min)
- **Live site**: Changes appear at https://zynlo-helpdesk-fixed-dashboard-fjrm.vercel.app

## 🔍 Troubleshooting

### Problem: Changes not appearing on GitHub
```bash
# Check current remote URL
git config --get remote.origin.url

# If it shows wrong URL (e.g., zynlo-helpdesk-1.git), fix it:
git remote set-url origin https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git

# Re-push
git push origin main
```

### Problem: Permission denied during push
```bash
# Check GitHub authentication
git config --get user.name
git config --get user.email

# Set if missing:
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Problem: Merge conflicts
```bash
# Pull latest changes first
git pull origin main

# Resolve conflicts in editor
# Then commit and push
git add .
git commit -m "resolve: merge conflicts"
git push origin main
```

## 📋 Pre-Push Checklist

Before elke `git push`, controleer:

- [ ] `git remote -v` toont correcte repository URL
- [ ] `git status` toont clean working directory
- [ ] Commit message is beschrijvend
- [ ] Je bent op de `main` branch

## 🔄 Deployment Pipeline

```
Local Changes
    ↓ git push origin main
GitHub Repository (zynlo-helpdesk-fixed)
    ↓ automatic webhook
Vercel Build & Deploy
    ↓ ~2-3 minutes
Live Application (zynlo-helpdesk-fixed-dashboard-fjrm.vercel.app)
```

## 🚨 Repository Backup

In case of emergency, the correct URLs are:
- **Primary**: https://github.com/wasgeurtjeNL/zynlo-helpdesk-fixed.git
- **Vercel Git**: https://vercel.com/wasgeurtjenl/zynlo-helpdesk-fixed-dashboard-fjrm

## 📝 Commit Message Convention

Use these prefixes for consistent commit history:

- `feat:` - Nieuwe functionaliteit
- `fix:` - Bug fixes
- `docs:` - Documentatie updates
- `style:` - UI/CSS wijzigingen
- `refactor:` - Code restructuring
- `test:` - Test toevoegingen
- `chore:` - Maintenance taken

### Voorbeelden:
```bash
git commit -m "feat: Gmail OAuth integratie toegevoegd"
git commit -m "fix: redirect URI mismatch opgelost"
git commit -m "docs: Git setup guide toegevoegd"
```

---

**Laatste update**: $(date)  
**Repository**: wasgeurtjeNL/zynlo-helpdesk-fixed  
**Live URL**: https://zynlo-helpdesk-fixed-dashboard-fjrm.vercel.app 