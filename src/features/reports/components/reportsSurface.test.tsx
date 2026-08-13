import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportsCoverageHeatmapCard } from "./ReportsCoverageHeatmapCard";
import { ReportsFilters } from "./ReportsFilters";
import { ReportsQuickReportsCard } from "./ReportsQuickReportsCard";
import { ReportsStateCard } from "./ReportsStateCard";

describe("Reports filters", () => {
  it("emits only the fixed period and workspace option ids", async () => {
    const onPresetChange = vi.fn();
    const onLocationChange = vi.fn();
    const onDepartmentChange = vi.fn();
    render(
      <ReportsFilters
        preset="four_weeks"
        onPresetChange={onPresetChange}
        locationId={null}
        onLocationChange={onLocationChange}
        departmentId={null}
        onDepartmentChange={onDepartmentChange}
        locations={[{ id: "location-1", name: "Harbour", status: "active" }]}
        departments={[{ id: "department-1", name: "Old Bar", status: "inactive" }]}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Period"), "current_week");
    await userEvent.selectOptions(screen.getByLabelText("Location"), "location-1");
    await userEvent.selectOptions(screen.getByLabelText("Department"), "department-1");
    expect(onPresetChange).toHaveBeenCalledWith("current_week");
    expect(onLocationChange).toHaveBeenCalledWith("location-1");
    expect(onDepartmentChange).toHaveBeenCalledWith("department-1");
    expect(screen.getByRole("option", { name: "Old Bar (inactive)" })).toBeInTheDocument();
  });
});

describe("Reports states", () => {
  it.each([
    ["loading", "Loading Reports"],
    ["error", "Reports could not be loaded"],
    ["empty", "No operational activity in this period"],
  ] as const)("renders the honest %s state", (state, title) => {
    render(<ReportsStateCard state={state} />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("states that an error has no sample fallback", () => {
    render(<ReportsStateCard state="error" />);
    expect(document.body).toHaveTextContent("No sample data is shown");
  });
});

describe("Quick Reports", () => {
  it("offers fixed drilldowns and routes approved-hours export separately", async () => {
    const onOpen = vi.fn();
    const onApprovedExport = vi.fn();
    render(<ReportsQuickReportsCard onOpen={onOpen} onApprovedExport={onApprovedExport} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: /Coverage and open work/ }));
    expect(onOpen).toHaveBeenCalledWith("coverage");
    await userEvent.click(screen.getByRole("button", { name: /Approved hours export/ }));
    expect(onApprovedExport).toHaveBeenCalledOnce();
    expect(document.body).not.toHaveTextContent(/New report|Saved reports/i);
  });
});

describe("scheduled staffing density", () => {
  it("labels exact headcount without adequacy or employee scoring language", () => {
    render(
      <ReportsCoverageHeatmapCard
        cells={[
          {
            weekday: 0,
            bucketStartHour: 0,
            bucketEndHour: 3,
            averageHeadcount: 2.5,
          },
        ]}
      />,
    );
    expect(screen.getByLabelText(/average scheduled headcount 2.5/i)).toBeInTheDocument();
    expect(document.body).toHaveTextContent("does not judge whether staffing is adequate");
    expect(document.body).not.toHaveTextContent(/understaffed|overstaffed|score|rank/i);
  });
});
