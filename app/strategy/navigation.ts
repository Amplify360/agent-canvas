export interface TransformationMapPathOptions {
  requestedMapSlug?: string | null;
  resolvedMapSlug?: string | null;
  departmentId?: string | null;
  serviceId?: string | null;
}

export function shouldCanonicalizeTransformationMapSlug(
  requestedMapSlug?: string | null,
  resolvedMapSlug?: string | null
) {
  return Boolean(requestedMapSlug && resolvedMapSlug && requestedMapSlug !== resolvedMapSlug);
}

export function buildTransformationMapPath({
  requestedMapSlug,
  resolvedMapSlug,
  departmentId,
  serviceId,
}: TransformationMapPathOptions) {
  const params = new URLSearchParams();
  const effectiveMapSlug = resolvedMapSlug ?? requestedMapSlug;

  if (effectiveMapSlug) {
    params.set('map', effectiveMapSlug);
  }
  if (departmentId) {
    params.set('department', departmentId);
  }
  if (serviceId) {
    params.set('service', serviceId);
  }

  const query = params.toString();
  return query ? `/transformation-map?${query}` : '/transformation-map';
}
