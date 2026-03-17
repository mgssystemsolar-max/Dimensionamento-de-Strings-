
import React, { useState, useEffect } from 'react';

interface InputGroupProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  type?: string;
  status?: 'default' | 'error' | 'warning';
}

export function InputGroup({
  label,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  max,
  placeholder,
  type = "number",
  status = 'default'
}: InputGroupProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    // Sync local value with prop value only if they are numerically different
    // This prevents the "decimal point vanishing" issue while typing (e.g. "5." -> "5")
    const parsedLocal = parseFloat(localValue);
    if (parsedLocal !== value && !(Number.isNaN(parsedLocal) && value === 0)) {
       setLocalValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value;
    
    // If min is defined and >= 0, prevent negative signs
    if (min !== undefined && min >= 0 && newVal.includes('-')) {
      newVal = newVal.replace('-', '');
    }

    setLocalValue(newVal);
    
    // Allow empty string or minus sign without triggering 0 update immediately if desired,
    // but for live calculation we might need a value.
    // Here we parse and update if valid number.
    const num = parseFloat(newVal);
    if (!isNaN(num)) {
      onChange(num);
    } else if (newVal === '') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    let num = parseFloat(localValue);
    if (isNaN(num)) {
      num = 0;
    }
    
    let corrected = false;
    if (min !== undefined && num < min) {
      num = min;
      corrected = true;
    }
    if (max !== undefined && num > max) {
      num = max;
      corrected = true;
    }
    
    if (corrected) {
      setLocalValue(num.toString());
      onChange(num);
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'error': return 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50';
      case 'warning': return 'border-amber-500 focus:border-amber-500 focus:ring-amber-500 bg-amber-50';
      default: return 'border-slate-300 focus:border-amber-500 focus:ring-amber-500 bg-white';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className={`text-sm font-medium ${status === 'error' ? 'text-red-600' : status === 'warning' ? 'text-amber-600' : 'text-slate-700'} dark:text-slate-300`}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${getBorderColor()}`}
        />
        {unit && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className={`text-xs ${status === 'error' ? 'text-red-500' : status === 'warning' ? 'text-amber-500' : 'text-slate-500'} dark:text-slate-400`}>{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}
