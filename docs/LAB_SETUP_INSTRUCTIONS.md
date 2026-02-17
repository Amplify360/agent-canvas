# Lab Environment Setup Instructions

## Status

✅ **Completed:**
- Lab branch created and pushed to GitHub
- Documentation updated (CLAUDE.md, VERCEL_PROJECTS.md, LAB_ENVIRONMENT.md)
- Cookie password generated

⏳ **Remaining Manual Steps:**
Follow the instructions below to complete the lab environment setup.

---

## 1. Create Convex Preview Deployment

Preview deployments in Convex require deploy keys, which are typically used in CI/CD. For simplicity, we'll create via the Convex dashboard:

### Option A: Via Convex Dashboard (Recommended)

1. Go to https://dashboard.convex.dev
2. Navigate to your project: **agent-canvas** (Team: andreas-cambitsis)
3. Click "New Deployment"
4. Choose "Preview Deployment"
5. Name it: **lab**
6. Click "Create Deployment"
7. Copy the deployment URL (e.g., `https://happy-eagle-123.convex.cloud`)
8. Copy the deployment name (e.g., `preview:happy-eagle-123`)

### Option B: Via CLI (If You Have Deploy Key)

If you have a preview deploy key:

```bash
# Set the deploy key
export CONVEX_DEPLOY_KEY="your-preview-deploy-key"

# Deploy
npx convex deploy --preview-create lab
```

### Deploy Schema and Functions

After creating the deployment, deploy your code:

```bash
# Set deployment
export CONVEX_DEPLOYMENT="preview:happy-eagle-123"  # Use actual deployment name

# Deploy
npx convex deploy

# Verify
npx convex dashboard
# Check: All tables created, crons scheduled, HTTP routes registered
```

**Save these values for later:**
- Deployment name: `_______________________`
- Deployment URL: `_______________________`

---

## 2. Create Vercel Lab Project

### Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/acambitsis-projects
2. Click "Add New..." → "Project"
3. Import from GitHub: https://github.com/Amplify360/agent-canvas
4. Configure project:
   - **Project Name:** `agentcanvas-app-lab`
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `pnpm build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
5. Click "Deploy" (initial deploy will fail without env vars - that's OK)
6. After project created, copy the Project ID from URL or settings

### Configure Production Branch

1. Go to Project Settings → Git
2. Set **Production Branch** to: `lab`
3. Disable auto-deploy for other branches (main, dev)
4. Save changes

**Save this value:**
- Project ID: `_______________________`

---

## 3. Configure Environment Variables in Vercel

Go to Project Settings → Environment Variables

Add the following variables (all for **Production** environment):

### Required Variables

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `CONVEX_DEPLOYMENT` | `preview:happy-eagle-123` | Use actual deployment name from step 1 |
| `NEXT_PUBLIC_CONVEX_URL` | `https://happy-eagle-123.convex.cloud` | Use actual URL from step 1 |
| `WORKOS_REDIRECT_URI` | `https://canvas-lab.amplify360.ai/api/auth/callback` | Must match domain |
| `WORKOS_COOKIE_PASSWORD` | `256a303acf830e8d720211fa8954756f5d99d44c272e23a5ebbeafbbe0c07346` | From VERCEL_PROJECTS.md |
| `BASE_URL` | `https://canvas-lab.amplify360.ai` | Lab domain |
| `WORKOS_API_KEY` | (copy from dev) | Copy from dev project env vars |
| `WORKOS_CLIENT_ID` | (copy from dev) | Copy from dev project env vars |
| `WORKOS_WEBHOOK_SECRET` | (copy from dev) | Copy from dev project |
| `SUPER_ADMIN_EMAILS` | (your admin emails) | Copy from dev project |
| `NEXT_PUBLIC_AUTH_DEBUG` | `0` | Disable auth debug in lab |

### Via CLI (Alternative)

```bash
# Link to lab project
cd /Users/andreas/src/agent-canvas
vercel link --project=agentcanvas-app-lab

# Add each variable
vercel env add CONVEX_DEPLOYMENT production
# When prompted, enter: preview:happy-eagle-123

vercel env add NEXT_PUBLIC_CONVEX_URL production
# When prompted, enter: https://happy-eagle-123.convex.cloud

# ... repeat for all variables above
```

### Trigger Redeploy

After adding all variables:

```bash
# Trigger new deployment
vercel --prod

# Or via dashboard: Deployments → Latest → Redeploy
```

---

## 4. Configure DNS

### Add CNAME Record

In your DNS provider for **amplify360.ai** domain:

**Using Cloudflare DNS (if applicable):**

You can use the `cloudflare-dns` skill to add the record:

```bash
# Via Claude Code skill
/cloudflare-dns
# Ask to: Add CNAME record for canvas-lab.amplify360.ai pointing to cname.vercel-dns.com
```

**Manual via DNS Provider:**

1. Log in to your DNS provider
2. Navigate to DNS settings for `amplify360.ai`
3. Add new record:
   - **Type:** CNAME
   - **Name:** `canvas-lab`
   - **Target:** `cname.vercel-dns.com.` (note the trailing dot)
   - **TTL:** 3600 (or Auto)
4. Save changes

### Verify DNS Propagation

```bash
# Check DNS resolution
dig canvas-lab.amplify360.ai

# Expected output should show:
# canvas-lab.amplify360.ai. 3600 IN CNAME cname.vercel-dns.com.
```

**Note:** DNS propagation can take 5-60 minutes.

---

## 5. Add Domain in Vercel

### Via Dashboard

1. Go to Vercel Project → Settings → Domains
2. Click "Add"
3. Enter: `canvas-lab.amplify360.ai`
4. Click "Add"
5. Assign to Git Branch: `lab`
6. Save

