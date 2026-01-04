import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const libraries = ['places'];

const LocationPicker = ({ 
  onLocationSelect, 
  initialLocation = null,
  height = '400px',
  readOnly = false 
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || {
    lat: 23.8103, // Default to Dhaka
    lng: 90.4125
  });
  const [address, setAddress] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  const reverseGeocode = useCallback((location) => {
    if (!window.google || !window.google.maps) {
      onLocationSelect(location);
      return;
    }

    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }

    geocoderRef.current.geocode({ location }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const addr = results[0].formatted_address;
        setAddress(addr);
        onLocationSelect({
          ...location,
          address: addr
        });
      } else {
        setAddress('');
        onLocationSelect(location);
      }
    });
  }, [onLocationSelect]);

  const onMapClick = useCallback((e) => {
    if (readOnly || !e.latLng) return;
    
    const location = {
      lat: typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat,
      lng: typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng
    };
    
    setSelectedLocation(location);
    reverseGeocode(location);
  }, [readOnly, reverseGeocode]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    
    // Get current location if available
    if (navigator.geolocation && !initialLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedLocation(location);
          map.setCenter(location);
          map.setZoom(15);
          reverseGeocode(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Still allow user to select location manually
        }
      );
    } else if (initialLocation && initialLocation.lat && initialLocation.lng) {
      map.setCenter(initialLocation);
      map.setZoom(15);
      if (!readOnly) {
        reverseGeocode(initialLocation);
      }
    }
  }, [initialLocation, readOnly, reverseGeocode]);

  if (!googleMapsApiKey) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-600">
          Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file.
        </p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={libraries}
      onLoad={() => {
        // Wait a bit for Google Maps to fully initialize
        setTimeout(() => {
          setIsLoaded(true);
          setMapError(null);
        }, 100);
      }}
      onError={(error) => {
        console.error('Error loading Google Maps:', error);
        setMapError('Failed to load Google Maps. Please check your API key and ensure Maps JavaScript API is enabled.');
        setIsLoaded(false);
      }}
    >
      {mapError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{mapError}</p>
          <p className="text-xs text-red-500 mt-2">
            Make sure REACT_APP_GOOGLE_MAPS_API_KEY is set in your .env file and Maps JavaScript API is enabled in Google Cloud Console.
          </p>
        </div>
      ) : !isLoaded ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="text-gray-500 mb-2">Loading map...</div>
            <div className="text-xs text-gray-400">Please wait while Google Maps loads</div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-gray-300">
            <GoogleMap
              mapContainerStyle={{ height: '100%', width: '100%' }}
              center={selectedLocation}
              zoom={15}
              onClick={onMapClick}
              onLoad={onMapLoad}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                clickableIcons: true,
              }}
            >
              {selectedLocation && (
                <Marker
                  position={selectedLocation}
                  draggable={!readOnly}
                  onDragEnd={(e) => {
                    if (readOnly || !e.latLng) return;
                    const location = {
                      lat: typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat,
                      lng: typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng
                    };
                    setSelectedLocation(location);
                    reverseGeocode(location);
                  }}
                />
              )}
            </GoogleMap>
          </div>
          {address && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
              📍 {address}
            </div>
          )}
          {selectedLocation && (
            <div className="mt-1 text-xs text-gray-500">
              Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
            </div>
          )}
          {!readOnly && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              💡 Click on the map or drag the marker to set your location
            </div>
          )}
        </div>
      )}
    </LoadScript>
  );
};

export default LocationPicker;

