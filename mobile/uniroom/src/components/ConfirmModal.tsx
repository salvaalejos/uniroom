import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    description?: string;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    iconColor?: string;
    iconBackgroundColor?: string;
    
    primaryButtonText: string;
    primaryButtonColor?: string;
    onPrimaryPress: () => void;
    isPrimaryLoading?: boolean;
    
    secondaryButtonText?: string;
    onSecondaryPress: () => void;
    
    // Si la disposición de los botones es en fila o columna
    buttonsLayout?: 'row' | 'column';
}

export const ConfirmModal = ({
    visible,
    title,
    description,
    icon,
    iconColor = "#ffffff",
    iconBackgroundColor,
    primaryButtonText,
    primaryButtonColor,
    onPrimaryPress,
    isPrimaryLoading = false,
    secondaryButtonText = "Cancelar",
    onSecondaryPress,
    buttonsLayout = 'column'
}: ConfirmModalProps) => {
    const { colors } = useTheme();

    const mainColor = primaryButtonColor || colors.buttonMain;
    const bgIconColor = iconBackgroundColor || mainColor;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                    
                    {icon && (
                        <View style={buttonsLayout === 'column' 
                            ? [styles.modalIconoCol, { backgroundColor: bgIconColor }]
                            : { marginBottom: 12 }
                        }>
                            <MaterialCommunityIcons 
                                name={icon} 
                                size={buttonsLayout === 'column' ? 32 : 48} 
                                color={buttonsLayout === 'column' ? iconColor : mainColor} 
                            />
                        </View>
                    )}

                    <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>
                        {title}
                    </Text>

                    {description && (
                        <Text style={[
                            buttonsLayout === 'column' ? styles.modalSubtituloCol : styles.modalSubtituloRow, 
                            { color: colors.textSecondary }
                        ]}>
                            {description}
                        </Text>
                    )}

                    {buttonsLayout === 'column' ? (
                        <>
                            <TouchableOpacity
                                style={[styles.modalBtnPrimaryCol, { backgroundColor: mainColor }, isPrimaryLoading && { opacity: 0.7 }]}
                                onPress={onPrimaryPress}
                                disabled={isPrimaryLoading}
                            >
                                {isPrimaryLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnPrimaryColTxt}>{primaryButtonText}</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnVolver}
                                onPress={onSecondaryPress}
                                disabled={isPrimaryLoading}
                            >
                                <Text style={[styles.modalBtnVolverTxt, { color: colors.textSecondary }]}>{secondaryButtonText}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.modalBotonesRow}>
                            <TouchableOpacity 
                                style={[styles.modalBtnCancelarRow, { borderColor: colors.border }]} 
                                onPress={onSecondaryPress}
                                disabled={isPrimaryLoading}
                            >
                                <Text style={[styles.modalBtnCancelarRowTexto, { color: colors.textSecondary }]}>{secondaryButtonText}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtnPrimaryRow, { backgroundColor: mainColor }, isPrimaryLoading && { opacity: 0.7 }]} 
                                onPress={onPrimaryPress}
                                disabled={isPrimaryLoading}
                            >
                                {isPrimaryLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnPrimaryRowTexto}>{primaryButtonText}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { 
        flex: 1, 
        backgroundColor: "rgba(0,0,0,0.45)", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: 24 
    },
    modalCard: { 
        borderRadius: 24, 
        padding: 28, 
        width: "90%", 
        alignItems: "center", 
        gap: 12, 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.15, 
        shadowRadius: 20, 
        elevation: 10 
    },
    
    // Estilos Column
    modalIconoCol: { 
        width: 68, 
        height: 68, 
        borderRadius: 34, 
        justifyContent: "center", 
        alignItems: "center", 
        marginBottom: 4 
    },
    modalTitulo: { 
        fontSize: 18, 
        fontWeight: "800",
        textAlign: "center" 
    },
    modalSubtituloCol: { 
        fontSize: 13, 
        textAlign: "center", 
        lineHeight: 20 
    },
    modalBtnPrimaryCol: { 
        borderRadius: 12, 
        paddingVertical: 14, 
        paddingHorizontal: 24, 
        width: "100%", 
        alignItems: "center", 
        marginTop: 6 
    },
    modalBtnPrimaryColTxt: { 
        fontSize: 15, 
        fontWeight: "700", 
        color: "#ffffff" 
    },
    modalBtnVolver: { 
        paddingVertical: 10 
    },
    modalBtnVolverTxt: { 
        fontSize: 14, 
        fontWeight: "600" 
    },

    // Estilos Row
    modalSubtituloRow: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 10
    },
    modalBotonesRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
        width: '100%'
    },
    modalBtnCancelarRow: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
    },
    modalBtnCancelarRowTexto: {
        fontWeight: "600",
        fontSize: 14
    },
    modalBtnPrimaryRow: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center"
    },
    modalBtnPrimaryRowTexto: {
        fontWeight: "700",
        color: "#fff",
        fontSize: 14
    },
});
