export function settlementTotal(
  rate: number,
  pricingUnit: "OVERALL" | "HOURLY" | "DAILY",
  unitCount?: number,
  override?: number,
) {
  for (const [name, value] of [
    ["Kredi", rate],
    ["Birim", pricingUnit === "OVERALL" ? 1 : unitCount],
    ["Toplam", override],
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0))
      throw new Error(`${name} pozitif bir tam sayı olmalı.`);
  }
  const units = pricingUnit === "OVERALL" ? 1 : unitCount;
  if (!units) throw new Error("Birim sayısı gerekli.");
  const creditsTotal = override ?? rate * units;
  if (!Number.isSafeInteger(creditsTotal))
    throw new Error("Toplam kredi miktarı çok büyük.");
  return { unitCount: units, creditsTotal };
}
