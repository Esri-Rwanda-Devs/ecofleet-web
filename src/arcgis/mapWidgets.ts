import type MapView from '@arcgis/core/views/MapView';
import Zoom from '@arcgis/core/widgets/Zoom';
import Compass from '@arcgis/core/widgets/Compass';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import Locate from '@arcgis/core/widgets/Locate';

/** Standard ArcGIS navigation widgets for operations map */
export function attachMapWidgets(view: MapView): () => void {
  const zoom = new Zoom({ view });
  const compass = new Compass({ view });
  const scaleBar = new ScaleBar({ view, unit: 'metric' });
  const locate = new Locate({ view });

  view.ui.add(zoom, 'top-left');
  view.ui.add(compass, 'top-left');
  view.ui.add(locate, 'top-left');
  view.ui.add(scaleBar, 'bottom-left');

  return () => {
    zoom.destroy();
    compass.destroy();
    scaleBar.destroy();
    locate.destroy();
  };
}
