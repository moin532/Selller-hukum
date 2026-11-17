export function getChartTheme() {
  if (typeof window === "undefined") {
    return {
      text: "#FFFFFF",
      muted: "#A3A3A3",
      border: "#262626",
      grid: "#262626",
      gold: "#C6A15B",
      cream: "#F5E9D5",
      surface: "#141414",
      series: ["#C6A15B", "#F5E9D5", "#8A8A8A", "#5B8FA8", "#A67C52", "#6B7C5E"],
    };
  }
  const s = getComputedStyle(document.documentElement);
  const gold = s.getPropertyValue("--gold").trim() || "#C6A15B";
  const cream = s.getPropertyValue("--btn").trim() || "#F5E9D5";
  const text = s.getPropertyValue("--text").trim() || "#FFFFFF";
  const muted = s.getPropertyValue("--muted").trim() || "#A3A3A3";
  const border = s.getPropertyValue("--border").trim() || "#262626";
  const surface = s.getPropertyValue("--card").trim() || "#141414";
  return {
    text,
    muted,
    border,
    grid: border,
    gold,
    cream,
    surface,
    series: [gold, cream, "#8A8A8A", "#5B8FA8", "#A67C52", "#6B7C5E"],
  };
}
