import { FeedbackBanner } from "@/components/dl";

type LeaveDataNotice = {
  tone: "info" | "warning";
  title: string;
  description: string;
};

export function getRotaLeaveDataNotice({
  isLoading,
  isError,
}: {
  isLoading: boolean;
  isError: boolean;
}): LeaveDataNotice | null {
  if (isError) {
    return {
      tone: "warning",
      title: "Leave data unavailable",
      description:
        "The live rota is still editable, but approved leave markers and leave conflicts may be incomplete until leave data reloads.",
    };
  }
  if (isLoading) {
    return {
      tone: "info",
      title: "Checking approved leave",
      description:
        "The live rota is editable while approved leave markers and leave conflicts finish loading.",
    };
  }
  return null;
}

export function RotaLeaveDataWarning({
  isLoading,
  isError,
}: {
  isLoading: boolean;
  isError: boolean;
}) {
  const notice = getRotaLeaveDataNotice({ isLoading, isError });
  if (!notice) return null;

  return (
    <FeedbackBanner
      tone={notice.tone}
      title={notice.title}
      description={notice.description}
      className="mb-4"
    />
  );
}
