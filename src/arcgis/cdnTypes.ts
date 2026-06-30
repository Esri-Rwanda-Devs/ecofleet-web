/** Minimal types for ArcGIS CDN modules (loaded at runtime via require). */
export interface EsriMapView {
  when(): Promise<void>;
  destroy(): void;
  resize(): void;
  goTo(target: unknown, options?: unknown): Promise<unknown>;
  on(event: string, handler: (event: unknown) => void): { remove(): void };
  hitTest(screenPoint: unknown, options?: unknown): Promise<{ results: unknown[] }>;
}

export interface EsriGraphicsLayer {
  removeAll(): void;
  add(graphic: unknown): void;
  addMany(graphics: unknown[]): void;
}

export interface EsriModules {
  Map: new (props: { basemap: string }) => { add(layer: unknown): void; addMany(layers: unknown[]): void };
  MapView: new (props: Record<string, unknown>) => EsriMapView;
  GraphicsLayer: new (props?: Record<string, unknown>) => EsriGraphicsLayer;
  Graphic: new (props: Record<string, unknown>) => unknown;
  Point: new (props: Record<string, unknown>) => unknown;
  Polyline: new (props: Record<string, unknown>) => unknown;
  Extent: new (props: Record<string, unknown>) => unknown;
  SpatialReference: { WGS84: unknown };
  SimpleMarkerSymbol: new (props: Record<string, unknown>) => unknown;
  SimpleLineSymbol: new (props: Record<string, unknown>) => unknown;
  TextSymbol: new (props: Record<string, unknown>) => unknown;
}

declare global {
  interface Window {
    require?: (
      modules: string[],
      callback: (...args: unknown[]) => void,
      errback?: (err: Error) => void
    ) => void;
  }
}

export {};
