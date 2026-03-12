'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCanvas } from '@/contexts/CanvasContext';
import { Icon } from '@/components/ui/Icon';

function CanvasErrorView() {
  const router = useRouter();
  const { initialCanvasError } = useCanvas();

  if (!initialCanvasError) {
    return null;
  }

  return (
    <div className="canvas-error">
      <div className="canvas-error__content">
        <h1>Canvas Unavailable</h1>
        <p>
          This canvas may have been deleted, the link may be invalid, or you may not have access.
        </p>
        <button className="btn btn--primary" onClick={() => router.push('/')}>
          Go to Home
        </button>
      </div>
    </div>
  );
}

function CanvasLoadingView() {
  return (
    <div className="canvas-error">
      <div className="canvas-error__loading">
        <Icon name="loader-2" className="loading-icon" />
        <p>Loading canvas...</p>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  const pathname = usePathname();
  const { initialCanvasError, isLoading, currentCanvas } = useCanvas();
  const requestedCanvasId = pathname.match(/^\/c\/([^/]+)$/)?.[1];
  const isResolvingRequestedCanvas = Boolean(
    requestedCanvasId &&
    !initialCanvasError &&
    currentCanvas?._id !== decodeURIComponent(requestedCanvasId)
  );

  if ((isLoading && !initialCanvasError && !currentCanvas) || isResolvingRequestedCanvas) {
    return <CanvasLoadingView />;
  }

  if (initialCanvasError) {
    return <CanvasErrorView />;
  }

  return <AppLayout />;
}
