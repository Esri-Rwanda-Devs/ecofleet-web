import type Extent from '@arcgis/core/geometry/Extent';
import type Layer from '@arcgis/core/layers/Layer';
import type MapView from '@arcgis/core/views/MapView';

/** Zoom the view to the combined extent of feature layers (with padding). */
export async function zoomToFeatureLayers(
  view: MapView,
  layers: Layer[],
  padding = 1.25
): Promise<void> {
  const loaded = layers.filter((l) => l.loaded);
  if (!loaded.length) return;

  const extents = await Promise.all(
    loaded.map((layer) => {
      const extent = 'fullExtent' in layer ? layer.fullExtent : null;
      if (extent && extent.width > 0 && extent.height > 0) {
        return Promise.resolve(extent);
      }
      if ('queryExtent' in layer && typeof layer.queryExtent === 'function') {
        return layer
          .queryExtent()
          .then((result: { extent: Extent }) => result.extent)
          .catch(() => null);
      }
      return Promise.resolve(null);
    })
  );

  const valid = extents.filter((e): e is Extent => e != null && e.width > 0 && e.height > 0);
  if (!valid.length) return;

  let combined = valid[0].clone();
  for (let i = 1; i < valid.length; i++) {
    combined = combined.union(valid[i]);
  }

  await view.goTo(combined.expand(padding), { duration: 800 });
}
