export function getInitialTheme() {
  if (typeof window === "undefined") return "system";

  const saved = localStorage.getItem("theme");
  if (saved) return saved;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: string) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");

  if (theme === "system") return;

  root.classList.add(theme);
}

export function toggleTheme(current: string) {
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
  return next;
}
