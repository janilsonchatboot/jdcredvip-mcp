import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DateRangePreset = "last7" | "currentMonth" | "previousMonth" | "custom";

type DashboardFilterState = {
  dateInicio: string;
  dateFim: string;
  preset: DateRangePreset;
  label: string;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (inicio: string, fim: string) => void;
  setDates: (inicio: string, fim: string) => void;
  clearDates: () => void;
};

const STORAGE_KEY = "jdcredvip-date-range";

const toDateKey = (value: Date) => format(value, "yyyy-MM-dd");

const presetFactories: Record<Exclude<DateRangePreset, "custom">, () => { dateInicio: string; dateFim: string }> = {
  last7: () => {
    const today = new Date();
    const start = addDays(today, -6);
    return { dateInicio: toDateKey(start), dateFim: toDateKey(today) };
  },
  currentMonth: () => {
    const today = new Date();
    return { dateInicio: toDateKey(startOfMonth(today)), dateFim: toDateKey(today) };
  },
  previousMonth: () => {
    const previous = subMonths(new Date(), 1);
    return { dateInicio: toDateKey(startOfMonth(previous)), dateFim: toDateKey(endOfMonth(previous)) };
  }
};

const buildLabel = (preset: DateRangePreset, inicio: string, fim: string) => {
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  switch (preset) {
    case "last7":
      return "Últimos 7 dias";
    case "currentMonth":
      return "Mês atual";
    case "previousMonth":
      return "Mês anterior";
    default: {
      if (inicio && fim) {
        return `${formatter.format(new Date(inicio))} - ${formatter.format(new Date(fim))}`;
      }
      return "Personalizado";
    }
  }
};

type StoredState = {
  preset: DateRangePreset;
  dateInicio: string;
  dateFim: string;
};

const loadStoredState = (): StoredState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed.preset) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
};

const DashboardFilterContext = createContext<DashboardFilterState | undefined>(undefined);

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const initial = loadStoredState() ?? { preset: "last7" as DateRangePreset, ...presetFactories.last7() };
  const [state, setState] = useState<StoredState>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const applyPreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setState((prev) => ({ ...prev, preset }));
      return;
    }
    const range = presetFactories[preset]();
    setState({ preset, ...range });
  };

  const setCustomRange = (inicio: string, fim: string) => {
    setState({
      preset: "custom",
      dateInicio: inicio || "",
      dateFim: fim || ""
    });
  };

  const clearDates = () => applyPreset("last7");

  const value = useMemo<DashboardFilterState>(
    () => ({
      dateInicio: state.dateInicio,
      dateFim: state.dateFim,
      preset: state.preset,
      label: buildLabel(state.preset, state.dateInicio, state.dateFim),
      setPreset: applyPreset,
      setCustomRange,
      setDates: setCustomRange,
      clearDates
    }),
    [state]
  );

  return <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>;
}

export function useDateRangeContext() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error("useDateRangeContext deve ser usado dentro de DashboardFilterProvider");
  }
  return context;
}

export const useDashboardFilter = useDateRangeContext;
