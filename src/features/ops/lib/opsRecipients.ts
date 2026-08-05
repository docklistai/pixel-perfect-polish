import type { OpsRecipientState } from "../types";

export function recipientForActor(
  recipients: OpsRecipientState[],
  actorMembershipId: string,
): OpsRecipientState | null {
  return recipients.find((recipient) => recipient.membershipId === actorMembershipId) ?? null;
}

export function canAcknowledgeOpsRecord(
  recipients: OpsRecipientState[],
  actorMembershipId: string,
): boolean {
  const recipient = recipientForActor(recipients, actorMembershipId);
  return Boolean(recipient && !recipient.acknowledgedAt);
}
