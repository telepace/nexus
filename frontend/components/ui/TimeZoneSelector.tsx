"use client";

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
import { TIME_ZONES, TimeZone, getBrowserTimeZone } from '../../lib/date';

interface TimeZoneSelectorProps {
  value?: TimeZone;
  onChange?: (value: TimeZone) => void;
  label?: string;
}

export function TimeZoneSelector({ value, onChange, label = 'Time Zone' }: TimeZoneSelectorProps) {
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>(value || getBrowserTimeZone());

  useEffect(() => {
    if (value) {
      setSelectedTimeZone(value);
    }
  }, [value]);

  const handleChange = (newValue: TimeZone) => {
    setSelectedTimeZone(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select
        defaultValue={selectedTimeZone}
        onValueChange={(val) => handleChange(val as TimeZone)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select time zone" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TIME_ZONES).map(([key, value]) => (
            <SelectItem key={key} value={key}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 