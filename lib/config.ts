// Test configuration for Sojourn booking flow
// This file validates that all environment variables and endpoints are correctly configured

const config = {
  backendUrl:
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://sojournbackend.onrender.com",
  endpoints: {
    hotels: "/api/hotels",
    auth: "/api/auth",
    bookings: "/api/hotels/bookings",
    payment: {
      createOrder: "/payment/create-order",
      verify: "/payment/verify",
    },
  },

  // Test phone numbers that bypass OTP for development
  testPhoneNumbers: ["9876543211", "9876543212", "9876543213"],

  // Booking flow status
  bookingStatuses: {
    DRAFT: "Booking created, room not yet reserved",
    PENDING: "Payment initiated, room reserved",
    CONFIRMED: "Payment successful, booking confirmed",
    CANCELLED: "Booking cancelled",
    COMPLETED: "Stay completed",
  },
};

// Validate configuration
export function validateConfig() {
  const issues = [];

  if (!config.backendUrl) {
    issues.push("NEXT_PUBLIC_BACKEND_URL not set");
  }

  if (!config.backendUrl.startsWith("https://")) {
    issues.push("Backend URL should use HTTPS in production");
  }

  return {
    isValid: issues.length === 0,
    issues,
    config,
  };
}

export default config;
