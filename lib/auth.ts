// Authentication utilities

export interface User {
  id: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_KEY = "accessToken";
  private static readonly REFRESH_TOKEN_KEY = "refreshToken";
  private static readonly USER_KEY = "user";
  private static readonly RETURN_URL_KEY = "returnUrl";

  // Store return URL for post-authentication redirect
  static setReturnUrl(url: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.RETURN_URL_KEY, url);
  }

  // Get and clear return URL
  static getAndClearReturnUrl(): string | null {
    if (typeof window === "undefined") return null;
    const url = localStorage.getItem(this.RETURN_URL_KEY);
    localStorage.removeItem(this.RETURN_URL_KEY);
    return url;
  }

  // Clear return URL
  static clearReturnUrl(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.RETURN_URL_KEY);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    return !!accessToken;
  }

  // Get stored user data
  static getUser(): User | null {
    if (typeof window === "undefined") return null;

    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData) return null;

    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  // Get access token
  static getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  // Get refresh token
  static getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // Store authentication data
  static setAuthData(tokens: AuthTokens, user: User): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Clear authentication data
  static clearAuthData(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.RETURN_URL_KEY);
  }

  // Check if token is expired (basic check based on JWT structure)
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Refresh access token
  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
        return data.accessToken;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
    }

    return null;
  }

  // Make authenticated API request
  static async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error("No access token available");
    }

    // Check if token is expired and try to refresh
    if (this.isTokenExpired(accessToken)) {
      accessToken = await this.refreshAccessToken();
      if (!accessToken) {
        this.clearAuthData();
        // Store current URL as return URL before redirecting
        this.setReturnUrl(window.location.pathname + window.location.search);
        window.location.href = "/auth";
        throw new Error("Unable to refresh token");
      }
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get a 401, try to refresh the token once
    if (response.status === 401) {
      accessToken = await this.refreshAccessToken();
      if (accessToken) {
        const retryHeaders = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        };

        return fetch(url, {
          ...options,
          headers: retryHeaders,
        });
      } else {
        this.clearAuthData();
        // Store current URL as return URL before redirecting
        this.setReturnUrl(window.location.pathname + window.location.search);
        window.location.href = "/auth";
        throw new Error("Authentication failed");
      }
    }

    return response;
  }
}
