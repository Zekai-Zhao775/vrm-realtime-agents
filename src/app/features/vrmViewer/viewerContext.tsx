"use client";

import React, { createContext } from "react";
import { Viewer } from "./viewer";

const viewer = new Viewer();

export const ViewerContext = createContext({ viewer });
export const ViewerContextProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ViewerContext.Provider value={{ viewer }}>
      {children}
    </ViewerContext.Provider>
  );
};
