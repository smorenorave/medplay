/** Use the stored complete-account amounts, exactly as Cuentas completas does. */
export function expiryAccountAmounts<T extends {
  total_pagado_completa?: number | string | null;
  total_pagado_proveedor_completa?: number | string | null;
}>(row: T) {
  return {
    ...row,
    total_pagado: row.total_pagado_completa == null ? null : Number(row.total_pagado_completa),
    total_pagado_proveedor: row.total_pagado_proveedor_completa == null
      ? null : Number(row.total_pagado_proveedor_completa),
  };
}
