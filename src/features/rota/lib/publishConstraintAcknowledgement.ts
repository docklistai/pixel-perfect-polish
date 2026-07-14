export function constraintAcknowledgementValue(
  constraintClashCount: number,
  issuesAcknowledged: boolean,
): boolean {
  return constraintClashCount > 0 && issuesAcknowledged;
}
