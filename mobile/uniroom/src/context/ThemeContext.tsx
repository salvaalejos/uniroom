import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';

type ThemeContextType = {
    isDark: boolean;
    colors: ThemeColors;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('@theme');
                if (storedTheme !== null) {
                    setIsDark(storedTheme === 'dark');
                }
            } catch (error) {
                console.error("Error loading theme", error);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        try {
            const newIsDark = !isDark;
            setIsDark(newIsDark);
            await AsyncStorage.setItem('@theme', newIsDark ? 'dark' : 'light');
        } catch (error) {
            console.error("Error saving theme", error);
        }
    };

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
