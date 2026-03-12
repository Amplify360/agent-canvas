'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
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
  const [copied, setCopied] = useState(false);

  const scopes = canWrite
    ? ['canvas:read', 'canvas:write', 'transformation:read', 'transformation:write', 'transformation:review']
    : ['canvas:read', 'transformation:read'];

  const activeTokens = tokens.filter((t: any) => !t.revokedAt);
  const revokedTokens = tokens.filter((t: any) => t.revokedAt);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MCP Access">
      {secret ? (
        <div style={{
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-5)',
        }}>
          <div className="u-flex u-align-center u-gap-sm" style={{ marginBottom: 'var(--space-3)' }}>
            <Icon name="alert-triangle" />
            <strong>Save your token now</strong>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            This secret will not be shown again. Copy it to a secure location.
          </p>
          <div className="u-flex u-align-center u-gap-sm" style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
          }}>
            <code style={{
              flex: 1,
              fontSize: 'var(--text-sm)',
              wordBreak: 'break-all',
              userSelect: 'all',
            }}>{secret}</code>
            <button
              className="btn btn--sm"
              onClick={() => copyToClipboard(secret)}
              style={{ flexShrink: 0 }}
            >
              <Icon name={copied ? 'check' : 'copy'} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            className="btn btn--sm"
            onClick={() => { setSecret(null); setCopied(false); }}
            style={{ marginTop: 'var(--space-3)' }}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
          Create service tokens for external MCP clients. Token secrets are shown once.
        </p>
      )}

      <div className="form-group">
        <label className="form-label">Token name</label>
        <input
          className="form-input"
          placeholder="e.g. CI Pipeline"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Default canvas</label>
        <select
          className="form-select"
          value={defaultCanvasId}
          onChange={(e) => setDefaultCanvasId(e.target.value)}
        >
          <option value="">No default canvas</option>
          {canvases.map((canvas) => (
            <option key={canvas._id} value={canvas._id}>{canvas.title}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={canWrite}
            onChange={(e) => setCanWrite(e.target.checked)}
          />
          Allow write operations
        </label>
      </div>

      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
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
            setCopied(false);
            setName('');
          }}
        >
          Create token
        </button>
      </div>

      {activeTokens.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-6) 0 var(--space-4)' }} />
          <h4 style={{ marginBottom: 'var(--space-3)' }}>Active tokens</h4>
          <div className="u-flex u-flex-column u-gap-sm">
            {activeTokens.map((token: any) => (
              <div key={token._id} className="surface-card" style={{ padding: 'var(--space-4)' }}>
                <div className="u-flex u-align-center u-gap-sm" style={{ marginBottom: 'var(--space-2)' }}>
                  <strong>{token.name}</strong>
                  <code style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>{token.tokenPrefix}</code>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                  {token.scopes.join(', ')}
                  {token.lastUsedAt && (
                    <> &middot; last used {new Date(token.lastUsedAt).toLocaleDateString()}</>
                  )}
                </div>
                <div className="u-flex u-gap-sm">
                  <button
                    className="btn btn--sm"
                    onClick={async () => {
                      const result = await rotateToken({ tokenId: token._id } as any);
                      setSecret(result.token);
                      setCopied(false);
                    }}
                  >
                    Rotate
                  </button>
                  <button
                    className="btn btn--sm btn--danger"
                    onClick={() => revokeToken({ tokenId: token._id } as any)}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {revokedTokens.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-5) 0 var(--space-3)' }} />
          <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>Revoked tokens</h4>
          <div className="u-flex u-flex-column u-gap-sm">
            {revokedTokens.map((token: any) => (
              <div key={token._id} style={{ padding: 'var(--space-3) var(--space-4)', opacity: 0.5 }}>
                <span>{token.name}</span>
                <code style={{ fontSize: 'var(--text-xs)', marginLeft: 'var(--space-2)' }}>{token.tokenPrefix}</code>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
