/**
 * ArcGIS JS API configuration — load before any @arcgis/core modules.
 * Satellite basemap uses ArcGIS Online (no portal login required).
 */
import esriConfig from '@arcgis/core/config';

const ARCGIS_VERSION = '4.31';
const API_URL = import.meta.env.VITE_API_URL || 'https://esrirw.rw:8000' || 'http://localhost:8000';
const ARCGIS_TOKEN = import.meta.env.VITE_ARCGIS_TOKEN || null;

// Required for @arcgis/core + Vite — without this the map view stays blank
esriConfig.assetsPath = `https://js.arcgis.com/${ARCGIS_VERSION}/@arcgis/core/assets`;

esriConfig.portalUrl = 'https://www.arcgis.com';
esriConfig.request.useIdentity = false;

if (ARCGIS_TOKEN) {
  esriConfig.apiKey = ARCGIS_TOKEN;
}

// Optional Esri Rwanda proxy (only when backend exposes /api/arcgis/proxy)
const useRwandaProxy = import.meta.env.VITE_ARCGIS_RW_PROXY === 'true';
if (useRwandaProxy) {
  esriConfig.request.proxyUrl = `${API_URL}/api/arcgis/proxy`;
  esriConfig.request.trustedServers.push('esrirw.rw');
  esriConfig.request.interceptors = esriConfig.request.interceptors || [];
  esriConfig.request.interceptors.push({
    urls: /^https:\/\/esrirw\.rw\//,
    before(params) {
      params.url = `${API_URL}/api/arcgis/proxy?url=${encodeURIComponent(params.url)}`;
    },
  });
}

export { esriConfig, ARCGIS_TOKEN };
