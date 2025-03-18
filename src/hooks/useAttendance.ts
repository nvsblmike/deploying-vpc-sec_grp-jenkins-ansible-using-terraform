'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AttendanceResponse } from '@/types/attendance';

export function useAttendance() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [date, setDate] = useState<Date>();
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Clear selected records when page or filters change
  useEffect(() => {
    setSelectedRecords([]);
  }, [page, search, status, date]);

  const { data, isLoading } = useQuery<AttendanceResponse>({
    queryKey: ['attendance', page, search, status, date],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (search) params.append('search', search);
      if (status && status !== 'none') params.append('status', status);
      if (date) params.append('startDate', date.toISOString());

      const res = await fetch(`/api/admin/attendance?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ ids, eventType }: { ids: string[]; eventType?: 'checkIn' | 'checkOut' }) => {
      const promises = ids.map((id) =>
        fetch('/api/admin/attendance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendanceId: id,
            status: 'approved',
            eventType,
          }),
        }),
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setSelectedRecords([]);
      toast.success('Attendance approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve attendance');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ ids, remarks, eventType }: { ids: string[]; remarks: string; eventType?: 'checkIn' | 'checkOut' }) => {
      const promises = ids.map((id) =>
        fetch('/api/admin/attendance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendanceId: id,
            status: 'rejected',
            remarks,
            eventType,
          }),
        }),
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setSelectedRecords([]);
      toast.success('Attendance rejected successfully');
    },
    onError: () => {
      toast.error('Failed to reject attendance');
    },
  });

  return {
    data,
    isLoading,
    page,
    setPage,
    search,
    setSearch,
    status,
    setStatus,
    date,
    setDate,
    handleApprove: (ids: string[], eventType?: 'checkIn' | 'checkOut') => approveMutation.mutate({ ids, eventType }),
    handleReject: (ids: string[], remarks: string, eventType?: 'checkIn' | 'checkOut') =>
      rejectMutation.mutate({ ids, remarks, eventType }),
    selectedRecords,
    toggleRecordSelection: (id: string) =>
      setSelectedRecords((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])),
  };
}
