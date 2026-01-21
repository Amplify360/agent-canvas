/**
 * Canvas page - Direct link to a specific canvas
 */

'use client';

import { use } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConvexClientProvider } from '@/contexts/ConvexClientProvider';
import { CanvasProvider, useCanvas } from '@/contexts/CanvasContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { GroupingProvider } from '@/contexts/GroupingContext';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Link from 'next/link';

interface CanvasPageProps {
  params: Promise<{ id: string }>;
}

function CanvasErrorView() {
  const { initialCanvasError } = useCanvas();

  if (!initialCanvasError) {
    return null;
  }

  return (
    <div className="canvas-error">
      <div className="canvas-error__content">
        <h1>
          {initialCanvasError === 'not_found'
            ? 'Canvas Not Found'
            : 'Access Denied'}
        </h1>
        <p>
          {initialCanvasError === 'not_found'
            ? 'This canvas may have been deleted or the link is invalid.'
            : 'You do not have access to this canvas.'}
        </p>
        <Link href="/" className="btn btn--primary">
          Go to Home
        </Link>
      </div>
      <style jsx>{`
        .canvas-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          background: var(--color-bg);
        }
        .canvas-error__content {
          text-align: center;
          max-width: 400px;
        }
        .canvas-error__content h1 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
          color: var(--color-text);
        }
        .canvas-error__content p {
          margin: 0 0 1.5rem;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}

function CanvasContent() {
  const { initialCanvasError } = useCanvas();

  if (initialCanvasError) {
    return <CanvasErrorView />;
  }

  return <AppLayout />;
}

export default function CanvasPage({ params }: CanvasPageProps) {
  const { id } = use(params);

  return (
    <AuthProvider>
      <ConvexClientProvider>
        <CanvasProvider initialCanvasId={id}>
          <AgentProvider>
            <GroupingProvider>
              <AppStateProvider>
                <CanvasContent />
              </AppStateProvider>
            </GroupingProvider>
          </AgentProvider>
        </CanvasProvider>
      </ConvexClientProvider>
    </AuthProvider>
  );
}
