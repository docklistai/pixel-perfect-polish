import type {
  SaveWorkspaceLabourSettingsInput,
  WorkspaceLabourSettings,
} from "../api/workspaceSettings";

/** Editable string state for the labour targets form. */
export type LabourTargetFields = {
  weeklyBudgetHours: string;
  dailyBudgetHours: string;
  targetLabourPct: string;
  forecastWeeklySales: string;
  avgHourlyCost: string;
  budgetWarningPct: string;
};

export type LabourTargetsParseResult =
  | { ok: true; payload: SaveWorkspaceLabourSettingsInput }
  | { ok: false; message: string };

function formatPounds(pence: number | null): string {
  if (pence === null) return "";
  return Number.isInteger(pence / 100) ? String(pence / 100) : (pence / 100).toFixed(2);
}

function formatHours(minutes: number | null): string {
  if (minutes === null) return "";
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function labourFieldsFromSettings(
  settings: WorkspaceLabourSettings | null,
): LabourTargetFields {
  return {
    weeklyBudgetHours: formatHours(settings?.weeklyBudgetMinutes ?? null),
    dailyBudgetHours: formatHours(settings?.dailyBudgetMinutes ?? null),
    targetLabourPct:
      settings?.targetLabourPct === null || settings?.targetLabourPct === undefined
        ? ""
        : String(settings.targetLabourPct),
    forecastWeeklySales: formatPounds(settings?.forecastWeeklySalesPence ?? null),
    avgHourlyCost: formatPounds(settings?.avgHourlyCostPence ?? null),
    budgetWarningPct: String(settings?.budgetWarningPct ?? 95),
  };
}

/** Parses a user-entered number, tolerating £, commas, and spaces. Empty → null. */
function parseOptionalNumber(raw: string): number | null | undefined {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export function buildLabourTargetsPayload(fields: LabourTargetFields): LabourTargetsParseResult {
  const budgetHours = parseOptionalNumber(fields.weeklyBudgetHours);
  if (budgetHours === undefined || (budgetHours !== null && (budgetHours < 0 || budgetHours > 16000))) {
    return { ok: false, message: "Weekly hours budget must be a number of hours (e.g. 820)." };
  }

  const dailyHours = parseOptionalNumber(fields.dailyBudgetHours);
  if (dailyHours === undefined || (dailyHours !== null && (dailyHours < 0 || dailyHours > 3000))) {
    return { ok: false, message: "Daily hours budget must be a number of hours (e.g. 120)." };
  }

  const targetPct = parseOptionalNumber(fields.targetLabourPct);
  if (targetPct === undefined || (targetPct !== null && (targetPct <= 0 || targetPct > 100))) {
    return { ok: false, message: "Target labour % must be between 0 and 100." };
  }

  const sales = parseOptionalNumber(fields.forecastWeeklySales);
  if (sales === undefined || (sales !== null && (sales < 0 || sales > 100_000_000))) {
    return { ok: false, message: "Forecast weekly sales must be a £ amount (e.g. 17800)." };
  }

  const hourlyCost = parseOptionalNumber(fields.avgHourlyCost);
  if (hourlyCost === undefined || (hourlyCost !== null && (hourlyCost < 0 || hourlyCost > 1000))) {
    return { ok: false, message: "Average hourly cost must be a £ amount (e.g. 13.20)." };
  }

  const warningPct = Number(fields.budgetWarningPct);
  if (!Number.isInteger(warningPct) || warningPct < 50 || warningPct > 120) {
    return { ok: false, message: "Budget warning threshold must be between 50% and 120%." };
  }

  return {
    ok: true,
    payload: {
      weeklyBudgetMinutes: budgetHours === null ? null : Math.round(budgetHours * 60),
      dailyBudgetMinutes: dailyHours === null ? null : Math.round(dailyHours * 60),
      targetLabourPct: targetPct,
      forecastWeeklySalesPence: sales === null ? null : Math.round(sales * 100),
      avgHourlyCostPence: hourlyCost === null ? null : Math.round(hourlyCost * 100),
      budgetWarningPct: warningPct,
    },
  };
}
