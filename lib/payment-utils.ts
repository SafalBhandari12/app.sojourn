// Payment utility for Razorpay integration
// Handles script loading and payment initialization

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
  handler: (response: any) => void;
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

      // Create and open Razorpay instance
      const rzp = new window.Razorpay(options);
      rzp.open();

      return true;
    } catch (error) {
      console.error("Payment initialization error:", error);
      return false;
    }
  }

  // Format payment options from backend response
  static formatPaymentOptions(
    paymentData: any,
    bookingId: string,
    onSuccess: (response: any) => void,
    onDismiss?: () => void
  ): RazorpayOptions {
    return {
      key: paymentData.key,
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: paymentData.name || "Sojourn",
      description: paymentData.description || "Hotel Booking",
      image: paymentData.image,
      order_id: paymentData.orderId,
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
  static safeGet(obj: any, path: string, defaultValue: any = null): any {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined
        ? current[key]
        : defaultValue;
    }, obj);
  }

  // Validate API response structure
  static validateApiResponse(
    response: any,
    requiredFields: string[] = []
  ): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    // Check if success field exists and is true
    if (!response.success) {
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
  static logApiResponse(response: any, context: string): void {
    try {
      console.log(`${context} - Response:`, JSON.stringify(response, null, 2));
    } catch (error) {
      console.log(`${context} - Response (non-serializable):`, response);
    }
  }
}

// Global Razorpay type declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default PaymentUtils;
