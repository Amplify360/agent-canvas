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

## Project Information

- **Original Project:** See `.vercel.original/project.json`
- **V2 Project:** See `.vercel/project.json`
- **Lab Project:** `agentcanvas-app-lab` (link separately; do not assume `.vercel/project.json` points there)
- **Full Details:** See `.vercel/PROJECT_INFO.md`
