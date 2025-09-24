// components/ui/FieldPantallas.tsx
"use client";

import React, { useId } from "react";
import type { HTMLInputTypeAttribute, InputHTMLAttributes } from "react";

type BaseInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  // los controlamos nosotros:
  "value" | "onChange" | "id"
>;

export type FieldPantallasProps = BaseInputProps & {
  label: string;
  labelRight?: React.ReactNode;
  value: string | number;
  onChange: (v: string) => void;
  type?: HTMLInputTypeAttribute;
  /** clases del contenedor (wrapper) */
  className?: string;
  /** clases del input (si no se usa, aplica el default oscuro) */
  inputClassName?: string;
};

export function FieldPantallas({
  label,
  labelRight,
  value,
  onChange,
  type = "text",
  className,
  inputClassName,
  required,
  ...rest // pattern, title, inputMode, placeholder, onInvalid, onInput, min, step, etc.
}: FieldPantallasProps) {
  const id = useId();

  const inputClasses =
    inputClassName ??
    "w-full rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500";

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm text-neutral-300">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {labelRight ? <div className="ml-3">{labelRight}</div> : null}
      </div>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={inputClasses}
        {...rest}
      />
    </div>
  );
}
