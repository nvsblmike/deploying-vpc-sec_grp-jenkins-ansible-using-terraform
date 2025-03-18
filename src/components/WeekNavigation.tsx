import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameMonth } from 'date-fns';

interface WeekNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function WeekNavigation({ currentDate, onDateChange }: WeekNavigationProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => {
    onDateChange(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    onDateChange(addDays(weekStart, 7));
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm mb-6">
      <button
        onClick={handlePrevWeek}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="flex space-x-4">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateChange(day)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              format(day, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
                ? 'bg-blue-100 text-blue-700'
                : !isSameMonth(day, currentDate)
                ? 'text-gray-400'
                : 'hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">{format(day, 'EEE')}</span>
            <span className="text-lg">{format(day, 'd')}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleNextWeek}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}