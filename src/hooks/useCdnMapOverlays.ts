import { useEffect } from 'react';
import { esriRequire } from '../arcgis/cdnLoader';
import type { EsriMapView, EsriModules } from '../arcgis/cdnTypes';
import type { ArcgisCdnLayers } from './useArcgisCdnMap';
import type { BusStop, TripTrackingState } from '../types';

export function useCdnVehicleGraphics(
  layers: ArcgisCdnLayers | null,
  tracking: TripTrackingState[]
) {
  useEffect(() => {
    if (!layers) return;

    let cancelled = false;

    esriRequire<[
      EsriModules['Graphic'],
      EsriModules['Point'],
      EsriModules['SimpleMarkerSymbol'],
      EsriModules['TextSymbol'],
      EsriModules['SpatialReference'],
    ]>([
      'esri/Graphic',
      'esri/geometry/Point',
      'esri/symbols/SimpleMarkerSymbol',
      'esri/symbols/TextSymbol',
      'esri/geometry/SpatialReference',
    ]).then(([Graphic, Point, SimpleMarkerSymbol, TextSymbol, SpatialReference]) => {
      if (cancelled) return;

      layers.vehicleLayer.removeAll();

      tracking.forEach((t) => {
        const point = new Point({
          longitude: t.longitude,
          latitude: t.latitude,
          spatialReference: SpatialReference.WGS84,
        });

        layers.vehicleLayer.add(
          new Graphic({
            geometry: point,
            symbol: new SimpleMarkerSymbol({
              style: 'triangle',
              color: t.gps_connected ? '#16A34A' : '#0A0A0A',
              size: 20,
              outline: { color: '#ffffff', width: 2 },
              angle: t.heading,
            }),
            attributes: { tripId: t.trip_id, plate: t.vehicle_plate },
          })
        );

        layers.vehicleLayer.add(
          new Graphic({
            geometry: point,
            symbol: new TextSymbol({
              text: t.vehicle_plate,
              color: '#ffffff',
              haloColor: '#14532D',
              haloSize: 2,
              yoffset: -22,
              font: { size: 11, weight: 'bold' },
            }),
          })
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, [layers, tracking]);
}

export function useCdnRouteGraphics(
  view: EsriMapView | null,
  layers: ArcgisCdnLayers | null,
  selectedRoute?: {
    polyline?: number[][];
    stops?: BusStop[];
  },
  tracking: TripTrackingState[] = []
) {
  useEffect(() => {
    if (!layers) return;

    let cancelled = false;

    esriRequire<[
      EsriModules['Graphic'],
      EsriModules['Point'],
      EsriModules['Polyline'],
      EsriModules['Extent'],
      EsriModules['SimpleMarkerSymbol'],
      EsriModules['SimpleLineSymbol'],
      EsriModules['TextSymbol'],
      EsriModules['SpatialReference'],
    ]>([
      'esri/Graphic',
      'esri/geometry/Point',
      'esri/geometry/Polyline',
      'esri/geometry/Extent',
      'esri/symbols/SimpleMarkerSymbol',
      'esri/symbols/SimpleLineSymbol',
      'esri/symbols/TextSymbol',
      'esri/geometry/SpatialReference',
    ]).then(([
      Graphic,
      Point,
      Polyline,
      Extent,
      SimpleMarkerSymbol,
      SimpleLineSymbol,
      TextSymbol,
      SpatialReference,
    ]) => {
      if (cancelled) return;

      layers.routeLayer.removeAll();
      layers.stopLayer.removeAll();

      const polylineCoords = selectedRoute?.polyline;
      const stops = selectedRoute?.stops ?? [];

      if (polylineCoords && polylineCoords.length >= 2) {
        const routeLine = new Polyline({
          paths: [polylineCoords],
          spatialReference: SpatialReference.WGS84,
        });

        layers.routeLayer.add(
          new Graphic({
            geometry: routeLine,
            symbol: new SimpleLineSymbol({
              color: [255, 255, 255, 0.95],
              width: 5,
              cap: 'round',
              join: 'round',
            }),
          })
        );

        layers.routeLayer.add(
          new Graphic({
            geometry: routeLine,
            symbol: new SimpleLineSymbol({
              color: '#16A34A',
              width: 3,
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

        layers.stopLayer.add(
          new Graphic({
            geometry: point,
            symbol: new SimpleMarkerSymbol({
              style: isOrigin || isDestination ? 'square' : 'circle',
              color: isOrigin ? '#16A34A' : isDestination ? '#0A0A0A' : '#525252',
              size: isOrigin || isDestination ? 14 : 12,
              outline: { color: '#ffffff', width: 2 },
            }),
          })
        );

        layers.stopLayer.add(
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
        view
          .goTo(
            new Extent({
              xmin: Math.min(...lngs) - 0.008,
              ymin: Math.min(...lats) - 0.008,
              xmax: Math.max(...lngs) + 0.008,
              ymax: Math.max(...lats) + 0.008,
              spatialReference: SpatialReference.WGS84,
            }),
            { duration: 800 }
          )
          .catch(() => undefined);
      } else if (view && tracking.length > 0) {
        const lngs = tracking.map((t) => t.longitude);
        const lats = tracking.map((t) => t.latitude);
        view
          .goTo(
            new Extent({
              xmin: Math.min(...lngs) - 0.02,
              ymin: Math.min(...lats) - 0.02,
              xmax: Math.max(...lngs) + 0.02,
              ymax: Math.max(...lats) + 0.02,
              spatialReference: SpatialReference.WGS84,
            }),
            { duration: 800 }
          )
          .catch(() => undefined);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [view, layers, selectedRoute, tracking]);
}
