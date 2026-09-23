import { z } from "zod";

export const pantallaPinSchema = z.string().trim().max(50)
  .regex(/^\d*$/, "El PIN solo puede contener dígitos")
  .nullable().optional()
  .transform((pin) => pin === "" ? null : pin);
