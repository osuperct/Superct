import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarContextValue = {
  forcarRecolhida: boolean;
  setForcarRecolhida: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  forcarRecolhida: false,
  setForcarRecolhida: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [forcarRecolhida, setForcarRecolhida] = useState(false);
  return (
    <SidebarContext.Provider value={{ forcarRecolhida, setForcarRecolhida }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarControl() {
  return useContext(SidebarContext);
}