### Via CLI

```bash
vercel domains add canvas-lab.amplify360.ai --prod

# If prompted for branch, select: lab
```

### Wait for SSL Certificate

Vercel automatically provisions SSL certificates via Let's Encrypt. This usually takes 1-5 minutes after DNS resolves.

**Verify SSL:**

```bash
curl -I https://canvas-lab.amplify360.ai
# Should return: HTTP/2 200 (not 404 or certificate error)
```

---

## 6. Configure WorkOS

### Add Redirect URI

1. Go to https://dashboard.workos.com
2. Navigate to your environment (test or production)
3. Go to Authentication → Redirect URIs
4. Click "Add Redirect URI"
5. Enter: `https://canvas-lab.amplify360.ai/api/auth/callback`
6. Save

**Current URIs (keep these):**
- `http://localhost:3000/api/auth/callback`
- `https://canvas.amplify360.ai/api/auth/callback`
- `https://canvas-dev.amplify360.ai/api/auth/callback`

**New URI:**
- `https://canvas-lab.amplify360.ai/api/auth/callback` ✅

### Add Allowed Origin (for Widgets)

1. In WorkOS Dashboard → Authentication → Allowed Origins
2. Click "Add Origin"
3. Enter: `https://canvas-lab.amplify360.ai`
4. Save

**Current Origins (keep these):**
- `http://localhost:3000`
- `https://canvas.amplify360.ai`
- `https://canvas-dev.amplify360.ai`

**New Origin:**
- `https://canvas-lab.amplify360.ai` ✅

### Webhook Configuration

We're **skipping webhook configuration** for lab (using daily cron sync only). No action needed.

---

## 7. Verification

### Test Lab Environment

1. **Open lab app:**
   ```bash
   open https://canvas-lab.amplify360.ai
   ```

2. **Test auth flow:**
   - Should redirect to WorkOS login
   - Log in with your account
   - Should redirect back to lab app
   - Should show empty canvas list

3. **Test data operations:**
   - Create a new canvas
   - Create a new agent
   - Refresh page → data should persist
   - Open in second tab → should see real-time updates

4. **Test data isolation:**
   - Create test agent in lab
   - Open dev environment
   - Verify lab agent does NOT appear in dev

5. **Test WorkOS widgets:**
   - If you're an org admin, open member management
   - Widget should load (WorkOS UI)

### Verify Deployment Info

```bash
# Check git status
git status
# Should be on lab branch

# Check Convex deployment
npx convex dashboard
# Should show lab deployment with all tables

# Check Vercel deployment
vercel inspect https://canvas-lab.amplify360.ai
# Should show project: agentcanvas-app-lab
```

---

## 8. Update Documentation

After successful deployment, update the deployment names:

### Update CLAUDE.md

Replace `TBD` with actual deployment name:

```markdown
- **Lab** (`preview:happy-eagle-123`): Isolated environment for experiments (preview deployment)
```

### Update VERCEL_PROJECTS.md

Add actual Project ID:

```markdown
**Project ID:** `prj_XYZ123ABC`
```

### Update LAB_ENVIRONMENT.md

Update URLs:

```markdown
- **Convex:** https://happy-eagle-123.convex.cloud
```

Commit changes:

```bash
git add CLAUDE.md docs/VERCEL_PROJECTS.md docs/LAB_ENVIRONMENT.md
git commit -m "docs: update lab deployment IDs"
git push origin lab
```

---

## Troubleshooting

### Issue: "Deployment not found" in Convex

**Solution:** Ensure you're using the correct deployment name format:
- Preview deployments: `preview:deployment-name`
- Production deployments: `prod:deployment-name`
- Dev deployments: `dev:deployment-name`

### Issue: Vercel deployment fails

**Solution:** Check environment variables are set correctly:
```bash
vercel env ls
# Should show all required variables
```

### Issue: DNS not resolving

**Solution:**
- Wait 5-60 minutes for DNS propagation
- Check DNS record is CNAME, not A record
- Verify target is `cname.vercel-dns.com` (not `vercel.app`)

### Issue: SSL certificate not provisioning

**Solution:**
- Ensure DNS is fully propagated first
- Remove and re-add domain in Vercel
- Check Vercel logs for SSL errors

### Issue: WorkOS auth fails

**Solution:**
- Verify redirect URI exactly matches (no trailing slash)
- Check WORKOS_REDIRECT_URI env var matches domain
- Ensure origin is in allowed origins list

### Issue: Real-time updates not working

**Solution:**
- Check NEXT_PUBLIC_CONVEX_URL is correct (must be public variable)
- Verify Convex deployment is healthy
- Check browser console for errors

---

## Success Criteria

Lab environment is complete when:

- ✅ `https://canvas-lab.amplify360.ai` loads without errors
- ✅ Can log in via WorkOS
- ✅ Can create and edit canvases
- ✅ Can create and edit agents
- ✅ Data persists across page refreshes
- ✅ Real-time updates work across browser tabs
- ✅ Data is isolated from dev and prod
- ✅ WorkOS widgets load correctly
- ✅ Documentation updated with deployment IDs

---

## Next Steps

After lab is verified:

1. Test experimental feature in lab
2. Iterate quickly (direct push to lab branch)
3. When ready, promote to dev via cherry-pick or manual port
4. Continue using lab for future experiments

**Remember:** Lab is throwaway - feel free to reset it to match dev anytime!

```bash
git checkout lab
git reset --hard origin/dev
git push --force origin lab
```

---

## Reference

- **Lab branch:** `lab`
- **Cookie password:** See `docs/VERCEL_PROJECTS.md`
- **Setup plan:** `.claude/plans/valiant-swinging-thimble.md`
- **Environment template:** `.env.example`
