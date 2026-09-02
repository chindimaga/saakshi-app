import {
  findCity,
  findNearbyStations,
  haversineKm,
  KARNATAKA_CITIES,
  parsePoliceStationKml,
  type PoliceStation,
} from '../police-stations';

const OPEN_CITY_KARNATAKA_KML = 'https://data.opencity.in/dataset/1fe7e205-d00e-437e-b43d-6237f065dc2d/resource/9f99ef79-3231-4c9a-8a9d-c8940198489a/download/9181e6ed-6164-430c-8b10-238ad7b8ab45.kml';
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_RADIUS_KM = 100;
const MAX_EDITABLE_STATIONS = 25;

let cachedStations: { loadedAt: number; stations: PoliceStation[] } | null = null;

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const finiteNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function requestValues(request: Request): Promise<{
  userLat: number | null;
  userLng: number | null;
  radiusKm: number | null;
  list: boolean;
  cities: boolean;
  city: string;
  search: string;
}> {
  if (request.method === 'GET') {
    const params = new URL(request.url).searchParams;
    return {
      userLat: finiteNumber(params.get('user_lat')),
      userLng: finiteNumber(params.get('user_lng')),
      radiusKm: params.has('radius_km') ? finiteNumber(params.get('radius_km')) : 10,
      list: params.get('list') === 'true',
      cities: params.get('cities') === 'true',
      city: (params.get('city') ?? '').trim(),
      search: (params.get('search') ?? '').trim(),
    };
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    return {
      userLat: finiteNumber(body.user_lat),
      userLng: finiteNumber(body.user_lng),
      radiusKm: body.radius_km === undefined ? 10 : finiteNumber(body.radius_km),
      list: body.list === true,
      cities: body.cities === true,
      city: typeof body.city === 'string' ? body.city.trim() : '',
      search: typeof body.search === 'string' ? body.search.trim() : '',
    };
  } catch {
    return { userLat: null, userLng: null, radiusKm: null, list: false, cities: false, city: '', search: '' };
  }
}

async function loadStations(): Promise<PoliceStation[]> {
  if (cachedStations && Date.now() - cachedStations.loadedAt < CACHE_TTL_MS) return cachedStations.stations;
  const datasetUrl = process.env.POLICE_STATIONS_DATA_URL || OPEN_CITY_KARNATAKA_KML;
  const response = await fetch(datasetUrl, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error('Dataset unavailable');
  const stations = parsePoliceStationKml(await response.text());
  if (!stations.length) throw new Error('Dataset did not contain any station coordinates');
  cachedStations = { loadedAt: Date.now(), stations };
  return stations;
}

const nearestKarnatakaCity = (station: PoliceStation) => KARNATAKA_CITIES.reduce((nearest, city) => (
  !nearest || haversineKm(station.latitude, station.longitude, city.latitude, city.longitude) < haversineKm(station.latitude, station.longitude, nearest.latitude, nearest.longitude)
    ? city
    : nearest
), null as (typeof KARNATAKA_CITIES)[number] | null);

async function handle(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin location lookups are not allowed.' }, 403);
  }
  const { userLat, userLng, radiusKm, list, cities, city, search } = await requestValues(request);

  if (cities) {
    return json({ cities: KARNATAKA_CITIES.map(({ name }) => ({ name })) });
  }

  if (list) {
    try {
      const stations = await loadStations();
      const normalizedSearch = search.toLowerCase();
      const selectedCity = findCity(city);

      let availableStations = selectedCity
        ? findNearbyStations(stations, selectedCity.latitude, selectedCity.longitude, selectedCity.radius_km)
        : [...stations].sort((left, right) => left.name.localeCompare(right.name));

      if (normalizedSearch) {
        availableStations = availableStations.filter((station) =>
          station.name.toLowerCase().includes(normalizedSearch));
      }

      availableStations = availableStations.slice(0, MAX_EDITABLE_STATIONS);

      if (!availableStations.length) {
        const message = selectedCity
          ? `No police stations were found near ${selectedCity.name}.`
          : 'No police stations match that name.';
        return json({ error: message, available_stations: [] }, 404);
      }
      return json({
        city: selectedCity?.name ?? null,
        available_stations: availableStations,
      });
    } catch {
      return json({ error: 'Police-station data is unavailable right now.' }, 503);
    }
  }

  if (userLat === null || userLng === null || radiusKm === null
    || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180
    || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
    return json({ error: `Send valid user_lat, user_lng, and radius_km between 0 and ${MAX_RADIUS_KM}.` }, 400);
  }

  try {
    const nearby = findNearbyStations(await loadStations(), userLat, userLng, radiusKm);
    if (!nearby.length) {
      return json({ error: `No police station was found within ${radiusKm} km.`, available_stations: [] }, 404);
    }
    const [nearest, ...remaining] = nearby;
    const city = nearestKarnatakaCity(nearest);
    return json({
      ...nearest,
      city: city?.name ?? null,
      available_stations: [nearest, ...remaining.slice(0, MAX_EDITABLE_STATIONS - 1)],
    });
  } catch {
    return json({ error: 'Police-station data is unavailable right now. Choose a station manually.' }, 503);
  }
}

export const GET = handle;
export const POST = handle;
