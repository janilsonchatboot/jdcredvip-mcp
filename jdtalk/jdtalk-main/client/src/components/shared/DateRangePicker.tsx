import { useEffect, useState } from "react";
import { CalendarIcon, ChevronDown, RotateCcw } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRangeContext, DateRangePreset } from "@/contexts/DashboardFilterContext";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "last7", label: "Últimos 7 dias" },
  { value: "currentMonth", label: "Mês atual" },
  { value: "previousMonth", label: "Mês anterior" },
  { value: "custom", label: "Personalizado" }
] as const;

const toDateRange = (inicio?: string, fim?: string): DateRange | undefined => {
  if (!inicio || !fim) return undefined;
  const start = new Date(inicio);
  const end = new Date(fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  return { from: start, to: end };
};

const toInputDate = (value: Date) => format(value, "yyyy-MM-dd");

export function DateRangePicker() {
  const { dateInicio, dateFim, preset, label, setPreset, setCustomRange, clearDates } = useDateRangeContext();
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<DateRange | undefined>(() => toDateRange(dateInicio, dateFim));

  useEffect(() => {
    setLocalRange(toDateRange(dateInicio, dateFim));
  }, [dateInicio, dateFim]);

  const handlePresetChange = (value: DateRangePreset) => {
    setPreset(value);
    if (value !== "custom") {
      setLocalRange(toDateRange(dateInicio, dateFim));
    }
  };

  const handleSelectRange = (range: DateRange | undefined) => {
    setLocalRange(range);
    if (range?.from && range?.to) {
      setCustomRange(toInputDate(range.from), toInputDate(range.to));
    }
  };

  const showCalendar = preset === "custom";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span className="text-sm">{label}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] space-y-4" align="start">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Período global</div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              clearDates();
              setLocalRange(toDateRange(dateInicio, dateFim));
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <Select value={preset} onValueChange={(value) => handlePresetChange(value as DateRangePreset)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um período" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showCalendar ? (
          <Calendar
            mode="range"
            selected={localRange}
            onSelect={handleSelectRange}
            numberOfMonths={1}
            defaultMonth={localRange?.from}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            O período será atualizado automaticamente conforme o preset selecionado.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
