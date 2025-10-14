"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AuthService } from "../../../lib/auth";

interface Hotel {
  id: string;
  hotelName: string;
  category: string;
  totalRooms?: number;
  amenities?: string[];
  cancellationPolicy?: string;
  checkInTime?: string;
  checkOutTime?: string;
  vendor?: {
    businessName?: string;
    ownerName?: string;
    businessAddress?: string;
    contactNumbers?: string[];
    email?: string;
    images?: Array<{
      id: string;
      imageUrl: string;
      thumbnailUrl: string;
      description: string;
      isPrimary: boolean;
      imageType: string;
    }>;
  };
  rooms?: Array<{
    id: string;
    roomType: string;
    roomNumber: string;
    capacity: number;
    basePrice: number;
    summerPrice: number;
    winterPrice: number;
    amenities: string[];
    isAvailable: boolean;
    images: Array<{
      id: string;
      imageUrl: string;
      description: string;
      isPrimary: boolean;
    }>;
  }>;
  location?: {
    googleMapsLink: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  avgRating?: number;
  totalReviews?: number;
}

interface RoomAvailability {
  id: string;
  roomType: string;
  roomNumber: string;
  capacity: number;
  pricePerNight?: number;
  totalPrice?: number;
  amenities?: string[];
  images?: Array<{
    imageUrl: string;
    isPrimary: boolean;
  }>;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://sojournbackend.onrender.com";

export default function HotelDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = params.id as string;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  // Removed unused showBookingModal and selectedRoom states

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setAuthLoading(false);
    };

    checkAuth();

    // Listen for storage events to update auth status across tabs
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSignOut = () => {
    AuthService.clearAuthData();
    setIsAuthenticated(false);
    window.location.reload();
  };

  // Read URL parameters and set form values
  useEffect(() => {
    const urlCheckIn = searchParams.get("checkIn");
    const urlCheckOut = searchParams.get("checkOut");
    const urlGuests = searchParams.get("guests");

    if (urlCheckIn) setCheckIn(urlCheckIn);
    if (urlCheckOut) setCheckOut(urlCheckOut);
    if (urlGuests) setGuests(parseInt(urlGuests));
  }, [searchParams]);

  const fetchHotelDetails = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/hotels/${hotelId}`);
      const data = await response.json();

      console.log("Hotel Details API Response:", data);

      if (data.success) {
        setHotel(data.data);
      } else {
        console.error("Hotel Details API Error:", data.message);
      }
    } catch (error) {
      console.error("Error fetching hotel details:", error);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const checkAvailability = useCallback(async () => {
    if (!checkIn || !checkOut || !guests) return;

    setAvailabilityLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/hotels/${hotelId}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableRooms(data.data.availableRooms);
      }
    } catch (error) {
      console.error("Error checking availability:", error);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [checkIn, checkOut, guests, hotelId]);

  useEffect(() => {
    fetchHotelDetails();
  }, [fetchHotelDetails]);

  useEffect(() => {
    if (checkIn && checkOut && guests) {
      checkAvailability();
    }
  }, [checkIn, checkOut, guests, checkAvailability]);

  const handleBookRoom = (room: RoomAvailability) => {
    // Check if user is authenticated
    if (!AuthService.isAuthenticated()) {
      const returnUrl = `/hotels/${hotelId}/book/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;

      // Store return URL in localStorage as backup
      AuthService.setReturnUrl(returnUrl);

