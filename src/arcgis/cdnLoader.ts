const ARCGIS_CDN = 'https://js.arcgis.com/4.31';

let loadPromise: Promise<void> | null = null;

/** Load ArcGIS JS API from CDN (same pattern as mobile WebView map). */
export function loadArcgisCdn(): Promise<void> {
  if (typeof window !== 'undefined' && window.require) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${ARCGIS_CDN}/esri/themes/light/main.css"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${ARCGIS_CDN}/esri/themes/light/main.css`;
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = `${ARCGIS_CDN}/`;
    script.async = true;
    script.onload = () => {
      if (window.require) resolve();
      else reject(new Error('ArcGIS CDN loaded but require() missing'));
    };
    script.onerror = () => reject(new Error('Failed to load ArcGIS JS API from CDN'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Promise-based require() after CDN load. */
export function esriRequire<T extends unknown[]>(modules: string[]): Promise<T> {
  return loadArcgisCdn().then(
    () =>
      new Promise((resolve, reject) => {
        if (!window.require) {
          reject(new Error('ArcGIS require() not available'));
          return;
        }
        window.require(modules, (...args: unknown[]) => resolve(args as T), reject);
      })
  );
}
