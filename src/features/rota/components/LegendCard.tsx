import { Card } from "@/components/dl";
import { roleLegend } from "../data/mockData";
import { DEPT_COLOUR_PRESETS } from "../lib/deptColours";

export function LegendCard() {
  return (
    <Card className="p-4">
      <div className="mb-4 text-sm font-semibold">Departments</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {roleLegend.map((item) => {
          const swatchClass = DEPT_COLOUR_PRESETS[item.preset]?.swatch ?? "bg-muted-foreground";
          return (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${swatchClass}`} aria-hidden />
              {item.label}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
