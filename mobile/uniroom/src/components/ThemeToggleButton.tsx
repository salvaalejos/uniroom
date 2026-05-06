import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggleButton({ style }: { style?: any }) {
    const { isDark, toggleTheme, colors } = useTheme();

    return (
        <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.cardBackground, borderColor: colors.border }, style]} 
            onPress={toggleTheme}
            activeOpacity={0.7}
        >
            <Ionicons 
                name={isDark ? "sunny" : "moon"} 
                size={24} 
                color={isDark ? "#F1C40F" : "#2C3E50"} 
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    }
});
