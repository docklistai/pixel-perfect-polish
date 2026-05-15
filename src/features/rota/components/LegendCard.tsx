import { Card } from "@/components/dl";
import { roleLegend } from "../data/mockData";

export function LegendCard() {
  return (
    <Card className="p-4">
      <div className="mb-4 text-sm font-semibold">Legend</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {roleLegend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                item.tone === "warning"
                  ? "bg-warning"
                  : item.tone === "danger"
                    ? "bg-danger"
                    : item.tone === "purple"
                      ? "bg-accent-purple"
                      : item.tone === "success"
                        ? "bg-success"
                        : "bg-info"
              }`}
              aria-hidden
            />
            {item.label}
          </div>
        ))}
      </div>
    </Card>
  );
}
