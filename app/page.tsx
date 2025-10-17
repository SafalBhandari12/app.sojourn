"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthService } from "../lib/auth";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchData, setSearchData] = useState({
    location: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setLoading(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();

    if (searchData.location) queryParams.set("location", searchData.location);
    if (searchData.checkIn) queryParams.set("checkIn", searchData.checkIn);
    if (searchData.checkOut) queryParams.set("checkOut", searchData.checkOut);
    if (searchData.guests)
      queryParams.set("guests", searchData.guests.toString());

    router.push(`/hotels?${queryParams.toString()}`);
  };

  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const getMinCheckOutDate = () => {
    if (!searchData.checkIn) return getMinDate();
    const checkInDate = new Date(searchData.checkIn);
    checkInDate.setDate(checkInDate.getDate() + 1);
    return checkInDate.toISOString().split("T")[0];
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-gray-50 shadow-sm border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <Link href='/' className='inline-flex items-center'>
              <div className='flex items-center'>
                <Image
                  src='/logo.jpg'
                  alt='Sojourn logo'
                  width={60}
                  height={50}
                  priority
                />
                <span className='ml-3 text-sm text-gray-600 font-serif italic'>
                  Your travel companion
                </span>
              </div>
            </Link>
            <div className='flex items-center space-x-8'>
              {/* Authentication Navigation */}
              {loading ? (
                <div className='w-24 h-8 bg-gray-100 animate-pulse rounded'></div>
              ) : isAuthenticated ? (
                <div className='flex items-center space-x-4'>
                  <Link
                    href='/bookings'
                    className='text-gray-500 hover:text-gray-700 font-medium transition-colors'
                  >
                    Your Bookings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className='text-gray-500 hover:text-gray-700 font-medium transition-colors'
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href='/auth'
                  className='text-gray-500 hover:text-gray-700 font-medium transition-colors'
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto text-center'>
          <h1 className='text-4xl md:text-6xl font-light text-gray-700 mb-6 tracking-tight'>
            Find Your Perfect Stay
          </h1>
          <p className='text-xl text-gray-500 mb-12 max-w-2xl mx-auto'>
            Discover exceptional hotels and accommodations for your next journey
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className='bg-gray-50 rounded-lg shadow-lg p-6 max-w-4xl mx-auto'
          >
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              {/* Location */}
              <div className='relative'>
                <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                  <svg
                    className='h-5 w-5 text-gray-400'
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
                </div>
                <input
                  type='text'
                  placeholder='Where to?'
                  value={searchData.location}
                  onChange={(e) =>
                    setSearchData({ ...searchData, location: e.target.value })
                  }
                  className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-gray-700 bg-white'
                />
              </div>

              {/* Check-in */}
              <div className='relative'>
                <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                  <svg
                    className='h-5 w-5 text-gray-400'
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
                </div>
                <input
                  type='date'
                  placeholder='Check-in'
                  value={searchData.checkIn}
                  onChange={(e) =>
                    setSearchData({ ...searchData, checkIn: e.target.value })
                  }
                  min={getMinDate()}
                  className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-gray-700 bg-white'
                />
              </div>

              {/* Check-out */}
              <div className='relative'>
                <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                  <svg
                    className='h-5 w-5 text-gray-400'
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
                </div>
                <input
                  type='date'
                  placeholder='Check-out'
                  value={searchData.checkOut}
                  onChange={(e) =>
                    setSearchData({ ...searchData, checkOut: e.target.value })
                  }
                  min={getMinCheckOutDate()}
                  className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-gray-700 bg-white'
                />
              </div>

              {/* Guests */}
              <div className='relative'>
                <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                  <svg
                    className='h-5 w-5 text-gray-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
                    />
                  </svg>
                </div>
                <select
                  value={searchData.guests}
                  onChange={(e) =>
                    setSearchData({
                      ...searchData,
                      guests: parseInt(e.target.value),
                    })
                  }
                  className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors appearance-none text-gray-700 bg-white'
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "Guest" : "Guests"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type='submit'
              className='w-full md:w-auto mt-6 bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2'
            >
              <svg
                className='h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
              Search Hotels
            </button>
          </form>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-16 bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4'>
                <svg
                  className='h-6 w-6 text-gray-500'
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
              </div>
              <h3 className='text-lg font-semibold text-gray-700 mb-2'>
                Best Locations
              </h3>
              <p className='text-gray-500'>
                Handpicked properties in prime locations worldwide
              </p>
            </div>

            <div className='text-center'>
              <div className='inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4'>
                <svg
                  className='h-6 w-6 text-gray-500'
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
              </div>
              <h3 className='text-lg font-semibold text-gray-700 mb-2'>
                Trusted Booking
              </h3>
              <p className='text-gray-500'>
                Secure payments and verified accommodations
              </p>
            </div>

            <div className='text-center'>
              <div className='inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4'>
                <svg
                  className='h-6 w-6 text-gray-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-700 mb-2'>
                24/7 Support
              </h3>
              <p className='text-gray-500'>
                Round-the-clock assistance for your travel needs
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className='py-16 bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <h2 className='text-3xl font-light text-gray-700 text-center mb-12'>
            Popular Destinations
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {[
              { name: "Mumbai", hotels: "150+ hotels" },
              { name: "Delhi", hotels: "200+ hotels" },
              { name: "Bangalore", hotels: "120+ hotels" },
              { name: "Goa", hotels: "80+ hotels" },
              { name: "Jaipur", hotels: "90+ hotels" },
              { name: "Chennai", hotels: "110+ hotels" },
              { name: "Kolkata", hotels: "85+ hotels" },
              { name: "Hyderabad", hotels: "95+ hotels" },
            ].map((destination) => (
              <Link
                key={destination.name}
                href={`/hotels?location=${destination.name}`}
                className='group bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100'
              >
                <h3 className='text-lg font-semibold text-gray-800 group-hover:text-gray-700 transition-colors'>
                  {destination.name}
                </h3>
                <p className='text-gray-500 text-sm mt-1'>
                  {destination.hotels}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer removed per request */}
    </div>
  );
}
