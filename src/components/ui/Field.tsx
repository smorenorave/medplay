// components/ui/Field.tsx
'use client';

import React, { useId } from 'react';
import type { HTMLInputTypeAttribute, InputHTMLAttributes } from 'react';

type BaseInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  // Los controlamos nosotros para tiparlos a nuestro gusto
  'value' | 'onChange' | 'id'
>;

type Props = BaseInputProps & {
  label: string;
  labelRight?: React.ReactNode;
  /** Valor controlado (string o number) */
  value: string | number;
  /** onChange controlado que devuelve string */
  onChange: (v: string) => void;
  /** Tipo de input (incluye "tel", "email", etc.) */
  type?: HTMLInputTypeAttribute;
  /** Clases del contenedor (wrapper). Retrocompatible con tu uso actual. */
  className?: string;
  /** Clases del input. Úsalo si quieres estilos específicos del input. */
  inputClassName?: string;
};

export default function Field({
  label,
  labelRight,
  value,
  onChange,
  type = 'text',
  className,
  inputClassName,
  required,
  ...rest // pattern, title, inputMode, placeholder, onInvalid, onInput, min, step, etc.
}: Props) {
  const id = useId();

  const inputClasses =
    inputClassName ??
    'w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300';

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm">
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
        {...rest} // 🔥 pasa pattern, title, inputMode, onInvalid, onInput, min, step, etc.
      />
    </div>
  );
}
