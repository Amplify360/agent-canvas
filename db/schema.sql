-- Neon Postgres schema for AgentCanvas multi-user system
-- Stores canvases (YAML files) with access control

-- Canvases table: stores YAML documents
CREATE TABLE IF NOT EXISTS canvases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('personal', 'org')),
    owner_user_id TEXT NOT NULL,
    org_id TEXT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    yaml_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_user_id TEXT NOT NULL,
    updated_by_user_id TEXT NOT NULL,
    
    -- Ensure org_id is set for org canvases
    CONSTRAINT org_canvas_requires_org CHECK (
        (scope_type = 'org' AND org_id IS NOT NULL) OR
        (scope_type = 'personal' AND org_id IS NULL)
    ),
    
    -- Unique slug within scope
    CONSTRAINT unique_personal_slug UNIQUE (scope_type, owner_user_id, slug),
    CONSTRAINT unique_org_slug UNIQUE (scope_type, org_id, slug)
);

-- Canvas ACL: sharing permissions (RW-only for MVP)
CREATE TABLE IF NOT EXISTS canvas_acl (
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    principal_type TEXT NOT NULL CHECK (principal_type IN ('user', 'group')),
    principal_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (canvas_id, principal_type, principal_id)
);

-- Groups: org-scoped groups for sharing
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (org_id, name)
);

-- Group members: users in groups
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (group_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvases_owner ON canvases(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_org ON canvases(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvases_scope ON canvases(scope_type);
CREATE INDEX IF NOT EXISTS idx_canvas_acl_canvas ON canvas_acl(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_acl_principal ON canvas_acl(principal_type, principal_id);
CREATE INDEX IF NOT EXISTS idx_groups_org ON groups(org_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_canvases_updated_at ON canvases;
CREATE TRIGGER update_canvases_updated_at
    BEFORE UPDATE ON canvases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

