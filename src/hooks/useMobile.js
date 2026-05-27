import { useEffect, useState } from "react";

function getBreakpoint() {
  const w = window.innerWidth;
  return {
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isDesktop: w >= 1024,
  };
}

export function useMobile() {
  const [state, setState] = useState(getBreakpoint);

  useEffect(() => {
    const handler = () => setState(getBreakpoint());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return state;
}
