'use client';

import React from 'react';
import { MapPin, Camera } from 'lucide-react';
import type { AttendanceEvent } from '@/types/attendance';

interface AttendanceDetailsProps {
  event: AttendanceEvent;
  type: 'checkIn' | 'checkOut';
}

export function AttendanceDetails({ event }: AttendanceDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Map View */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <MapPin className="h-4 w-4" />
          Location
        </div>
        <div className="h-[200px] w-full rounded-lg overflow-hidden border border-gray-200">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.location.longitude - 0.002}%2C${
              event.location.latitude - 0.002
            }%2C${event.location.longitude + 0.002}%2C${event.location.latitude + 0.002}&layer=mapnik&marker=${
              event.location.latitude
            }%2C${event.location.longitude}`}
            allowFullScreen
          />
        </div>
        {event.location.address && <p className="text-sm text-gray-600">{event.location.address}</p>}
        <a
          href={`https://www.openstreetmap.org/?mlat=${event.location.latitude}&mlon=${event.location.longitude}#map=17/${event.location.latitude}/${event.location.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View larger map
        </a>
      </div>

      {/* Selfie View */}
      {event.selfie && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Camera className="h-4 w-4" />
            Selfie
          </div>
          <div className="relative h-[200px] w-full rounded-lg overflow-hidden border border-gray-200">
            <img src={`/api/employee/selfie/${event.selfie}`} alt="Employee selfie" className="object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
