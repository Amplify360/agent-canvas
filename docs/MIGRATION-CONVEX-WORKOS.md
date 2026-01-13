# Migration Plan: Convex + WorkOS

This document outlines the migration of AgentCanvas from the current Vercel/Clerk/Neon stack to Convex (backend) + WorkOS (auth).

## Current Architecture

| Component | Current Technology |
|-----------|-------------------|
| Database | Neon PostgreSQL |
| Auth | Clerk (JWT-based) |
| API | Vercel Serverless Functions |
| Storage | PostgreSQL (YAML stored as text) |
| Hosting | Vercel |

### Current Data Model

```
groups
├── id (uuid)
├── name (text)
├── created_by_user_id (text)
└── created_at (timestamp)

group_members
├── id (uuid)
├── group_id (uuid) → groups.id
├── user_id (text)
├── role ('admin' | 'viewer')
├── invited_by_user_id (text)
└── created_at (timestamp)

canvases
├── id (uuid)
├── group_id (uuid) → groups.id
├── title (text)
├── slug (text)
├── yaml_text (text)
├── created_by_user_id (text)
├── updated_by_user_id (text)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

## Target Architecture

| Component | New Technology |
|-----------|---------------|
| Database | Convex |
| Auth | WorkOS AuthKit |
| API | Convex Functions |
| Storage | Convex (documents + optional file storage) |
| Hosting | Vercel (frontend only) |

---

## Free Tier Limits

### WorkOS
- **1 million MAUs** free
- Includes: AuthKit, Magic Auth, Social Login, MFA, RBAC
- No credit card required

### Convex
- **1 million function calls/month**
- **0.5 GB database storage**
- **1 GB file storage**
- **1 GB bandwidth/month**
- 40 deployments per team

Both are more than sufficient for low-volume usage.

---

## Migration Phases

### Phase 1: Project Setup

#### 1.1 Initialize Convex
```bash
# Install Convex
pnpm add convex

# Initialize Convex project
npx convex init
```

This creates a `convex/` directory with:
- `convex/_generated/` - Auto-generated types and API
- `convex/schema.ts` - Database schema
- `convex.json` - Project configuration

#### 1.2 Configure WorkOS
1. Create WorkOS account at https://workos.com
2. Create a new project
3. Enable AuthKit with Magic Auth
4. Configure redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-domain.com/api/auth/callback`
5. Note credentials:
   - `WORKOS_API_KEY`
   - `WORKOS_CLIENT_ID`

#### 1.3 Environment Variables
```bash
# Convex
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# WorkOS
WORKOS_API_KEY=sk_xxxxx
WORKOS_CLIENT_ID=client_xxxxx
WORKOS_COOKIE_PASSWORD=32-character-secure-string
```

---

### Phase 2: Convex Schema

Create `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table (synced from WorkOS)
  users: defineTable({
    workosId: v.string(),        // WorkOS user ID
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    isSuperAdmin: v.boolean(),
    lastSignInAt: v.optional(v.number()),
  })
    .index("by_workos_id", ["workosId"])
    .index("by_email", ["email"]),

  // Groups for organizing canvases
  groups: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
  })
    .index("by_name", ["name"]),

  // Group membership with roles
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("viewer")),
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_and_user", ["groupId", "userId"]),

  // Group invitations
  groupInvites: defineTable({
    groupId: v.id("groups"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("viewer")),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_email", ["email"]),

  // Canvas configurations
  canvases: defineTable({
    groupId: v.id("groups"),
    title: v.string(),
    slug: v.string(),
    yamlText: v.string(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_slug", ["slug"])
    .index("by_group_and_slug", ["groupId", "slug"]),
});
```

---

### Phase 3: WorkOS Authentication Integration

#### 3.1 Auth HTTP Actions

Create `convex/http.ts` for WorkOS callback handling:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// WorkOS callback endpoint
http.route({
  path: "/auth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    // Exchange code for user info via action
    const result = await ctx.runAction(internal.auth.exchangeCode, { code });

    if (!result.success) {
      return new Response("Authentication failed", { status: 401 });
    }

    // Redirect to app with session token
    const redirectUrl = new URL("/", url.origin);
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        "Set-Cookie": `session=${result.sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/`,
      },
    });
  }),
});

