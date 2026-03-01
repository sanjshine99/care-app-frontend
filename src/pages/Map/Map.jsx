// frontend/src/pages/Map/Map.jsx

import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MapPin,
  Users,
  RefreshCw,
  User,
  Home,
  Filter,
  AlertCircle,
  Navigation,
  Maximize2,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const updateMarkersRef = useRef(null);
  const hasFitBounds = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locations, setLocations] = useState({
    careGivers: [],
    careReceivers: [],
  });
  const [stats, setStats] = useState({
    totalCareGivers: 0,
    totalCareReceivers: 0,
    total: 0,
  });
  const [filters, setFilters] = useState({
    showCareGivers: true,
    showCareReceivers: true,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v12",
  );

  // Fallback center (middle of England) — overridden immediately by fitMapToBounds once data loads
  const defaultCenter = { lng: -1.5, lat: 52.5 };
  const defaultZoom = 7;

  // Initialize map only once
  useEffect(() => {
    if (map.current) return; // Prevent re-initialization

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: defaultZoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    let moveendHandler = null;

    map.current.on("load", () => {
      console.log("Map loaded successfully");
      setMapReady(true);
      setLoading(false);
      moveendHandler = () => updateMarkersRef.current?.();
      map.current.on("moveend", moveendHandler);
    });

    return () => {
      if (map.current) {
        if (moveendHandler) {
          map.current.off("moveend", moveendHandler);
        }
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  // Update markers when locations or filters change (ONLY if map is ready)
  // Also auto-fit to data on the very first load, regardless of which arrives first
  useEffect(() => {
    if (mapReady && map.current) {
      updateMarkers();
      if (
        !hasFitBounds.current &&
        (locations.careGivers.length > 0 || locations.careReceivers.length > 0)
      ) {
        fitMapToBounds(locations);
        hasFitBounds.current = true;
      }
    }
  }, [locations, filters, mapReady]);

  const loadLocations = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      }

      const response = await api.get("/map/locations");

      if (response.data.success) {
        const { locations: locs, stats: st } = response.data.data;
        setLocations(locs);
        setStats(st);

        // On manual refresh, re-fit bounds to updated data
        if (
          showToast &&
          mapReady &&
          map.current &&
          (locs.careGivers.length > 0 || locs.careReceivers.length > 0)
        ) {
          fitMapToBounds(locs);
          toast.success("Locations refreshed successfully!");
        }
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setRefreshing(false);
    }
  };

  const fitMapToBounds = (locs) => {
    if (!map.current) return;

    const allLocations = [...locs.careGivers, ...locs.careReceivers];

    if (allLocations.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    allLocations.forEach((location) => {
      bounds.extend([
        location.coordinates.longitude,
        location.coordinates.latitude,
      ]);
    });

    map.current.fitBounds(bounds, {
      padding: 100,
      maxZoom: 14,
      duration: 1000,
    });
  };

  const updateMarkers = () => {
    if (!map.current) {
      console.warn("Map not ready, skipping marker update");
      return;
    }

    // Clear existing markers
    markers.current.forEach((marker) => {
      try {
        marker.remove();
      } catch (e) {
        console.warn("Error removing marker:", e);
      }
    });
    markers.current = [];

    // Add care giver markers
    if (filters.showCareGivers) {
      locations.careGivers.forEach((cg) => {
        try {
          const el = createMarkerElement("caregiver");

          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([cg.coordinates.longitude, cg.coordinates.latitude])
            .setPopup(createPopup(cg))
            .addTo(map.current);

          el.addEventListener("click", () => {
            setSelectedLocation(cg);
          });

          markers.current.push(marker);
        } catch (e) {
          console.error("Error adding care giver marker:", e);
        }
      });
    }

    // Add care receiver markers
    if (filters.showCareReceivers) {
      locations.careReceivers.forEach((cr) => {
        try {
          const el = createMarkerElement("carereceiver");

          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([cr.coordinates.longitude, cr.coordinates.latitude])
            .setPopup(createPopup(cr))
            .addTo(map.current);

          el.addEventListener("click", () => {
            setSelectedLocation(cr);
          });

          markers.current.push(marker);
        } catch (e) {
          console.error("Error adding care receiver marker:", e);
        }
      });
    }

    console.log(`Added ${markers.current.length} markers to map`);
  };
  updateMarkersRef.current = updateMarkers;

  const createMarkerElement = (type) => {
    const root = document.createElement("div");
    root.className = "marker-root";
    root.style.width = "40px";
    root.style.height = "40px";
    root.style.cursor = "pointer";
    root.style.display = "flex";
    root.style.alignItems = "center";
    root.style.justifyContent = "center";
    root.style.borderRadius = "50%";
    root.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    root.style.border = "3px solid white";
    root.style.transition = "transform 0.2s ease-in-out";

    if (type === "caregiver") {
      root.style.backgroundColor = "#3B82F6";
    } else {
      root.style.backgroundColor = "#10B981";
    }

    const iconWrap = document.createElement("div");
    iconWrap.style.display = "flex";
    iconWrap.style.alignItems = "center";
    iconWrap.style.justifyContent = "center";
    iconWrap.style.transition = "transform 0.2s ease-in-out";

    if (type === "caregiver") {
      iconWrap.innerHTML =
        '<svg style="color: white; width: 20px; height: 20px; pointer-events: none;" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>';
    } else {
      iconWrap.innerHTML =
        '<svg style="color: white; width: 20px; height: 20px; pointer-events: none;" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>';
    }

    root.appendChild(iconWrap);

    root.addEventListener("mouseenter", () => {
      iconWrap.style.transform = "scale(1.2)";
    });
    root.addEventListener("mouseleave", () => {
      iconWrap.style.transform = "scale(1)";
    });

    return root;
  };

  const createPopup = (location) => {
    const isCareGiver = location.type === "caregiver";

    return new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isCareGiver ? "#3B82F6" : "#10B981"}; display: flex; align-items: center; justify-content: center;">
              <svg style="color: white; width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
                ${
                  isCareGiver
                    ? '<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>'
                    : '<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>'
                }
              </svg>
            </div>
            <div>
              <p style="font-weight: 600; margin: 0; font-size: 14px;">${location.name}</p>
              <p style="font-size: 11px; color: #666; margin: 0;">${isCareGiver ? "Care Giver" : "Care Receiver"}</p>
            </div>
          </div>
          <div style="font-size: 12px; color: #666;">
            <p style="margin: 4px 0;">📧 ${location.email}</p>
            <p style="margin: 4px 0;">📞 ${location.phone}</p>
            ${
              isCareGiver
                ? `<p style="margin: 4px 0;">🎯 ${location.skills.length} skills</p>`
                : `<p style="margin: 4px 0;"> ${location.dailyVisits} daily visits</p>`
            }
          </div>
        </div>
      `);
  };

  const handleRefresh = () => {
    loadLocations(true);
  };

  const handleFitBounds = () => {
    if (locations.careGivers.length > 0 || locations.careReceivers.length > 0) {
      fitMapToBounds(locations);
    } else {
      toast.info("No locations to display");
    }
  };

  const handleStyleChange = (style) => {
    if (map.current) {
      map.current.setStyle(style);
      setMapStyle(style);
    }
  };

  const getFilteredCount = () => {
    let count = 0;
    if (filters.showCareGivers) count += locations.careGivers.length;
    if (filters.showCareReceivers) count += locations.careReceivers.length;
    return count;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <MapPin className="h-7 w-7 text-primary-600" />
              Locations Map
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View all care givers and care receivers on the map
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">
                  Care Givers: <strong>{stats.totalCareGivers}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">
                  Care Receivers: <strong>{stats.totalCareReceivers}</strong>
                </span>
              </div>
            </div>

            <div className="border-l pl-3 flex gap-2">
              <button
                onClick={handleFitBounds}
                disabled={!mapReady}
                className="btn-secondary flex items-center gap-2"
                title="Fit all locations"
              >
                <Maximize2 className="h-5 w-5" />
                Fit All
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing || !mapReady}
                className="btn-primary flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              Filters
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showCareGivers}
                  onChange={(e) =>
                    setFilters({ ...filters, showCareGivers: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">
                    Show Care Givers ({locations.careGivers.length})
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showCareReceivers}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      showCareReceivers: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-green-600 rounded"
                />
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">
                    Show Care Receivers ({locations.careReceivers.length})
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-600">
                Showing <strong>{getFilteredCount()}</strong> of{" "}
                <strong>{stats.total}</strong> locations
              </p>
            </div>
          </div>

          {/* Map Styles */}
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3 text-sm">Map Style</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  handleStyleChange("mapbox://styles/mapbox/streets-v12")
                }
                disabled={!mapReady}
                className={`text-xs px-3 py-2 rounded border ${mapStyle === "mapbox://styles/mapbox/streets-v12" ? "bg-primary-600 text-white border-primary-600" : "bg-white border-gray-300"}`}
              >
                Streets
              </button>
              <button
                onClick={() =>
                  handleStyleChange(
                    "mapbox://styles/mapbox/satellite-streets-v12",
                  )
                }
                disabled={!mapReady}
                className={`text-xs px-3 py-2 rounded border ${mapStyle === "mapbox://styles/mapbox/satellite-streets-v12" ? "bg-primary-600 text-white border-primary-600" : "bg-white border-gray-300"}`}
              >
                Satellite
              </button>
              <button
                onClick={() =>
                  handleStyleChange("mapbox://styles/mapbox/light-v11")
                }
                disabled={!mapReady}
                className={`text-xs px-3 py-2 rounded border ${mapStyle === "mapbox://styles/mapbox/light-v11" ? "bg-primary-600 text-white border-primary-600" : "bg-white border-gray-300"}`}
              >
                Light
              </button>
              <button
                onClick={() =>
                  handleStyleChange("mapbox://styles/mapbox/dark-v11")
                }
                disabled={!mapReady}
                className={`text-xs px-3 py-2 rounded border ${mapStyle === "mapbox://styles/mapbox/dark-v11" ? "bg-primary-600 text-white border-primary-600" : "bg-white border-gray-300"}`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Location Details */}
          {selectedLocation ? (
            <div className="p-4 border-b bg-blue-50">
              <h3 className="font-semibold mb-3 text-sm">Selected Location</h3>
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full ${selectedLocation.type === "caregiver" ? "bg-blue-500" : "bg-green-500"} flex items-center justify-center`}
                  >
                    {selectedLocation.type === "caregiver" ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Home className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedLocation.name}</p>
                    <p className="text-xs text-gray-600">
                      {selectedLocation.type === "caregiver"
                        ? "Care Giver"
                        : "Care Receiver"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">📧 {selectedLocation.email}</p>
                  <p className="text-gray-600">📞 {selectedLocation.phone}</p>
                  {selectedLocation.type === "caregiver" && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedLocation.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedLocation.type === "carereceiver" && (
                    <p className="text-gray-600">
                      {selectedLocation.dailyVisits} daily visits
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedLocation(null)}
                  className="mt-3 w-full text-xs text-center text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Click on a marker to view details</p>
            </div>
          )}

          {/* Info */}
          <div className="p-4 mt-auto border-t bg-gray-50">
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700 mb-2">Legend:</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Blue markers = Care Givers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Green markers = Care Receivers</span>
              </div>
              <p className="mt-3 text-gray-500">
                💡 Click refresh to update locations after changes
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />

          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}

          {!loading && stats.total === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2 text-gray-800">
                  No Locations Found
                </h3>
                <p className="text-gray-600 mb-4">
                  There are no care givers or care receivers with coordinates to
                  display on the map.
                </p>
                <p className="text-sm text-gray-500">
                  Add care givers and care receivers with valid addresses to see
                  them here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Map;
