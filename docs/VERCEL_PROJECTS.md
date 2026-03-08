# Vercel Project Information

## Active Projects

### Main App

- **Project Name:** `agentcanvas-app-v2`
- **Project ID:** `prj_F861OkfkgcZKI2Qj8Dvgj009KaUM`
- **Organization ID:** `team_OyuSxI1QnCzGd7SOW2T9YveW`
- **Production URL:** https://canvas.amplify360.ai
- **Dev URL:** https://canvas-dev.amplify360.ai
- **Git branch mapping:** `main` -> prod, `dev` -> dev
- **Status:** Active - Automatic deployments via GitHub integration

### Lab App

- **Project Name:** `agentcanvas-app-lab`
- **Project ID:** `prj_1Xn6IY43I3NSxBSxBB1Q8NzXbb2c`
- **Organization ID:** `team_OyuSxI1QnCzGd7SOW2T9YveW`
- **Production URL:** https://canvas-lab.amplify360.ai
- **Git branch mapping:** `lab` -> lab production deployment
- **Status:** Active - Dedicated lab frontend project
- **Backend pairing:** Convex project `agent-canvas-lab` using `prod:fortunate-hummingbird-653`

## Local Linking

- This repo's checked-in [`.vercel/project.json`](/Users/andreas/src/agent-canvas/.vercel/project.json) points to `agentcanvas-app-v2`
- Manual `vercel` commands from the repo root therefore target the main app by default
- For manual lab deploy/debug work, use a separate temp directory linked to `agentcanvas-app-lab` or temporarily relink this checkout
- [`.vercel.original/project.json`](/Users/andreas/src/agent-canvas/.vercel.original/project.json) is only for the frozen legacy project

## Deprecated Projects (To Be Removed)

The following projects should be disconnected from GitHub and deleted in the Vercel dashboard:

- `agentcanvas-app` (prj_nQkPX9TgaZbr738EJWPSI4Pog77T) - Original frozen project
- `agent-canvas` - Legacy duplicate project causing misleading preview/check noise