export default http;
```

#### 3.2 WorkOS Action

Create `convex/auth.ts`:

```typescript
"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { WorkOS } from "@workos-inc/node";

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const getAuthorizationUrl = action({
  args: {},
  handler: async () => {
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "authkit",
      clientId: process.env.WORKOS_CLIENT_ID!,
      redirectUri: `${process.env.BASE_URL}/api/auth/callback`,
    });
    return authorizationUrl;
  },
});

export const exchangeCode = internalAction({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    try {
      const { user, accessToken, refreshToken } =
        await workos.userManagement.authenticateWithCode({
          clientId: process.env.WORKOS_CLIENT_ID!,
          code,
        });

      // Upsert user in Convex
      const convexUserId = await ctx.runMutation(internal.users.upsertFromWorkOS, {
        workosId: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profilePictureUrl: user.profilePictureUrl || undefined,
      });

      return {
        success: true,
        sessionToken: accessToken,
        userId: convexUserId,
      };
    } catch (error) {
      console.error("WorkOS authentication failed:", error);
      return { success: false };
    }
  },
});
```

#### 3.3 Session Validation

For validating WorkOS JWT tokens in Convex queries/mutations, add to `convex/auth.ts`:

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL(`https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`)
);

export async function verifyWorkOSToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: "https://api.workos.com/",
    });
    return {
      workosUserId: payload.sub as string,
      sessionId: payload.sid as string,
    };
  } catch {
    return null;
  }
}
```

---

### Phase 4: Convex Functions

#### 4.1 User Functions

Create `convex/users.ts`:

```typescript
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation for upserting users from WorkOS
export const upsertFromWorkOS = internalMutation({
  args: {
    workosId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
      .unique();

    const isSuperAdmin = (process.env.SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .includes(args.email.toLowerCase());

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        profilePictureUrl: args.profilePictureUrl,
        isSuperAdmin,
        lastSignInAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      workosId: args.workosId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      profilePictureUrl: args.profilePictureUrl,
      isSuperAdmin,
      lastSignInAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  args: { workosId: v.string() },
  handler: async (ctx, { workosId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", workosId))
      .unique();
  },
});
```

#### 4.2 Canvas Functions

