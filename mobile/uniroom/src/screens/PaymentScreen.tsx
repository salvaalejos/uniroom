import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch 
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { SavedCard } from '../types/payments';

const MP_PUBLIC_KEY = process.env.EXPO_PUBLIC_MP_PUBLIC_KEY;

export default function PaymentScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    
    const token = route.params?.token;
    const tipoPago = route.params?.tipo || 'renta';
    const id_inmueble = route.params?.id_inmueble;
    const precio_mensual = route.params?.precio_mensual || route.params?.monto || 0;
    const titulo_inmueble = route.params?.titulo_inmueble || route.params?.titulo || 'Inmueble';
    
    const esRenta = tipoPago === 'renta' || !!id_inmueble;
    
    const [cardNumber, setCardNumber] = useState('');
    const [expiration, setExpiration] = useState('');
    const [cvc, setCvc] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [saveCard, setSaveCard] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Tarjetas guardadas
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
    const [loadingCards, setLoadingCards] = useState(true);
    const [useNewCard, setUseNewCard] = useState(false);

    // Cargar tarjetas guardadas al montar
    useEffect(() => {
        loadSavedCards();
    }, []);

    const loadSavedCards = async () => {
        try {
            setLoadingCards(true);
            const response = await fetch(`${API_BASE_URL}/payments/cards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.cards && data.cards.length > 0) {
                setSavedCards(data.cards);
                setSelectedCard(data.cards[0]);
                setUseNewCard(false);
            } else {
                setUseNewCard(true);
            }
        } catch (error) {
            console.log("Error cargando tarjetas:", error);
            setUseNewCard(true);
        } finally {
            setLoadingCards(false);
        }
    };

    const deleteCard = async (cardId: string) => {
        Alert.alert(
            "Eliminar tarjeta",
            "¿Estás seguro de que quieres eliminar esta tarjeta guardada?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await fetch(`${API_BASE_URL}/payments/cards/${cardId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            setSavedCards(prev => prev.filter(c => c.id !== cardId));
                            if (selectedCard?.id === cardId) {
                                setSelectedCard(null);
                                setUseNewCard(true);
                            }
                        } catch (error) {
                            Alert.alert("Error", "No se pudo eliminar la tarjeta");
                        }
                    }
                }
            ]
        );
    };

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

    const getCardIcon = (pmId: string) => {
        if (pmId === 'visa') return 'cc-visa';
        if (pmId === 'master') return 'cc-mastercard';
        if (pmId === 'amex') return 'cc-amex';
        return 'credit-card';
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

        if (useNewCard) {
            if (!cardNumber || !expiration || !cvc || !cardholderName) {
                setErrorMessage("Por favor llena todos los datos de la tarjeta.");
                return;
            }
        } else if (!selectedCard) {
            setErrorMessage("Selecciona una tarjeta para pagar.");
            return;
        }

        setIsLoading(true);

        try {
            let cardToken: string;
            let paymentMethodId: string;
            let issuerId: string | undefined;

            if (useNewCard) {
                // 1. Obtener Token de la tarjeta nueva desde Mercado Pago
                const expirationMonth = expiration.split('/')[0];
                const expirationYear = "20" + expiration.split('/')[1];
                
                const tokenResponse = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        card_number: cardNumber.replace(/\s/g, ''),
                        expiration_month: parseInt(expirationMonth),
                        expiration_year: parseInt(expirationYear),
                        security_code: cvc,
                        cardholder: { name: cardholderName }
                    })
                });

                const tokenData = await tokenResponse.json();
                if (!tokenResponse.ok) {
                    throw new Error("Error validando la tarjeta. Revisa los datos.");
                }

                cardToken = tokenData.id;
                paymentMethodId = getPaymentMethodId(cardNumber);
                issuerId = tokenData.issuer_id || undefined;
            } else {
                // Usar tarjeta guardada: generar token desde la tarjeta guardada
                if (!cvc) {
                    setIsLoading(false);
                    setErrorMessage("Ingresa el código de seguridad (CVC) de tu tarjeta.");
                    return;
                }

                const tokenResponse = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        card_id: selectedCard!.id,
                        security_code: cvc
                    })
                });

                const tokenData = await tokenResponse.json();
                if (!tokenResponse.ok) {
                    throw new Error("Error al procesar la tarjeta guardada.");
                }

                cardToken = tokenData.id;
                paymentMethodId = selectedCard!.payment_method.id;
                issuerId = selectedCard!.issuer?.id?.toString() || undefined;
            }

            // 2. Enviar Token a nuestro Backend para cobrar
            const backendResponse = await fetch(`${API_BASE_URL}/payments/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    token: cardToken,
                    payment_method_id: paymentMethodId,
                    id_inmueble: id_inmueble,
                    installments: 1,
                    saveCard: useNewCard ? saveCard : false,
                    issuer_id: issuerId
                })
            });

            const backendData = await backendResponse.json();

            if (!backendResponse.ok) {
                throw new Error(backendData.error || backendData.detail || "Error al procesar el pago");
            }

            // Éxito
            setSuccessMessage(`¡Has pagado la renta de ${titulo_inmueble} exitosamente!`);
            
            setTimeout(() => {
                navigation.goBack();
            }, 2500);

        } catch (error: any) {
            setErrorMessage(error.message || "Ocurrió un error");
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingCards) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#205EA6" />
                <Text style={{ marginTop: 12, color: '#7F8C8D' }}>Cargando métodos de pago...</Text>
            </View>
        );
    }

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
                        ? `Completa el pago para rentar ${titulo_inmueble}.`
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
                    <Text style={[styles.amountValue, { color: colors.buttonMain }]}>${precio_mensual.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</Text>
                </View>

                {/* Tarjetas Guardadas */}
                {savedCards.length > 0 && (
                    <View style={styles.savedCardsSection}>
                        <Text style={styles.sectionTitle}>Tarjetas Guardadas</Text>
                        {savedCards.map((card) => (
                            <TouchableOpacity
                                key={card.id}
                                style={[
                                    styles.savedCardItem,
                                    !useNewCard && selectedCard?.id === card.id && styles.savedCardItemSelected
                                ]}
                                onPress={() => {
                                    setSelectedCard(card);
                                    setUseNewCard(false);
                                    setCvc('');
                                }}
                            >
                                <View style={styles.savedCardLeft}>
                                    <FontAwesome 
                                        name={getCardIcon(card.payment_method.id) as any} 
                                        size={28} 
                                        color={!useNewCard && selectedCard?.id === card.id ? '#205EA6' : '#7F8C8D'} 
                                    />
                                    <View style={styles.savedCardInfo}>
                                        <Text style={styles.savedCardNumber}>
                                            •••• •••• •••• {card.last_four_digits}
                                        </Text>
                                        <Text style={styles.savedCardExpiry}>
                                            {card.cardholder?.name || 'Titular'} · Exp. {String(card.expiration_month).padStart(2, '0')}/{card.expiration_year}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.savedCardRight}>
                                    {!useNewCard && selectedCard?.id === card.id && (
                                        <MaterialCommunityIcons name="check-circle" size={22} color="#205EA6" />
                                    )}
                                    <TouchableOpacity onPress={() => deleteCard(card.id)} style={styles.deleteCardBtn}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E74C3C" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* CVC para tarjeta guardada */}
                        {!useNewCard && selectedCard && (
                            <View style={styles.cvcSavedContainer}>
                                <Text style={styles.label}>Código de seguridad (CVC)</Text>
                                <TextInput 
                                    style={[styles.input, { width: 120 }]}
                                    keyboardType="number-pad"
                                    placeholder="CVC"
                                    secureTextEntry
                                    maxLength={4}
                                    value={cvc}
                                    onChangeText={setCvc}
                                />
                            </View>
                        )}

                        {/* Botón para usar tarjeta nueva */}
                        <TouchableOpacity 
                            style={[styles.newCardButton, useNewCard && styles.newCardButtonActive]}
                            onPress={() => {
                                setUseNewCard(true);
                                setSelectedCard(null);
                                setCvc('');
                            }}
                        >
                            <MaterialCommunityIcons 
                                name="credit-card-plus-outline" 
                                size={20} 
                                color={useNewCard ? '#205EA6' : '#7F8C8D'} 
                            />
                            <Text style={[styles.newCardButtonText, useNewCard && { color: '#205EA6' }]}>
                                Usar tarjeta nueva
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Formulario de tarjeta nueva */}
                {useNewCard && (
                    <>
                        {savedCards.length > 0 && (
                            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Nueva Tarjeta</Text>
                        )}

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
                                    <Text style={styles.switchSubLabel}>Para pagos futuros de manera segura</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#767577", true: colors.buttonMain }}
                                    thumbColor={saveCard ? "#fff" : "#f4f3f4"}
                                    onValueChange={setSaveCard}
                                    value={saveCard}
                                />
                            </View>
                        </View>
                    </>
                )}

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
    // Tarjetas guardadas
    savedCardsSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
    savedCardItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 10 },
    savedCardItemSelected: { borderColor: '#205EA6', backgroundColor: '#F0F7FF' },
    savedCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    savedCardInfo: { marginLeft: 14, flex: 1 },
    savedCardNumber: { fontSize: 16, fontWeight: '600', letterSpacing: 1 },
    savedCardExpiry: { fontSize: 13, color: '#7F8C8D', marginTop: 3 },
    savedCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    deleteCardBtn: { padding: 6 },
    cvcSavedContainer: { marginTop: 8, marginBottom: 12 },
    newCardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', marginTop: 6 },
    newCardButtonActive: { borderColor: '#205EA6', backgroundColor: '#F0F7FF' },
    newCardButtonText: { fontSize: 15, fontWeight: '600', color: '#7F8C8D', marginLeft: 8 },
    // Tarjeta visual
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
