"use client";

import { CalendarX2, Clock3, X } from "lucide-react";
import { useMemo, useState } from "react";
import { tr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_RANGE_DAYS = 90;
const hourGroups = [
  { label: "Gece", hours: [0, 1, 2, 3, 4, 5] },
  { label: "Sabah", hours: [6, 7, 8, 9, 10, 11] },
  { label: "Öğleden sonra", hours: [12, 13, 14, 15, 16, 17] },
  { label: "Akşam", hours: [18, 19, 20, 21, 22, 23] },
] as const;

type Constraints = Record<string, number[] | null>;

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function datesInRange(start: string, end: string) {
  if (!start || !end || end < start) return [];
  const result: string[] = [];
  const cursor = dateFromKey(start);
  const last = dateFromKey(end);
  while (cursor <= last && result.length < MAX_RANGE_DAYS) {
    result.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function formatDate(key: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    ...options,
  }).format(dateFromKey(key));
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function FlexibleAvailabilityBuilder({ active }: { active: boolean }) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [constraints, setConstraints] = useState<Constraints>({});
  const [activeDate, setActiveDate] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const rangeDates = useMemo(() => datesInRange(start, end), [start, end]);
  const rangeSet = useMemo(() => new Set(rangeDates), [rangeDates]);
  const unavailableDays = rangeDates.filter(
    (key) => constraints[key] === null,
  );
  const partiallyUnavailableDays = rangeDates.filter(
    (key) => Array.isArray(constraints[key]) && constraints[key].length > 0,
  );
  const hourEligibleDates = rangeDates.filter(
    (key) => constraints[key] !== null,
  );
  const selectedDate = hourEligibleDates.includes(activeDate)
    ? activeDate
    : (hourEligibleDates[0] ?? "");
  const selectedHours = selectedDate
    ? (constraints[selectedDate] ?? [])
    : [];
  const serializedConstraints = JSON.stringify(
    Object.entries(constraints)
      .filter(
        ([key, hours]) =>
          rangeSet.has(key) && (hours === null || hours.length > 0),
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, hours]) => ({
        date,
        allDay: hours === null,
        unavailableHours: hours ?? [],
      })),
  );

  function pruneConstraints(nextStart: string, nextEnd: string) {
    const allowed = new Set(datesInRange(nextStart, nextEnd));
    setConstraints((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => allowed.has(key)),
      ),
    );
    if (!allowed.has(activeDate)) setActiveDate(nextStart);
  }

  function changeStart(value: string) {
    setAvailabilityError("");
    setStart(value);
    const nextEnd = end && end >= value && end <= addDays(value, 89) ? end : "";
    setEnd(nextEnd);
    pruneConstraints(value, nextEnd);
  }

  function changeEnd(value: string) {
    setAvailabilityError("");
    setEnd(value);
    pruneConstraints(start, value);
  }

  function changeUnavailableDays(selected: Date[] | undefined) {
    const selectedKeys = new Set(
      (selected ?? []).map(dateKey).filter((key) => rangeSet.has(key)),
    );
    if (selectedKeys.size === rangeDates.length) {
      const newlySelected = [...selectedKeys].find(
        (key) => !unavailableDays.includes(key),
      );
      if (newlySelected) selectedKeys.delete(newlySelected);
      setAvailabilityError(
        "Esnek uygunluk aralığında en az bir uygun gün kalmalı.",
      );
    } else setAvailabilityError("");
    setConstraints((current) => {
      const next = { ...current };
      rangeDates.forEach((key) => {
        if (selectedKeys.has(key)) next[key] = null;
        else if (next[key] === null) delete next[key];
      });
      return next;
    });
    if (selectedKeys.has(selectedDate)) {
      setActiveDate(
        rangeDates.find((key) => !selectedKeys.has(key)) ?? "",
      );
    }
  }

  function toggleHour(hour: number) {
    if (!selectedDate) return;
    const hours = constraints[selectedDate] ?? [];
    if (hours === null) return;
    const nextHours = hours.includes(hour)
      ? hours.filter((value) => value !== hour)
      : [...hours, hour].sort((left, right) => left - right);
    if (
      nextHours.length === 24 &&
      unavailableDays.length === rangeDates.length - 1
    ) {
      setAvailabilityError(
        "Esnek uygunluk aralığında en az bir uygun saat kalmalı.",
      );
      return;
    }
    setAvailabilityError("");
    const next = { ...constraints };
    if (nextHours.length === 24) next[selectedDate] = null;
    else if (nextHours.length) next[selectedDate] = nextHours;
    else delete next[selectedDate];
    setConstraints(next);
  }

  function toggleHourGroup(hours: readonly number[]) {
    if (!selectedDate) return;
    const selected = constraints[selectedDate] ?? [];
    if (selected === null) return;
    const everySelected = hours.every((hour) => selected.includes(hour));
    const nextHours = everySelected
      ? selected.filter((hour) => !hours.includes(hour))
      : [...new Set([...selected, ...hours])].sort(
          (left, right) => left - right,
        );
    if (
      nextHours.length === 24 &&
      unavailableDays.length === rangeDates.length - 1
    ) {
      setAvailabilityError(
        "Esnek uygunluk aralığında en az bir uygun saat kalmalı.",
      );
      return;
    }
    setAvailabilityError("");
    const next = { ...constraints };
    if (nextHours.length === 24) next[selectedDate] = null;
    else if (nextHours.length) next[selectedDate] = nextHours;
    else delete next[selectedDate];
    setConstraints(next);
  }

  return (
    <Card className="py-5">
      <CardContent className="grid gap-7 px-4 sm:px-6">
        <div>
          <h3 className="text-[1.294rem]">Esnek uygunluk</h3>
          <p className="mt-1 text-[1.006rem] text-muted-foreground">
            Önce ilanın geçerli olduğu tarih aralığını belirleyin. Ardından bu
            aralıktaki uygun olmadığınız gün ve saatleri işaretleyin.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field-stack">
            <Label htmlFor="flexibleStartDate" className="text-[1.006rem]">
              İlk gün
            </Label>
            <Input
              id="flexibleStartDate"
              name="flexibleStartDate"
              type="date"
              min={today}
              value={start}
              onChange={(event) => changeStart(event.target.value)}
              required
              disabled={!active}
              className="text-[1.15rem]"
            />
          </div>
          <div className="field-stack">
            <Label htmlFor="flexibleEndDate" className="text-[1.006rem]">
              Son gün
            </Label>
            <Input
              id="flexibleEndDate"
              name="flexibleEndDate"
              type="date"
              min={start || today}
              max={start ? addDays(start, 89) : undefined}
              value={end}
              onChange={(event) => changeEnd(event.target.value)}
              required
              disabled={!active || !start}
              className="text-[1.15rem]"
            />
          </div>
          <p className="text-[1.006rem] text-muted-foreground sm:col-span-2">
            En fazla 90 günlük bir uygunluk aralığı belirleyebilirsiniz.
          </p>
        </div>

        {rangeDates.length > 0 && (
          <>
            <section aria-labelledby="unavailable-days-title">
              <div className="flex items-start gap-3">
                <CalendarX2
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h4
                    id="unavailable-days-title"
                    className="text-[1.294rem] font-medium"
                  >
                    Uygun olmadığınız günler
                  </h4>
                  <p className="mt-1 text-[1.006rem] text-muted-foreground">
                    Bir güne dokunarak o günün tamamını uygun değil olarak
                    işaretleyin. Tekrar dokunursanız seçim kalkar.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border bg-background p-1">
                <Calendar
                  key={start}
                  mode="multiple"
                  locale={tr}
                  defaultMonth={dateFromKey(start)}
                  startMonth={dateFromKey(start)}
                  endMonth={dateFromKey(end)}
                  selected={unavailableDays.map(dateFromKey)}
                  onSelect={changeUnavailableDays}
                  disabled={{
                    before: dateFromKey(start),
                    after: dateFromKey(end),
                  }}
                  showOutsideDays={false}
                  className="mx-auto [--cell-size:--spacing(11)] [&_button]:text-[1.15rem]"
                  classNames={{
                    caption_label: "text-[1.006rem]",
                    weekday: "text-[0.92rem]",
                  }}
                />
              </div>
              {unavailableDays.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
                  {unavailableDays.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      variant="secondary"
                      className="text-[1.15rem]"
                      onClick={() =>
                        changeUnavailableDays(
                          unavailableDays
                            .filter((date) => date !== key)
                            .map(dateFromKey),
                        )
                      }
                      aria-label={`${formatDate(key)} için tüm gün engelini kaldır`}
                    >
                      <X aria-hidden="true" />
                      {formatDate(key, { weekday: "short" })}
                    </Button>
                  ))}
                </div>
              )}
              {availabilityError && (
                <p
                  role="alert"
                  className="mt-3 text-[1.006rem] text-destructive"
                >
                  {availabilityError}
                </p>
              )}
            </section>

            <section aria-labelledby="unavailable-hours-title">
              <div className="flex items-start gap-3">
                <Clock3
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h4
                    id="unavailable-hours-title"
                    className="text-[1.294rem] font-medium"
                  >
                    Gün içindeki uygun olmadığınız saatler
                  </h4>
                  <p className="mt-1 text-[1.006rem] text-muted-foreground">
                    Saatlerin art arda olması gerekmez. Örneğin 09:00 seçimi,
                    09:00–10:00 arasını uygun değil olarak işaretler.
                  </p>
                </div>
              </div>

              {selectedDate ? (
                <div className="mt-4 grid gap-5">
                  <div className="field-stack max-w-sm">
                    <Label
                      htmlFor="availabilityDay"
                      className="text-[1.006rem]"
                    >
                      Gün
                    </Label>
                    <select
                      id="availabilityDay"
                      value={selectedDate}
                      onChange={(event) => setActiveDate(event.target.value)}
                      className="h-12 rounded-md border bg-background px-3 text-[1.15rem]"
                    >
                      {hourEligibleDates.map((key) => (
                        <option key={key} value={key}>
                          {formatDate(key)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-5">
                    {hourGroups.map((group) => {
                      const everySelected = group.hours.every((hour) =>
                        selectedHours.includes(hour),
                      );
                      return (
                        <fieldset key={group.label} className="grid gap-2">
                          <legend className="sr-only">
                            {group.label} saatleri
                          </legend>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className="text-[1.006rem] font-medium"
                              aria-hidden="true"
                            >
                              {group.label}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-[1.15rem]"
                              onClick={() => toggleHourGroup(group.hours)}
                            >
                              {everySelected ? "Grubu temizle" : "Grubu seç"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {group.hours.map((hour) => {
                              const selected = selectedHours.includes(hour);
                              return (
                                <Button
                                  key={hour}
                                  type="button"
                                  variant={selected ? "secondary" : "outline"}
                                  aria-pressed={selected}
                                  onClick={() => toggleHour(hour)}
                                  className="px-2 text-[1.15rem]"
                                >
                                  {selected && <X aria-hidden="true" />}
                                  {formatHour(hour)}
                                </Button>
                              );
                            })}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border p-4 text-[1.006rem] text-muted-foreground">
                  Aralıktaki bütün günleri uygun değil olarak işaretlediniz.
                  Saat seçebilmek için yukarıdan en az bir günü yeniden açın.
                </p>
              )}
            </section>

            {(unavailableDays.length > 0 ||
              partiallyUnavailableDays.length > 0) && (
              <section aria-labelledby="availability-summary-title">
                <h4
                  id="availability-summary-title"
                  className="text-[1.294rem] font-medium"
                >
                  Uygunluk özeti
                </h4>
                <ul className="mt-3 grid gap-2 text-[1.006rem]">
                  {unavailableDays.map((key) => (
                    <li key={key} className="rounded-lg border p-3">
                      <span className="font-medium">{formatDate(key)}</span>
                      <span className="ml-2 text-muted-foreground">
                        Tüm gün uygun değil
                      </span>
                    </li>
                  ))}
                  {partiallyUnavailableDays.map((key) => (
                    <li key={key} className="rounded-lg border p-3">
                      <span className="font-medium">{formatDate(key)}</span>
                      <span className="ml-2 text-muted-foreground">
                        {(constraints[key] ?? []).map(formatHour).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <input
          type="hidden"
          name="flexibleUnavailability"
          value={serializedConstraints}
          disabled={!active}
        />
      </CardContent>
    </Card>
  );
}
