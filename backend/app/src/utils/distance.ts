export const TEC_ITM = {
    latitude: 19.721869,
    longitude: -101.185483,
};

export const getDistancia = (lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - TEC_ITM.latitude) * Math.PI / 180;
    const dLon = (lon2 - TEC_ITM.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(TEC_ITM.latitude * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};
