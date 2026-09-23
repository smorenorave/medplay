import test from "node:test";
import assert from "node:assert/strict";
import { pantallaPinSchema } from "../lib/pantallaPin";
import { buildDataUpdateMessage } from "../lib/dataUpdateMessage";

test("el PIN es opcional y conserva los ceros iniciales como texto", () => {
  assert.equal(pantallaPinSchema.parse(undefined), undefined);
  assert.equal(pantallaPinSchema.parse(null), null);
  assert.equal(pantallaPinSchema.parse(""), null);
  assert.equal(pantallaPinSchema.parse("  "), null);
  assert.equal(pantallaPinSchema.parse("0012"), "0012");
  assert.equal(pantallaPinSchema.parse("0"), "0");
  for (const pin of [12, "-1", "1.2", "1e3", "12a", "1".repeat(51)]) {
    assert.equal(pantallaPinSchema.safeParse(pin).success, false);
  }
});

test("copiar incluye el PIN literal solo cuando tiene contenido", () => {
  const base = { tipo: "pantalla" as const, numeroPantalla: "2" };
  const withoutPin = buildDataUpdateMessage(base);
  for (const pin of [undefined, null, "", "   "]) {
    assert.equal(buildDataUpdateMessage({ ...base, pin }), withoutPin);
  }
  for (const pin of ["0012", "0000", "0"]) {
    assert.equal(buildDataUpdateMessage({ ...base, pin }), `${withoutPin}\nPIN: ${pin}`);
  }
  assert.equal(buildDataUpdateMessage({ tipo: "cuenta", pin: "0012" }), buildDataUpdateMessage({ tipo: "cuenta" }));
});
