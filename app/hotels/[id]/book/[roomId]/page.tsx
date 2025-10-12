"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { AuthService } from "../../../../../lib/auth";
import PaymentUtils from "../../../../../lib/payment-utils";

interface BookingData {
  hotelId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  userDetails: {
    firstName: string;
    lastName: string;
    email?: string;
    dateOfBirth?: string;
    address?: string;
    emergencyContact?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  guestDetails: Array<{
    firstName: string;
    lastName: string;
    age?: number;
    idProofType?: string;
    idProofNumber?: string;
    isPrimaryGuest: boolean;
    specialRequests?: string;
  }>;
  specialRequests?: string;
}

interface Hotel {
  id: string;
  hotelName: string;
  category: string;
  vendor: {
    businessName: string;
    businessAddress: string;
    contactNumbers: string[];
  };
}

interface Room {
  id: string;
  roomType: string;
  roomNumber: string;
  capacity: number;
  basePrice: number;
  amenities: string[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://sojournbackend.onrender.com";

const ID_PROOF_TYPES = [
  { value: "AADHAR", label: "Aadhar Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "PAN_CARD", label: "PAN Card" },
];

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Changed from hotelId to id to match the directory structure
  const hotelId = params.id as string;
  const roomId = params.roomId as string;
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = parseInt(searchParams.get("guests") || "2");

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [localCheckIn, setLocalCheckIn] = useState(checkIn);
  const [localCheckOut, setLocalCheckOut] = useState(checkOut);
  const [priceDetails, setPriceDetails] = useState({
    pricePerNight: 0,
    totalPrice: 0,
    nights: 0,
    taxes: 0,
    finalAmount: 0,
  });

  const [formData, setFormData] = useState<BookingData>({
    hotelId,
    roomId,
    checkInDate: localCheckIn || checkIn,
    checkOutDate: localCheckOut || checkOut,
    numberOfGuests: guests,
    userDetails: {
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      address: "",
      emergencyContact: "",
      idProofType: "",
      idProofNumber: "",
    },
    guestDetails: [],
    specialRequests: "",
  });

  useEffect(() => {
    // Check if Razorpay is already loaded
    setRazorpayLoaded(PaymentUtils.isRazorpayLoaded());

    // Debug: Log search params
    console.log("Debug - Search Params:", {
      checkIn,
      checkOut,
      guests,
      hotelId,
      roomId,
    });

    // Check authentication
    if (!AuthService.isAuthenticated()) {
      const returnUrl = `/hotels/${hotelId}/book/${roomId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;

      // Store return URL in localStorage as backup
      AuthService.setReturnUrl(returnUrl);

      // Redirect to auth with return URL
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    fetchBookingDetails();
    setupAdditionalGuests();
  }, [hotelId, roomId]);

  useEffect(() => {
    calculatePricing();
  }, [localCheckIn, localCheckOut, room]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      checkInDate: localCheckIn || checkIn,
      checkOutDate: localCheckOut || checkOut,
    }));
  }, [localCheckIn, localCheckOut, checkIn, checkOut]);

  const fetchBookingDetails = async () => {
    try {
      // Fetch hotel details
      const hotelResponse = await fetch(`${BACKEND_URL}/api/hotels/${hotelId}`);
      const hotelData = await hotelResponse.json();

      if (hotelData.success) {
        setHotel(hotelData.data);

        // Find the specific room
        const selectedRoom = hotelData.data.rooms.find(
          (r: Room) => r.id === roomId
        );
        if (selectedRoom) {
          setRoom(selectedRoom);
        }
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupAdditionalGuests = () => {
    const guestList: Array<{
      firstName: string;
      lastName: string;
      age?: number;
      idProofType?: string;
      idProofNumber?: string;
      isPrimaryGuest: boolean;
      specialRequests?: string;
    }> = [];

    // Add primary guest
    guestList.push({
      firstName: "",
      lastName: "",
      age: undefined,
      idProofType: "",
      idProofNumber: "",
      isPrimaryGuest: true,
      specialRequests: "",
    });

    // Add additional guests
    for (let i = 1; i < guests; i++) {
      guestList.push({
        firstName: "",
        lastName: "",
        age: undefined,
        idProofType: "",
        idProofNumber: "",
        isPrimaryGuest: false,
        specialRequests: "",
      });
    }

    setFormData((prev) => ({
      ...prev,
      guestDetails: guestList,
    }));
  };

  const calculatePricing = () => {
    const currentCheckIn = localCheckIn || checkIn;
    const currentCheckOut = localCheckOut || checkOut;

    if (!currentCheckIn || !currentCheckOut || !room) return;

    const start = new Date(currentCheckIn);
    const end = new Date(currentCheckOut);
    const nights = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pricePerNight = room.basePrice || 2500; // Fallback price
    const totalPrice = pricePerNight * nights;
    const taxes = Math.round(totalPrice * 0.12); // 12% taxes
    const finalAmount = totalPrice + taxes;

    setPriceDetails({
      pricePerNight,
      totalPrice,
      nights,
      taxes,
      finalAmount,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith("userDetails.")) {
      const userField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        userDetails: {
          ...prev.userDetails,
          [userField]: value,
        },
      }));
    } else if (field.startsWith("guest.")) {
      const [, index, guestField] = field.split(".");
      const guestIndex = parseInt(index);

      setFormData((prev) => {
        if (guestField === "isPrimaryGuest" && value === "true") {
          // If setting a guest as primary, unset all others
          return {
            ...prev,
            guestDetails: prev.guestDetails.map((guest, i) => ({
              ...guest,
              isPrimaryGuest: i === guestIndex,
            })),
          };
        } else {
          return {
            ...prev,
            guestDetails: prev.guestDetails.map((guest, i) =>
              i === guestIndex
                ? {
                    ...guest,
                    [guestField]:
                      guestField === "age"
                        ? parseInt(value) || undefined
                        : guestField === "isPrimaryGuest"
                        ? value === "true"
                        : value,
                  }
                : guest
            ),
          };
        }
      });
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    // Validate user details
    if (!formData.userDetails.firstName || !formData.userDetails.lastName) {
      alert("Please fill in your first name and last name");
      return false;
    }

    // Validate guest details
    for (let i = 0; i < formData.guestDetails.length; i++) {
      const guest = formData.guestDetails[i];
      if (!guest.firstName || !guest.lastName) {
        alert(`Please fill in the first name and last name for guest ${i + 1}`);
        return false;
      }
    }

    // Ensure exactly one primary guest
    const primaryGuests = formData.guestDetails.filter(
      (guest) => guest.isPrimaryGuest
    );
    if (primaryGuests.length !== 1) {
      alert("Please select exactly one primary guest");
      return false;
    }

    return true;
  };

  const createBooking = async () => {
    if (!validateForm()) return;

    setBookingLoading(true);
    try {
      const response = await AuthService.authenticatedFetch(
        `${BACKEND_URL}/api/hotels/bookings`,
        {
          method: "POST",
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log("Booking created successfully:", data.data.id);
        console.log("Booking status:", data.data.status); // Should be 'DRAFT'

        // Create payment order (changes status from DRAFT to PENDING)
        const paymentResponse = await AuthService.authenticatedFetch(
          `${BACKEND_URL}/api/hotels/bookings/${data.data.id}/payment/create-order`,
          { method: "POST" }
        );
        const paymentData = await paymentResponse.json();

        if (paymentData.success) {
          console.log(
            "Payment order created, booking status changed to PENDING"
          );
          console.log("Room is now reserved for this customer");
          initiatePayment(paymentData.data, data.data.id);
        } else {
          console.error("Payment creation failed:", paymentData);

          // Handle specific error cases
          if (paymentData.message?.includes("Room is not available")) {
            alert(
              "Sorry, this room is no longer available for your selected dates. Please choose different dates or another room."
            );
            // Redirect back to hotel details or search
            router.push(
              `/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
            );
          } else if (paymentData.message?.includes("Booking not found")) {
            alert("Booking not found. Please try creating a new booking.");
            router.push(`/hotels/${hotelId}`);
          } else {
            alert(
              paymentData.message ||
                "Failed to create payment order. Please try again."
            );
          }
        }
      } else {
        alert(data.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const initiatePayment = async (paymentData: any, bookingId: string) => {
    try {
      const options = PaymentUtils.formatPaymentOptions(
        paymentData,
        bookingId,
        async (response: any) => {
          await verifyPayment(response, bookingId);
        },
        () => {
          console.log("Payment modal dismissed");
          // Booking remains in PENDING status - customer can retry payment
        }
      );

      const success = await PaymentUtils.initializePayment(options);

      if (!success) {
        alert("Failed to initialize payment. Please try again.");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert("Payment initialization failed. Please try again.");
    }
  };

  const verifyPayment = async (paymentResponse: any, bookingId: string) => {
    try {
      const response = await AuthService.authenticatedFetch(
        `${BACKEND_URL}/api/hotels/bookings/${bookingId}/payment/verify`,
        {
          method: "POST",
          body: JSON.stringify({
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        }
      );

      const data = await response.json();
      PaymentUtils.logApiResponse(data, "Payment Verification");

      if (PaymentUtils.validateApiResponse(data)) {
        console.log(
          "Payment verified successfully, booking status changed to CONFIRMED"
        );

        alert("Payment successful! Your booking has been confirmed.");

        // Safely check for invoice
        const invoiceUrl = PaymentUtils.safeGet(
          data,
          "data.invoice.invoiceUrl"
        );
        if (invoiceUrl) {
          console.log("Invoice available:", invoiceUrl);
        } else {
          console.log("No invoice data in response");
        }

        // Redirect to booking confirmation page or dashboard
        try {
          router.push(`/bookings/${bookingId}`);
        } catch (routerError) {
          console.error(
            "Router error, redirecting to bookings list:",
            routerError
          );
          router.push("/bookings");
        }
      } else {
        console.error("Payment verification failed:", data);
        alert(
          `Payment verification failed: ${
            data.message || "Unknown error"
          }. If money was deducted, it will be refunded within 5-7 business days. Please contact support.`
        );
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert(
        "Payment verification failed due to network error. Please contact support."
      );
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!hotel || !room) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-medium text-gray-900 mb-4'>
            Booking Details Not Found
          </h1>
          <Link
            href='/hotels'
            className='text-gray-600 hover:text-gray-900 underline'
          >
            Back to Hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <Link href='/' className='text-2xl font-semibold text-gray-900'>
              Sojourn
            </Link>
            <nav className='hidden md:flex space-x-8'>
              <Link
                href='/hotels'
                className='text-gray-600 hover:text-gray-900 font-medium'
              >
                Hotels
              </Link>
              <Link
                href='/dashboard'
                className='text-gray-600 hover:text-gray-900'
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Load Razorpay Script */}
      <Script
        src='https://checkout.razorpay.com/v1/checkout.js'
        onLoad={() => {
          console.log("Razorpay script loaded successfully");
          setRazorpayLoaded(PaymentUtils.isRazorpayLoaded());
        }}
        onError={() => {
          console.error("Failed to load Razorpay script");
          setRazorpayLoaded(false);
        }}
      />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column - Booking Form */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Booking Details */}
            <div className='bg-white border border-gray-200 p-6'>
              <h2 className='text-xl font-semibold mb-4 text-gray-900'>
                Booking Details
              </h2>

              {/* Hotel & Room Info */}
              <div className='bg-gray-50 border border-gray-200 p-4 mb-6'>
                <h3 className='font-medium text-lg text-gray-900'>
                  {hotel.hotelName}
                </h3>
                <p className='text-gray-600 text-sm'>
                  {hotel.vendor.businessAddress}
                </p>
                <div className='mt-3 space-y-1 text-sm text-gray-700'>
                  <p>
                    <span className='font-medium text-gray-900'>Room:</span>{" "}
                    {room.roomType} (Room {room.roomNumber})
                  </p>
                  <p>
                    <span className='font-medium text-gray-900'>Check-in:</span>{" "}
                    {localCheckIn || checkIn
                      ? new Date(localCheckIn || checkIn).toLocaleDateString()
                      : "Not selected"}
                  </p>
                  <p>
                    <span className='font-medium text-gray-900'>
                      Check-out:
                    </span>{" "}
                    {localCheckOut || checkOut
                      ? new Date(localCheckOut || checkOut).toLocaleDateString()
                      : "Not selected"}
                  </p>
                  <p>
                    <span className='font-medium text-gray-900'>Guests:</span>{" "}
                    {guests}
                  </p>
                  <p>
                    <span className='font-medium text-gray-900'>Nights:</span>{" "}
                    {priceDetails.nights}
                  </p>
                </div>
              </div>

              {/* Booking Process Status */}
              <div className='bg-blue-50 border border-blue-200 p-4 mb-6'>
                <h4 className='font-medium text-blue-900 mb-2'>
                  🔄 Booking Process
                </h4>
                <div className='text-sm text-blue-800 space-y-1'>
                  <p>✅ Step 1: Fill guest details and create booking</p>
                  <p>🔄 Step 2: Initiate payment (room will be reserved)</p>
                  <p>⏳ Step 3: Complete payment (booking confirmed)</p>
                </div>
                <div className='mt-3 text-xs text-blue-600'>
                  <p>
                    • Your room will be reserved only when payment is initiated
                  </p>
                  <p>
                    • Secure payment via Razorpay with all major payment methods
                  </p>
                  <p>• Instant confirmation upon successful payment</p>
                </div>
              </div>

              {/* Date Selection (if not provided in URL) */}
              {(!(localCheckIn || checkIn) || !(localCheckOut || checkOut)) && (
                <div className='bg-yellow-50 border border-yellow-200 p-4 mb-6'>
                  <h4 className='font-medium text-sm mb-3 text-gray-900'>
                    Select Your Dates
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Check-in Date
                      </label>
                      <input
                        type='date'
                        value={localCheckIn}
                        onChange={(e) => {
                          const newCheckIn = e.target.value;
                          setLocalCheckIn(newCheckIn);
                          setFormData((prev) => ({
                            ...prev,
                            checkInDate: newCheckIn,
                          }));
                        }}
                        className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Check-out Date
                      </label>
                      <input
                        type='date'
                        value={localCheckOut}
                        onChange={(e) => {
                          const newCheckOut = e.target.value;
                          setLocalCheckOut(newCheckOut);
                          setFormData((prev) => ({
                            ...prev,
                            checkOutDate: newCheckOut,
                          }));
                        }}
                        className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                        min={
                          localCheckIn || new Date().toISOString().split("T")[0]
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* User Details */}
              <div className='space-y-4'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Your Details
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      First Name *
                    </label>
                    <input
                      type='text'
                      value={formData.userDetails.firstName}
                      onChange={(e) =>
                        handleInputChange(
                          "userDetails.firstName",
                          e.target.value
                        )
                      }
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                      placeholder='Enter first name'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Last Name *
                    </label>
                    <input
                      type='text'
                      value={formData.userDetails.lastName}
                      onChange={(e) =>
                        handleInputChange(
                          "userDetails.lastName",
                          e.target.value
                        )
                      }
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                      placeholder='Enter last name'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Email Address
                    </label>
                    <input
                      type='email'
                      value={formData.userDetails.email}
                      onChange={(e) =>
                        handleInputChange("userDetails.email", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                      placeholder='Enter email address'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Date of Birth
                    </label>
                    <input
                      type='date'
                      value={formData.userDetails.dateOfBirth}
                      onChange={(e) =>
                        handleInputChange(
                          "userDetails.dateOfBirth",
                          e.target.value
                        )
                      }
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                    />
                  </div>

                  <div className='md:col-span-2'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Address
                    </label>
                    <textarea
                      value={formData.userDetails.address}
                      onChange={(e) =>
                        handleInputChange("userDetails.address", e.target.value)
                      }
                      rows={2}
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                      placeholder='Enter your address'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Emergency Contact
                    </label>
                    <input
                      type='tel'
                      value={formData.userDetails.emergencyContact}
                      onChange={(e) =>
                        handleInputChange(
                          "userDetails.emergencyContact",
                          e.target.value
                        )
                      }
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                      placeholder='Emergency contact number'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      ID Proof Type
                    </label>
                    <select
                      value={formData.userDetails.idProofType}
                      onChange={(e) =>
                        handleInputChange(
                          "userDetails.idProofType",
                          e.target.value
                        )
                      }
                      className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                    >
                      <option value=''>Select ID Proof Type</option>
                      {ID_PROOF_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.userDetails.idProofType && (
                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        ID Proof Number
                      </label>
                      <input
                        type='text'
                        value={formData.userDetails.idProofNumber}
                        onChange={(e) =>
                          handleInputChange(
                            "userDetails.idProofNumber",
                            e.target.value
                          )
                        }
                        className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                        placeholder={`Enter ${formData.userDetails.idProofType} number`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Details */}
              <div className='space-y-4 mt-6'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Guest Details
                </h3>

                {formData.guestDetails.map((guest, index) => (
                  <div
                    key={index}
                    className='bg-gray-50 border border-gray-200 p-4'
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <h4 className='font-medium text-gray-900'>
                        Guest {index + 1}
                      </h4>
                      <label className='flex items-center'>
                        <input
                          type='radio'
                          name='primaryGuest'
                          checked={guest.isPrimaryGuest}
                          onChange={(e) =>
                            handleInputChange(
                              `guest.${index}.isPrimaryGuest`,
                              e.target.checked ? "true" : "false"
                            )
                          }
                          className='mr-2'
                        />
                        <span className='text-sm text-gray-600'>
                          Primary Guest
                        </span>
                      </label>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                          First Name *
                        </label>
                        <input
                          type='text'
                          value={guest.firstName}
                          onChange={(e) =>
                            handleInputChange(
                              `guest.${index}.firstName`,
                              e.target.value
                            )
                          }
                          className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                          placeholder='Enter first name'
                        />
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                          Last Name *
                        </label>
                        <input
                          type='text'
                          value={guest.lastName}
                          onChange={(e) =>
                            handleInputChange(
                              `guest.${index}.lastName`,
                              e.target.value
                            )
                          }
                          className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                          placeholder='Enter last name'
                        />
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                          Age
                        </label>
                        <input
                          type='number'
                          value={guest.age || ""}
                          onChange={(e) =>
                            handleInputChange(
                              `guest.${index}.age`,
                              e.target.value
                            )
                          }
                          className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                          placeholder='Enter age'
                          min='1'
                          max='120'
                        />
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                          ID Proof Type
                        </label>
                        <select
                          value={guest.idProofType || ""}
                          onChange={(e) =>
                            handleInputChange(
                              `guest.${index}.idProofType`,
                              e.target.value
                            )
                          }
                          className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                        >
                          <option value=''>Select ID Proof Type</option>
                          {ID_PROOF_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {guest.idProofType && (
                        <div className='md:col-span-2'>
                          <label className='block text-sm font-medium text-gray-700 mb-1'>
                            ID Proof Number
                          </label>
                          <input
                            type='text'
                            value={guest.idProofNumber || ""}
                            onChange={(e) =>
                              handleInputChange(
                                `guest.${index}.idProofNumber`,
                                e.target.value
                              )
                            }
                            className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                            placeholder={`Enter ${guest.idProofType} number`}
                          />
                        </div>
                      )}

                      <div className='md:col-span-2'>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                          Special Requests
                        </label>
                        <textarea
                          value={guest.specialRequests || ""}
                          onChange={(e) =>
                            handleInputChange(
                              `guest.${index}.specialRequests`,
                              e.target.value
                            )
                          }
                          rows={2}
                          maxLength={200}
                          className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                          placeholder='Any special requests for this guest (max 200 characters)'
                        />
                        <div className='text-xs text-gray-500 mt-1'>
                          {(guest.specialRequests || "").length}/200 characters
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Requests */}
              <div className='space-y-4 mt-6'>
                <h3 className='text-lg font-medium text-gray-900'>
                  General Special Requests (Optional)
                </h3>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) =>
                    handleInputChange("specialRequests", e.target.value)
                  }
                  rows={3}
                  maxLength={500}
                  className='w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white'
                  placeholder='Any special requests or preferences for your entire stay (max 500 characters)'
                />
                <div className='text-xs text-gray-500'>
                  {(formData.specialRequests || "").length}/500 characters
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Price Summary */}
          <div className='space-y-6'>
            <div className='bg-white border border-gray-200 p-6'>
              <h3 className='text-lg font-medium mb-4 text-gray-900'>
                Price Summary
              </h3>

              <div className='space-y-3 text-gray-700'>
                <div className='flex justify-between'>
                  <span>
                    ₹{priceDetails.pricePerNight.toLocaleString()} ×{" "}
                    {priceDetails.nights} nights
                  </span>
                  <span>₹{priceDetails.totalPrice.toLocaleString()}</span>
                </div>

                <div className='flex justify-between'>
                  <span>Taxes & Fees</span>
                  <span>₹{priceDetails.taxes.toLocaleString()}</span>
                </div>

                <hr className='my-3' />

                <div className='flex justify-between text-lg font-medium text-gray-900'>
                  <span>Total Amount</span>
                  <span>₹{priceDetails.finalAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={createBooking}
                disabled={bookingLoading || !razorpayLoaded}
                className='w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 font-medium disabled:opacity-50'
              >
                {!razorpayLoaded
                  ? "Loading Payment System..."
                  : bookingLoading
                  ? "Creating Booking & Processing Payment..."
                  : "Create Booking & Pay Now"}
              </button>

              <div className='mt-4 text-xs text-gray-500'>
                <p>
                  By clicking "Create Booking & Pay Now", you agree to our terms
                  and conditions.
                </p>
                <p className='mt-2'>✅ Secure payment powered by Razorpay</p>
                <p className='mt-1'>
                  🔒 Room reserved only during payment process
                </p>
                {!razorpayLoaded && (
                  <p className='mt-1 text-orange-600'>
                    ⏳ Loading payment gateway...
                  </p>
                )}
              </div>
            </div>

            {/* Room Amenities */}
            <div className='bg-white border border-gray-200 p-6'>
              <h3 className='text-lg font-medium mb-4 text-gray-900'>
                Room Amenities
              </h3>
              <div className='space-y-2'>
                {room.amenities.map((amenity) => (
                  <div key={amenity} className='flex items-center'>
                    <svg
                      className='h-4 w-4 text-gray-600 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    <span className='text-sm capitalize text-gray-700'>
                      {amenity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
