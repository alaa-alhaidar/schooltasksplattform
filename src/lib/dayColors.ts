export interface DayColorPalette {
  soft: string;
  card: string;
  border: string;
  badge: string;
}

export const dayColors: Record<number, DayColorPalette> = {
  1: {
    soft: 'bg-blue-50',
    card: 'bg-blue-100 text-blue-950',
    border: 'border-blue-300',
    badge: 'bg-blue-200 text-blue-900',
  },
  2: {
    soft: 'bg-violet-50',
    card: 'bg-violet-100 text-violet-950',
    border: 'border-violet-300',
    badge: 'bg-violet-200 text-violet-900',
  },
  3: {
    soft: 'bg-amber-50',
    card: 'bg-amber-100 text-amber-950',
    border: 'border-amber-300',
    badge: 'bg-amber-200 text-amber-900',
  },
  4: {
    soft: 'bg-teal-50',
    card: 'bg-teal-100 text-teal-950',
    border: 'border-teal-300',
    badge: 'bg-teal-200 text-teal-900',
  },
  5: {
    soft: 'bg-rose-50',
    card: 'bg-rose-100 text-rose-950',
    border: 'border-rose-300',
    badge: 'bg-rose-200 text-rose-900',
  },
};

export const fallbackDayColor: DayColorPalette = {
  soft: 'bg-slate-50',
  card: 'bg-slate-100 text-slate-950',
  border: 'border-slate-300',
  badge: 'bg-slate-200 text-slate-900',
};

const englishDayNumbers: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};

export const getDayColor = (weekday?: number | null) =>
  (weekday && dayColors[weekday]) || fallbackDayColor;

export const getEnglishDayColor = (day: string) =>
  getDayColor(englishDayNumbers[day]);

export const getDateDayColor = (dateValue: string | Date) => {
  const jsDay = new Date(dateValue).getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;
  return getDayColor(weekday);
};

