import * as React from "react";
import { Upload } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  valid: { label: "Valid", cls: "bg-success-soft text-success" },
  expiring: { label: "Expiring soon", cls: "bg-warning-soft text-warning" },
  expired: { label: "Expired", cls: "bg-danger-soft text-danger" },
  missing: { label: "Missing", cls: "bg-danger-soft text-danger" },
};

export function ProfileDocumentsTab({ profile }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2">
        <ProfileCard title="Documents">
          {profile.documents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No documents uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="text-left py-2 pr-4">Document</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Expiry date</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.documents.map((doc, i) => {
                    const s = STATUS_LABELS[doc.status] ?? STATUS_LABELS.valid;
                    return (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-4 font-medium">{doc.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{doc.type}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{doc.expiry ?? "—"}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}
                          >
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ProfileCard>
      </div>

      <div className="space-y-4">
        <ProfileCard title="Upload document">
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" aria-hidden />
            <p className="text-xs text-muted-foreground">Document upload coming soon</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Connected once document storage is wired
            </p>
          </div>
        </ProfileCard>

        <ProfileCard title="Expiring soon">
          {profile.documents.filter((d) => d.status === "expiring").length === 0 ? (
            <p className="text-xs text-muted-foreground">No documents expiring soon.</p>
          ) : (
            <ul className="space-y-2">
              {profile.documents
                .filter((d) => d.status === "expiring")
                .map((doc, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{doc.name}</span>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-warning-soft text-warning">
                      {doc.expiry}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </ProfileCard>
      </div>
    </div>
  );
}
