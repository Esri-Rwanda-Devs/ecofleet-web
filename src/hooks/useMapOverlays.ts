import { useEffect } from 'react';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import Extent from '@arcgis/core/geometry/Extent';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import type MapView from '@arcgis/core/views/MapView';
import type { BusStop, TripTrackingState } from '../types';
import type { OperationsMapLayers } from '../hooks/useOperationsMap';

/** Draw live fleet vehicles on the graphics layer */
export function useVehicleGraphics(
  layers: OperationsMapLayers | null,
  tracking: TripTrackingState[]
) {
  useEffect(() => {
    const vehicleLayer = layers?.vehicleLayer;
    if (!vehicleLayer) return;

    vehicleLayer.removeAll();

    tracking.forEach((t) => {
      const point = new Point({
        longitude: t.longitude,
        latitude: t.latitude,
        spatialReference: SpatialReference.WGS84,
      });

      vehicleLayer.add(
        new Graphic({
          geometry: point,
          symbol: new SimpleMarkerSymbol({
            style: 'triangle',
            color: t.gps_connected ? '#34D399' : '#F87171',
            size: 20,
            outline: { color: '#ffffff', width: 2 },
            angle: t.heading,
          }),
          attributes: { tripId: t.trip_id, plate: t.vehicle_plate },
        })
      );

      vehicleLayer.add(
        new Graphic({
          geometry: point,
          symbol: new TextSymbol({
            text: t.vehicle_plate,
            color: '#ffffff',
            haloColor: '#0F766E',
            haloSize: 2,
            yoffset: -22,
            font: { size: 11, weight: 'bold' },
          }),
        })
      );
    });
  }, [layers, tracking]);
}

/** Highlight a selected trip route from the database (overlay on feature layers) */
export function useSelectedRouteGraphics(
  view: MapView | null,
  layers: OperationsMapLayers | null,
  selectedRoute?: {
    polyline?: number[][];
    stops?: BusStop[];
    arcgisObjectId?: number;
  },
  tracking: TripTrackingState[] = []
) {
  useEffect(() => {
    const routeLayer = layers?.routeLayer;
    const stopLayer = layers?.stopLayer;
    if (!routeLayer || !stopLayer) return;

    routeLayer.removeAll();
    stopLayer.removeAll();

    const polylineCoords = selectedRoute?.polyline;
    const stops = selectedRoute?.stops ?? [];

    if (polylineCoords && polylineCoords.length >= 2) {
      const routeLine = new Polyline({
        paths: [polylineCoords],
        spatialReference: SpatialReference.WGS84,
      });

      routeLayer.add(
        new Graphic({
          geometry: routeLine,
          symbol: new SimpleLineSymbol({
            color: [255, 255, 255, 0.95],
            width: 9,
            cap: 'round',
            join: 'round',
          }),
        })
      );

      routeLayer.add(
        new Graphic({
          geometry: routeLine,
          symbol: new SimpleLineSymbol({
            color: '#0F766E',
            width: 6,
            cap: 'round',
            join: 'round',
          }),
        })
      );
    }

    stops.forEach((stop, i) => {
      const point = new Point({
        longitude: stop.longitude,
        latitude: stop.latitude,
        spatialReference: SpatialReference.WGS84,
      });

      const isOrigin = i === 0;
      const isDestination = i === stops.length - 1;

      stopLayer.add(
        new Graphic({
          geometry: point,
          symbol: new SimpleMarkerSymbol({
            style: isOrigin || isDestination ? 'square' : 'circle',
            color: isOrigin ? '#38BDF8' : isDestination ? '#F87171' : '#F59E0B',
            size: isOrigin || isDestination ? 14 : 12,
            outline: { color: '#ffffff', width: 2 },
          }),
          attributes: stop,
        })
      );

      stopLayer.add(
        new Graphic({
          geometry: point,
          symbol: new TextSymbol({
            text: `${i + 1}. ${stop.name}`,
            color: '#ffffff',
            haloColor: '#134E4A',
            haloSize: 2,
            yoffset: 18,
            font: { size: 10, weight: 'bold' },
          }),
        })
      );
    });

    if (view && polylineCoords && polylineCoords.length >= 2) {
      const lngs = polylineCoords.map((c) => c[0]);
      const lats = polylineCoords.map((c) => c[1]);
      view.goTo(
        new Extent({
          xmin: Math.min(...lngs) - 0.01,
          ymin: Math.min(...lats) - 0.01,
          xmax: Math.max(...lngs) + 0.01,
          ymax: Math.max(...lats) + 0.01,
          spatialReference: SpatialReference.WGS84,
        }),
        { duration: 800 }
      ).catch(() => undefined);
    } else if (view && tracking.length > 0) {
      const lngs = tracking.map((t) => t.longitude);
      const lats = tracking.map((t) => t.latitude);
      view.goTo(
        new Extent({
          xmin: Math.min(...lngs) - 0.02,
          ymin: Math.min(...lats) - 0.02,
          xmax: Math.max(...lngs) + 0.02,
          ymax: Math.max(...lats) + 0.02,
          spatialReference: SpatialReference.WGS84,
        }),
        { duration: 800 }
      ).catch(() => undefined);
    }
  }, [view, layers, selectedRoute, tracking]);
}
