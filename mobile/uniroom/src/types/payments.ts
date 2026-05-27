export type SavedCard = {
    id: string;
    first_six_digits: string;
    last_four_digits: string;
    expiration_month: number;
    expiration_year: number;
    payment_method: { id: string; name: string };
    issuer: { id: number; name: string };
    cardholder: { name: string };
};
