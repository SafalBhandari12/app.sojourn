// Payment utility for Razorpay integration
// Handles script loading and payment initialization

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentBackendData {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  orderId?: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  timeout?: number;
  remember_customer?: boolean;
  readonly?: {
    email?: boolean;
    contact?: boolean;
    name?: boolean;
  };
  hidden?: {
    email?: boolean;
    contact?: boolean;
    name?: boolean;
  };
  notes?: Record<string, string>;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  timeout?: number;
  remember_customer?: boolean;
  readonly?: {
    email?: boolean;
    contact?: boolean;
    name?: boolean;
  };
  hidden?: {
    email?: boolean;
    contact?: boolean;
    name?: boolean;
  };
  notes?: Record<string, string>;
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export class PaymentUtils {
  // Check if Razorpay is loaded
  static isRazorpayLoaded(): boolean {
    return typeof window !== "undefined" && !!window.Razorpay;
  }

  // Wait for Razorpay to load
  static waitForRazorpay(timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isRazorpayLoaded()) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.isRazorpayLoaded()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  // Initialize Razorpay payment
  static async initializePayment(options: RazorpayOptions): Promise<boolean> {
    try {
      // Wait for Razorpay to load
      const isLoaded = await this.waitForRazorpay();

      if (!isLoaded) {
        throw new Error("Razorpay failed to load");
      }

      // Create and open Razorpay instance (narrowed)
      const RazorpayConstructor = window.Razorpay;
      if (!RazorpayConstructor)
        throw new Error("Razorpay constructor not available");
      const rzp = new RazorpayConstructor(options);
      rzp.open();

      return true;
    } catch (error) {
      console.error("Payment initialization error:", error);
      return false;
    }
  }

  // Format payment options from backend response
  static formatPaymentOptions(
    paymentData: PaymentBackendData,
    bookingId: string,
    onSuccess: (response: RazorpayResponse) => void,
    onDismiss?: () => void
  ): RazorpayOptions {
    return {
      key: paymentData.key,
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: paymentData.name || "Sojourn",
      description: paymentData.description || "Hotel Booking",
      image: paymentData.image,
      order_id: paymentData.orderId || paymentData.order_id,
      prefill: paymentData.prefill,
      theme: paymentData.theme,
      retry: paymentData.retry,
      timeout: paymentData.timeout,
      remember_customer: paymentData.remember_customer,
      readonly: paymentData.readonly,
      hidden: paymentData.hidden,
      notes: paymentData.notes,
      handler: onSuccess,
      modal: {
        ondismiss:
          onDismiss ||
          (() => {
            console.log("Payment modal dismissed");
          }),
      },
    };
  }

  // Safely access nested object properties
  static safeGet<T = unknown>(
    obj: unknown,
    path: string,
    defaultValue: T | null = null
  ): T | null {
    let current: unknown = obj;
    const parts = path.split(".");

    for (const key of parts) {
      if (
        current !== null &&
        typeof current === "object" &&
        Object.prototype.hasOwnProperty.call(current, key)
      ) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }

    return current as T;
  }

  // Validate API response structure
  static validateApiResponse(
    response: unknown,
    requiredFields: string[] = []
  ): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const resp = response as Record<string, unknown>;

    // Check if success field exists and is true
    if (!resp["success"]) {
      return false;
    }

    // Check required fields
    for (const field of requiredFields) {
      if (this.safeGet(response, field) === null) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  // Log API response safely
  static logApiResponse(response: unknown, context: string): void {
    try {
      console.log(`${context} - Response:`, JSON.stringify(response, null, 2));
    } catch {
      // optional catch binding used to avoid unused variable lint
      console.log(`${context} - Response (non-serializable):`, response);
    }
  }
}

// Global Razorpay type declaration
declare global {
  interface Window {
    Razorpay?: {
      new (options: RazorpayOptions): { open: () => void };
    };
  }
}

export default PaymentUtils;
