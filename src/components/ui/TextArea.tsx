// components/ui/TextArea.tsx
'use client';

import { useId } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

export default function TextArea({ label, value, onChange, placeholder, className }: Props) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm mb-1">{label}</label>
      <textarea
        id={id}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300 resize-y"
      />
    </div>
  );
}
