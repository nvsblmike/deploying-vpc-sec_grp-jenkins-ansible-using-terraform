import type { GeoFence, WorkingHours } from '@/types/db';

export function isWithinGeoFence(userLat: number, userLng: number, fence: GeoFence): boolean {
  // Calculate distance using Haversine formula
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (fence.latitude * Math.PI) / 180;
  const Δφ = ((fence.latitude - userLat) * Math.PI) / 180;
  const Δλ = ((fence.longitude - userLng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= fence.radius;
}

export function isWithinWorkingHours(
  datetime: Date,
  workingHours: WorkingHours,
): {
  isValid: boolean;
  message?: string;
} {
  const time = datetime.toTimeString().slice(0, 5); // Get "HH:mm" format
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  const [startHours, startMinutes] = workingHours.start.split(':').map(Number);
  const startTotalMinutes = startHours * 60 + startMinutes;

  const [endHours, endMinutes] = workingHours.end.split(':').map(Number);
  const endTotalMinutes = endHours * 60 + endMinutes;

  const flexibleTime = workingHours.flexibleTime || 0;

  // Check if within working hours including flexible time
  if (totalMinutes >= startTotalMinutes - flexibleTime && totalMinutes <= endTotalMinutes + flexibleTime) {
    return { isValid: true };
  }

  return {
    isValid: false,
    message: `Attendance only allowed between ${workingHours.start} and ${workingHours.end} (±${workingHours.flexibleTime} minutes)`,
  };
}

export function validateAttendanceLocation(
  latitude: number,
  longitude: number,
  allowedLocations: GeoFence[],
  allowRemoteWork: boolean,
): {
  isValid: boolean;
  message?: string;
  locationName?: string;
} {
  if (allowRemoteWork) {
    return { isValid: true, message: 'Remote work allowed' };
  }

  for (const fence of allowedLocations) {
    if (isWithinGeoFence(latitude, longitude, fence)) {
      return { isValid: true, locationName: fence.name };
    }
  }

  return {
    isValid: false,
    message: 'Location not within any allowed areas',
  };
}
