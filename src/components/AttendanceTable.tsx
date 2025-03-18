'use client';

import React, { useMemo, useState } from 'react';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AttendanceEvent } from '../types/attendance';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { Button } from './ui/button';
import type { AttendanceResponse } from '@/types/attendance';
import { AttendanceDetails } from '@/components/AttendanceDetails';
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  CalendarIcon,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  User,
  X as XIcon,
  Check as CheckIcon,
  Loader2,
} from 'lucide-react';

interface Employee {
  Staff_ID: string;
  personalInfo: {
    name: {
      first: string;
      last: string;
    };
  };
}

export function transformedRecords(records: AttendanceResponse['records']) {
  return (
    records.map((record) => {
      // Ensure we have valid dates before formatting
      const checkInDate = new Date(record.clockIn.createdAt);
      const checkOutDate = record.clockOut ? new Date(record.clockOut.createdAt) : null;

      if (isNaN(checkInDate.getTime())) {
        console.error('Invalid check-in date:', record.clockIn.createdAt);
      }
      if (checkOutDate && isNaN(checkOutDate.getTime())) {
        console.error('Invalid check-out date:', record.clockOut?.createdAt);
      }

      return {
        id: record._id as unknown as string,
        userId: record.employee.Staff_ID,
        userName: `${record.employee.personalInfo.name.first} ${record.employee.personalInfo.name.last}`,
        date: new Date(record.date),
        status: record.status,
        checkIn: {
          time: isNaN(checkInDate.getTime()) ? 'Invalid time' : format(checkInDate, 'HH:mm'),
          location: {
            latitude: record.clockIn.location.latitude,
            longitude: record.clockIn.location.longitude,
            address: record.clockIn.location.address,
          },
          selfie: record.clockIn.fileName,
          status: record.clockIn.status,
        },
        checkOut: record.clockOut
          ? {
              time: checkOutDate ? format(checkOutDate, 'HH:mm') : 'Invalid time',
              location: {
                latitude: record.clockOut.location.latitude,
                longitude: record.clockOut.location.longitude,
                address: record.clockOut.location.address,
              },
              selfie: record.clockOut.fileName,
              status: record.clockOut.status,
            }
          : undefined,
        remarks: record.remarks,
      };
    }) || []
  );
}

export type TransformedAttendanceRecord = ReturnType<typeof transformedRecords>[number];
interface AttendanceTableProps {
  records: TransformedAttendanceRecord[];
  onApprove: (ids: string[], eventType?: 'checkIn' | 'checkOut') => void;
  onReject: (ids: string[], remarks: string, eventType?: 'checkIn' | 'checkOut') => void;
  pageCount: number;
  pageIndex: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
  selectedRecords: string[];
  toggleRecordSelection: (id: string) => void;
}

