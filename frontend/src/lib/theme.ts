export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "vault-theme";

export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLLinkElement>("#app-favicon")?.setAttribute(
    "href",
    theme === "dark" ? "/vault-icon-dark.svg" : "/vault-icon.svg"
  );
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "dark" ? "#10171d" : "#f6f7f7"
  );
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export function initializeTheme() {
  applyTheme(getStoredTheme());
}
