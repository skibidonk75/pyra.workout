import React from "react";

export function StorageProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function useStorageDb(): null {
  return null;
}
