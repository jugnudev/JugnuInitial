import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  minDate?: Date;
  placeholder?: string;
  testId?: string;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  minDate,
  placeholder = 'Select date and time',
  testId
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse the current value
  const parseValue = () => {
    if (!value) return { date: undefined, time: '19:00' };
    
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) return { date: undefined, time: '19:00' };
    
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return {
      date: dateObj,
      time: `${hours}:${minutes}`
    };
  };

  const { date, time } = parseValue();

  const updateDateTime = (updates: Partial<{ date: Date; time: string }>) => {
    const currentDate = date || new Date();
    const newDate = updates.date || currentDate;
    const newTime = updates.time || time;

    // Parse time (HH:MM format)
    const [hours, minutes] = newTime.split(':').map(Number);

    const dateTime = new Date(newDate);
    dateTime.setHours(hours, minutes, 0, 0);
    
    // Format as ISO 8601 datetime string WITH local timezone offset
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hrs = String(dateTime.getHours()).padStart(2, '0');
    const mins = String(dateTime.getMinutes()).padStart(2, '0');
    const seconds = '00';
    
    // Get timezone offset
    const timezoneOffsetMinutes = dateTime.getTimezoneOffset();
    const absOffset = Math.abs(timezoneOffsetMinutes);
    const offsetHours = Math.floor(absOffset / 60);
    const offsetMinutes = absOffset % 60;
    const offsetSign = timezoneOffsetMinutes <= 0 ? '+' : '-';
    const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    
    const isoString = `${year}-${month}-${day}T${hrs}:${mins}:${seconds}${offset}`;
    onChange(isoString);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-copper-500">*</span>}
      </Label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-12 
                       bg-charcoal-800/40 border-charcoal-700 hover:border-copper-500/50
                       text-neutral-200 hover:bg-charcoal-800/60 transition-all"
              data-testid={testId ? `${testId}-date-button` : undefined}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-copper-500" />
              {date ? format(date, 'MMM dd, yyyy') : <span className="text-neutral-500">Pick date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0 glass-elevated border-charcoal-700" 
            align="start" 
            role="dialog" 
            aria-label="Date picker"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  updateDateTime({ date: newDate });
                  setIsOpen(false);
                }
              }}
              disabled={(date) => {
                if (!minDate) return false;
                const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                return dateOnly < minDateOnly;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Native Time Picker */}
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-copper-500 pointer-events-none" />
          <Input
            type="time"
            value={time}
            onChange={(e) => updateDateTime({ time: e.target.value })}
            className="h-12 pl-10 bg-charcoal-800/40 border-charcoal-700 
                     hover:border-copper-500/50 focus:border-copper-500
                     text-neutral-200 placeholder:text-neutral-500
                     [&::-webkit-calendar-picker-indicator]:cursor-pointer
                     [&::-webkit-calendar-picker-indicator]:opacity-60
                     [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
            data-testid={testId ? `${testId}-time` : undefined}
          />
        </div>
      </div>

      {/* Preview */}
      {date && (
        <p className="text-xs text-neutral-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(date, 'EEEE, MMMM d, yyyy')} at {time}
        </p>
      )}
    </div>
  );
}
