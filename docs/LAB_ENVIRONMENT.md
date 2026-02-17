# Lab Environment Guide

## Overview

The lab environment is a fully isolated instance of AgentCanvas for experimental work. It has its own Convex database and Vercel deployment, completely separate from dev and prod environments.

## URLs

- **Frontend:** https://canvas-lab.amplify360.ai
- **Convex:** TBD (preview deployment)
- **Branch:** `lab`

## When to Use Lab

Use the lab environment for:
- Trying major architectural changes
- Experimenting with new libraries or frameworks
- Testing breaking changes
- Prototyping UI redesigns
- Any work that might destabilize the app
- Long-running experiments that need persistent data

## When NOT to Use Lab

- **Production bug fixes** → use `dev` → PR to `main`
- **Minor feature work** → use feature branch → PR to `dev`
- **Documentation updates** → commit to `dev`
- **Quick prototypes** → use local dev environment

## Workflow

### Start New Experiment

```bash
git checkout lab
git pull origin lab

# Make experimental changes
# ... edit files ...

git add .
git commit -m "Experiment: trying new feature X"
git push origin lab
# Auto-deploys to canvas-lab.amplify360.ai
```

### Reset Lab to Match Dev

When you want to abandon all experiments and sync lab with dev:

```bash
git checkout lab
git reset --hard origin/dev
git push --force origin lab
```

### Promote Experiment to Dev

When an experiment succeeds and you want to bring it to dev:

```bash
# Option 1: Cherry-pick specific commits
git checkout dev
git cherry-pick <commit-hash>
git push origin dev

# Option 2: Manually port changes
# Copy the code changes from lab to a new feature branch off dev
git checkout dev
git checkout -b feature/my-experiment
# ... manually copy changes ...
git commit -m "feat: implement feature from lab experiment"
git push origin feature/my-experiment
# Create PR to dev
```

## Data Isolation

- Lab has its own Convex deployment (separate database)
- No shared data with dev or prod
- Safe to delete all data and start fresh
- WorkOS auth shared (same organizations available)
- User memberships sync daily at 3am UTC (no real-time webhooks)

## Environment Details

**Convex Deployment:**
- Type: Preview deployment (free tier)
- Sync: Daily cron for membership reconciliation
- No real-time webhook events

**Vercel Deployment:**
- Project: `agentcanvas-app-lab`
- Auto-deploys from `lab` branch
- Custom domain: `canvas-lab.amplify360.ai`

**Environment Variables:**
- `CONVEX_DEPLOYMENT`: TBD (preview deployment name)
- `NEXT_PUBLIC_CONVEX_URL`: TBD (preview deployment URL)
- `WORKOS_REDIRECT_URI`: `https://canvas-lab.amplify360.ai/api/auth/callback`
- `WORKOS_COOKIE_PASSWORD`: See `docs/VERCEL_PROJECTS.md`
- All other WorkOS keys shared with dev/prod

## Maintenance

### Manual Tasks

- **Reset lab to match dev:** ~5 minutes/week (optional)
- **Environment variable updates:** ~5 minutes/month (when credentials rotate)

### No PR Required

The lab branch is throwaway by design:
- Direct push allowed (no PR workflow)
- Can force-push to reset
- Never merge lab → dev or main

### Data Cleanup

Lab data can be wiped anytime:
```bash
# Via Convex dashboard
# Navigate to Data tab → Delete tables or entire deployment
```

## Cost

- **Convex:** $0/month (preview deployment)
- **Vercel:** $0 (within Pro plan limits)
- **Total:** $0/month

## Setup Checklist

If you need to recreate the lab environment:

- [ ] Create Convex preview deployment
- [ ] Create Vercel project `agentcanvas-app-lab`
- [ ] Configure environment variables in Vercel
- [ ] Add DNS CNAME: `canvas-lab` → `cname.vercel-dns.com`
- [ ] Add domain in Vercel dashboard
- [ ] Add WorkOS redirect URI: `https://canvas-lab.amplify360.ai/api/auth/callback`
- [ ] Add WorkOS allowed origin: `https://canvas-lab.amplify360.ai`
- [ ] Verify SSL certificate provisioned
- [ ] Test login flow
- [ ] Test canvas and agent creation

See implementation plan in `.claude/plans/` for detailed setup steps.
