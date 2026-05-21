import { Card } from "@/components/dl";
import type { LeaveRequest } from "../types";

interface Props {
  requests: LeaveRequest[];
  approved: Set<string>;
  declined: Set<string>;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onReview: (req: LeaveRequest) => void;
}

export function LeaveRequestInbox({
  requests,
  approved,
  declined,
  onApprove,
  onDecline,
  onReview,
}: Props) {
  const pendingCount = requests.filter((r) => !approved.has(r.id) && !declined.has(r.id)).length;

  return (
    <Card className="col-span-12 lg:col-span-3 rounded-2xl p-5">
      <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2">
        LEAVE REQUEST INBOX
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold mb-3 pb-2 border-b border-border">
        <span>Needs review</span>
        <span className="rounded bg-brand-soft text-brand px-1">{pendingCount}</span>
      </div>
      <div className="space-y-3">
        {requests.map((r) => {
          const isApproved = approved.has(r.id);
          const isDeclined = declined.has(r.id);
          return (
            <div key={r.id} className="rounded-xl border border-border p-3">
              <button
                type="button"
                className="flex items-center gap-2.5 w-full text-left"
                onClick={() => onReview(r)}
              >
                <img
                  src={`https://i.pravatar.cc/64?img=${r.img}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.n}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.role}</div>
                </div>
              </button>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <div>
                  <div className="font-medium">{r.date}</div>
                  <div className="text-muted-foreground">{r.dur}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Rota impact</div>
                  <div
                    className={`font-medium flex items-center gap-1 justify-end ${
                      r.tone === "danger"
                        ? "text-danger"
                        : r.tone === "warning"
                          ? "text-warning"
                          : "text-success"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> {r.impact}
                  </div>
                </div>
              </div>
              {!isApproved && !isDeclined ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    aria-label={`Decline leave request for ${r.n}`}
                    className="flex-1 rounded-lg border border-border py-1.5 text-xs"
                    onClick={() => onDecline(r.id)}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    aria-label={`Approve leave request for ${r.n}`}
                    className="flex-1 rounded-lg bg-brand-soft text-brand py-1.5 text-xs font-semibold"
                    onClick={() => onApprove(r.id)}
                  >
                    Approve
                  </button>
                </div>
              ) : (
                <div
                  className={`mt-2 rounded-lg py-1.5 text-xs text-center font-semibold ${
                    isApproved ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isApproved ? "Approved" : "Declined"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
