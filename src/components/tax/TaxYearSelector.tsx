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
  // Base years guaranteed (2024, 2025, 2026)
  const baseYears = [2026, 2025, 2024];
  
  // Combine with available years from payments data
  const years = [...new Set([...baseYears, ...availableYears])].sort((a, b) => b - a);

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
