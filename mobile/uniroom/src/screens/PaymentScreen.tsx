import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch 
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Constants from 'expo-constants';

// URLs y Credenciales
const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

const MP_PUBLIC_KEY = process.env.EXPO_PUBLIC_MP_PUBLIC_KEY || "TEST-PUBLIC-KEY-REEMPLAZAR";

export default function PaymentScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    
    const token = route.params?.token;
    const tipoPago = route.params?.tipo || 'servicio'; // 'servicio' o 'renta'
    const montoPersonalizado = route.params?.monto;
    const idInmueble = route.params?.id_inmueble;
    const tituloInmueble = route.params?.titulo_inmueble;
    
    const esRenta = tipoPago === 'renta';
    const monto = esRenta && montoPersonalizado ? montoPersonalizado : 50;
    
    const [cardNumber, setCardNumber] = useState('');
    const [expiration, setExpiration] = useState('');
    const [cvc, setCvc] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [saveCard, setSaveCard] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleCardNumberChange = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 0) {
            formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        }
        setCardNumber(formatted.substring(0, 19));
    };

    const handleExpirationChange = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length >= 3) {
            setExpiration(`${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`);
        } else {
            setExpiration(cleaned);
        }
    };

    const getPaymentMethodId = (number: string) => {
        const cleanNumber = number.replace(/\D/g, '');
        if (/^4/.test(cleanNumber)) return "visa";
        if (/^5[1-5]/.test(cleanNumber)) return "master";
        if (/^3[47]/.test(cleanNumber)) return "amex";
        return "master";
    };

    const getCardTypeForUI = () => {
        const cleanNumber = cardNumber.replace(/\D/g, '');
        if (cleanNumber.length === 0) return "unknown";
        if (/^4/.test(cleanNumber)) return "visa";
        if (/^5[1-5]/.test(cleanNumber)) return "master";
        if (/^3[47]/.test(cleanNumber)) return "amex";
        return "unknown";
    };

    const cardType = getCardTypeForUI();
    
    const cardStyles = {
        visa: { backgroundColor: '#1A1F71', icon: 'cc-visa' },
        master: { backgroundColor: '#222222', icon: 'cc-mastercard' },
        amex: { backgroundColor: '#002663', icon: 'cc-amex' },
        unknown: { backgroundColor: isDark ? colors.backgroundSecondary : '#0F2C4F', icon: 'credit-card-outline' }
    };
    
    const currentCardStyle = cardStyles[cardType as keyof typeof cardStyles];

    const processPayment = async () => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!cardNumber || !expiration || !cvc || !cardholderName) {
            setErrorMessage("Por favor llena todos los datos de la tarjeta.");
            return;
        }

        setIsLoading(true);

        try {
            const expirationMonth = expiration.split('/')[0];
            const expirationYear = "20" + expiration.split('/')[1];
            
            const tokenResponse = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card_number: cardNumber.replace(/\s/g, ''),
                    expiration_month: parseInt(expirationMonth),
                    expiration_year: parseInt(expirationYear),
                    security_code: cvc,
                    cardholder: {
                        name: cardholderName
                    }
                })
            });

            const tokenData = await tokenResponse.json();

            if (!tokenResponse.ok) {
                console.log(tokenData);
                throw new Error("Error validando la tarjeta. Revisa los datos.");
            }

            const cardToken = tokenData.id;

            // Endpoint diferente según tipo de pago
            const endpoint = esRenta ? '/payments/process-renta' : '/payments/process';
            const body: any = {
                token: cardToken,
                payment_method_id: getPaymentMethodId(cardNumber),
                transaction_amount: monto,
                installments: 1,
                saveCard: saveCard,
                issuer_id: tokenData.issuer_id || undefined,
            };
            if (esRenta) {
                body.id_inmueble = idInmueble;
            }

            const backendResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const backendData = await backendResponse.json();

            if (!backendResponse.ok) {
                throw new Error(backendData.error || backendData.detail || "Error al procesar el pago");
            }

            if (esRenta) {
                setSuccessMessage(`¡Renta de ${tituloInmueble} pagada exitosamente!`);
                setTimeout(() => {
                    // Volver dos pantallas atrás (al mapa/Inmuebles)
                    navigation.goBack();
                    navigation.goBack();
                }, 2500);
            } else {
                setSuccessMessage("La tarifa se ha cubierto. Ahora puedes contactar al arrendador.");
                setTimeout(() => {
                    navigation.goBack();
                }, 2500);
            }

        } catch (error: any) {
            setErrorMessage(error.message || "Ocurrió un error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary}/>
                </TouchableOpacity>

                <Text style={[styles.title, { color: colors.textPrimary }]}>{esRenta ? 'Pago de Renta' : 'Tarifa de Servicio'}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {esRenta
                        ? `Completa el pago para rentar ${tituloInmueble || 'este inmueble'}.`
                        : 'Completa el pago seguro para acceder a la información de contacto.'}
                </Text>

                {errorMessage ? (
                    <View style={[styles.errorContainer, { backgroundColor: isDark ? '#3a1a1a' : '#FDEDEC', borderColor: isDark ? '#5a1a1a' : '#FADBD8' }]}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#E74C3C" />
                        <Text style={styles.errorTextUI}>{errorMessage}</Text>
                    </View>
                ) : null}

                {successMessage ? (
                    <View style={[styles.successContainer, { backgroundColor: isDark ? '#1a3a2a' : '#EAFAF1', borderColor: isDark ? '#1a5a2a' : '#D5F5E3' }]}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#27AE60" />
                        <View style={styles.successTextContainer}>
                            <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
                            <Text style={[styles.successTextUI, { color: colors.textPrimary }]}>{successMessage}</Text>
                        </View>
                    </View>
                ) : null}

                <View style={[styles.amountContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#DCEEFF' }]}>
                    <Text style={[styles.amountLabel, { color: colors.textPrimary }]}>{esRenta ? 'Renta mensual' : 'Total a pagar'}</Text>
                    <Text style={[styles.amountValue, { color: colors.buttonMain }]}>${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>
                </View>

                {/* Tarjeta Virtual Visual */}
                <View style={[styles.cardVisual, { backgroundColor: currentCardStyle.backgroundColor }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="credit-card-chip-outline" size={32} color="#DCEEFF" />
                        {cardType !== 'unknown' && (
                            <FontAwesome name={currentCardStyle.icon as any} size={32} color="#FFFFFF" />
                        )}
                        {cardType === 'unknown' && (
                            <MaterialCommunityIcons name="credit-card-outline" size={32} color="rgba(255,255,255,0.3)" />
                        )}
                    </View>
                    <Text style={styles.cardVisualNumber}>{cardNumber || '**** **** **** ****'}</Text>
                    <View style={styles.cardVisualFooter}>
                        <View>
                            <Text style={styles.cardVisualLabel}>Titular</Text>
                            <Text style={styles.cardVisualText}>{cardholderName || 'Nombre Completo'}</Text>
                        </View>
                        <View>
                            <Text style={styles.cardVisualLabel}>Expira</Text>
                            <Text style={styles.cardVisualText}>{expiration || 'MM/YY'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Número de Tarjeta</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                            keyboardType="number-pad"
                            placeholder="0000 0000 0000 0000"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={19}
                            value={cardNumber}
                            onChangeText={handleCardNumberChange}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>Expiración</Text>
                            <TextInput 
                                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                                keyboardType="number-pad"
                                placeholder="MM/YY"
                                placeholderTextColor={colors.textSecondary}
                                maxLength={5}
                                value={expiration}
                                onChangeText={handleExpirationChange}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                            <Text style={[styles.label, { color: colors.textPrimary }]}>CVC</Text>
                            <TextInput 
                                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                                keyboardType="number-pad"
                                placeholder="123"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry
                                maxLength={4}
                                value={cvc}
                                onChangeText={setCvc}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Nombre del Titular</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                            placeholder="Como aparece en la tarjeta"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="words"
                            value={cardholderName}
                            onChangeText={setCardholderName}
                        />
                    </View>

                    <View style={[styles.switchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <View>
                            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Guardar tarjeta</Text>
                            <Text style={styles.switchSubLabel}>Para compras futuras de manera segura</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#767577", true: colors.buttonMain }}
                            thumbColor={saveCard ? "#fff" : "#f4f3f4"}
                            onValueChange={setSaveCard}
                            value={saveCard}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.payButton, { backgroundColor: colors.buttonMain }, isLoading && { opacity: 0.7 }]} 
                    onPress={processPayment}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payButtonText}>
                            {esRenta ? 'Pagar Renta de Forma Segura' : 'Pagar de Forma Segura'}
                        </Text>
                    )}
                </TouchableOpacity>
                <View style={styles.secureBadge}>
                    <MaterialCommunityIcons name="lock" size={14} color={colors.textSecondary} />
                    <Text style={[styles.secureText, { color: colors.textSecondary }]}>Pagos protegidos por Mercado Pago</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24 },
    backButton: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: 15, marginBottom: 24, lineHeight: 22 },
    amountContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 24 },
    amountLabel: { fontSize: 16, fontWeight: '600' },
    amountValue: { fontSize: 24, fontWeight: 'bold' },
    cardVisual: { borderRadius: 16, padding: 24, height: 200, justifyContent: 'space-between', marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
    cardVisualNumber: { color: '#FFFFFF', fontSize: 22, letterSpacing: 2, fontWeight: '600' },
    cardVisualFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    cardVisualLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
    cardVisualText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
    form: { marginBottom: 24 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: 16, borderRadius: 12, borderWidth: 1 },
    switchLabel: { fontSize: 15, fontWeight: '600' },
    switchSubLabel: { fontSize: 12, color: '#7F8C8D', marginTop: 4 },
    payButton: { padding: 18, borderRadius: 12, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    payButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    secureBadge: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 40 },
    secureText: { fontSize: 12, marginLeft: 6 },
    errorContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
    errorTextUI: { color: '#E74C3C', marginLeft: 8, fontSize: 15, flex: 1 },
    successContainer: { flexDirection: 'row', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, alignItems: 'flex-start' },
    successTextContainer: { marginLeft: 12, flex: 1 },
    successTitle: { color: '#27AE60', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    successTextUI: { fontSize: 15, marginBottom: 16, lineHeight: 22 }
});
