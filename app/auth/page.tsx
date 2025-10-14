"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "../../lib/auth";

interface SendOTPResponse {
  success: boolean;
  message: string;
  data: {
    verificationId: string;
    timeout: string;
  };
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      phoneNumber: string;
      role: string;
      isActive: boolean;
    };
  };
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://sojournbackend.onrender.com";

export default function AuthPage() {
  const router = useRouter();
  const [returnUrlFromParams, setReturnUrlFromParams] = useState<string | null>(
    null
  );

  // Hydrate returnUrl from the URL on client mount to avoid useSearchParams during render
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setReturnUrlFromParams(params.get("returnUrl"));
    } catch (err) {
      // ignore
    }
  }, []);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeout, setTimeout] = useState<number>(0);

  // Determine the final return URL (from params, localStorage, or default)
  const getReturnUrl = useCallback(() => {
    if (returnUrlFromParams) {
      // Clear any stored URL since we're using the param one
      AuthService.clearReturnUrl();
      return returnUrlFromParams;
    }
    const storedUrl = AuthService.getAndClearReturnUrl();
    return storedUrl || "/";
  }, [returnUrlFromParams]);

  // Check if user is already authenticated
  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      const redirectUrl = getReturnUrl();
      router.push(redirectUrl);
    }
  }, [router, getReturnUrl]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data: SendOTPResponse = await response.json();

      if (data.success) {
        setVerificationId(data.data.verificationId);
        setTimeout(parseInt(data.data.timeout));
        setStep("otp");
        // Start countdown timer
        startCountdown(parseInt(data.data.timeout));
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          verificationId,
          code: otp,
        }),
      });

      const data: VerifyOTPResponse = await response.json();

      if (data.success) {
        // Store tokens using AuthService
        AuthService.setAuthData(
          {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          },
          data.data.user
        );

        // Redirect to returnUrl if available, otherwise to dashboard
        const redirectUrl = getReturnUrl();
        window.location.href = redirectUrl;
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (seconds: number) => {
    const timer = setInterval(() => {
      seconds--;
      setTimeout(seconds);
      if (seconds <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleResendOTP = () => {
    setOtp("");
    setError("");
    setStep("phone");
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Limit to 10 digits
    return digits.slice(0, 10);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            {step === "phone" ? "Sign in to your account" : "Verify OTP"}
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            {step === "phone"
              ? "Enter your phone number to receive an OTP"
              : `Enter the 4-digit code sent to ${phoneNumber}`}
          </p>
        </div>

        {step === "phone" ? (
          <form className='mt-8 space-y-6' onSubmit={handleSendOTP}>
            <div>
              <label htmlFor='phone' className='sr-only'>
                Phone number
              </label>
              <input
                id='phone'
                name='phone'
                type='tel'
                required
                className='appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm'
                placeholder='Phone number (10 digits)'
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(formatPhoneNumber(e.target.value))
                }
                maxLength={10}
              />
            </div>

            {error && (
              <div className='text-red-600 text-sm text-center'>{error}</div>
            )}

            <div>
              <button
                type='submit'
                disabled={loading || phoneNumber.length !== 10}
                className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        ) : (
          <form className='mt-8 space-y-6' onSubmit={handleVerifyOTP}>
            <div>
              <label htmlFor='otp' className='sr-only'>
                OTP
              </label>
              <input
                id='otp'
                name='otp'
                type='text'
                required
                className='appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl tracking-widest focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10'
                placeholder='0000'
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                maxLength={4}
              />
            </div>

            {timeout > 0 && (
              <div className='text-center text-sm text-gray-600'>
                Resend OTP in {timeout} seconds
              </div>
            )}

            {error && (
              <div className='text-red-600 text-sm text-center'>{error}</div>
            )}

            <div className='space-y-3'>
              <button
                type='submit'
                disabled={loading || otp.length !== 4}
                className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type='button'
                onClick={handleResendOTP}
                disabled={timeout > 0}
                className='w-full text-center text-sm text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed'
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
