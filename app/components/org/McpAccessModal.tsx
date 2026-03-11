'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCanQuery, useMutation, useQuery } from '@/hooks/useConvex';
import { api } from '../../../convex/_generated/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workosOrgId: string;
  canvases: Array<{ _id: string; title: string }>;
}

export function McpAccessModal({ isOpen, onClose, workosOrgId, canvases }: Props) {
  const { canQuery } = useCanQuery();
  const tokens = (
    useQuery(
      (api as any).mcpTokens.listForOrg,
      isOpen && canQuery ? { workosOrgId, includeRevoked: true } : 'skip',
    ) as any[]
  ) ?? [];
  const createToken = useMutation((api as any).mcpTokens.create);
  const revokeToken = useMutation((api as any).mcpTokens.revoke);
  const rotateToken = useMutation((api as any).mcpTokens.rotate);

  const [name, setName] = useState('');
  const [canWrite, setCanWrite] = useState(false);
  const [defaultCanvasId, setDefaultCanvasId] = useState('');
  const [secret, setSecret] = useState<string | null>(null);

  const scopes = canWrite ? ['canvas:read', 'canvas:write'] : ['canvas:read'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MCP Access">
      <div className="u-flex u-flex-col u-gap-sm">
        <p>Create service tokens for external MCP clients. Token secrets are shown once.</p>
        <input placeholder="Token name" value={name} onChange={(e) => setName(e.target.value)} />
        <label><input type="checkbox" checked={canWrite} onChange={(e) => setCanWrite(e.target.checked)} /> Allow write operations</label>
        <select value={defaultCanvasId} onChange={(e) => setDefaultCanvasId(e.target.value)}>
          <option value="">No default canvas</option>
          {canvases.map((canvas) => <option key={canvas._id} value={canvas._id}>{canvas.title}</option>)}
        </select>
        <button
          className="btn btn--primary"
          onClick={async () => {
            const result = await createToken({
              workosOrgId,
              name: name || 'MCP Token',
              scopes,
              defaultCanvasId: defaultCanvasId || undefined,
            } as any);
            setSecret(result.token);
            setName('');
          }}
        >
          Create token
        </button>
        {secret && (
          <div className="surface-card" style={{ padding: 8 }}>
            <strong>Copy now (shown once):</strong>
            <pre>{secret}</pre>
          </div>
        )}

        <div className="sidebar__dropdown-divider" />
        <h4>Existing tokens</h4>
        {tokens.map((token: any) => (
          <div key={token._id} className="surface-card" style={{ padding: 8 }}>
            <div>{token.name} <code>{token.tokenPrefix}</code> {token.revokedAt ? '(revoked)' : ''}</div>
            <div>Scopes: {token.scopes.join(', ')}</div>
            {!token.revokedAt && (
              <div className="u-flex u-gap-sm">
                <button className="btn" onClick={() => revokeToken({ tokenId: token._id } as any)}>Revoke</button>
                <button className="btn" onClick={async () => {
                  const result = await rotateToken({ tokenId: token._id } as any);
                  setSecret(result.token);
                }}>Rotate</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
