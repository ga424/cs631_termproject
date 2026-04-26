import { useEffect, useState } from "react";

export type AppPath = "/" | "/customer" | "/agent" | "/manager" | "/admin";

const APP_PATHS: AppPath[] = ["/", "/customer", "/agent", "/manager", "/admin"];

export function normalizePath(pathname: string): AppPath {
  return (APP_PATHS.includes(pathname as AppPath) ? pathname : "/") as AppPath;
}

export function navigateTo(path: AppPath) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathname() {
  const [pathname, setPathname] = useState<AppPath>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return pathname;
}
