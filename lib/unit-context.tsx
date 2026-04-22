"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Unit = "kg" | "lb";
const KG_TO_LB = 2.20462;

type UnitCtx = {
  unit: Unit;
  label: string;
  toDisplay: (kg: number) => number;
  fromDisplay: (val: number) => number;
  toggle: () => void;
};

const UnitContext = createContext<UnitCtx>({
  unit: "kg",
  label: "kg",
  toDisplay: (v) => v,
  fromDisplay: (v) => v,
  toggle: () => {},
});

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<Unit>("kg");

  useEffect(() => {
    if (localStorage.getItem("fitUnit") === "lb") setUnit("lb");
  }, []);

  function toggle() {
    setUnit((prev) => {
      const next = prev === "kg" ? "lb" : "kg";
      localStorage.setItem("fitUnit", next);
      return next;
    });
  }

  return (
    <UnitContext.Provider
      value={{
        unit,
        label: unit,
        toDisplay: (kg) =>
          unit === "lb" ? Math.round(kg * KG_TO_LB * 10) / 10 : kg,
        fromDisplay: (val) =>
          unit === "lb" ? Math.round((val / KG_TO_LB) * 100) / 100 : val,
        toggle,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  return useContext(UnitContext);
}
