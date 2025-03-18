'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import type { WorkingHours } from '@/types/db';

export function WorkingHoursSettings() {
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    start: '09:00',
    end: '17:00',
    flexibleTime: 15,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['attendance-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    },
  });

  const { mutate: updateWorkingHours } = useMutation({
    mutationFn: async (hours: WorkingHours) => {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: hours }),
      });
      if (!res.ok) throw new Error('Failed to update working hours');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Working hours updated successfully');
    },
    onError: () => {
      toast.error('Failed to update working hours');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkingHours(workingHours);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start">Start Time</Label>
          <Input
            id="start"
            type="time"
            value={workingHours.start}
            onChange={(e) => setWorkingHours((prev) => ({ ...prev, start: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End Time</Label>
          <Input
            id="end"
            type="time"
            value={workingHours.end}
            onChange={(e) => setWorkingHours((prev) => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="flexibleTime">Flexible Time (minutes)</Label>
          <Input
            id="flexibleTime"
            type="number"
            value={workingHours.flexibleTime}
            onChange={(e) => setWorkingHours((prev) => ({ ...prev, flexibleTime: Number(e.target.value) }))}
            min="0"
            max="120"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        <Clock className="w-4 h-4 mr-2" />
        Update Working Hours
      </Button>

      <div className="p-4 border rounded-lg bg-muted/50">
        <h4 className="font-medium mb-2">Current Working Hours</h4>
        <p className="text-sm text-muted-foreground">
          {config?.workingHours?.start || '09:00'} - {config?.workingHours?.end || '17:00'}
        </p>
        <p className="text-sm text-muted-foreground">Flexible Time: {config?.workingHours?.flexibleTime || 15} minutes</p>
      </div>
    </form>
  );
}
