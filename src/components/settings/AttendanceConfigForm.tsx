'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MapPin, Plus, Trash } from 'lucide-react';
import type { GeoFence, WorkingHours } from '@/types/db';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface AttendanceConfig {
  allowedLocations: GeoFence[];
  workingHours: WorkingHours;
  requireSelfie: boolean;
}

const defaultWorkingHours: WorkingHours = {
  start: '09:00',
  end: '17:00',
  flexibleTime: 30,
  breakTime: 60,
};

const defaultLocation: Partial<GeoFence> = {
  name: '',
  latitude: 0,
  longitude: 0,
  radius: 100,
};

export function AttendanceConfigForm() {
  const [mounted, setMounted] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<GeoFence>>(defaultLocation);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours);

  const { data: config, isLoading } = useQuery({
    queryKey: ['attendance-config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json() as Promise<AttendanceConfig>;
    },
  });

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update form state when config is fetched
  useEffect(() => {
    if (config?.workingHours) {
      setWorkingHours(config.workingHours);
    }
    if (config?.allowedLocations?.length) {
      setNewLocation(config.allowedLocations[0]);
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: async (data: AttendanceConfig) => {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update config');
      return response.json();
    },
    onSuccess: (data: AttendanceConfig) => {
      toast.success('Settings updated successfully');
      // Only reset location form if we just added a location
      if (data.allowedLocations.length) setNewLocation(data.allowedLocations[0]);
      if (data.workingHours) setWorkingHours(data.workingHours);
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const handleAddLocation = () => {
    if (!config) return;

    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      toast.error('Please fill in all location fields');
      return;
    }

    mutation.mutate({
      ...config,
      allowedLocations: [...config.allowedLocations, newLocation as GeoFence],
    });
  };

  const handleRemoveLocation = (index: number) => {
    if (!config) return;

    mutation.mutate({
      ...config,
      allowedLocations: config.allowedLocations.filter((_, i) => i !== index),
    });
  };

  const handleWorkingHoursChange = (field: keyof WorkingHours, value: string | number) => {
    const updatedHours = { ...workingHours, [field]: value };
    setWorkingHours(updatedHours);

    if (!config) return;

    // Debounce the update to avoid too many API calls
    const timeoutId = setTimeout(() => {
      mutation.mutate({
        ...config,
        workingHours: updatedHours,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Don't render anything until after hydration
  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={workingHours.start}
                onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={workingHours.end}
                onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flexibleTime">Flexible Time (minutes)</Label>
              <Input
                id="flexibleTime"
                type="number"
                value={workingHours.flexibleTime}
                onChange={(e) => handleWorkingHoursChange('flexibleTime', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakTime">Break Time (minutes)</Label>
              <Input
                id="breakTime"
                type="number"
                value={workingHours.breakTime}
                onChange={(e) => handleWorkingHoursChange('breakTime', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Locations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name</Label>
              <Input
                id="locationName"
                value={newLocation.name}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Office"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={newLocation.latitude}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, latitude: Number(e.target.value) }))}
                  placeholder="e.g., 51.5074"
                  type="number"
                  step="any"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={newLocation.longitude}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, longitude: Number(e.target.value) }))}
                  placeholder="e.g., -0.1278"
                  type="number"
                  step="any"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (meters)</Label>
              <Input
                id="radius"
                type="number"
                value={newLocation.radius}
                onChange={(e) => setNewLocation((prev) => ({ ...prev, radius: Number(e.target.value) }))}
                placeholder="e.g., 100"
              />
            </div>
            <Button onClick={handleAddLocation} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Add Location
            </Button>
          </div>

          {config?.allowedLocations.length === 0 && (
            <div className="text-center text-sm text-muted-foreground">No locations added yet</div>
          )}

          <div className="space-y-2">
            {config?.allowedLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {location.latitude}, {location.longitude} ({location.radius}m)
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveLocation(index)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
