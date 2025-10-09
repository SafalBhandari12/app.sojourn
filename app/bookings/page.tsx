"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthService } from "../../lib/auth";

interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  booking: {
    id: string;
    bookingType: string;
    status: string;
    payment?: {
      paymentStatus: string;
      paymentMethod: string;
      razorpayPaymentId: string;
      processedAt: string;
    };
  };
  hotelProfile: {
    hotelName: string;
    vendor: {
      businessName: string;
      businessAddress: string;
      contactNumbers: string[];
    };
  };
  room: {
    roomType: string;
    roomNumber: string;
  };
  canCancel: boolean;
  canModify: boolean;
  createdAt: string;
}

interface BookingSummary {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchBookings();
  }, [selectedStatus, pagination.page]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(selectedStatus && { status: selectedStatus }),
      });

      const response = await AuthService.authenticatedFetch(
        `${BACKEND_URL}/api/hotels/bookings?${queryParams}`
      );
      const data = await response.json();

      if (data.success) {
        setBookings(data.data.bookings);
        setSummary(data.data.summary);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

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
        alert("Booking cancelled successfully");
        fetchBookings(); // Refresh the list
      } else {
        alert(data.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
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
      month: "short",
      year: "numeric",
    });
  };

  const isUpcoming = (checkInDate: string) => {
    return new Date(checkInDate) > new Date();
  };

  if (loading && bookings.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
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

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Page Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>My Bookings</h1>
          <p className='text-gray-600'>
            Manage your hotel reservations and travel history
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <div className='text-center'>
                <div className='text-3xl font-bold text-blue-600'>
                  {summary.totalBookings}
                </div>
                <div className='text-sm text-gray-600'>Total Bookings</div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <div className='text-center'>
                <div className='text-3xl font-bold text-green-600'>
                  {summary.upcomingBookings}
                </div>
                <div className='text-sm text-gray-600'>Upcoming</div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <div className='text-center'>
                <div className='text-3xl font-bold text-purple-600'>
                  {summary.completedBookings}
                </div>
                <div className='text-sm text-gray-600'>Completed</div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <div className='text-center'>
                <div className='text-3xl font-bold text-gray-900'>
                  ₹{summary.totalSpent.toLocaleString()}
                </div>
                <div className='text-sm text-gray-600'>Total Spent</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <div className='flex flex-wrap gap-4 items-center'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value=''>All Bookings</option>
                <option value='PENDING'>Pending</option>
                <option value='CONFIRMED'>Confirmed</option>
                <option value='COMPLETED'>Completed</option>
                <option value='CANCELLED'>Cancelled</option>
              </select>
            </div>

            <div className='flex-1'></div>

            <Link
              href='/hotels'
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium'
            >
              Book New Hotel
            </Link>
          </div>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md p-12 text-center'>
            <div className='text-6xl mb-4'>🏨</div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              No Bookings Found
            </h2>
            <p className='text-gray-600 mb-6'>
              {selectedStatus
                ? `No bookings found with status "${selectedStatus}"`
                : "You haven't made any bookings yet. Start exploring hotels!"}
            </p>
            <Link
              href='/hotels'
              className='inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium'
            >
              Explore Hotels
            </Link>
          </div>
        ) : (
          <div className='space-y-6'>
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className='bg-white rounded-lg shadow-md overflow-hidden'
              >
                <div className='p-6'>
                  <div className='flex justify-between items-start mb-4'>
                    <div>
                      <h3 className='text-xl font-bold text-gray-900 mb-2'>
                        {booking.hotelProfile.hotelName}
                      </h3>
                      <p className='text-gray-600'>
                        📍 {booking.hotelProfile.vendor.businessAddress}
                      </p>
                    </div>

                    <div className='text-right'>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                      {booking.booking.payment && (
                        <div className='mt-2 text-sm text-gray-600'>
                          Payment: {booking.booking.payment.paymentStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-4'>
                    <div>
                      <div className='text-sm font-medium text-gray-700'>
                        Check-in
                      </div>
                      <div className='text-lg'>
                        {formatDate(booking.checkInDate)}
                      </div>
                    </div>

                    <div>
                      <div className='text-sm font-medium text-gray-700'>
                        Check-out
                      </div>
                      <div className='text-lg'>
                        {formatDate(booking.checkOutDate)}
                      </div>
                    </div>

                    <div>
                      <div className='text-sm font-medium text-gray-700'>
                        Room & Guests
                      </div>
                      <div className='text-lg'>
                        {booking.room.roomType} • {booking.numberOfGuests}{" "}
                        guests
                      </div>
                      <div className='text-sm text-gray-600'>
                        Room {booking.room.roomNumber}
                      </div>
                    </div>

                    <div>
                      <div className='text-sm font-medium text-gray-700'>
                        Total Amount
                      </div>
                      <div className='text-lg font-bold'>
                        ₹{booking.totalAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-between items-center pt-4 border-t'>
                    <div className='text-sm text-gray-600'>
                      Booked on {formatDate(booking.createdAt)}
                    </div>

                    <div className='flex space-x-3'>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium'
                      >
                        View Details
                      </Link>

                      {booking.canCancel && isUpcoming(booking.checkInDate) && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium'
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className='flex justify-center mt-8'>
            <div className='flex space-x-2'>
              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => setPagination((prev) => ({ ...prev, page }))}
                  className={`px-3 py-2 rounded ${
                    page === pagination.page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
