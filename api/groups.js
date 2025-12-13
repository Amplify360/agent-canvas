/**
 * Groups API endpoint
 * Manages org-scoped groups for sharing canvases
 */

import { requireAuth } from './lib/clerk.js';
import { query, queryOne, queryAll } from './lib/db.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

const json = (res, status, payload) =>
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(payload));

/**
 * GET /api/groups - List groups in current org
 * POST /api/groups - Create a new group
 */
export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req);
    const { userId, orgId } = auth;

    if (!orgId) {
      json(res, 400, { error: 'Organization context required for groups' });
      return;
    }

    if (req.method === 'GET') {
      const groups = await queryAll(
        `SELECT id, org_id, name, created_at
         FROM groups
         WHERE org_id = $1
         ORDER BY name ASC`,
        [orgId]
      );

      json(res, 200, { groups });
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
      
      const { name } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        json(res, 400, { error: 'Group name is required' });
        return;
      }

      const groupName = name.trim();

      // Check if group already exists
      const existing = await queryOne(
        `SELECT * FROM groups WHERE org_id = $1 AND name = $2`,
        [orgId, groupName]
      );

      if (existing) {
        json(res, 400, { error: 'A group with this name already exists' });
        return;
      }

      const result = await queryOne(
        `INSERT INTO groups (org_id, name)
         VALUES ($1, $2)
         RETURNING id, org_id, name, created_at`,
        [orgId, groupName]
      );

      json(res, 201, { group: result });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    if (error.message === 'Authentication required') {
      json(res, 401, { error: 'Authentication required' });
      return;
    }
    console.error('Groups API error:', error);
    json(res, 500, { error: error.message || 'Internal server error' });
  }
}

