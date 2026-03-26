const ADMIN_TOKEN_KEY = "speedtest-admin-token";

export function authHeaders(): Record<string, string> {
    const token =
        typeof localStorage !== "undefined"
            ? localStorage.getItem(ADMIN_TOKEN_KEY)
            : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export function setAdminToken(token: string): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
