// Small helpers for OpenStreetMap Nominatim geocoding.
// Note: Nominatim has usage policies + rate limits. Keep calls debounced and low-volume.

export async function reverseGeocodeOSM(location, { signal } = {}) {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    throw new Error('reverseGeocodeOSM: invalid location');
  }

  const url =
    `https://nominatim.openstreetmap.org/reverse?` +
    `format=json&lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lng)}` +
    `&zoom=18&addressdetails=1`;

  const res = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`reverseGeocodeOSM failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.display_name || null;
}

export async function searchGeocodeOSM(query, { limit = 5, signal } = {}) {
  const q = (query || '').trim();
  if (q.length < 3) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}` +
    `&addressdetails=1`;

  const res = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`searchGeocodeOSM failed: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((r) => ({
      place_id: r.place_id,
      display_name: r.display_name,
      lat: typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat,
      lon: typeof r.lon === 'string' ? parseFloat(r.lon) : r.lon,
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.display_name);
}


