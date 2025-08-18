import React, { createContext, useContext } from 'react';
import { useCrmData } from '../hooks/useCrmData';

// Infer the return type of useCrmData to create a strongly typed context
type CrmDataContextType = ReturnType<typeof useCrmData>;

const DataContext = createContext<CrmDataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const data = useCrmData();
    return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
