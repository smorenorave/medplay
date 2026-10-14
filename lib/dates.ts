import { addMonthsYMD, todayYMDBogota } from "./bogotaDate";
/** Fecha civil actual de Colombia. */
export function todayStr() { return todayYMDBogota(); }
/** Mismo día del próximo mes, limitado al último día cuando no existe. */
export function nextMonthStr() { return addMonthsYMD(todayStr(), 1); }
