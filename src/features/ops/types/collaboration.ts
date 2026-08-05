export interface OpsRecipientState {
  membershipId: string;
  name: string;
  readAt?: string | null;
  acknowledgedAt: string | null;
}

export interface OpsHandover {
  id: string;
  locationId: string;
  locationName: string;
  rotaWeekId: string | null;
  handoverDate: string;
  notes: string;
  senderName: string;
  createdAt: string;
  recipients: OpsRecipientState[];
  items: Array<{ entryId: string; title: string; carriedForward: boolean }>;
}

export interface OpsBriefing {
  id: string;
  locationId: string;
  locationName: string;
  briefingDate: string;
  title: string;
  summary: string;
  authorName: string;
  createdAt: string;
  isToday: boolean;
  recipients: OpsRecipientState[];
  entryIds: string[];
}
