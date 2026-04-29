import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch 
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

// URLs y Credenciales
const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

// La Public Key de Mercado Pago debe venir de variables de entorno (.env)
// El usuario deberá crear el archivo mobile/uniroom/.env y añadir EXPO_PUBLIC_MP_PUBLIC_KEY="TEST-XXXX..."
const MP_PUBLIC_KEY = process.env.EXPO_PUBLIC_MP_PUBLIC_KEY || "TEST-PUBLIC-KEY-REEMPLAZAR";

export default function PaymentScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    
    // Obtener info del usuario logueado o datos necesarios del route param
    const token = route.params?.token; // Token JWT del backend
    
    const [cardNumber, setCardNumber] = useState('');
    const [expiration, setExpiration] = useState(''); // Formato MM/YY
    const [cvc, setCvc] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [saveCard, setSaveCard] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Formateadores simples
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
        return "master"; // Fallback por defecto
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
        unknown: { backgroundColor: '#0F2C4F', icon: 'credit-card-outline' }
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
            // 1. Obtener Token de la tarjeta desde Mercado Pago directamente (Frontend)
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

            const cardToken = tokenData.id; // ¡Este es el token seguro!

            // 2. Enviar Token a nuestro Backend para cobrar
            const backendResponse = await fetch(`${API_BASE_URL}/payments/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    token: cardToken,
                    payment_method_id: getPaymentMethodId(cardNumber), // Detectado dinámicamente
                    transaction_amount: 50, // Costo de la tarifa
                    installments: 1,
                    saveCard: saveCard,
                    issuer_id: tokenData.issuer_id || undefined
                })
            });

            const backendData = await backendResponse.json();

            if (!backendResponse.ok) {
                throw new Error(backendData.error || backendData.detail || "Error al procesar el pago");
            }

            // Éxito
            setSuccessMessage("La tarifa se ha cubierto. Ahora puedes contactar al arrendador.");
            
            // Regresa a InmuebleScreen después de 2 segundos
            setTimeout(() => {
                navigation.goBack();
            }, 2500);

        } catch (error: any) {
            setErrorMessage(error.message || "Ocurrió un error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { paddingTop: insets.top }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#0F2C4F"/>
                </TouchableOpacity>

                <Text style={styles.title}>Tarifa de Servicio</Text>
                <Text style={styles.subtitle}>Completa el pago seguro para acceder a la información de contacto.</Text>

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#E74C3C" />
                        <Text style={styles.errorTextUI}>{errorMessage}</Text>
                    </View>
                ) : null}

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <MaterialCommunityIcons name="check-circle" size={24} color="#27AE60" />
                        <View style={styles.successTextContainer}>
                            <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
                            <Text style={styles.successTextUI}>{successMessage}</Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Total a pagar</Text>
                    <Text style={styles.amountValue}>$50.00 MXN</Text>
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
                        <Text style={styles.label}>Número de Tarjeta</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="number-pad"
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            value={cardNumber}
                            onChangeText={handleCardNumberChange}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Expiración</Text>
                            <TextInput 
                                style={styles.input}
                                keyboardType="number-pad"
                                placeholder="MM/YY"
                                maxLength={5}
                                value={expiration}
                                onChangeText={handleExpirationChange}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                            <Text style={styles.label}>CVC</Text>
                            <TextInput 
                                style={styles.input}
                                keyboardType="number-pad"
                                placeholder="123"
                                secureTextEntry
                                maxLength={4}
                                value={cvc}
                                onChangeText={setCvc}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nombre del Titular</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Como aparece en la tarjeta"
                            autoCapitalize="words"
                            value={cardholderName}
                            onChangeText={setCardholderName}
                        />
                    </View>

                    <View style={styles.switchContainer}>
                        <View>
                            <Text style={styles.switchLabel}>Guardar tarjeta</Text>
                            <Text style={styles.switchSubLabel}>Para compras futuras de manera segura</Text>
                        </View>
                        <Switch
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={saveCard ? "#205EA6" : "#f4f3f4"}
                            onValueChange={setSaveCard}
                            value={saveCard}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.payButton, isLoading && { opacity: 0.7 }]} 
                    onPress={processPayment}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payButtonText}>Pagar de Forma Segura</Text>
                    )}
                </TouchableOpacity>
                <View style={styles.secureBadge}>
                    <MaterialCommunityIcons name="lock" size={14} color="#7F8C8D" />
                    <Text style={styles.secureText}>Pagos protegidos por Mercado Pago</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    scroll: {
        padding: 24,
    },
    backButton: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0F2C4F',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#7F8C8D',
        marginBottom: 24,
        lineHeight: 22,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#DCEEFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    amountLabel: {
        fontSize: 16,
        color: '#0F2C4F',
        fontWeight: '600',
    },
    amountValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#205EA6',
    },
    cardVisual: {
        backgroundColor: '#0F2C4F',
        borderRadius: 16,
        padding: 24,
        height: 200,
        justifyContent: 'space-between',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    cardVisualNumber: {
        color: '#FFFFFF',
        fontSize: 22,
        letterSpacing: 2,
        fontWeight: '600',
    },
    cardVisualFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardVisualLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardVisualText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    form: {
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#0F2C4F',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2C3E50',
    },
    switchSubLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        marginTop: 4,
    },
    payButton: {
        backgroundColor: '#205EA6',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: "#205EA6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    payButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    secureBadge: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 40,
    },
    secureText: {
        fontSize: 12,
        color: '#7F8C8D',
        marginLeft: 6,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FDEDEC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FADBD8',
    },
    errorTextUI: {
        color: '#E74C3C',
        marginLeft: 8,
        fontSize: 15,
        flex: 1,
    },
    successContainer: {
        flexDirection: 'row',
        backgroundColor: '#EAFAF1',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#D5F5E3',
        alignItems: 'flex-start',
    },
    successTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    successTitle: {
        color: '#27AE60',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    successTextUI: {
        color: '#2E4053',
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
    }
});
