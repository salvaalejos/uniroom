import { app } from "../../src/index";

export async function getTestApp() {
    return app;
}

export function createAuthHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
}
