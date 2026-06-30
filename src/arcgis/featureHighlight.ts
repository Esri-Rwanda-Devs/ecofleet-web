import type Layer from '@arcgis/core/layers/Layer';
import type MapView from '@arcgis/core/views/MapView';

/**
 * Opens popups and highlights clicked bus stop / route features.
 */
export function enableFeatureHighlight(
  view: MapView,
  layers: Layer[]
) {
  let highlightHandle: { remove: () => void } | null = null;
  const layerSet = new Set(layers);

  return view.on('click', async (event) => {
    const response = await view.hitTest(event, { include: layers });

    const featureHit = response.results.find(
      (r) =>
        'graphic' in r &&
        r.graphic?.layer &&
        layerSet.has(r.graphic.layer as Layer)
    );

    highlightHandle?.remove();
    highlightHandle = null;

    if (!featureHit || !('graphic' in featureHit) || !featureHit.graphic) {
      view.closePopup();
      return;
    }

    const graphic = featureHit.graphic;
    const layer = graphic.layer as Layer;

    view.openPopup({
      features: [graphic],
      location: event.mapPoint,
    });

    try {
      const layerView = await view.whenLayerView(layer);
      if ('highlight' in layerView && typeof layerView.highlight === 'function') {
        highlightHandle = layerView.highlight(graphic);
      }
    } catch {
      /* highlight optional when layer view not ready */
    }
  });
}
