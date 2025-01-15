'use client';

import { createContext, useContext, useState } from 'react';

type StatusType = 'success' | 'error' | 'default';

interface StatusMessage {
  message: string;
  type: StatusType;
}

interface StatusContextType {
  status: StatusMessage | null;
  setStatus: (status: StatusMessage | null) => void;
  clearStatus: () => void;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const clearStatus = () => setStatus(null);

  return (
    <StatusContext.Provider value={{ status, setStatus, clearStatus }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
}
