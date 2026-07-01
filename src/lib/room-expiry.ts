export const ROOM_EXPIRY_MINUTES = 12;

export function nextRoomExpiry() {
  return new Date(Date.now() + ROOM_EXPIRY_MINUTES * 60 * 1000).toISOString();
}
