type CanvasState = {
  title: string;
  slug: string;
  phases?: string[];
  categories?: string[];
};

type CanvasStateOperation = {
  type: string;
  title?: string;
  slug?: string;
  phases?: string[];
  categories?: string[];
  fromPhase?: string;
  toPhase?: string;
};

export function resolveDryRun(value?: boolean): boolean {
  return value ?? true;
}

export function applyCanvasStateOperation<T extends CanvasState>(
  canvas: T,
  operation: CanvasStateOperation
): T {
  if (operation.type === "update_canvas") {
    return {
      ...canvas,
      ...(operation.title !== undefined ? { title: operation.title } : {}),
      ...(operation.slug !== undefined ? { slug: operation.slug } : {}),
    };
  }

  if (operation.type === "rename_phase") {
    return {
      ...canvas,
      phases: (canvas.phases ?? []).map((phase) =>
        phase === operation.fromPhase ? operation.toPhase ?? phase : phase
      ),
    };
  }

  if (operation.type === "reorder_phases") {
    return {
      ...canvas,
      phases: operation.phases,
    };
  }

  if (operation.type === "reorder_categories") {
    return {
      ...canvas,
      categories: operation.categories,
    };
  }

  return canvas;
}
