import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

export type CustomAlertOptions = {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    onConfirm?: () => void;
    confirmText?: string;
    showCancel?: boolean;
    onCancel?: () => void;
    cancelText?: string;
};

type AlertContextType = {
    showAlert: (options: CustomAlertOptions | string, message?: string) => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors, isDark } = useTheme();
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<CustomAlertOptions>({
        title: '',
        message: '',
        type: 'info',
    });
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showAlert = (optsOrTitle: CustomAlertOptions | string, msg?: string) => {
        if (typeof optsOrTitle === 'string') {
            setOptions({
                title: optsOrTitle,
                message: msg || '',
                type: 'info',
            });
        } else {
            setOptions({ type: 'info', ...optsOrTitle });
        }
        setVisible(true);
    };

    const hideAlert = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
        });
    };

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 60,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const getIcon = () => {
        switch (options.type) {
            case 'success': return { name: 'check-circle', color: colors.success };
            case 'error': return { name: 'alert-circle', color: colors.error };
            case 'warning': return { name: 'alert', color: '#F39C12' };
            default: return { name: 'information', color: colors.buttonMain };
        }
    };

    const iconData = getIcon();

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <Modal transparent visible={visible} animationType="none" onRequestClose={hideAlert}>
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <Animated.View style={[
                        styles.alertBox,
                        { backgroundColor: colors.cardBackground, transform: [{ scale: scaleAnim }] }
                    ]}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name={iconData.name as any} size={48} color={iconData.color} />
                        </View>
                        
                        <Text style={[styles.title, { color: colors.textPrimary }]}>{options.title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{options.message}</Text>
                        
                        <View style={styles.buttonContainer}>
                            {options.showCancel && (
                                <TouchableOpacity 
                                    style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? colors.backgroundSecondary : '#EEF4FF' }]} 
                                    onPress={() => {
                                        if (options.onCancel) options.onCancel();
                                        hideAlert();
                                    }}
                                >
                                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{options.cancelText || 'Cancelar'}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={[styles.button, { backgroundColor: colors.buttonMain }]} 
                                onPress={() => {
                                    if (options.onConfirm) options.onConfirm();
                                    hideAlert();
                                }}
                            >
                                <Text style={[styles.buttonText, { color: '#fff' }]}>{options.confirmText || 'Aceptar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </AlertContext.Provider>
    );
};

export const useCustomAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useCustomAlert must be used within an AlertProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 0,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
    }
});
