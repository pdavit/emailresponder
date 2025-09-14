"use client";

import { useEffect } from "react";

export default function DemoGuards() {
  useEffect(() => {
    const prevent = (e: Event) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("copy", prevent);
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("mousedown", prevent);
    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("mousedown", prevent);
    };
  }, []);

  return null;
}
