import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface TaxYearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
}

export function TaxYearSelector({
  selectedYear,
  onYearChange,
  availableYears,
}: TaxYearSelectorProps) {
  // Ensure we have at least current and previous years
  const currentYear = new Date().getFullYear();
  const years = availableYears.length > 0 
    ? availableYears 
    : [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Seleccionar año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              Ejercicio {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
