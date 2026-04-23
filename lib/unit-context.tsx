"use client";

import { createContext, useContext, type ReactNode } from "react";

type UnitCtx = {
  label: string;
  toDisplay: (val: number) => number;
  fromDisplay: (val: number) => number;
};

const noOp = (val: number) => val;

const UnitContext = createContext<UnitCtx>({
  label: "lb",
  toDisplay: noOp,
  fromDisplay: noOp,
});

export function UnitProvider({ children }: { children: ReactNode }) {
  return (
    <UnitContext.Provider value={{ label: "lb", toDisplay: noOp, fromDisplay: noOp }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  return useContext(UnitContext);
}
