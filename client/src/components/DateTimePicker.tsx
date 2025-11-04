import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    if (!value) return { date: undefined, hour: '7', minute: '00', period: 'PM' };
    
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) return { date: undefined, hour: '7', minute: '00', period: 'PM' };
    
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    return {
      date: dateObj,
      hour: hours.toString(),
      minute: minutes.toString().padStart(2, '0'),
      period
    };
  };

  const { date, hour, minute, period } = parseValue();

  const updateDateTime = (updates: Partial<{ date: Date; hour: string; minute: string; period: string }>) => {
    const currentDate = date || new Date();
    const newDate = updates.date || currentDate;
    const newHour = updates.hour || hour;
    const newMinute = updates.minute || minute;
    const newPeriod = updates.period || period;

    // Convert to 24-hour format
    let hours24 = parseInt(newHour);
    if (newPeriod === 'PM' && hours24 !== 12) hours24 += 12;
    if (newPeriod === 'AM' && hours24 === 12) hours24 = 0;

    const dateTime = new Date(newDate);
    dateTime.setHours(hours24, parseInt(newMinute), 0, 0);
    
    // Format as ISO 8601 datetime string WITH local timezone offset (not UTC)
    // Example: 2025-11-05T16:00:00-08:00 (Pacific time)
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    const seconds = '00';
    
    // Get timezone offset in minutes and convert to ±HH:MM format
    // Note: getTimezoneOffset() returns OPPOSITE sign (negative for ahead of UTC)
    const timezoneOffsetMinutes = dateTime.getTimezoneOffset();
    const absOffset = Math.abs(timezoneOffsetMinutes);
    const offsetHours = Math.floor(absOffset / 60);
    const offsetMinutes = absOffset % 60;
    const offsetSign = timezoneOffsetMinutes <= 0 ? '+' : '-';
    const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    
    const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
    onChange(isoString);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = ['00', '15', '30', '45'];

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Date Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal bg-card border-border text-card-foreground"
              data-testid={testId ? `${testId}-date-button` : undefined}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span className="text-muted-foreground">Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border" align="start" role="dialog" aria-label="Date picker">
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
                // Compare dates only (ignore time) to allow same-day selections
                const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                return dateOnly < minDateOnly;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Time Picker */}
        <div className="flex gap-2">
          {/* Hour */}
          <Select value={hour} onValueChange={(h) => updateDateTime({ hour: h })}>
            <SelectTrigger 
              className="w-20 bg-card border-border text-card-foreground"
              data-testid={testId ? `${testId}-hour` : undefined}
            >
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="flex items-center text-muted-foreground">:</span>

          {/* Minute */}
          <Select value={minute} onValueChange={(m) => updateDateTime({ minute: m })}>
            <SelectTrigger 
              className="w-20 bg-card border-border text-card-foreground"
              data-testid={testId ? `${testId}-minute` : undefined}
            >
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* AM/PM */}
          <Select value={period} onValueChange={(p) => updateDateTime({ period: p })}>
            <SelectTrigger 
              className="w-20 bg-card border-border text-card-foreground"
              data-testid={testId ? `${testId}-period` : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview of selected date/time */}
      {date && (
        <p className="text-xs text-muted-foreground">
          <Clock className="inline w-3 h-3 mr-1" />
          {format(date, 'EEEE, MMMM d, yyyy')} at {hour}:{minute} {period}
        </p>
      )}
    </div>
  );
}
