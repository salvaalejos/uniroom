import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SectionHeaderProps {
    title: string;
    style?: any;
    textStyle?: any;
    isUppercase?: boolean;
}

export const SectionHeader = ({ title, style, textStyle, isUppercase = false }: SectionHeaderProps) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <Text style={[
                styles.title, 
                { color: colors.textPrimary },
                isUppercase && styles.uppercase,
                textStyle
            ]}>
                {title}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
    },
    uppercase: {
        fontSize: 13,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "#888", // overridden by textStyle if needed
    }
});
