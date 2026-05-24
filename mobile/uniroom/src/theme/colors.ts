export const lightColors = {
    background: '#F0F6FC', // Cleaner, more neutral light blue
    backgroundSecondary: '#E1ECF4', // Slightly deeper for contrast
    cardBackground: '#FFFFFF', // Clean white for cards
    textPrimary: '#0A1E3F', // Deep navy for high contrast readability
    textSecondary: '#5C6D82', // Modern slate gray
    buttonMain: '#1A62C6', // Slightly more vibrant primary blue
    buttonText: '#FFFFFF',
    accent: '#007AFF', // Modern iOS-like blue accent
    border: '#D0D9E4', // Soft blue-gray border
    error: '#E63946', // Vibrant modern red
    errorBackground: '#FDEDEC',
    success: '#10B981', // Emerald green
    successBackground: '#ECFDF5',
    headerBackground: '#F0F6FC', 
};

export const darkColors = {
    background: '#0B1221', // Deep sleek dark blue
    backgroundSecondary: '#111D35',
    cardBackground: '#111D35',
    textPrimary: '#E2E8F0', // Soft white for less eye strain
    textSecondary: '#94A3B8', // Slate gray
    buttonMain: '#3B82F6', // Brighter blue for dark mode
    buttonText: '#FFFFFF',
    accent: '#38BDF8', // Sky blue accent
    border: '#1E293B',
    error: '#EF4444',
    errorBackground: '#450A0A',
    success: '#10B981',
    successBackground: '#022C22',
    headerBackground: '#0B1221',
};

export type ThemeColors = typeof lightColors;
