/**
 * Canvas shares API endpoint
 * Manages sharing of canvases with users and groups
 */

import { requireAuth } from '../../../lib/clerk.js';
import { query, queryOne, queryAll } from '../../../lib/db.js';
import { checkCanvasAccess } from '../../../lib/permissions.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

const json = (res, status, payload) =>
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(payload));

/**
 * GET /api/canvases/:id/shares - List shares for a canvas
 * POST /api/canvases/:id/shares - Share canvas with user or group
 * DELETE /api/canvases/:id/shares - Remove share (requires principalType and principalId in body)
 */
export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req);
    const { userId, orgId } = auth;

    // In Vercel, dynamic route params are in req.query
    // For /api/canvases/[id]/shares, the id is in req.query.id
    const canvasId = req.query.id;
    if (!canvasId) {
      json(res, 400, { error: 'Canvas ID is required' });
      return;
    }

    // Check access to canvas
    const { hasAccess, canvas } = await checkCanvasAccess(userId, orgId, canvasId);
    
    if (!hasAccess || !canvas) {
      json(res, 404, { error: 'Canvas not found or access denied' });
      return;
    }

    // Only owner can manage shares
    if (canvas.owner_user_id !== userId) {
      json(res, 403, { error: 'Only the owner can manage shares' });
      return;
    }

    if (req.method === 'GET') {
      const shares = await queryAll(
        `SELECT principal_type, principal_id, created_at
         FROM canvas_acl
         WHERE canvas_id = $1
         ORDER BY created_at ASC`,
        [canvas.id]
      );

      json(res, 200, { shares });
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
      
      const { principalType, principalId } = body;

      if (!principalType || !['user', 'group'].includes(principalType)) {
        json(res, 400, { error: 'Valid principalType (user or group) is required' });
        return;
      }

      if (!principalId || typeof principalId !== 'string') {
        json(res, 400, { error: 'principalId is required' });
        return;
      }

      // For groups, verify it belongs to the same org (if org canvas)
      if (principalType === 'group') {
        if (canvas.scope_type === 'org' && !orgId) {
          json(res, 400, { error: 'Organization context required for group shares on org canvases' });
          return;
        }

        const group = await queryOne(
          `SELECT * FROM groups WHERE id = $1`,
          [principalId]
        );

        if (!group) {
          json(res, 404, { error: 'Group not found' });
          return;
        }

        // Verify group belongs to same org if org canvas
        if (canvas.scope_type === 'org' && group.org_id !== canvas.org_id) {
          json(res, 400, { error: 'Group must belong to the same organization' });
          return;
        }
      }

      // Check if share already exists
      const existing = await queryOne(
        `SELECT * FROM canvas_acl 
         WHERE canvas_id = $1 AND principal_type = $2 AND principal_id = $3`,
        [canvas.id, principalType, principalId]
      );

      if (existing) {
        json(res, 400, { error: 'Share already exists' });
        return;
      }

      await query(
        `INSERT INTO canvas_acl (canvas_id, principal_type, principal_id)
         VALUES ($1, $2, $3)`,
        [canvas.id, principalType, principalId]
      );

      json(res, 201, { 
        success: true, 
        principalType, 
        principalId 
      });
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
      
      const { principalType, principalId } = body;

      if (!principalType || !principalId) {
        json(res, 400, { error: 'principalType and principalId are required' });
        return;
      }

      await query(
        `DELETE FROM canvas_acl 
         WHERE canvas_id = $1 AND principal_type = $2 AND principal_id = $3`,
        [canvas.id, principalType, principalId]
      );

      json(res, 200, { 
        success: true, 
        principalType, 
        principalId 
      });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    if (error.message === 'Authentication required') {
      json(res, 401, { error: 'Authentication required' });
      return;
    }
    console.error('Canvas shares API error:', error);
    json(res, 500, { error: error.message || 'Internal server error' });
  }
}

