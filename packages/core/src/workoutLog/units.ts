/**
 * 每一组自己的输入单位。磁盘重量仍是公斤；容量公式不看单位。
 * 1 kg = 2.2046226218 lb
 */

import type { WeightUnit } from "./types.js";

export const LB_PER_KG = 2.2046226218;

export function recordedWeightUnit(unit: WeightUnit | undefined): WeightUnit {
  return unit === "lb" ? "lb" : "kg";
}

export function toggleWeightUnit(unit: WeightUnit): WeightUnit {
  return unit === "lb" ? "kg" : "lb";
}

export function weightUnitLabel(unit: WeightUnit): "kg" | "lb" {
  return unit === "lb" ? "lb" : "kg";
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatAmount(n: number): string {
  const rounded = round1(n);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** 把已存公斤格式化成当前单位的数字（lb 保留 1 位）。 */
export function formatWeightAmount(storedKg: number, unit: WeightUnit): string {
  if (unit === "lb") return formatAmount(kgToLb(storedKg));
  return formatAmount(storedKg);
}

/** 容量展示仍是公斤。组上的 lb 不改变这个合计。 */
export function formatVolumeKg(volumeKg: number): string {
  return `${formatWeightAmount(volumeKg, "kg")} kg`;
}

/**
 * 输入框点单位：空着只改标签；已有数字换成同一重量的另一种写法。
 */
export function retargetWeightText(
  raw: string,
  from: WeightUnit,
  to: WeightUnit,
): string {
  if (from === to) return raw;
  const kg = parseWeightToKg(raw, from);
  if (kg == null) return "";
  return formatWeightAmount(kg, to);
}

/** 用户在当前单位输入的数字，换回公斤再落盘。空串为未填。 */
export function parseWeightToKg(
  raw: string,
  unit: WeightUnit,
): number | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const kg = unit === "lb" ? lbToKg(n) : n;
  return Math.round(kg * 1000) / 1000;
}
