// src/lib/serializers.ts

function isPrismaDecimal(v: any): boolean {
  return (
    v &&
    typeof v === "object" &&
    v.constructor &&
    v.constructor.name === "Decimal" &&
    typeof (v as any).toNumber === "function"
  );
}

/** Convierte BigInt/Date/Decimal/objetos anidados a algo JSON-safe */
export function toSerializable(value: any): any {
  if (value === null || value === undefined) return value;

  if (typeof value === "bigint") return value.toString();        // BigInt -> string
  if (value instanceof Date) return value.toISOString();         // Date -> ISO

  if (Array.isArray(value)) return value.map(toSerializable);

  if (typeof value === "object") {
    if (isPrismaDecimal(value)) {
      try {
        const n = (value as any).toNumber();
        return Number.isFinite(n) ? n : (value as any).toString();
      } catch {
        return (value as any).toString();
      }
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toSerializable(v);
    return out;
  }

  return value;
}

function normalizeInput(json: any) {
  if (json && typeof json === 'object' && 'cuenta' in json) {
    return {
      ...json.cuenta,
      contacto: json.cuenta?.contacto ?? json.usuario?.contacto,
      nombre: json.usuario?.nombre ?? null,
    };
  }
  return json;
}