"use client";

import { createContext, useContext, type ReactNode } from "react";

const KG_TO_LB = 2.20462;

type UnitCtx = {
  label: string;
  toDisplay: (kg: number) => number;
  fromDisplay: (val: number) => number;
};

const UnitContext = createContext<UnitCtx>({
  label: "lb",
  toDisplay: (kg) => Math.round(kg * KG_TO_LB * 10) / 10,
  fromDisplay: (val) => Math.round((val / KG_TO_LB) * 100) / 100,
});

export function UnitProvider({ children }: { children: ReactNode }) {
  return (
    <UnitContext.Provider
      value={{
        label: "lb",
        toDisplay: (kg) => Math.round(kg * KG_TO_LB * 10) / 10,
        fromDisplay: (val) => Math.round((val / KG_TO_LB) * 100) / 100,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  return useContext(UnitContext);
}
