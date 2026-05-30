import { API_BASE_URL } from "../config"

export const getMediaUri = (src: string): { uri: string } | number => {
    if (!src) return 0;
    if (src.startsWith("http")) return { uri: src };
    return { uri: `${API_BASE_URL}${src}` };
};
