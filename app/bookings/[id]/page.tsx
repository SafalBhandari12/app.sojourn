"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "../../../lib/auth";

interface BookingDetails {
  bookingRef: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  createdAt: string;
  specialRequests?: string;
  guests: Array<{
    firstName: string;
    lastName: string;
    age?: number;
    isPrimaryGuest: boolean;
    specialRequests?: string;
    idProofType?: string;
    idProofNumber?: string;
  }>;
  hotel: {
    name: string;
    category: string;
    address: string;
    contactNumbers: string[];
  };
  room: {
    type: string;
    number: string;
    capacity: number;
    amenities: string[];
  };
  customer: {
    phoneNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    emergencyContact?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  payment?: {
    paymentStatus: string;
    paymentMethod: string;
    totalAmount: number;
    processedAt: string;
  };
  vendor: {
    businessName: string;
    contactNumbers: string[];
  };
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://sojournbackend.onrender.com";

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Helper function to handle authentication errors
  const handleAuthError = (error: unknown) => {
    if (
      error instanceof Error &&
      (error.message.includes("No access token") ||
        error.message.includes("Authentication failed") ||
        error.message.includes("Unable to refresh token"))
    ) {
      // Clear any loading states and redirect
      setLoading(false);
      setCancelling(false);
      
      // Store current URL as return URL
      const returnUrl = window.location.pathname + window.location.search;
      AuthService.setReturnUrl(returnUrl);
      
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Check if user is authenticated before fetching data
    if (!AuthService.isAuthenticated()) {
      const returnUrl = window.location.pathname + window.location.search;
      AuthService.setReturnUrl(returnUrl);
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    fetchBookingDetails();
  }, [bookingId, router]);  const fetchBookingDetails = async () => {
    try {
      const response = await AuthService.authenticatedFetch(
        `${BACKEND_URL}/api/hotels/bookings/${bookingId}`
      );
      const data = await response.json();

      if (data.success) {
        setBooking(data.data);
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);

      // Handle authentication errors
      if (handleAuthError(error)) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel this booking? This action cannot be undone."
      )
    ) {
      return;
    }

    setCancelling(true);
    try {
      const response = await AuthService.authenticatedFetch(
        `${BACKEND_URL}/api/hotels/bookings/${bookingId}/cancel`,
        {
          method: "PATCH",
          body: JSON.stringify({
            reason: "User requested cancellation",
            requestRefund: true,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(
          "Booking cancelled successfully. Refund will be processed within 3-5 business days."
        );
        fetchBookingDetails(); // Refresh the details
      } else {
        alert(data.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);

      // Handle authentication errors
      if (handleAuthError(error)) {
        return;
      }

      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateNights = () => {
    if (!booking) return 0;
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    return Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const isUpcoming = () => {
    if (!booking) return false;
    return new Date(booking.checkInDate) > new Date();
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  // Double-check authentication status before rendering
  if (!AuthService.isAuthenticated()) {
    const returnUrl = window.location.pathname + window.location.search;
    AuthService.setReturnUrl(returnUrl);
    router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-4'>
            Booking Not Found
          </h1>
          <Link href='/bookings' className='text-blue-600 hover:text-blue-700'>
            Back to My Bookings
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
              <Link
                href='/hotels'
                className='text-gray-700 hover:text-blue-600'
              >
                Hotels
              </Link>
              <Link href='/bookings' className='text-blue-600 font-medium'>
                My Bookings
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

      {/* Breadcrumb */}
      <div className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
          <nav className='text-sm text-gray-600'>
            <Link href='/' className='hover:text-blue-600'>
              Home
            </Link>
            <span className='mx-2'>/</span>
            <Link href='/bookings' className='hover:text-blue-600'>
              My Bookings
            </Link>
            <span className='mx-2'>/</span>
            <span className='text-gray-900'>
              {booking?.bookingRef || "Loading..."}
            </span>
          </nav>
        </div>
      </div>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Booking Header */}
        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <div className='flex justify-between items-start mb-4'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                {booking.hotel?.name || "Hotel Name"}
              </h1>
              <p className='text-gray-600'>
                📍 {booking.hotel?.address || "Address not available"}
              </p>
              <div className='mt-2'>
                <span className='text-sm text-gray-500'>
                  Booking Reference:{" "}
                </span>
                <span className='font-mono text-sm'>{booking.bookingRef}</span>
              </div>
            </div>

            <div className='text-right'>
              <span
                className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>
              {booking.payment && (
                <div className='mt-2 text-sm text-gray-600'>
                  Payment: {booking.payment.paymentStatus}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className='flex space-x-3'>
            {isUpcoming() && (
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className='bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50'
              >
                {cancelling ? "Cancelling..." : "Cancel Booking"}
              </button>
            )}

            <button className='bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium'>
              Download Invoice
            </button>

            <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium'>
              Contact Hotel
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column - Booking Details */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Stay Details */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Stay Details</h2>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <h3 className='font-semibold mb-3'>Check-in</h3>
                  <div className='text-lg'>
                    {formatDate(booking.checkInDate)}
                  </div>
                  <div className='text-sm text-gray-600'>
                    Check-in time not available
                  </div>
                </div>

                <div>
                  <h3 className='font-semibold mb-3'>Check-out</h3>
                  <div className='text-lg'>
                    {formatDate(booking.checkOutDate)}
                  </div>
                  <div className='text-sm text-gray-600'>
                    Check-out time not available
                  </div>
                </div>

                <div>
                  <h3 className='font-semibold mb-3'>Duration</h3>
                  <div className='text-lg'>{calculateNights()} nights</div>
                </div>

                <div>
                  <h3 className='font-semibold mb-3'>Guests</h3>
                  <div className='text-lg'>{booking.numberOfGuests} guests</div>
                </div>
              </div>
            </div>

            {/* Room Details */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Room Details</h2>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <h3 className='font-semibold mb-2'>Room Type</h3>
                  <p>{booking.room?.type || "Room type not available"}</p>

                  <h3 className='font-semibold mb-2 mt-4'>Room Number</h3>
                  <p>{booking.room?.number || "Room number not available"}</p>

                  <h3 className='font-semibold mb-2 mt-4'>Capacity</h3>
                  <p>
                    {booking.room?.capacity || "Capacity not available"} guests
                  </p>
                </div>

                <div>
                  <h3 className='font-semibold mb-2'>Room Amenities</h3>
                  <div className='grid grid-cols-2 gap-2'>
                    {booking.room?.amenities?.map((amenity) => (
                      <div key={amenity} className='flex items-center'>
                        <span className='text-green-500 mr-2'>✓</span>
                        <span className='text-sm capitalize'>{amenity}</span>
                      </div>
                    )) || <p className='text-gray-500'>No amenities listed</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Guest Details</h2>

              <div className='space-y-4'>
                {booking.guests?.map((guest, index) => (
                  <div key={index}>
                    <h3 className='font-semibold mb-2'>
                      {guest.isPrimaryGuest
                        ? "Primary Guest"
                        : `Guest ${index + 1}`}
                      {guest.isPrimaryGuest && (
                        <span className='ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full'>
                          Primary
                        </span>
                      )}
                    </h3>
                    <div className='bg-gray-50 rounded-lg p-4'>
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <div>
                          <span className='text-sm text-gray-600'>Name</span>
                          <div className='font-medium'>
                            {guest.firstName} {guest.lastName}
                          </div>
                        </div>
                        {guest.age && (
                          <div>
                            <span className='text-sm text-gray-600'>Age</span>
                            <div className='font-medium'>{guest.age}</div>
                          </div>
                        )}
                        {guest.idProofType && (
                          <div>
                            <span className='text-sm text-gray-600'>
                              ID Proof
                            </span>
                            <div className='font-medium'>
                              {guest.idProofType}
                              {guest.idProofNumber && (
                                <div className='text-sm text-gray-500'>
                                  {guest.idProofNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {guest.specialRequests && (
                          <div className='md:col-span-3'>
                            <span className='text-sm text-gray-600'>
                              Special Requests
                            </span>
                            <div className='font-medium'>
                              {guest.specialRequests}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Customer Details */}
                <div>
                  <h3 className='font-semibold mb-2'>
                    Customer Contact Information
                  </h3>
                  <div className='bg-gray-50 rounded-lg p-4'>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <div>
                        <span className='text-sm text-gray-600'>Name</span>
                        <div className='font-medium'>
                          {booking.customer.firstName}{" "}
                          {booking.customer.lastName}
                        </div>
                      </div>
                      <div>
                        <span className='text-sm text-gray-600'>Phone</span>
                        <div className='font-medium'>
                          {booking.customer.phoneNumber}
                        </div>
                      </div>
                      <div>
                        <span className='text-sm text-gray-600'>Email</span>
                        <div className='font-medium'>
                          {booking.customer.email}
                        </div>
                      </div>
                      {booking.customer.emergencyContact && (
                        <div>
                          <span className='text-sm text-gray-600'>
                            Emergency Contact
                          </span>
                          <div className='font-medium'>
                            {booking.customer.emergencyContact}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div>
                    <h3 className='font-semibold mb-2'>Special Requests</h3>
                    <div className='bg-gray-50 rounded-lg p-4'>
                      <div className='font-medium'>
                        {booking.specialRequests}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Policies */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Hotel Policies</h2>

              <div className='space-y-4'>
                <div>
                  <h3 className='font-semibold mb-2'>Cancellation Policy</h3>
                  <p className='text-sm text-gray-600'>
                    Policy information not available
                  </p>
                </div>

                <div>
                  <h3 className='font-semibold mb-2'>Check-in Policy</h3>
                  <p className='text-sm text-gray-600'>
                    Policy information not available
                  </p>
                </div>

                <div>
                  <h3 className='font-semibold mb-2'>Child Policy</h3>
                  <p className='text-sm text-gray-600'>
                    Policy information not available
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Payment & Contact */}
          <div className='space-y-6'>
            {/* Payment Summary */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Payment Summary</h2>

              <div className='space-y-3'>
                <div className='flex justify-between'>
                  <span>Room charges ({calculateNights()} nights)</span>
                  <span>₹{(booking.totalAmount * 0.88).toLocaleString()}</span>
                </div>

                <div className='flex justify-between'>
                  <span>Taxes & fees</span>
                  <span>₹{(booking.totalAmount * 0.12).toLocaleString()}</span>
                </div>

                <hr className='my-3' />

                <div className='flex justify-between text-lg font-bold'>
                  <span>Total Paid</span>
                  <span>₹{booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {booking.payment && (
                <div className='mt-4 pt-4 border-t'>
                  <h3 className='font-semibold mb-2'>Payment Details</h3>
                  <div className='text-sm space-y-1'>
                    <div>Method: {booking.payment.paymentMethod}</div>
                    <div>Status: {booking.payment.paymentStatus}</div>
                    <div>
                      Processed: {formatDateTime(booking.payment.processedAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hotel Contact */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Hotel Contact</h2>

              <div className='space-y-3'>
                <div>
                  <h3 className='font-semibold'>
                    {booking.vendor?.businessName || "Hotel Contact"}
                  </h3>
                </div>

                <div>
                  <span className='text-sm text-gray-600'>Phone</span>
                  <div>
                    {booking.vendor?.contactNumbers?.join(", ") ||
                      booking.hotel?.contactNumbers?.join(", ") ||
                      "Phone not available"}
                  </div>
                </div>

                <div>
                  <span className='text-sm text-gray-600'>Email</span>
                  <div>Email not available</div>
                </div>

                <div>
                  <span className='text-sm text-gray-600'>Address</span>
                  <div>{booking.hotel?.address || "Address not available"}</div>
                </div>
              </div>
            </div>

            {/* Booking Timeline */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold mb-4'>Booking Timeline</h2>

              <div className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span>Booking created</span>
                  <span>{formatDateTime(booking.createdAt)}</span>
                </div>

                {booking.payment && (
                  <div className='flex justify-between'>
                    <span>Payment completed</span>
                    <span>{formatDateTime(booking.payment.processedAt)}</span>
                  </div>
                )}

                <div className='flex justify-between'>
                  <span>Last updated</span>
                  <span>{formatDateTime(booking.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
