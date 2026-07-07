import * as React from "react";

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Time-of-day greeting for the dashboard header. Renders a stable value on
 * the server and syncs to the viewer's clock after mount so SSR hydration
 * never mismatches across timezones.
 */
export function useGreeting(): string {
  const [greeting, setGreeting] = React.useState("Good morning");
  React.useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);
  return greeting;
}