export function AttendanceTable({
  records,
  onApprove,
  onReject,
  pageCount,
  pageIndex,
  onPageChange,
  isLoading,
  selectedRecords,
  toggleRecordSelection,
}: AttendanceTableProps) {
  const [selectedEvent, setSelectedEvent] = useState<{ event: AttendanceEvent; type: 'checkIn' | 'checkOut' } | null>(null);
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejectingEventType, setRejectingEventType] = useState<'checkIn' | 'checkOut' | undefined>();
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ value: string; label: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [approvingEventType, setApprovingEventType] = useState<'checkIn' | 'checkOut' | undefined>();

  const queryClient = useQueryClient();

  // Fetch employees using React Query
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/admin/employees');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      return (data.employees || []) as Employee[];
    },
  });
  const employeesOptions = useMemo(
    () =>
      employeesData?.map((employee) => ({
        value: employee.Staff_ID,
        label: `${employee.personalInfo.name.first} ${employee.personalInfo.name.last}`,
      })) || [],
    [employeesData],
  );
  // Clock in/out mutation
  const clockMutation = useMutation({
    mutationFn: async ({
      type,
      employeeId,
      location,
      timestamp,
    }: {
      type: 'clockin' | 'clockout';
      employeeId: string;
      location: { latitude: number; longitude: number };
      timestamp?: string;
    }) => {
      const response = await fetch('/api/admin/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          employeeId,
          location,
          timestamp,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clock in/out');
      }
      return response.json();
    },
    onSuccess: () => {
      // Refresh attendance data
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Failed to perform clock action');
    },
  });

  const handleClockAction = async (type: 'clockin' | 'clockout') => {
    if (!selectedEmployee) return;

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Create timestamp if date and time are selected
      let timestamp: string | undefined;
      if (selectedDate && selectedTime) {
        const [hours, minutes] = selectedTime.split(':');
        const date = new Date(selectedDate);
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        timestamp = date.toISOString();
      }

      await clockMutation.mutateAsync({
        type,
        employeeId: selectedEmployee.value,
        location,
        timestamp,
      });

      // Reset date and time after successful clock action
      setSelectedDate(undefined);
      setSelectedTime('');
      setShowDatePicker(false);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Failed to get location. Please ensure location access is enabled.');
    }
  };

  const handleRejectSelected = () => {
    setRejectingIds(selectedRecords);
    setRejectingEventType(undefined);
    setRejectDialogOpen(true);
  };

  const handleReject = (ids: string[], eventType?: 'checkIn' | 'checkOut') => {
    setRejectingIds(ids);
    setRejectingEventType(eventType);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    onReject(rejectingIds, rejectRemarks, rejectingEventType);
    setRejectDialogOpen(false);
    setRejectRemarks('');
    setRejectingIds([]);
    setRejectingEventType(undefined);
  };

  const getStatusColor = (status: TransformedAttendanceRecord['status'] | string | undefined) => {
    switch (status) {
      case 'approved':
        return 'text-green-800 bg-green-100';
      case 'rejected':
        return 'text-red-800 bg-red-100';
      case 'partial':
        return 'text-orange-800 bg-orange-100';
      default:
        return 'text-yellow-800 bg-yellow-100';
    }
  };

  const resetSelection = () => {
    setSelectedEmployee(null);
    setSelectedDate(undefined);
    setSelectedTime('');
    setShowDatePicker(false);
  };

  const handleApprove = (id: string, type: 'checkIn' | 'checkOut') => {
    setApprovingEventType(type);
    onApprove([id], type);
    setTimeout(() => setApprovingEventType(undefined), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-[300px] justify-between">
                {selectedEmployee ? `${selectedEmployee.label}` : 'Select employee...'}
                <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search employee..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    {employeesLoading ? (
                      <CommandItem disabled>Loading employees...</CommandItem>
                    ) : (
                      employeesOptions.map((employee) => (
                        <CommandItem
                          key={employee.value}
                          value={employee.value}
                          onSelect={() => {
                            setSelectedEmployee(employee);
                            setOpen(false);
                          }}
                        >
                          {employee.label}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedEmployee && (
            <Card className="mt-4 max-w-md">
              <CardHeader className="relative">
                <CardTitle className="text-lg">Clock {selectedDate || selectedTime ? 'with Custom Time' : 'Now'}</CardTitle>
                <CardDescription>Selected Employee: {selectedEmployee.label}</CardDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                  onClick={resetSelection}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <div className="flex items-center gap-2">
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!selectedDate && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setShowDatePicker(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date(new Date().setDate(new Date().getDate() - 30))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="time">Time</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="time"
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full pl-10"
                      />
                      <ClockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleClockAction('clockin')}
                    disabled={clockMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {clockMutation.isPending ? 'Processing...' : 'Clock In'}
                  </Button>
                  <Button
                    onClick={() => handleClockAction('clockout')}
                    disabled={clockMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    {clockMutation.isPending ? 'Processing...' : 'Clock Out'}
                  </Button>
                </div>

                {clockMutation.isPending && (
                  <div className="text-sm text-muted-foreground text-center animate-pulse">Getting location...</div>
                )}
              </CardContent>
              <CardFooter className="justify-end pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(undefined);
                    setSelectedTime('');
                  }}
                  className="text-muted-foreground"
                  disabled={!selectedDate && !selectedTime}
                >
                  Reset Time
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Selection Actions */}
          {selectedRecords.length > 0 && (
            <div className="sticky top-0 z-10 bg-blue-50/95 backdrop-blur-sm px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-sm text-blue-700 font-medium">
                {selectedRecords.length} {selectedRecords.length === 1 ? 'record' : 'records'} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onApprove(selectedRecords)} variant="default" className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
                <Button onClick={handleRejectSelected} variant="destructive">
                  <X className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6">
          <div className="inline-block min-w-full py-2 align-middle px-4 sm:px-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="relative px-4 sm:px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      onChange={(e) => {
                        const ids = records.filter((r) => r.status === 'pending' && r.checkOut).map((r) => r.id);
                        if (e.target.checked) {
                          ids.forEach(
                            (id) =>
                              !selectedRecords.includes(id as unknown as string) &&
                              toggleRecordSelection(id as unknown as string),
                          );
                        } else {
                          toggleRecordSelection('');
                        }
                      }}
                      checked={
                        records.length > 0 &&
                        records.filter((r) => r.status === 'pending' && r.checkOut).length > 0 &&
                        records
                          .filter((r) => r.status === 'pending' && r.checkOut)
                          .every((r) => selectedRecords.includes(r.id as unknown as string))
                      }
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <>
                    {[...Array(5)].map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap w-12">
                          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id as unknown as string} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap w-12">
                        {record.status === 'pending' && record.checkOut && (
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(record.id as unknown as string)}
                            onChange={() => toggleRecordSelection(record.id as unknown as string)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-sm text-gray-900 font-medium">{record.userId}</td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-sm text-gray-900">{record.userName}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-900">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                      <td className="px-3 py-3.5 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedEvent({ event: record.checkIn, type: 'checkIn' })}
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          >
                            {record.checkIn.time}
                            <MapPinIcon className="ml-1 h-4 w-4" />
                          </button>
                          <span
                            className={clsx(
                              'inline-flex items-center rounded-md py-0.5 px-1 text-[10px] font-medium capitalize',
                              {
                                'bg-yellow-50 text-yellow-800': record.checkIn.status === 'pending',
                                'bg-green-50 text-green-800': record.checkIn.status === 'approved',
                                'bg-red-50 text-red-800': record.checkIn.status === 'rejected',
                              },
                            )}
                          >
                            {record.checkIn.status}
                          </span>
                          {record.status === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                className="text-green-600 hover:text-green-800"
                                onClick={() => handleApprove(record.id, 'checkIn')}
                                disabled={approvingEventType === 'checkIn'}
                              >
                                {approvingEventType === 'checkIn' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800"
                                onClick={() => handleReject([record.id], 'checkIn')}
                                disabled={rejectingEventType === 'checkIn'}
                              >
                                {rejectingEventType === 'checkIn' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XIcon className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm">
                        {record.checkOut && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedEvent({ event: record.checkOut!, type: 'checkOut' })}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800"
                            >
                              {record.checkOut.time}
                              <MapPinIcon className="ml-1 h-4 w-4" />
                            </button>
                            <span
                              className={clsx(
                                'inline-flex items-center rounded-md px-1 py-0.5 text-[10px] font-medium capitalize',
                                {
                                  'bg-yellow-50 text-yellow-800': record.checkOut.status === 'pending',
                                  'bg-green-50 text-green-800': record.checkOut.status === 'approved',
                                  'bg-red-50 text-red-800': record.checkOut.status === 'rejected',
                                },
                              )}
                            >
                              {record.checkOut.status}
                            </span>
                            {record.status === 'pending' && (
                              <div className="flex gap-1">
                                <button
                                  className="text-green-600 hover:text-green-800"
                                  onClick={() => handleApprove(record.id, 'checkOut')}
                                  disabled={approvingEventType === 'checkOut'}
                                >
                                  {approvingEventType === 'checkOut' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckIcon className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-800"
                                  onClick={() => handleReject([record.id], 'checkOut')}
                                  disabled={rejectingEventType === 'checkOut'}
                                >
                                  {rejectingEventType === 'checkOut' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={clsx(
                              'px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full w-fit capitalize',
                              getStatusColor(record.status),
                            )}
                          >
                            {record.status === 'partial' ? 'Partial Approval' : record.status}
                          </span>
                          {(record.status === 'rejected' ||
                            record.checkIn.status === 'rejected' ||
                            record.checkOut?.status === 'rejected') &&
                            record.remarks && <span className="text-xs text-red-600 font-medium">Reason: {record.remarks}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm">
                        {record.remarks && (
                          <div className="text-xs text-muted-foreground">
                            {record.remarks.split('\n').map(
                              (line, i) =>
                                line.trim() && (
                                  <div key={i} className="leading-5">
                                    {line.startsWith('Clock-') ? (
                                      <span className="font-medium text-foreground">{line}</span>
                                    ) : (
                                      line
                                    )}
                                  </div>
                                ),
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap text-sm text-gray-500">
                        {record.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApprove([record.id as unknown as string])}
                              disabled={!record.checkOut}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject([record.id as unknown as string])}
                              disabled={!record.checkOut}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button variant="outline" size="sm" onClick={() => onPageChange(pageIndex - 1)} disabled={pageIndex === 0}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={pageIndex === pageCount - 1}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{pageIndex + 1}</span> of{' '}
                <span className="font-medium">{pageCount}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-l-md"
                  onClick={() => onPageChange(pageIndex - 1)}
                  disabled={pageIndex === 0}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: pageCount }).map((_, idx) => (
                  <Button
                    key={idx}
                    variant={pageIndex === idx ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => onPageChange(idx)}
                  >
                    {idx + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-r-md"
                  onClick={() => onPageChange(pageIndex + 1)}
                  disabled={pageIndex === pageCount - 1}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Attendance</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting the selected attendance {rejectingIds.length > 1 ? 'records' : 'record'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Rejection Reason</Label>
              <Textarea
                id="remarks"
                placeholder="Enter the reason for rejection..."
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!rejectRemarks.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.type === 'checkIn' ? 'Check In' : 'Check Out'} Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && <AttendanceDetails event={selectedEvent.event} type={selectedEvent.type} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
