import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DateFilterProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

export function DateFilter({ currentDate, onMonthChange }: DateFilterProps) {
  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = event.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, 1);
    onMonthChange(newDate);
  };

  return (
    <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="flex items-center">
        <Calendar className="h-5 w-5 text-gray-500 mr-2" />
        <span className="text-gray-700 font-medium">
          {format(currentDate, 'MMMM yyyy')}
        </span>
      </div>
      <input
        type="month"
        value={format(currentDate, 'yyyy-MM')}
        onChange={handleMonthChange}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}