export interface MapObject {
  id: string;
  image: string; // base64 data URL
  x: number; // center
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  locked?: boolean;
}

const key = (mapId: string) => `map-objects-${mapId}`;

export function loadMapObjects(mapId: string): MapObject[] {
  try {
    const raw = localStorage.getItem(key(mapId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMapObjects(mapId: string, objects: MapObject[]) {
  try {
    localStorage.setItem(key(mapId), JSON.stringify(objects));
  } catch (e) {
    console.warn('Failed to save map objects', e);
  }
}
