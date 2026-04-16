"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  openMobile: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  openMobile: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}
