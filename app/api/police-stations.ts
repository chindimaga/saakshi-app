export type PoliceStation = {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
};

export type NearbyPoliceStation = PoliceStation & { distance_km: number };

export type CityChoice = {
  name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
};

/** Karnataka districts/cities used to filter the OpenCity station dataset by proximity. */
export const KARNATAKA_CITIES: readonly CityChoice[] = [
  { name: 'Bagalkot', latitude: 16.1691, longitude: 75.661, radius_km: 30 },
  { name: 'Ballari', latitude: 15.1394, longitude: 76.9214, radius_km: 30 },
  { name: 'Belagavi', latitude: 15.8497, longitude: 74.4977, radius_km: 30 },
  { name: 'Bengaluru Rural', latitude: 13.2847, longitude: 77.6821, radius_km: 35 },
  { name: 'Bengaluru Urban', latitude: 12.9716, longitude: 77.5946, radius_km: 30 },
  { name: 'Bidar', latitude: 17.9104, longitude: 77.5199, radius_km: 30 },
  { name: 'Chikkaballapur', latitude: 13.4355, longitude: 77.7315, radius_km: 30 },
  { name: 'Chikkamagaluru', latitude: 13.3161, longitude: 75.772, radius_km: 30 },
  { name: 'Chitradurga', latitude: 14.2306, longitude: 76.398, radius_km: 30 },
  { name: 'Dakshina Kannada', latitude: 12.9141, longitude: 74.856, radius_km: 35 },
  { name: 'Davangere', latitude: 14.4644, longitude: 75.9218, radius_km: 30 },
  { name: 'Dharwad', latitude: 15.4589, longitude: 75.0078, radius_km: 30 },
  { name: 'Gadag', latitude: 15.431, longitude: 75.635, radius_km: 30 },
  { name: 'Hassan', latitude: 13.0033, longitude: 76.1004, radius_km: 30 },
  { name: 'Haveri', latitude: 14.793, longitude: 75.405, radius_km: 30 },
  { name: 'Kalaburagi', latitude: 17.3297, longitude: 76.8343, radius_km: 30 },
  { name: 'Kodagu', latitude: 12.3375, longitude: 75.8069, radius_km: 35 },
  { name: 'Kolar', latitude: 13.1367, longitude: 78.132, radius_km: 30 },
  { name: 'Koppal', latitude: 15.35, longitude: 76.15, radius_km: 30 },
  { name: 'Mandya', latitude: 12.5218, longitude: 76.8951, radius_km: 30 },
  { name: 'Mysuru', latitude: 12.2958, longitude: 76.6394, radius_km: 30 },
  { name: 'Raichur', latitude: 16.212, longitude: 77.3439, radius_km: 30 },
  { name: 'Ramanagara', latitude: 12.72, longitude: 77.28, radius_km: 30 },
  { name: 'Shivamogga', latitude: 13.9299, longitude: 75.5681, radius_km: 30 },
  { name: 'Tumakuru', latitude: 13.3379, longitude: 77.1133, radius_km: 30 },
  { name: 'Udupi', latitude: 13.3409, longitude: 74.7421, radius_km: 30 },
  { name: 'Uttara Kannada', latitude: 14.8, longitude: 74.13, radius_km: 40 },
  { name: 'Vijayapura', latitude: 16.8302, longitude: 75.71, radius_km: 30 },
  { name: 'Vijayanagara', latitude: 15.275, longitude: 76.39, radius_km: 35 },
  { name: 'Yadgir', latitude: 16.77, longitude: 77.1376, radius_km: 30 },
].slice().sort((left, right) => left.name.localeCompare(right.name));

export function findCity(name: string): CityChoice | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return KARNATAKA_CITIES.find((city) => city.name.toLowerCase() === normalized) ?? null;
}

const stripXml = (value: string) => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const field = (placemark: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = placemark.match(new RegExp(`<SimpleData\\s+name=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/SimpleData>`, 'i'));
  return match ? stripXml(match[1]) || null : null;
};

const tag = (placemark: string, name: string) => {
  const match = placemark.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? stripXml(match[1]) || null : null;
};

/** Parse the OpenCity KML without adding an XML dependency to the worker bundle. */
export function parsePoliceStationKml(kml: string): PoliceStation[] {
  const stations: PoliceStation[] = [];
  for (const match of kml.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi)) {
    const placemark = match[1];
    const coordinates = tag(placemark, 'coordinates');
    if (!coordinates) continue;
    const [rawLongitude, rawLatitude] = coordinates.trim().split(/\s|,/);
    const longitude = Number(rawLongitude);
    const latitude = Number(rawLatitude);
    const name = field(placemark, 'POL_STAName') ?? tag(placemark, 'name');
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    stations.push({
      name,
      address: field(placemark, 'Address') ?? field(placemark, 'ADDRESS') ?? tag(placemark, 'address'),
      latitude,
      longitude,
      phone: field(placemark, 'Phone') ?? field(placemark, 'PHONE') ?? field(placemark, 'PhoneNumber'),
    });
  }
  return stations;
}

export function haversineKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearbyStations(
  stations: PoliceStation[],
  latitude: number,
  longitude: number,
  radiusKm: number,
): NearbyPoliceStation[] {
  return stations
    .map((station) => ({ ...station, distance_km: haversineKm(latitude, longitude, station.latitude, station.longitude) }))
    .filter((station) => station.distance_km <= radiusKm)
    .sort((left, right) => left.distance_km - right.distance_km)
    .map((station) => ({ ...station, distance_km: Number(station.distance_km.toFixed(2)) }));
}
