'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Search, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceTable, transformedRecords } from '@/components/AttendanceTable';
import { useAttendance } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const {
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
    handleApprove,
    handleReject,
    selectedRecords,
    toggleRecordSelection,
  } = useAttendance();

  // Transform the data to match AttendanceTable's expected format
  const records = useMemo(() => (data?.records ? transformedRecords(data?.records) : []), [data]);

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              {isLoading ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin">
                  <Loader2 className="h-4 w-4 text-gray-500" />
                </div>
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              )}
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters */}
          {(search || status || date) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {search && (
                <div className="inline-flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  Search: {search}
                  <button onClick={() => setSearch('')} className="hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {status && status !== 'none' && (
                <div className="inline-flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  Status: {status}
                  <button onClick={() => setStatus('none')} className="hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {date && (
                <div className="inline-flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  Date: {format(date, 'PPP')}
                  <button onClick={() => setDate(undefined)} className="hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <AttendanceTable
            records={records}
            pageCount={data?.pagination?.totalPages || 1}
            pageIndex={page - 1}
            onPageChange={(newPage) => setPage(newPage + 1)}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={isLoading}
            selectedRecords={selectedRecords}
            toggleRecordSelection={toggleRecordSelection}
          />
        </div>
      </div>
    </div>
  );
}
