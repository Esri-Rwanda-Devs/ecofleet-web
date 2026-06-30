import { useEffect, useRef, useState } from 'react';
import MapView from '@arcgis/core/views/MapView';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import type { BuslaneLayer } from '../arcgis/featureLayers';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import type { ArcGisConfig } from '../types';
import { loadOperationsWebMap, defaultMapCenter, defaultMapZoom } from '../arcgis/loadWebMap';
import { loadFeatureLayers } from '../arcgis/featureLayers';
import { attachMapWidgets } from '../arcgis/mapWidgets';
import { zoomToFeatureLayers } from '../arcgis/zoomToLayers';
import { enableFeatureHighlight } from '../arcgis/featureHighlight';

export interface OperationsMapLayers {
  vehicleLayer: GraphicsLayer;
  routeLayer: GraphicsLayer;
  stopLayer: GraphicsLayer;
  busStopsLayer: BuslaneLayer | null;
  busRoutesLayer: BuslaneLayer | null;
}

export interface UseOperationsMapOptions {
  config: ArcGisConfig;
  onVehicleClick?: (tripId: string) => void;
}

export interface UseOperationsMapResult {
  mapRef: React.RefObject<HTMLDivElement>;
  view: MapView | null;
  layers: OperationsMapLayers | null;
  layerErrors: string[];
  isLoading: boolean;
}

/**
 * Initializes the ArcGIS MapView with web map, satellite basemap, bus feature
 * layers, widgets, and operational graphics layers for fleet/route overlays.
 */
export function useOperationsMap({
  config,
  onVehicleClick,
}: UseOperationsMapOptions): UseOperationsMapResult {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const layersRef = useRef<OperationsMapLayers | null>(null);
  const [layers, setLayers] = useState<OperationsMapLayers | null>(null);
  const [layerErrors, setLayerErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<MapView | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;
    let destroyWidgets: (() => void) | undefined;
    let highlightHandle: { remove: () => void } | undefined;
    let vehicleClickHandle: { remove: () => void } | undefined;

    const routeLayer = new GraphicsLayer({ id: 'selected-route', listMode: 'hide' });
    const stopLayer = new GraphicsLayer({ id: 'selected-stops', listMode: 'hide' });
    const vehicleLayer = new GraphicsLayer({ id: 'live-vehicles', listMode: 'hide' });

    const init = async () => {
      setIsLoading(true);

      const map = await loadOperationsWebMap();
      if (cancelled || !mapRef.current) return;

      const errors: string[] = [];
      let busStops = null;
      let busRoutes = null;
      if (!config.osm) {
        const loaded = await loadFeatureLayers();
        busStops = loaded.busStops;
        busRoutes = loaded.busRoutes;
        errors.push(...loaded.errors);
      }
      if (cancelled) return;

      setLayerErrors(errors);

      // Layer order: routes (bottom) → stops → selection graphics → vehicles (top)
      const featureLayers: BuslaneLayer[] = [];
      if (busRoutes) {
        map.add(busRoutes);
        featureLayers.push(busRoutes);
      }
      if (busStops) {
        map.add(busStops);
        featureLayers.push(busStops);
      }
      map.addMany([routeLayer, stopLayer, vehicleLayer]);

      const operationalLayers: OperationsMapLayers = {
        vehicleLayer,
        routeLayer,
        stopLayer,
        busStopsLayer: busStops,
        busRoutesLayer: busRoutes,
      };
      layersRef.current = operationalLayers;
      setLayers(operationalLayers);

      const mapView = new MapView({
        container: mapRef.current,
        map,
        center: defaultMapCenter(),
        zoom: defaultMapZoom(),
        spatialReference: SpatialReference.WGS84,
        constraints: { minZoom: 10, maxZoom: 19, snapToZoom: false, rotationEnabled: true },
        popup: {
          dockEnabled: true,
          dockOptions: { buttonEnabled: true, position: 'bottom-right' },
        },
      });

      await mapView.when();
      if (cancelled) {
        mapView.destroy();
        return;
      }

      viewRef.current = mapView;
      setView(mapView);

      destroyWidgets = attachMapWidgets(mapView);

      if (featureLayers.length) {
        highlightHandle = enableFeatureHighlight(mapView, featureLayers);
        await zoomToFeatureLayers(mapView, featureLayers).catch(() => undefined);
      } else {
        await mapView.goTo({
          center: [config.center.longitude, config.center.latitude],
          zoom: defaultMapZoom(),
        });
      }

      vehicleClickHandle = mapView.on('click', (event) => {
        mapView.hitTest(event, { include: [vehicleLayer] }).then((response) => {
          const hit = response.results.find(
            (r) => 'graphic' in r && r.graphic?.layer === vehicleLayer
          );
          if (hit && 'graphic' in hit && onVehicleClick) {
            const tripId = hit.graphic.attributes?.tripId;
            if (tripId) onVehicleClick(tripId);
          }
        });
      });

      setIsLoading(false);
    };

    init().catch((err) => {
      console.error('Map initialization failed:', err);
      setLayerErrors([err instanceof Error ? err.message : 'Map failed to load']);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      highlightHandle?.remove();
      vehicleClickHandle?.remove();
      destroyWidgets?.();
      viewRef.current?.destroy();
      viewRef.current = null;
      layersRef.current = null;
      setLayers(null);
      setView(null);
    };
  }, [config.center.latitude, config.center.longitude, onVehicleClick]);

  return {
    mapRef,
    view,
    layers,
    layerErrors,
    isLoading,
  };
}