Create `convex/canvases.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get canvases accessible to user
export const listAccessible = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return [];

    // Get user's group memberships
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // If super admin, get all canvases
    if (user.isSuperAdmin) {
      return await ctx.db.query("canvases").collect();
    }

    // Get canvases from user's groups
    const groupIds = memberships.map((m) => m.groupId);
    const canvases = [];

    for (const groupId of groupIds) {
      const groupCanvases = await ctx.db
        .query("canvases")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect();
      canvases.push(...groupCanvases);
    }

    return canvases;
  },
});

// Get single canvas by slug
export const getBySlug = query({
  args: {
    userId: v.id("users"),
    slug: v.string()
  },
  handler: async (ctx, { userId, slug }) => {
    const canvas = await ctx.db
      .query("canvases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!canvas) return null;

    // Check access
    const user = await ctx.db.get(userId);
    if (user?.isSuperAdmin) return canvas;

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", canvas.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) return null;
    return canvas;
  },
});

// Create canvas
export const create = mutation({
  args: {
    userId: v.id("users"),
    groupId: v.id("groups"),
    title: v.string(),
    slug: v.string(),
    yamlText: v.string(),
  },
  handler: async (ctx, { userId, groupId, title, slug, yamlText }) => {
    // Check user has admin access to group
    const user = await ctx.db.get(userId);
    const isAdmin = user?.isSuperAdmin ||
      (await ctx.db
        .query("groupMembers")
        .withIndex("by_group_and_user", (q) =>
          q.eq("groupId", groupId).eq("userId", userId)
        )
        .unique()
      )?.role === "admin";

    if (!isAdmin) {
      throw new Error("Only group admins can create canvases");
    }

    // Check slug doesn't exist in group
    const existing = await ctx.db
      .query("canvases")
      .withIndex("by_group_and_slug", (q) =>
        q.eq("groupId", groupId).eq("slug", slug)
      )
      .unique();

    if (existing) {
      throw new Error("Canvas with this slug already exists in group");
    }

    return await ctx.db.insert("canvases", {
      groupId,
      title,
      slug,
      yamlText,
      createdBy: userId,
      updatedBy: userId,
    });
  },
});

// Update canvas
export const update = mutation({
  args: {
    userId: v.id("users"),
    canvasId: v.id("canvases"),
    title: v.optional(v.string()),
    yamlText: v.optional(v.string()),
  },
  handler: async (ctx, { userId, canvasId, title, yamlText }) => {
    const canvas = await ctx.db.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    // Check write access (admin or super admin)
    const user = await ctx.db.get(userId);
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", canvas.groupId).eq("userId", userId)
      )
      .unique();

    const canWrite = user?.isSuperAdmin || membership?.role === "admin";
    if (!canWrite) {
      throw new Error("You don't have permission to edit this canvas");
    }

    await ctx.db.patch(canvasId, {
      ...(title && { title }),
      ...(yamlText && { yamlText }),
      updatedBy: userId,
    });
  },
});

// Delete canvas
export const remove = mutation({
  args: {
    userId: v.id("users"),
    canvasId: v.id("canvases"),
  },
  handler: async (ctx, { userId, canvasId }) => {
    const canvas = await ctx.db.get(canvasId);
    if (!canvas) throw new Error("Canvas not found");

    // Check admin access
    const user = await ctx.db.get(userId);
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", canvas.groupId).eq("userId", userId)
      )
      .unique();

    const canDelete = user?.isSuperAdmin || membership?.role === "admin";
    if (!canDelete) {
      throw new Error("Only group admins can delete canvases");
    }

    await ctx.db.delete(canvasId);
  },
});
```

#### 4.3 Group Functions

Create `convex/groups.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return [];

    if (user.isSuperAdmin) {
      return await ctx.db.query("groups").collect();
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const groups = [];
    for (const membership of memberships) {
      const group = await ctx.db.get(membership.groupId);
      if (group) {
        groups.push({ ...group, role: membership.role });
      }
    }

    return groups;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, { userId, name }) => {
    const user = await ctx.db.get(userId);
    if (!user?.isSuperAdmin) {
      throw new Error("Only super admins can create groups");
    }

    // Check name doesn't exist
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();

    if (existing) {
      throw new Error("Group with this name already exists");
    }

    const groupId = await ctx.db.insert("groups", {
      name,
      createdBy: userId,
    });

    // Add creator as admin
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      role: "admin",
    });

    return groupId;
  },
});

export const addMember = mutation({
  args: {
    actorUserId: v.id("users"),
    groupId: v.id("groups"),
    userEmail: v.string(),
    role: v.union(v.literal("admin"), v.literal("viewer")),
  },
  handler: async (ctx, { actorUserId, groupId, userEmail, role }) => {
    // Check actor has permission
    const actor = await ctx.db.get(actorUserId);
    const actorMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", groupId).eq("userId", actorUserId)
      )
      .unique();

    const canInvite = actor?.isSuperAdmin || actorMembership?.role === "admin";
    if (!canInvite) {
      throw new Error("You don't have permission to add members");
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userEmail.toLowerCase()))
      .unique();

    if (!user) {
      throw new Error("User not found. They must sign in first.");
    }

    // Check not already a member
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", groupId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      throw new Error("User is already a member of this group");
    }

    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role,
      invitedBy: actorUserId,
    });
  },
});
```

---

### Phase 5: Frontend Integration

#### 5.1 Convex Client Setup

Update `main.js` to use Convex client:

```javascript
import { ConvexClient } from "convex/browser";

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

// Set auth token from WorkOS session
function setAuthToken(token) {
  convex.setAuth(() => token);
}

// Subscribe to canvases
function subscribeToCanvases(userId, callback) {
  return convex.onUpdate(
    api.canvases.listAccessible,
    { userId },
    callback
  );
}

// Execute mutations
async function saveCanvas(userId, canvasId, yamlText) {
  await convex.mutation(api.canvases.update, {
    userId,
    canvasId,
    yamlText,
  });
}
```

