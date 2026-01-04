import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { searchGeocodeOSM } from '../../utils/osmGeocoding';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';

// Create custom marker icon
const createCustomIcon = (color = '#3B82F6') => {
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Fix for default marker icons in Leaflet (fallback)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationPickerLeaflet = ({ 
  onLocationSelect, 
  initialLocation = null,
  height = '400px',
  readOnly = false 
}) => {
  const { t } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || {
    lat: 23.8103, // Default to Dhaka
    lng: 90.4125
  });
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const searchAbortRef = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const userHasSelectedRef = useRef(false);
  const watchIdRef = useRef(null);
  const customIcon = createCustomIcon('#3B82F6');

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      userHasSelectedRef.current = true;
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  // Debounced forward geocoding (search) via Nominatim
  useEffect(() => {
    if (readOnly) return;

    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearchError('');
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      return;
    }

    const ctrl = new AbortController();
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = ctrl;

    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const results = await searchGeocodeOSM(q, { limit: 6, signal: ctrl.signal });
        setSearchResults(results);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Error searching location:', err);
          setSearchError('Search failed. Try a different query.');
          setSearchResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 1000);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [searchQuery, readOnly]);

  // Get address from coordinates using Nominatim (OpenStreetMap geocoding)
  const reverseGeocode = useCallback(async (location, retryCount = 0) => {
    try {
      // Add delay to respect Nominatim rate limits (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'WorkerCallingApp/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 429 && retryCount < 2) {
          // Rate limited, wait longer and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          return reverseGeocode(location, retryCount + 1);
        }
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      if (data && data.display_name) {
        // Format address nicely
        let formattedAddress = data.display_name;
        if (data.address) {
          const addr = data.address;
          const parts = [];
          if (addr.house_number) parts.push(addr.house_number);
          if (addr.road) parts.push(addr.road);
          if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
          if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
          if (parts.length > 0) {
            formattedAddress = parts.join(', ');
          }
        }
        
        setAddress(formattedAddress);
        if (onLocationSelectRef.current) {
          onLocationSelectRef.current({
            ...location,
            address: formattedAddress
          });
        }
      } else {
        const fallbackAddress = `${t('location.locationAt')} ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        setAddress(fallbackAddress);
        if (onLocationSelectRef.current) {
          onLocationSelectRef.current({
            ...location,
            address: fallbackAddress
          });
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback: use coordinates as address
      const fallbackAddress = `Location at ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      if (onLocationSelectRef.current) {
        onLocationSelectRef.current({
          ...location,
          address: fallbackAddress
        });
      }
    }
  }, []);

  // Component to update map view when location changes
  const MapUpdater = ({ location }) => {
    const map = useMap();
    
    useEffect(() => {
      if (location && map && mapReady) {
        const currentZoom = map.getZoom();
        const newZoom = currentZoom < 13 ? 15 : currentZoom; // Ensure minimum zoom when updating location
        
        map.flyTo([location.lat, location.lng], newZoom, {
          duration: 1.0,
          easeLinearity: 0.25
        });
      }
    }, [location.lat, location.lng, map, mapReady]);
    
    return null;
  };

  // Component to handle map clicks
  const MapClickHandler = ({ onClick }) => {
    useMapEvents({
      click: (e) => {
        if (!readOnly) {
          onClick(e);
        }
      },
    });
    return null;
  };

  const handleMapClick = useCallback((e) => {
    if (readOnly) return;
    
    const location = {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    };
    
    userHasSelectedRef.current = true;
    setSelectedLocation(location);
    reverseGeocode(location);
  }, [readOnly, reverseGeocode]);

  // Get current location on mount
  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      reverseGeocode(initialLocation);
      return;
    }

    if (readOnly) return;
    if (!navigator.geolocation) return;
    // Don't auto-overwrite after user has manually picked a spot.
    if (userHasSelectedRef.current) return;

    // Most browsers require HTTPS (or localhost) for geolocation.
    if (!window.isSecureContext) {
      setGeoError('Geolocation requires HTTPS (or localhost).');
      return;
    }

    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setSelectedLocation(location);
        if (mapRef.current) {
          mapRef.current.setView([location.lat, location.lng], 15);
        }
        reverseGeocode(location);
        setLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setGeoError(describeGeoError(error));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [initialLocation, reverseGeocode, readOnly]);

  const handleMarkerDrag = useCallback((e) => {
    if (readOnly) return;
    const location = {
      lat: e.target.getLatLng().lat,
      lng: e.target.getLatLng().lng
    };
    userHasSelectedRef.current = true;
    setSelectedLocation(location);
    reverseGeocode(location);
  }, [readOnly, reverseGeocode]);

  const describeGeoError = (err) => {
    if (!err) return 'Failed to get your location.';
    if (err.code === 1) return 'Location permission denied. Please allow location access and try again.';
    if (err.code === 2) return 'Location unavailable. Please check GPS/network and try again.';
    if (err.code === 3) return 'Location request timed out. Please try again.';
    return err.message || 'Failed to get your location.';
  };

  const locateMe = useCallback(() => {
    if (readOnly) {
      console.log('[GPS] Read-only mode, GPS disabled');
      return;
    }

    console.log('[GPS] locateMe called, mapReady:', mapReady, 'mapRef:', !!mapRef.current);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser.';
      console.error('[GPS]', errorMsg);
      setGeoError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Most browsers require HTTPS (or localhost) for geolocation.
    if (!window.isSecureContext && window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      const errorMsg = 'Geolocation requires HTTPS (or localhost).';
      console.error('[GPS]', errorMsg);
      setGeoError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Note: Safari doesn't fully support the Permissions API, so we'll just try directly
    // and handle errors appropriately
    requestLocation();

    function requestLocation() {
      // Stop any existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      setLocating(true);
      setGeoError('');
      console.log('[GPS] Starting geolocation request...');
      
      // Use getCurrentPosition with settings optimized for Safari
      // Safari sometimes has issues with enableHighAccuracy, so we make it optional
      const geoOptions = {
        enableHighAccuracy: false, // Try false first - Safari works better with this
        timeout: 30000, // Longer timeout for Safari
        maximumAge: 60000 // Allow cached location (1 minute) - Safari prefers this
      };

      console.log('[GPS] Calling getCurrentPosition with options:', geoOptions);
      
      navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[GPS] Position received successfully:', position.coords);
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        console.log('[GPS] Setting location:', location);
        userHasSelectedRef.current = true;
        setSelectedLocation(location);
        
        // Update map view - don't wait for mapReady, just try
        const updateMapView = () => {
          if (mapRef.current) {
            try {
              console.log('[GPS] Updating map view to:', location);
              // Zoom based on accuracy - better accuracy = higher zoom
              const zoomLevel = position.coords.accuracy < 50 ? 17 : position.coords.accuracy < 100 ? 16 : 15;
              
              // Use flyTo if available, otherwise setView
              if (typeof mapRef.current.flyTo === 'function') {
                mapRef.current.flyTo([location.lat, location.lng], zoomLevel, {
                  duration: 1.0
                });
              } else {
                mapRef.current.setView([location.lat, location.lng], zoomLevel);
              }
              console.log('[GPS] Map view updated successfully');
              toast.success('Location found! Map updated.', { autoClose: 3000 });
            } catch (mapError) {
              console.error('[GPS] Error updating map view:', mapError);
              // Still continue with location selection even if map update fails
            }
          } else {
            console.warn('[GPS] Map ref not available, but location is set');
          }
        };
        
        // Try to update map immediately
        updateMapView();
        
        // Also try after a small delay in case map isn't ready yet
        setTimeout(updateMapView, 500);
        
        console.log('[GPS] Starting reverse geocoding...');
        reverseGeocode(location);
        setLocating(false);
      },
      (err) => {
        console.error('[GPS] Error getting location:', err);
        setLocating(false);
        
        // Log detailed error information for debugging
        console.error('[GPS] Error details:', {
          code: err.code,
          message: err.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          errorCode: err.code
        });
        
        // Detect Safari browser (more accurate detection)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                        /^((?!chrome|android).)*version/i.test(navigator.userAgent) ||
                        (navigator.vendor && navigator.vendor.indexOf('Apple') > -1 && !navigator.userAgent.match(/CriOS/) && !navigator.userAgent.match(/FxiOS/));
        
        // Show user-friendly toast error with specific message
        let userMessage = '';
        if (err.code === 1 || err.code === err.PERMISSION_DENIED) {
          if (isSafari) {
            userMessage = 'Safari location access denied. Try: 1) Safari menu > Settings > Websites > Location Services > Allow for "localhost:3000". 2) Hard refresh page (Cmd+Shift+R). 3) If still not working, try Chrome/Firefox for testing.';
          } else {
            userMessage = 'Location access denied. Click the 🔒 lock icon in your browser address bar, allow location access, then refresh the page and try again.';
          }
          setGeoError('Location permission denied. Please allow location access and try again.');
        } else if (err.code === 2 || err.code === err.POSITION_UNAVAILABLE) {
          userMessage = 'Unable to get your location. Please check your GPS/network connection and try again.';
          setGeoError('Location unavailable. Please check GPS/network and try again.');
        } else if (err.code === 3) {
          userMessage = 'Location request timed out. Please try again.';
          setGeoError('Location request timed out. Please try again.');
        } else {
          userMessage = 'Failed to get your location. Please try again.';
          setGeoError(err.message || 'Failed to get your location.');
        }
        
        toast.error(userMessage, {
          autoClose: 9000
        });
      },
      geoOptions
      );
    }
  }, [readOnly, reverseGeocode]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div>
      {!readOnly && (
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('location.searchAreaOrAddress')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {(searching || searchError || searchResults.length > 0) && (
                <div className="absolute z-[1000] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                  {searching && (
                    <div className="px-3 py-2 text-sm text-gray-500">{t('location.searching')}</div>
                  )}
                  {!searching && searchError && (
                    <div className="px-3 py-2 text-sm text-red-600">{searchError}</div>
                  )}
                  {!searching && !searchError && searchResults.map((r) => (
                    <button
                      key={r.place_id}
                      type="button"
                      onClick={() => {
                        const location = { lat: r.lat, lng: r.lon };
                        userHasSelectedRef.current = true;
                        setSelectedLocation(location);
                        setAddress(r.display_name);
                        if (onLocationSelectRef.current) {
                          onLocationSelectRef.current({ ...location, address: r.display_name });
                        }
                        if (mapRef.current) {
                          mapRef.current.setView([location.lat, location.lng], 15);
                        }
                        setSearchQuery(r.display_name);
                        setSearchResults([]);
                        setSearchError('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {r.display_name}
                    </button>
                  ))}
                  {!searching && !searchError && searchResults.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">{t('location.noResults')}</div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[GPS] Button clicked');
                locateMe();
              }}
              disabled={locating}
              className="px-4 py-2 btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Use my current location"
            >
              {locating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>{t('location.locating')}</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>{t('location.useGPS')}</span>
                </>
              )}
            </button>
          </div>
          {geoError && (
            <div className="text-xs text-red-600">{geoError}</div>
          )}
        </div>
      )}
      <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
        <MapContainer
          center={[selectedLocation.lat, selectedLocation.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance) => {
            console.log('[Map] Map instance created via whenCreated');
            mapRef.current = mapInstance;
            // Use setTimeout to ensure state update happens after render
            setTimeout(() => {
              setMapReady(true);
              console.log('[Map] Map ready set to true');
            }, 100);
          }}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          zoomControl={false}
          touchZoom={true}
          boxZoom={true}
          keyboard={true}
          dragging={true}
          animate={true}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            minZoom={2}
            maxNativeZoom={19}
            tileSize={256}
            zoomOffset={0}
            noWrap={false}
            updateWhenZooming={true}
            updateWhenIdle={true}
            keepBuffer={2}
          />
          <ZoomControl position="topright" />
          <MapUpdater location={selectedLocation} />
          <MapClickHandler onClick={handleMapClick} />
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            draggable={!readOnly}
            icon={customIcon}
            eventHandlers={{
              dragstart: () => {
                // Optional: hide address while dragging for performance
              },
              dragend: handleMarkerDrag,
              drag: (e) => {
                // Optional: update position during drag (can be performance intensive)
                // const latlng = e.target.getLatLng();
                // setSelectedLocation({ lat: latlng.lat, lng: latlng.lng });
              }
            }}
          />
        </MapContainer>
      </div>
      {address && (
        <div className="mt-3 p-3 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg shadow-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg mt-0.5">📍</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{address}</p>
              {selectedLocation && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('location.coordinates')}: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  {selectedLocation.accuracy && ` (${t('location.accuracy')}: ±${Math.round(selectedLocation.accuracy)}m)`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {!readOnly && (
        <div className="mt-2 text-xs text-gray-500 text-center italic">
          💡 {t('location.tip')}: {t('location.tipDescription')}
        </div>
      )}
    </div>
  );
};

export default LocationPickerLeaflet;

