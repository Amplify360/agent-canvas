# Deployment Guide

## Quick Reference

### Deploy Main App (Default local `vercel` target)
```bash
vercel --prod
```
This deploys to `agentcanvas-app-v2`, which serves:
- `dev` branch at `https://canvas-dev.amplify360.ai`
- `main` branch at `https://canvas.amplify360.ai`

### Deploy Lab App
The lab frontend lives in a separate Vercel project: `agentcanvas-app-lab`.

The checked-in `.vercel` link in this repo does not point there, so use a separate linked temp directory for manual commands:

```bash
mkdir -p /tmp/agentcanvas-lab-vercel
cd /tmp/agentcanvas-lab-vercel
vercel link --yes --project agentcanvas-app-lab --scope acambitsis-projects
vercel --prod
```

`canvas-lab.amplify360.ai` should normally be driven by the `lab` branch through Git integration. Use manual deploys only when you need to debug or repair the lab frontend project wiring.

### Deploy Lab Convex Backend
The lab backend is separate from Vercel and must be deployed manually.

```bash
CONVEX_DEPLOYMENT=prod:fortunate-hummingbird-653 npx convex deploy --yes
```

For lab inspection commands such as `logs`, `data`, and `function-spec`, use `--deployment-name fortunate-hummingbird-653`. Do not rely on the repo's ambient/default Convex context when working on lab.

### Deploy Main Convex Backends

Use explicit deployment targeting when working outside local dev.

```bash
CONVEX_DEPLOYMENT=dev:expert-narwhal-281 npx convex deploy --yes
CONVEX_DEPLOYMENT=prod:quaint-bee-380 npx convex deploy --yes
```

For inspection commands against non-default deployments, prefer:

```bash
npx convex <command> --deployment-name expert-narwhal-281
npx convex <command> --deployment-name quaint-bee-380
```

### Deploy to Original Project (Frozen - Manual Only)
If you need to deploy to the original frozen project:

1. **Backup current .vercel directory:**
   ```bash
   mv .vercel .vercel.v2
   ```

2. **Restore original project link:**
   ```bash
   mv .vercel.original .vercel
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Restore v2 project link:**
   ```bash
   mv .vercel .vercel.original
   mv .vercel.v2 .vercel
   ```

**Note:** The original project is frozen and should only be updated manually when absolutely necessary.

## Project Mapping

### Main App

- **Project Name:** `agentcanvas-app-v2`
- **Project ID:** `prj_F861OkfkgcZKI2Qj8Dvgj009KaUM`
- **Organization ID:** `team_OyuSxI1QnCzGd7SOW2T9YveW`
- **Production URL:** `https://canvas.amplify360.ai`
- **Dev URL:** `https://canvas-dev.amplify360.ai`
- **Git branch mapping:** `main` -> prod, `dev` -> dev

### Lab App

- **Project Name:** `agentcanvas-app-lab`
- **Project ID:** `prj_1Xn6IY43I3NSxBSxBB1Q8NzXbb2c`
- **Organization ID:** `team_OyuSxI1QnCzGd7SOW2T9YveW`
- **Production URL:** `https://canvas-lab.amplify360.ai`
- **Git branch mapping:** `lab` -> lab production deployment
- **Backend pairing:** Convex project `agent-canvas-lab` using `prod:fortunate-hummingbird-653`

### Local Linking

- This repo's checked-in [`.vercel/project.json`](/Users/andreas/src/agent-canvas/.vercel/project.json) points to `agentcanvas-app-v2`.
- Manual `vercel` commands from the repo root therefore target the main app by default.
- For manual lab deploy/debug work, use a separate temp directory linked to `agentcanvas-app-lab` or temporarily relink this checkout.
- [`.vercel.original/project.json`](/Users/andreas/src/agent-canvas/.vercel.original/project.json) is only for the frozen legacy project.

### Deprecated Projects

These should stay disconnected from GitHub and can be removed once no longer needed:

- `agentcanvas-app` (`prj_nQkPX9TgaZbr738EJWPSI4Pog77T`) - original frozen project
- `agent-canvas` - legacy duplicate project causing misleading preview/check noise
