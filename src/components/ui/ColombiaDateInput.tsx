"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import { addDaysYMD, addMonthsYMD, formatDateCO, isCivilDate, parseDateCO, todayYMDBogota, utcDateFromYMD } from "@/lib/bogotaDate";

// Preserve the input contract: callbacks receive YYYY-MM-DD.
const ColombiaDateInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function ColombiaDateInput({ value, onChange, disabled, readOnly, onMouseDown: _onMouseDown, ...props }, ref) {
    const ymd = String(value ?? "").slice(0, 10);
    const [draft, setDraft] = useState(formatDateCO(ymd));
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(() => (isCivilDate(ymd) ? ymd : todayYMDBogota()).slice(0, 7) + "-01");
    const input = useRef<HTMLInputElement | null>(null);
    const lastEmitted = useRef(ymd);
    useEffect(() => {
      if (ymd !== lastEmitted.current) {
        setDraft(formatDateCO(ymd));
        input.current?.setCustomValidity("");
      }
      lastEmitted.current = ymd;
    }, [ymd]);
    const emit = (next: string) => {
      lastEmitted.current = next;
      const target = { ...input.current, value: next } as HTMLInputElement;
      onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
    };
    const allowed = (date: string) => (!props.min || date >= String(props.min)) && (!props.max || date <= String(props.max));
    const choose = (date: string) => {
      if (date && !allowed(date)) return;
      setDraft(formatDateCO(date));
      input.current?.setCustomValidity("");
      emit(date);
      setOpen(false);
      input.current?.focus();
    };
    const showPicker = () => {
      if (disabled || readOnly) return;
      setMonth((isCivilDate(ymd) ? ymd : todayYMDBogota()).slice(0, 7) + "-01");
      setOpen(true);
    };
    const offset = (utcDateFromYMD(month).getUTCDay() + 6) % 7;
    const end = Number(addDaysYMD(addMonthsYMD(month, 1), -1).slice(8));
    const title = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(utcDateFromYMD(month));
    return <span className="relative inline-flex min-w-0 flex-1 items-center gap-1" lang="es-CO"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <input {...props} type="text" data-colombia-date="true" disabled={disabled} readOnly={readOnly}
        ref={element => {
          input.current = element;
          if (element) element.showPicker = showPicker;
          if (typeof ref === "function") ref(element); else if (ref) ref.current = element;
        }} value={draft} placeholder="dd/MM/yyyy" maxLength={10} autoComplete="off"
        onKeyDown={event => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" && event.altKey) { event.preventDefault(); showPicker(); }
          props.onKeyDown?.(event);
        }}
        onChange={event => {
          const text = event.target.value;
          const parsed = parseDateCO(text);
          const valid = !text || Boolean(parsed && allowed(parsed));
          setDraft(text);
          event.target.setCustomValidity(valid ? "" : "Escribe una fecha válida en formato dd/MM/yyyy.");
          emit(valid ? parsed : "");
        }} />
      {!disabled && !readOnly && <button type="button" title="Abrir calendario de Colombia" aria-label="Abrir calendario de Colombia" aria-expanded={open} onClick={showPicker}>📅</button>}
      {open && <span role="dialog" aria-label="Calendario de Colombia" className="absolute top-full left-0 z-50 mt-1 block w-72 rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-neutral-100 shadow-xl">
        <span className="flex justify-between gap-2">
          <button type="button" aria-label="Mes anterior" onClick={() => setMonth(addMonthsYMD(month, -1))}>‹</button>
          <span aria-live="polite">{title}</span>
          <button type="button" aria-label="Mes siguiente" onClick={() => setMonth(addMonthsYMD(month, 1))}>›</button>
        </span>
        <span className="grid grid-cols-7 gap-1 text-center">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => <span key={day}>{day}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: end }, (_, index) => {
            const date = `${month.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`;
            return <button type="button" key={date} aria-label={formatDateCO(date)} aria-pressed={ymd === date} disabled={!allowed(date)}
              className="rounded p-1 hover:bg-neutral-600 aria-pressed:bg-blue-700 disabled:opacity-30" onClick={() => choose(date)}>{index + 1}</button>;
          })}
        </span>
        <span className="mt-2 flex justify-between">
          <button type="button" disabled={!allowed(todayYMDBogota())} onClick={() => choose(todayYMDBogota())}>Hoy</button>
          {!props.required && <button type="button" onClick={() => choose("")}>Borrar</button>}
          <button type="button" onClick={() => setOpen(false)}>Cerrar</button>
        </span>
      </span>}
    </span>;
  }
);
export default ColombiaDateInput;
