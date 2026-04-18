import * as Linking from 'expo-linking';

export async function openAddressInMaps(address: string, lat?: number | null, lng?: number | null) {
  const query = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(address);
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  await Linking.openURL(url);
}

export function buildMapsEmbedUrl(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}
