/** True when polyline is only stop-to-stop vertices (not road-network geometry). */
export function isSparseRoutePolyline(polyline: number[][], stopCount: number): boolean {
  if (polyline.length < 2) return true;
  // ArcGIS route geometry typically has many more vertices than bus stops.
  return polyline.length <= Math.max(stopCount, 3);
}

/** Parse stored polyline, GeoJSON, or ArcGIS paths into [lng, lat][] coordinates */
export function parseRoutePolyline(
  polyline?: string | { type?: string; coordinates?: number[][] } | number[][][] | number[][]
): number[][] | undefined {
  if (!polyline) return undefined;

  if (typeof polyline === 'object' && !Array.isArray(polyline)) {
    const geo = polyline as { type?: string; coordinates?: number[][] };
    if (geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
      return geo.coordinates;
    }
  }

  if (typeof polyline === 'string') {
    try {
      const parsed = JSON.parse(polyline) as
        | { type?: string; coordinates?: number[][] }
        | number[][]
        | number[][][];
      return parseRoutePolyline(parsed as Parameters<typeof parseRoutePolyline>[0]);
    } catch {
      return undefined;
    }
  }

  if (Array.isArray(polyline)) {
    const first = polyline[0];
    if (!Array.isArray(first)) {
      // [{ latitude, longitude }, ...] from backend route_path
      if (first && typeof first === 'object' && !Array.isArray(first) && 'latitude' in first && 'longitude' in first) {
        return (polyline as unknown as { latitude: number; longitude: number }[]).map((p) => [
          p.longitude,
          p.latitude,
        ]);
      }
      return undefined;
    }

    if (Array.isArray(first[0])) {
      if (typeof (first as number[][])[0][0] === 'number') {
        return first as number[][];
      }
      return (polyline as number[][][])[0];
    }

    if (typeof first[0] === 'number') {
      return polyline as number[][];
    }
  }

  return undefined;
}