      // Redirect to auth with return URL as query param (primary method)
      router.push(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Navigate directly to booking page
    router.push(
      `/hotels/${hotelId}/book/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
    );
  };

  // Removed unused getRatingStars function

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateSeasonalPrice = (
    room: { summerPrice?: number; winterPrice?: number; basePrice?: number },
    checkInDate?: string
  ): number | undefined => {
    if (
      room.basePrice == null &&
      room.summerPrice == null &&
      room.winterPrice == null
    ) {
      return undefined;
    }

    const pick = (isSummer: boolean) => {
      return isSummer
        ? room.summerPrice ?? room.basePrice ?? undefined
        : room.winterPrice ?? room.basePrice ?? undefined;
    };

    if (!checkInDate) {
      const currentMonth = new Date().getMonth() + 1;
      const isSummer = currentMonth >= 4 && currentMonth <= 9;
      return pick(isSummer);
    }

    const checkIn = new Date(checkInDate);
    const month = checkIn.getMonth() + 1; // getMonth() returns 0-11
    const isSummer = month >= 4 && month <= 9;
    return pick(isSummer);
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900 mx-auto mb-4'></div>
          <p className='text-gray-600 text-lg'>Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100'>
        <div className='text-center'>
          <div className='bg-white rounded-2xl shadow-lg p-8 max-w-md'>
            <svg
              className='w-16 h-16 text-gray-400 mx-auto mb-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
              />
            </svg>
            <h1 className='text-2xl font-bold text-gray-900 mb-4'>
              Hotel Not Found
            </h1>
            <p className='text-gray-600 mb-6'>
              The hotel you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link
              href='/hotels'
              className='bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block'
            >
              Back to Hotels
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <Link
              href='/'
              className='text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors'
            >
              Sojourn
            </Link>

            {/* Authentication Navigation */}
            <div className='flex items-center space-x-4'>
              {authLoading ? (
                <div className='w-24 h-8 bg-gray-200 animate-pulse rounded'></div>
              ) : isAuthenticated ? (
                <div className='flex items-center space-x-4'>
                  <Link
                    href='/bookings'
                    className='text-gray-700 hover:text-gray-900 font-medium transition-colors'
                  >
                    Your Bookings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className='text-gray-700 hover:text-red-600 font-medium transition-colors'
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href='/auth'
                  className='bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md'
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <nav className='text-sm text-gray-500'>
            <Link href='/' className='hover:text-gray-700 transition-colors'>
              Home
            </Link>
            <span className='mx-2 text-gray-300'>/</span>
            <Link
              href='/hotels'
              className='hover:text-gray-700 transition-colors'
            >
              Hotels
            </Link>
            <span className='mx-2 text-gray-300'>/</span>
            <span className='text-gray-900 font-medium'>{hotel.hotelName}</span>
          </nav>
        </div>
      </div>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Hotel Header - More Compact */}
        <div className='bg-white rounded-2xl shadow-lg mb-6 overflow-hidden'>
          <div className='bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6'>
            <div className='flex justify-between items-start mb-4'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-3'>
                  <h1 className='text-4xl font-bold text-white mb-4 leading-tight'>
                    {hotel.hotelName}
                  </h1>
                  <span className='bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-semibold'>
                    {hotel.category}
                  </span>
                </div>

                <div className='flex items-center text-gray-300'>
                  <svg
                    className='w-5 h-5 mr-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                    />
                  </svg>
                  <span>
                    {hotel.vendor?.businessAddress || "Address not available"}
                  </span>
                  {hotel.location?.googleMapsLink && (
                    <a
                      href={hotel.location.googleMapsLink}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='ml-3 text-blue-300 hover:text-blue-200 text-sm underline'
                    >
                      View on Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date Selection - More Compact */}
          <div className='p-6'>
            <div className='bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5'>
              <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center'>
                <svg
                  className='w-6 h-6 mr-2 text-gray-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
                Check Availability
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Check In
                  </label>
                  <input
                    type='date'
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className='w-full px-4 py-3 border border-gray-300 text-black rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all bg-white shadow-sm'
                  />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Check Out
                  </label>
                  <input
                    type='date'
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || new Date().toISOString().split("T")[0]}
                    className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 text-black focus:border-gray-500 transition-all bg-white shadow-sm'
                  />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-2'>
                    Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all bg-white shadow-sm text-black'
                  >
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} Guest{num > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='flex items-end'>
                  <button
                    onClick={checkAvailability}
                    disabled={!checkIn || !checkOut || availabilityLoading}
                    className='w-full bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 '
                  >
                    {availabilityLoading ? (
                      <span className='flex items-center justify-center text-white'>
                        <svg
                          className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                          ></circle>
                          <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          ></path>
                        </svg>
                        Checking...
                      </span>
                    ) : (
                      "Check Availability"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Cards - Better Space Utilization */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          {hotel.totalRooms && (
            <div className='bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100'>
              <div className='text-2xl font-bold text-gray-900'>
                {hotel.totalRooms}
              </div>
              <div className='text-xs text-gray-600 uppercase tracking-wider'>
                Total Rooms
              </div>
            </div>
          )}
          {hotel.checkInTime && (
            <div className='bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100'>
              <div className='text-lg font-semibold text-gray-900'>
                {hotel.checkInTime}
              </div>
              <div className='text-xs text-gray-600 uppercase tracking-wider'>
                Check-in
              </div>
            </div>
          )}
          {hotel.checkOutTime && (
            <div className='bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100'>
              <div className='text-lg font-semibold text-gray-900'>
                {hotel.checkOutTime}
              </div>
              <div className='text-xs text-gray-600 uppercase tracking-wider'>
                Check-out
              </div>
            </div>
          )}
          {hotel.vendor?.contactNumbers?.[0] && (
            <div className='bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100'>
              <div className='text-sm font-semibold text-gray-900'>
                {hotel.vendor.contactNumbers[0]}
              </div>
              <div className='text-xs text-gray-600 uppercase tracking-wider'>
                Contact
              </div>
            </div>
          )}
        </div>

        {/* Amenities Preview */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className='bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100'>
            <h3 className='text-sm font-medium text-gray-900 mb-3 uppercase tracking-wider'>
              Popular Amenities
            </h3>
            <div className='flex flex-wrap gap-2'>
              {hotel.amenities.slice(0, 8).map((amenity) => (
                <span
                  key={amenity}
                  className='bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium capitalize rounded-full'
                >
                  {amenity}
                </span>
              ))}
              {hotel.amenities.length > 8 && (
                <span className='text-gray-600 text-xs px-3 py-1 bg-gray-50 rounded-full'>
                  +{hotel.amenities.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column - Images and Details */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Image Gallery */}
            <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
              <div className='relative h-96 bg-gradient-to-br from-gray-100 to-gray-200'>
                {hotel.vendor?.images?.[selectedImageIndex]?.imageUrl && (
                  <Image
                    src={hotel.vendor.images[selectedImageIndex].imageUrl}
                    alt={
                      hotel.vendor.images[selectedImageIndex]?.description ||
                      hotel.hotelName ||
                      "Hotel Image"
                    }
                    fill
                    className='object-cover transition-all duration-300 hover:scale-105'
                    priority
                  />
                )}
                {!hotel.vendor?.images?.[selectedImageIndex]?.imageUrl && (
                  <div className='absolute inset-0 flex items-center justify-center bg-gray-100'>
                    <div className='text-center text-gray-500'>
                      <svg
                        className='w-16 h-16 mx-auto mb-4 text-gray-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={1.5}
                          d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                        />
                      </svg>
                      <p className='text-sm'>No image available</p>
                    </div>
                  </div>
                )}
                <div className='absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium'>
                  {selectedImageIndex + 1} / {hotel.vendor?.images?.length || 0}
                </div>
              </div>
              {hotel.vendor?.images && hotel.vendor.images.length > 0 && (
                <div className='p-6'>
                  <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                    Gallery
                  </h3>
                  <div className='grid grid-cols-4 gap-3'>
                    {hotel.vendor.images.slice(0, 8).map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                          selectedImageIndex === index
                            ? "border-blue-500 shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {image.thumbnailUrl &&
                        image.thumbnailUrl.trim() !== "" ? (
                          <Image
                            src={image.thumbnailUrl}
                            alt={
                              image.description || `Hotel image ${index + 1}`
                            }
                            fill
                            className='object-cover'
                          />
                        ) : image.imageUrl && image.imageUrl.trim() !== "" ? (
                          <Image
                            src={image.imageUrl}
                            alt={
                              image.description || `Hotel image ${index + 1}`
                            }
                            fill
                            className='object-cover'
                          />
                        ) : (
                          <div className='absolute inset-0 flex items-center justify-center bg-gray-100'>
                            <svg
                              className='w-6 h-6 text-gray-400'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                              />
                            </svg>
                          </div>
                        )}
                        {selectedImageIndex === index && (
                          <div className='absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center'>
                            <div className='w-3 h-3 bg-white rounded-full'></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hotel Description */}
            <div className='bg-white rounded-xl shadow-lg p-8'>
              <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
                <svg
                  className='w-6 h-6 mr-3 text-gray-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                  />
                </svg>
                About {hotel.hotelName}
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5'>
                  <h3 className='font-bold text-gray-900 mb-4 flex items-center'>
                    <svg
                      className='w-5 h-5 mr-2 text-gray-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    Property Details
                  </h3>
                  <ul className='space-y-3'>
                    {hotel.totalRooms && (
                      <li className='flex items-center text-gray-700'>
                        <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
                        {hotel.totalRooms} rooms available
                      </li>
                    )}
                    {hotel.checkInTime && (
                      <li className='flex items-center text-gray-700'>
                        <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
                        Check-in: {hotel.checkInTime}
                      </li>
                    )}
                    {hotel.checkOutTime && (
                      <li className='flex items-center text-gray-700'>
                        <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
                        Check-out: {hotel.checkOutTime}
                      </li>
                    )}
                    {hotel.category && (
                      <li className='flex items-center text-gray-700'>
                        <span className='w-2 h-2 bg-green-500 rounded-full mr-3'></span>
                        Property type: {hotel.category.toLowerCase()}
                      </li>
                    )}
                  </ul>
                </div>
                <div className='bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-5'>
                  <h3 className='font-bold text-gray-900 mb-4 flex items-center'>
                    <svg
                      className='w-5 h-5 mr-2 text-blue-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                      />
                    </svg>
                    Contact Information
                  </h3>
                  <ul className='space-y-3'>
                    {hotel.vendor?.contactNumbers &&
                      hotel.vendor.contactNumbers.length > 0 && (
                        <li className='flex items-center text-gray-700'>
                          <span className='w-2 h-2 bg-blue-500 rounded-full mr-3'></span>
                          📞 {hotel.vendor.contactNumbers.join(", ")}
                        </li>
                      )}
                    {hotel.vendor?.email && (
                      <li className='flex items-center text-gray-700'>
                        <span className='w-2 h-2 bg-blue-500 rounded-full mr-3'></span>
                        ✉️ {hotel.vendor.email}
                      </li>
                    )}
                    {hotel.vendor?.businessName && (
                      <li className='flex items-center text-gray-700'>
                        <span className='w-2 h-2 bg-blue-500 rounded-full mr-3'></span>
                        🏢 {hotel.vendor.businessName}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column - Amenities and Policies */}
            <div className='lg:col-span-1 space-y-6'>
              {/* Amenities */}
              <div className='bg-white rounded-xl shadow-lg p-8'>
                <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
                  <svg
                    className='w-6 h-6 mr-3 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  Amenities
                </h2>
                {hotel.amenities && hotel.amenities.length > 0 ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {hotel.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className='bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 flex items-center border border-green-100'
                      >
                        <div className='w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-4'>
                          <span className='text-white font-bold'>✓</span>
                        </div>
                        <span className='text-gray-800 font-medium capitalize'>
                          {amenity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <div className='bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                      <svg
                        className='w-8 h-8 text-gray-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        />
                      </svg>
                    </div>
                    <p className='text-gray-500'>No amenities listed</p>
                  </div>
                )}
              </div>

              {/* Policies */}
              <div className='bg-white rounded-xl shadow-lg p-8'>
                <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
                  <svg
                    className='w-6 h-6 mr-3 text-blue-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    />
                  </svg>
                  Hotel Policies
                </h2>
                <div className='bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6'>
                  <div>
                    <h3 className='font-bold text-gray-900 mb-3 flex items-center'>
                      <svg
                        className='w-5 h-5 mr-2 text-blue-600'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      Cancellation Policy
                    </h3>
                    <p className='text-gray-700 leading-relaxed'>
                      {hotel.cancellationPolicy ||
                        "Cancellation policy information is not available for this property. Please contact the hotel directly for details."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Rooms Section */}
          <div className='mt-8'>
            <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
              <div className='bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5'>
                <h2 className='text-xl font-bold flex items-center'>
                  <svg
                    className='w-6 h-6 mr-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                    />
                  </svg>
                  Available Rooms
                </h2>
                {checkIn && checkOut && (
                  <p className='text-gray-300 mt-2'>
                    {calculateNights()} night
                    {calculateNights() !== 1 ? "s" : ""} • {checkIn} to{" "}
                    {checkOut}
                  </p>
                )}
              </div>

              <div className='p-6'>
                {availabilityLoading ? (
                  <div className='text-center py-12'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-4 border-gray-900 mx-auto mb-4'></div>
                    <p className='text-gray-600 text-lg'>
                      Checking availability...
                    </p>
                  </div>
                ) : checkIn && checkOut && availableRooms.length === 0 ? (
                  <div className='text-center py-12'>
                    <div className='bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                      <svg
                        className='w-8 h-8 text-red-500'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M6 18L18 6M6 6l12 12'
                        />
                      </svg>
                    </div>
                    <p className='text-gray-600 text-lg mb-2'>
                      No Rooms Available
                    </p>
                    <p className='text-gray-500 text-sm'>
                      No rooms are available for your selected dates. Try
                      different dates.
                    </p>
                  </div>
                ) : checkIn &&
                  checkOut &&
                  availableRooms.length > 0 &&
                  availableRooms.some(
                    (room) => room.pricePerNight && room.pricePerNight > 0
                  ) ? (
                  // Show availability API results when they have proper pricing
                  <div className='space-y-6'>
                    {availableRooms.map((room) => (
                      <div
                        key={room.id}
                        className='bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
                      >
                        <div className='flex justify-between items-start mb-4'>
                          <div className='flex-1'>
                            <div className='flex items-center justify-between mb-3'>
                              <h3 className='text-xl font-bold text-gray-900'>
                                {room.roomType}
                              </h3>
                              <span className='bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium'>
                                Room {room.roomNumber}
                              </span>
                            </div>
                            <div className='flex items-center text-gray-600 mb-3'>
                              <svg
                                className='w-5 h-5 mr-2'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                                />
                              </svg>
                              <span>Up to {room.capacity} guests</span>
                            </div>
                          </div>
                          {room.images &&
                            room.images.length > 0 &&
                            room.images[0] && (
                              <div className='relative w-20 h-20 rounded-lg overflow-hidden shadow-md ml-4'>
                                <Image
                                  src={room.images[0].imageUrl}
                                  alt={room.roomType}
                                  fill
                                  className='object-cover'
                                />
                              </div>
                            )}
                        </div>

                        <div className='mb-4'>
                          <h4 className='font-semibold text-gray-900 mb-2'>
                            Room Amenities
                          </h4>
                          <div className='flex flex-wrap gap-2'>
                            {room.amenities && room.amenities.length > 0 ? (
                              <>
                                {room.amenities.slice(0, 4).map((amenity) => (
                                  <span
                                    key={amenity}
                                    className='bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium'
                                  >
                                    {amenity}
                                  </span>
                                ))}
                                {room.amenities.length > 4 && (
                                  <span className='text-gray-500 text-xs font-medium px-3 py-1'>
                                    +{room.amenities.length - 4} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className='text-gray-500 text-xs'>
                                No amenities listed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className='border-t border-gray-200 pt-4'>
                          <div className='flex justify-between items-center'>
                            <div className='flex-1'>
                              <div className='flex items-baseline gap-2 mb-1'>
                                <span className='text-2xl font-bold text-gray-900'>
                                  ₹
                                  {room.pricePerNight && room.pricePerNight > 0
                                    ? room.pricePerNight.toLocaleString()
                                    : "Price on request"}
                                </span>
                                <span className='text-gray-500 text-sm'>
                                  {room.pricePerNight && room.pricePerNight > 0
                                    ? "per night"
                                    : ""}
                                </span>
                              </div>
                              {calculateNights() > 0 &&
                                room.totalPrice &&
                                room.totalPrice > 0 && (
                                  <div className='bg-gray-100 rounded-lg p-3 mt-2'>
                                    <div className='text-sm text-gray-600 mb-1'>
                                      {calculateNights()} night
                                      {calculateNights() !== 1 ? "s" : ""} total
                                    </div>
                                    <div className='text-lg font-bold text-gray-900'>
                                      ₹{room.totalPrice.toLocaleString()}
                                    </div>
                                  </div>
                                )}
                            </div>
                            <button
                              onClick={() => handleBookRoom(room)}
                              className='bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ml-4'
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show hotel rooms with calculated seasonal pricing when no dates selected OR when availability API doesn't return proper pricing
                  <div className='space-y-6'>
                    {!checkIn || !checkOut ? (
                      <div className='text-center py-4 mb-4'>
                        <div className='bg-blue-50 rounded-lg p-4'>
                          <p className='text-blue-800 font-medium'>
                            Select dates to check availability and get exact
                            pricing
                          </p>
                          <p className='text-blue-600 text-sm mt-1'>
                            Showing seasonal pricing for reference
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='text-center py-4 mb-4'>
                        <div className='bg-amber-50 rounded-lg p-4'>
                          <p className='text-amber-800 font-medium'>
                            Showing available rooms with seasonal pricing
                          </p>
                          <p className='text-amber-600 text-sm mt-1'>
                            Prices calculated based on your selected dates
                          </p>
                        </div>
                      </div>
                    )}
                    {hotel.rooms && hotel.rooms.length > 0 ? (
                      hotel.rooms.map((room) => {
                        const seasonalPrice = calculateSeasonalPrice(
                          room,
                          checkIn
                        );
                        const nights = calculateNights();
                        const totalPrice =
                          nights > 0 && seasonalPrice
                            ? seasonalPrice * nights
                            : undefined;

                        return (
                          <div
                            key={room.id}
                            className='bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
                          >
                            <div className='flex justify-between items-start mb-4'>
                              <div className='flex-1'>
                                <div className='flex items-center justify-between mb-3'>
                                  <h3 className='text-xl font-bold text-gray-900'>
                                    {room.roomType}
                                  </h3>
                                  <span className='bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium'>
                                    Room {room.roomNumber}
                                  </span>
                                </div>
                                <div className='flex items-center text-gray-600 mb-3'>
                                  <svg
                                    className='w-5 h-5 mr-2'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                                    />
                                  </svg>
                                  <span>Up to {room.capacity} guests</span>
                                </div>
                                <div className='flex items-center text-sm text-gray-500 mb-3'>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      room.isAvailable
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {room.isAvailable
                                      ? "Available"
                                      : "Not Available"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className='mb-4'>
                              <h4 className='font-semibold text-gray-900 mb-2'>
                                Room Amenities
                              </h4>
                              <div className='flex flex-wrap gap-2'>
                                {room.amenities && room.amenities.length > 0 ? (
                                  <>
                                    {room.amenities
                                      .slice(0, 4)
                                      .map((amenity) => (
                                        <span
                                          key={amenity}
                                          className='bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium'
                                        >
                                          {amenity}
                                        </span>
                                      ))}
                                    {room.amenities.length > 4 && (
                                      <span className='text-gray-500 text-xs font-medium px-3 py-1'>
                                        +{room.amenities.length - 4} more
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className='text-gray-500 text-xs'>
                                    No amenities listed
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className='border-t border-gray-200 pt-4'>
                              <div className='flex justify-between items-center'>
                                <div className='flex-1'>
                                  {seasonalPrice ? (
                                    <>
                                      <div className='flex items-baseline gap-2 mb-1'>
                                        <span className='text-2xl font-bold text-gray-900'>
                                          ₹
                                          {seasonalPrice
                                            ? seasonalPrice.toLocaleString()
                                            : "Price on request"}
                                        </span>
                                        <span className='text-gray-500 text-sm'>
                                          per night
                                        </span>
                                      </div>
                                      <div className='text-xs text-gray-500 mb-2'>
                                        Base: ₹
                                        {room.basePrice?.toLocaleString() ??
                                          "-"}{" "}
                                        | Summer: ₹
                                        {room.summerPrice?.toLocaleString() ??
                                          "-"}{" "}
                                        | Winter: ₹
                                        {room.winterPrice?.toLocaleString() ??
                                          "-"}
                                      </div>
                                      {typeof totalPrice === "number" && (
                                        <div className='bg-gray-100 rounded-lg p-3 mt-2'>
                                          <div className='text-sm text-gray-600 mb-1'>
                                            {nights} night
                                            {nights !== 1 ? "s" : ""} total
                                          </div>
                                          <div className='text-lg font-bold text-gray-900'>
                                            ₹{totalPrice.toLocaleString()}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className='flex items-baseline gap-2 mb-1'>
                                      <span className='text-2xl font-bold text-gray-900'>
                                        Price on request
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className='ml-4'>
                                  {!checkIn || !checkOut ? (
                                    <div className='text-center'>
                                      <p className='text-sm text-gray-500 mb-2'>
                                        Select dates to book
                                      </p>
                                      <button
                                        onClick={() => {
                                          document
                                            .querySelector('input[type="date"]')
                                            ?.scrollIntoView({
                                              behavior: "smooth",
                                            });
                                        }}
                                        className='bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all'
                                      >
                                        Select Dates
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const roomForBooking = {
                                          id: room.id,
                                          roomType: room.roomType,
                                          roomNumber: room.roomNumber,
                                          capacity: room.capacity,
                                          pricePerNight: seasonalPrice,
                                          totalPrice:
                                            typeof totalPrice === "number"
                                              ? totalPrice
                                              : seasonalPrice,
                                          amenities: room.amenities,
                                        } as RoomAvailability;
                                        handleBookRoom(roomForBooking);
                                      }}
                                      disabled={!room.isAvailable}
                                      className='bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                      {room.isAvailable
                                        ? "Book Now"
                                        : "Not Available"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className='text-center py-12'>
                        <div className='bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4'>
                          <svg
                            className='w-8 h-8 text-gray-400'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                            />
                          </svg>
                        </div>
                        <p className='text-gray-500 text-lg mb-2'>
                          No Rooms Available
                        </p>
                        <p className='text-gray-400 text-sm'>
                          This hotel doesn&apos;t have any rooms configured.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            {hotel.location?.googleMapsLink && (
              <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
                <div className='bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6'>
                  <h2 className='text-xl font-bold flex items-center'>
                    <svg
                      className='w-6 h-6 mr-3'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                      />
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                      />
                    </svg>
                    Location
                  </h2>
                </div>
                <div className='p-6'>
                  <a
                    href={hotel.location.googleMapsLink}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-block bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  >
                    <svg
                      className='w-5 h-5 inline mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                      />
                    </svg>
                    View on Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
