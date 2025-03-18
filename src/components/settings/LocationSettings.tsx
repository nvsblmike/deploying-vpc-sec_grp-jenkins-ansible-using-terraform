'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MapPin, Plus, Trash } from 'lucide-react';
import type { GeoFence } from '@/types/db';

export function LocationSettings() {
  const [newLocation, setNewLocation] = useState<Partial<GeoFence>>({
    name: '',
    latitude: 0,
    longitude: 0,
    radius: 100,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['attendance-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    },
  });

  const { mutate: updateLocations } = useMutation({
    mutationFn: async (locations: GeoFence[]) => {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedLocations: locations }),
      });
      if (!res.ok) throw new Error('Failed to update locations');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Locations updated successfully');
      setNewLocation({ name: '', latitude: 0, longitude: 0, radius: 100 });
    },
    onError: () => {
      toast.error('Failed to update locations');
    },
  });

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      toast.error('Please fill in all required fields');
      return;
    }

    const locations = [...(config?.allowedLocations || []), newLocation as GeoFence];
    updateLocations(locations);
  };

  const handleRemoveLocation = (index: number) => {
    const locations = [...(config?.allowedLocations || [])];
    locations.splice(index, 1);
    updateLocations(locations);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="name">Location Name</Label>
          <Input
            id="name"
            value={newLocation.name}
            onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Main Office"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            value={newLocation.latitude}
            onChange={(e) => setNewLocation((prev) => ({ ...prev, latitude: Number(e.target.value) }))}
            placeholder="e.g., 51.5074"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={newLocation.longitude}
            onChange={(e) => setNewLocation((prev) => ({ ...prev, longitude: Number(e.target.value) }))}
            placeholder="e.g., -0.1278"
          />
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
      </div>

      <Button onClick={handleAddLocation} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Location
      </Button>

      <div className="space-y-4">
        {config?.allowedLocations?.map((location: GeoFence, index: number) => (
          <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div className="flex items-center space-x-4">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium">{location.name}</p>
                <p className="text-sm text-muted-foreground">
                  {location.latitude}, {location.longitude} ({location.radius}m)
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemoveLocation(index)}>
              <Trash className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
