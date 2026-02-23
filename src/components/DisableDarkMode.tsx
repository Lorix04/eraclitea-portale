"use client";

import { useEffect } from "react";

export default function DisableDarkMode() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}

