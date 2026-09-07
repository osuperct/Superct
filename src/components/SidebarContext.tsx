import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarContextValue = {
  forcarRecolhida: boolean;
  setForcarRecolhida: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [forcarRecolhida, setForcarRecolhida] = useState(false);
  return (
    <SidebarContext.Provider value={{ forcarRecolhida, setForcarRecolhida }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarControl() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarControl deve ser usado dentro de SidebarProvider");
  return ctx;
}
