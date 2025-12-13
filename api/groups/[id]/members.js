/**
 * Group members API endpoint
 * Manages members of a group
 */

import { requireAuth } from '../../../lib/clerk.js';
import { query, queryOne, queryAll } from '../../../lib/db.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

const json = (res, status, payload) =>
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(payload));

/**
 * GET /api/groups/:id/members - List group members
 * POST /api/groups/:id/members - Add a member to group
 * DELETE /api/groups/:id/members - Remove a member from group (requires userId in body)
 */
export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req);
    const { userId, orgId } = auth;

    if (!orgId) {
      json(res, 400, { error: 'Organization context required' });
      return;
    }

    // In Vercel, dynamic route params are in req.query
    // For /api/groups/[id]/members, the id is in req.query.id
    const groupId = req.query.id;
    if (!groupId) {
      json(res, 400, { error: 'Group ID is required' });
      return;
    }

    // Verify group exists and belongs to org
    const group = await queryOne(
      `SELECT * FROM groups WHERE id = $1 AND org_id = $2`,
      [groupId, orgId]
    );

    if (!group) {
      json(res, 404, { error: 'Group not found' });
      return;
    }

    if (req.method === 'GET') {
      const members = await queryAll(
        `SELECT gm.user_id, gm.created_at
         FROM group_members gm
         WHERE gm.group_id = $1
         ORDER BY gm.created_at ASC`,
        [groupId]
      );

      json(res, 200, { members });
      return;
    }

    if (req.method === 'POST') {
      let body = {};
      try {
        if (typeof req.body === 'string') {
          body = JSON.parse(req.body);
        } else {
          body = req.body || {};
        }
      } catch (e) {
        json(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      
      const { userId: targetUserId } = body;

      if (!targetUserId || typeof targetUserId !== 'string') {
        json(res, 400, { error: 'User ID is required' });
        return;
      }

      // Check if already a member
      const existing = await queryOne(
        `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, targetUserId]
      );

      if (existing) {
        json(res, 400, { error: 'User is already a member of this group' });
        return;
      }

      await query(
        `INSERT INTO group_members (group_id, user_id)
         VALUES ($1, $2)`,
        [groupId, targetUserId]
      );

      json(res, 201, { success: true, userId: targetUserId });
      return;
    }

    if (req.method === 'DELETE') {
      let body = {};
      try {
        if (typeof req.body === 'string') {
          body = JSON.parse(req.body);
        } else {
          body = req.body || {};
        }
      } catch (e) {
        json(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      
      const { userId: targetUserId } = body;

      if (!targetUserId || typeof targetUserId !== 'string') {
        json(res, 400, { error: 'User ID is required' });
        return;
      }

      await query(
        `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, targetUserId]
      );

      json(res, 200, { success: true, userId: targetUserId });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    if (error.message === 'Authentication required') {
      json(res, 401, { error: 'Authentication required' });
      return;
    }
    console.error('Group members API error:', error);
    json(res, 500, { error: error.message || 'Internal server error' });
  }
}

