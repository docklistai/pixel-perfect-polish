import { Card } from "@/components/dl";

export function LabourTargetChart() {
  const labour = [22, 24, 23, 26, 27, 29, 28, 30, 29, 31, 30, 32];
  const sales = [70, 72, 75, 80, 82, 85, 84, 88, 87, 90, 92, 94];
  const width = 700;
  const height = 220;
  const xs = (index: number) => (index / (labour.length - 1)) * width;
  const yLabour = (value: number) => height - ((value - 15) / (35 - 15)) * height;
  const ySales = (value: number) => height - ((value - 60) / (100 - 60)) * height;
  const labourPoints = labour.map((value, index) => `${xs(index)},${yLabour(value)}`).join(" ");
  const salesPoints = sales.map((value, index) => `${xs(index)},${ySales(value)}`).join(" ");

  return (
    <Card className="col-span-12 lg:col-span-8 p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div
            id="reports-chart-title"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            LABOUR COST VS SALES
          </div>
          <div className="text-xs text-muted-foreground">Weekly trend · last 12 weeks</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="dot" style={{ background: "var(--teal-500)" }} /> Labour cost
          </span>
          <span className="flex items-center gap-2">
            <span className="dot" style={{ background: "var(--purple-500)" }} /> Sales
          </span>
        </div>
      </div>

      <div id="reports-chart-summary" className="sr-only">
        Labour cost averaged 28.6 percent of sales over the last 12 weeks, with the sharpest
        increase coming from the busiest weekend periods.
      </div>

      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        width="100%"
        className="block"
        role="img"
        aria-labelledby="reports-chart-title"
        aria-describedby="reports-chart-summary"
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <line
            key={index}
            x1="0"
            x2={width}
            y1={(index * height) / 4}
            y2={(index * height) / 4}
            stroke="var(--border-faint)"
          />
        ))}
        <defs>
          <linearGradient id="reports-lg-teal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal-500)" stopOpacity=".18" />
            <stop offset="100%" stopColor="var(--teal-500)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="reports-lg-purple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--purple-500)" stopOpacity=".15" />
            <stop offset="100%" stopColor="var(--purple-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${labourPoints} ${width},${height}`}
          fill="url(#reports-lg-teal)"
        />
        <polygon
          points={`0,${height} ${salesPoints} ${width},${height}`}
          fill="url(#reports-lg-purple)"
        />
        <polyline points={labourPoints} fill="none" stroke="var(--teal-500)" strokeWidth="2.5" />
        <polyline points={salesPoints} fill="none" stroke="var(--purple-500)" strokeWidth="2.5" />
        {labour.map((value, index) => (
          <circle
            key={`labour-${index}`}
            cx={xs(index)}
            cy={yLabour(value)}
            r="3"
            fill="var(--bg-card)"
            stroke="var(--teal-500)"
            strokeWidth="2"
          />
        ))}
        {sales.map((value, index) => (
          <circle
            key={`sales-${index}`}
            cx={xs(index)}
            cy={ySales(value)}
            r="3"
            fill="var(--bg-card)"
            stroke="var(--purple-500)"
            strokeWidth="2"
          />
        ))}
        {["W14", "W15", "W16", "W17", "W18", "W19", "W20", "W21", "W22", "W23", "W24", "W25"].map(
          (week, index) => (
            <text
              key={week}
              x={xs(index)}
              y={height + 16}
              fontSize="11"
              fill="var(--ink-500)"
              textAnchor="middle"
            >
              {week}
            </text>
          ),
        )}
      </svg>
    </Card>
  );
}
