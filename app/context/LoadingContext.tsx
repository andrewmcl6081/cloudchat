import React, { createContext, useCallback, useContext, useState } from "react";

type LoadingContextType = {
  setLoading: (component: string, loading: boolean) => void;
  componentsAreLoading: boolean;
};

const LoadingContext = createContext<LoadingContextType | null>(null);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );

  const setLoading = useCallback((component: string, loading: boolean) => {
    setLoadingStates((prevStates) => ({
      ...prevStates,
      [component]: loading,
    }));
  }, []);

  const componentsAreLoading = Object.values(loadingStates).some(
    (isLoading) => isLoading,
  );

  return (
    <LoadingContext.Provider value={{ setLoading, componentsAreLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }

  return context;
};
