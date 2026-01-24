/**
 * Widget Token API Route - Generates authentication tokens for WorkOS widgets
 *
 * This endpoint creates short-lived tokens that authorize the frontend to
 * use WorkOS widgets like the Users Management component.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export async function POST(request: Request) {
  const { user } = await withAuth();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { organizationId, scopes } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const token = await workos.widgets.getToken({
      userId: user.id,
      organizationId,
      scopes: scopes || ['widgets:users-table:manage'],
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Widget token error:', error);
    return NextResponse.json(
      { error: 'Failed to get widget token' },
      { status: 500 }
    );
  }
}
