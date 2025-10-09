"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AuthService } from "../../../../../lib/auth";

interface BookingData {
  hotelId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  guestDetails: {
    primaryGuest: {
      name: string;
      phone: string;
      email: string;
    };
    additionalGuests: Array<{
      name: string;
      age?: number;
    }>;
  };
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

declare global {
  interface Window {
    Razorpay: any;
  }
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

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
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: guests,
    guestDetails: {
      primaryGuest: {
        name: "",
        phone: "",
        email: "",
      },
      additionalGuests: [],
    },
    specialRequests: "",
  });

  useEffect(() => {
    // Check authentication
    if (!AuthService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    fetchBookingDetails();
    setupAdditionalGuests();
  }, [hotelId, roomId]);

  useEffect(() => {
    calculatePricing();
  }, [checkIn, checkOut]);

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
    if (guests > 1) {
      const additionalGuests = Array.from({ length: guests - 1 }, () => ({
        name: "",
        age: undefined,
      }));

      setFormData((prev) => ({
        ...prev,
        guestDetails: {
          ...prev.guestDetails,
          additionalGuests,
        },
      }));
    }
  };

  const calculatePricing = () => {
    if (!checkIn || !checkOut || !room) return;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
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
    if (field.startsWith("primaryGuest.")) {
      const guestField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        guestDetails: {
          ...prev.guestDetails,
          primaryGuest: {
            ...prev.guestDetails.primaryGuest,
            [guestField]: value,
          },
        },
      }));
    } else if (field.startsWith("additionalGuest.")) {
      const [, index, guestField] = field.split(".");
      const guestIndex = parseInt(index);

      setFormData((prev) => ({
        ...prev,
        guestDetails: {
          ...prev.guestDetails,
          additionalGuests: prev.guestDetails.additionalGuests.map((guest, i) =>
            i === guestIndex
              ? {
                  ...guest,
                  [guestField]:
                    guestField === "age" ? parseInt(value) || undefined : value,
                }
              : guest
          ),
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    const { primaryGuest, additionalGuests } = formData.guestDetails;

    if (!primaryGuest.name || !primaryGuest.phone || !primaryGuest.email) {
      alert("Please fill in all primary guest details");
      return false;
    }

    for (let i = 0; i < additionalGuests.length; i++) {
      if (!additionalGuests[i].name) {
        alert(`Please fill in the name for guest ${i + 2}`);
        return false;
      }
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
        // Create payment order
        const paymentResponse = await AuthService.authenticatedFetch(
          `${BACKEND_URL}/api/hotels/bookings/${data.data.id}/payment/create-order`,
          { method: "POST" }
        );

        const paymentData = await paymentResponse.json();

        if (paymentData.success) {
          initiatePayment(paymentData.data, data.data.id);
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

  const initiatePayment = (paymentData: any, bookingId: string) => {
    const options = {
      key: paymentData.key,
      amount: paymentData.amount,
      currency: paymentData.currency,
      name: hotel?.vendor.businessName || "Sojourn",
      description: `Hotel Booking - ${hotel?.hotelName}`,
      order_id: paymentData.orderId,
      prefill: paymentData.prefill,
      theme: paymentData.theme,
      handler: async (response: any) => {
        await verifyPayment(response, bookingId);
      },
      modal: {
        ondismiss: () => {
          console.log("Payment dismissed");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
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

      if (data.success) {
        alert("Payment successful! Your booking has been confirmed.");
        router.push(`/bookings/${bookingId}`);
      } else {
        alert("Payment verification failed. Please contact support.");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Payment verification failed. Please contact support.");
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (!hotel || !room) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            Booking Details Not Found
          </h1>
          <Link href='/hotels' className='text-blue-600 hover:text-blue-700'>
            Back to Hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <Link href='/' className='text-2xl font-bold text-blue-600'>
              Sojourn
            </Link>
            <nav className='hidden md:flex space-x-8'>
              <Link href='/hotels' className='text-blue-600 font-medium'>
                Hotels
              </Link>
              <Link
                href='/dashboard'
                className='text-gray-700 hover:text-blue-600'
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Load Razorpay Script */}
      <script src='https://checkout.razorpay.com/v1/checkout.js'></script>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column - Booking Form */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Booking Details */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-bold mb-4'>Complete Your Booking</h2>

              {/* Hotel & Room Info */}
              <div className='bg-gray-50 rounded-lg p-4 mb-6'>
                <h3 className='font-semibold text-lg'>{hotel.hotelName}</h3>
                <p className='text-gray-600'>{hotel.vendor.businessAddress}</p>
                <div className='mt-2 space-y-1'>
                  <p>
                    <strong>Room:</strong> {room.roomType} (Room{" "}
                    {room.roomNumber})
                  </p>
                  <p>
                    <strong>Check-in:</strong>{" "}
                    {new Date(checkIn).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Check-out:</strong>{" "}
                    {new Date(checkOut).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Guests:</strong> {guests}
                  </p>
                  <p>
                    <strong>Nights:</strong> {priceDetails.nights}
                  </p>
                </div>
              </div>

              {/* Primary Guest Details */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>Primary Guest Details</h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Full Name *
                    </label>
                    <input
                      type='text'
                      value={formData.guestDetails.primaryGuest.name}
                      onChange={(e) =>
                        handleInputChange("primaryGuest.name", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      placeholder='Enter full name'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Phone Number *
                    </label>
                    <input
                      type='tel'
                      value={formData.guestDetails.primaryGuest.phone}
                      onChange={(e) =>
                        handleInputChange("primaryGuest.phone", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      placeholder='Enter phone number'
                    />
                  </div>

                  <div className='md:col-span-2'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Email Address *
                    </label>
                    <input
                      type='email'
                      value={formData.guestDetails.primaryGuest.email}
                      onChange={(e) =>
                        handleInputChange("primaryGuest.email", e.target.value)
                      }
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      placeholder='Enter email address'
                    />
                  </div>
                </div>
              </div>

              {/* Additional Guests */}
              {formData.guestDetails.additionalGuests.length > 0 && (
                <div className='space-y-4 mt-6'>
                  <h3 className='text-lg font-semibold'>
                    Additional Guest Details
                  </h3>

                  {formData.guestDetails.additionalGuests.map(
                    (guest, index) => (
                      <div key={index} className='bg-gray-50 rounded-lg p-4'>
                        <h4 className='font-medium mb-3'>Guest {index + 2}</h4>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                              Full Name *
                            </label>
                            <input
                              type='text'
                              value={guest.name}
                              onChange={(e) =>
                                handleInputChange(
                                  `additionalGuest.${index}.name`,
                                  e.target.value
                                )
                              }
                              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              placeholder='Enter full name'
                            />
                          </div>

                          <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                              Age (Optional)
                            </label>
                            <input
                              type='number'
                              value={guest.age || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  `additionalGuest.${index}.age`,
                                  e.target.value
                                )
                              }
                              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              placeholder='Enter age'
                              min='1'
                              max='120'
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Special Requests */}
              <div className='space-y-4 mt-6'>
                <h3 className='text-lg font-semibold'>
                  Special Requests (Optional)
                </h3>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) =>
                    handleInputChange("specialRequests", e.target.value)
                  }
                  rows={3}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  placeholder='Any special requests or preferences...'
                />
              </div>
            </div>
          </div>

          {/* Right Column - Price Summary */}
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-lg font-bold mb-4'>Price Summary</h3>

              <div className='space-y-3'>
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

                <div className='flex justify-between text-lg font-bold'>
                  <span>Total Amount</span>
                  <span>₹{priceDetails.finalAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={createBooking}
                disabled={bookingLoading}
                className='w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50'
              >
                {bookingLoading ? "Processing..." : "Proceed to Payment"}
              </button>

              <div className='mt-4 text-xs text-gray-500'>
                <p>
                  By clicking "Proceed to Payment", you agree to our terms and
                  conditions.
                </p>
                <p className='mt-2'>Secure payment powered by Razorpay</p>
              </div>
            </div>

            {/* Room Amenities */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-lg font-bold mb-4'>Room Amenities</h3>
              <div className='space-y-2'>
                {room.amenities.map((amenity) => (
                  <div key={amenity} className='flex items-center'>
                    <span className='text-green-500 mr-2'>✓</span>
                    <span className='text-sm capitalize'>{amenity}</span>
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