#### 5.2 Auth Flow

Create login redirect:

```javascript
async function initiateLogin() {
  const authUrl = await convex.action(api.auth.getAuthorizationUrl, {});
  window.location.href = authUrl;
}
```

#### 5.3 Session Management

Handle session from WorkOS cookie:

```javascript
// On page load, check for session cookie and set Convex auth
async function initAuth() {
  // Get session token from cookie (set by WorkOS callback)
  const token = getCookie("session");

  if (token) {
    setAuthToken(token);
    // Verify and get current user
    const user = await convex.query(api.users.getCurrentUser, {
      workosId: getWorkosIdFromToken(token)
    });
    return user;
  }

  return null;
}
```

---

### Phase 6: Data Migration

#### 6.1 Export from Neon PostgreSQL

```sql
-- Export groups
COPY (SELECT * FROM groups) TO '/tmp/groups.csv' WITH CSV HEADER;

-- Export group_members
COPY (SELECT * FROM group_members) TO '/tmp/group_members.csv' WITH CSV HEADER;

-- Export canvases
COPY (SELECT * FROM canvases) TO '/tmp/canvases.csv' WITH CSV HEADER;
```

#### 6.2 Import to Convex

Create `convex/migrations/import.ts`:

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const importData = internalAction({
  args: {},
  handler: async (ctx) => {
    // Read exported JSON files
    const groups = require("./data/groups.json");
    const members = require("./data/group_members.json");
    const canvases = require("./data/canvases.json");

    // Maps for ID conversion
    const groupIdMap = new Map();
    const userIdMap = new Map();

    // Import groups
    for (const group of groups) {
      const newId = await ctx.runMutation(internal.migrations.insertGroup, {
        oldId: group.id,
        name: group.name,
        createdByUserId: group.created_by_user_id,
      });
      groupIdMap.set(group.id, newId);
    }

    // Import members (after users exist from WorkOS)
    // ...

    // Import canvases
    for (const canvas of canvases) {
      await ctx.runMutation(internal.migrations.insertCanvas, {
        groupId: groupIdMap.get(canvas.group_id),
        title: canvas.title,
        slug: canvas.slug,
        yamlText: canvas.yaml_text,
      });
    }
  },
});
```

---

### Phase 7: Cleanup

After migration is verified:

1. **Remove old dependencies:**
   ```bash
   pnpm remove @clerk/backend @neondatabase/serverless
   ```

2. **Delete old files:**
   - `api/` directory (Vercel serverless functions)
   - `middleware.js` (Clerk middleware)

3. **Update environment variables:**
   - Remove: `CLERK_*`, `DATABASE_URL`
   - Keep: `CONVEX_*`, `WORKOS_*`

4. **Update Vercel project:**
   - Remove Neon integration
   - Remove Clerk integration
   - Add Convex environment variables

---

## File Changes Summary

### New Files
```
convex/
├── schema.ts           # Database schema
├── auth.ts             # WorkOS authentication actions
├── users.ts            # User queries/mutations
├── groups.ts           # Group queries/mutations
├── canvases.ts         # Canvas queries/mutations
├── http.ts             # HTTP endpoints (auth callback)
└── migrations/
    └── import.ts       # Data migration script
```

### Modified Files
```
main.js                 # Use Convex client instead of fetch
package.json            # Update dependencies
```

### Deleted Files
```
api/                    # All Vercel serverless functions
middleware.js           # Clerk middleware
api/lib/clerk.js        # Clerk integration
api/lib/db.js           # Neon database
```

---

## Rollback Plan

If issues arise:

1. Keep Neon database running during migration (read-only)
2. Maintain environment variables for old stack
3. Git branch for migration allows quick revert
4. Test in staging/preview deployment first

---

## Timeline Considerations

The migration involves several independent workstreams:
- Convex setup and schema design
- WorkOS configuration and auth flow
- Frontend client integration
- Data migration and verification
- Testing and validation

These can be parallelized where dependencies allow.
