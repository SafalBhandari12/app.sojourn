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
    <div className='min-h-screen bg-gradient-to-br from-green-50 to-emerald-50'>
      {/* Header */}
      <header className='fixed top-0 left-0 right-0 bg-white shadow-lg border-b border-green-100 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <Link href='/' className='flex items-center space-x-3'>
              <Image
                src='/logo.jpg'
                alt='Sojourn logo'
                width={40}
                height={40}
                priority
                className='w-8 h-8 object-contain'
              />
              <span className='text-xl font-semibold text-green-800'>
                Sojourn
              </span>
            </Link>
            <div className='flex items-center space-x-6'>
              {/* Authentication Navigation */}
              {loading ? (
                <div className='w-24 h-10 bg-green-100 animate-pulse rounded-lg'></div>
              ) : isAuthenticated ? (
                <div className='flex items-center space-x-4'>
                  <Link
                    href='/bookings'
                    className='text-green-700 hover:text-green-900 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-green-50'
                  >
                    Your Bookings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className='text-green-700 hover:text-red-600 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-red-50'
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href='/auth'
                  className='bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden'>
        {/* Background decoration */}
        <div className='absolute inset-0 bg-gradient-to-r from-green-100/50 to-emerald-100/50 rounded-full blur-3xl transform -translate-y-1/2 scale-150'></div>

        <div className='max-w-6xl mx-auto text-center relative z-10'>
          <h1 className='text-5xl md:text-7xl font-light text-green-800 mb-8 tracking-tight leading-tight'>
            Find Your Perfect
            <span className='block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-medium'>
              Stay
            </span>
          </h1>
          <p className='text-xl md:text-2xl text-green-700 mb-16 max-w-3xl mx-auto leading-relaxed'>
            Discover exceptional hotels and accommodations for your next journey
            with personalized recommendations
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className='bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-5xl mx-auto border border-green-100'
          >
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
              {/* Location */}
              <div className='relative group'>
                <div className='absolute inset-y-0 left-4 flex items-center pointer-events-none z-10'>
                  <svg
                    className='h-5 w-5 text-green-500 group-focus-within:text-green-600 transition-colors'
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
                  className='w-full pl-12 pr-4 py-4 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-green-800 bg-white placeholder-green-400 hover:border-green-300'
                />
              </div>

              {/* Check-in */}
              <div className='relative group'>
                <div className='absolute inset-y-0 left-4 flex items-center pointer-events-none z-10'>
                  <svg
                    className='h-5 w-5 text-green-500 group-focus-within:text-green-600 transition-colors'
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
                  className='w-full pl-12 pr-4 py-4 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-green-800 bg-white hover:border-green-300'
                />
              </div>

              {/* Check-out */}
              <div className='relative group'>
                <div className='absolute inset-y-0 left-4 flex items-center pointer-events-none z-10'>
                  <svg
                    className='h-5 w-5 text-green-500 group-focus-within:text-green-600 transition-colors'
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
                  className='w-full pl-12 pr-4 py-4 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-green-800 bg-white hover:border-green-300'
                />
              </div>

              {/* Guests */}
              <div className='relative group'>
                <div className='absolute inset-y-0 left-4 flex items-center pointer-events-none z-10'>
                  <svg
                    className='h-5 w-5 text-green-500 group-focus-within:text-green-600 transition-colors'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 515 0z'
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
                  className='w-full pl-12 pr-4 py-4 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all appearance-none text-green-800 bg-white hover:border-green-300'
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
              className='w-full md:w-auto mt-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-12 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg'
            >
              <svg
                className='h-6 w-6'
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
      <section className='py-20 bg-white/60 backdrop-blur-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-light text-green-800 mb-4'>
              Why Choose{" "}
              <span className='font-medium text-emerald-600'>Sojourn</span>
            </h2>
            <p className='text-lg text-green-700 max-w-2xl mx-auto'>
              Experience the difference with our carefully curated services and
              unmatched hospitality
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center group hover:transform hover:scale-105 transition-all duration-300'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl mb-6 group-hover:from-green-200 group-hover:to-emerald-200 transition-all duration-300'>
                <svg
                  className='h-8 w-8 text-green-600'
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
                    d='M15 11a3 3 0 11-6 0 3 3 0 616 0z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-green-800 mb-3'>
                Prime Locations
              </h3>
              <p className='text-green-600 leading-relaxed'>
                Handpicked properties in the most desirable destinations
                worldwide, ensuring you&apos;re always in the heart of the
                action
              </p>
            </div>

            <div className='text-center group hover:transform hover:scale-105 transition-all duration-300'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl mb-6 group-hover:from-green-200 group-hover:to-emerald-200 transition-all duration-300'>
                <svg
                  className='h-8 w-8 text-green-600'
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
              <h3 className='text-xl font-semibold text-green-800 mb-3'>
                Trusted Booking
              </h3>
              <p className='text-green-600 leading-relaxed'>
                Secure payments, verified accommodations, and transparent
                pricing. Your peace of mind is our top priority
              </p>
            </div>

            <div className='text-center group hover:transform hover:scale-105 transition-all duration-300'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl mb-6 group-hover:from-green-200 group-hover:to-emerald-200 transition-all duration-300'>
                <svg
                  className='h-8 w-8 text-green-600'
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
              <h3 className='text-xl font-semibold text-green-800 mb-3'>
                24/7 Support
              </h3>
              <p className='text-green-600 leading-relaxed'>
                Round-the-clock assistance from our dedicated travel experts,
                ensuring your journey is seamless from start to finish
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className='py-20 bg-gradient-to-b from-green-50/50 to-emerald-50/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-light text-green-800 mb-4'>
              Popular{" "}
              <span className='font-medium text-emerald-600'>Destinations</span>
            </h2>
            <p className='text-lg text-green-700 max-w-2xl mx-auto'>
              Discover amazing places and create unforgettable memories in these
              trending destinations
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {[
              {
                name: "Mumbai",
                hotels: "150+ hotels",
                description: "The City of Dreams",
              },
              {
                name: "Delhi",
                hotels: "200+ hotels",
                description: "Heart of India",
              },
              {
                name: "Bangalore",
                hotels: "120+ hotels",
                description: "Silicon Valley of India",
              },
              {
                name: "Goa",
                hotels: "80+ hotels",
                description: "Beach Paradise",
              },
              {
                name: "Jaipur",
                hotels: "90+ hotels",
                description: "The Pink City",
              },
              {
                name: "Chennai",
                hotels: "110+ hotels",
                description: "Gateway to South India",
              },
              {
                name: "Kolkata",
                hotels: "85+ hotels",
                description: "Cultural Capital",
              },
              {
                name: "Hyderabad",
                hotels: "95+ hotels",
                description: "City of Pearls",
              },
            ].map((destination) => (
              <Link
                key={destination.name}
                href={`/hotels?location=${destination.name}`}
                className='group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-green-100 hover:border-green-200 transform hover:-translate-y-2'
              >
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-xl font-semibold text-green-800 group-hover:text-emerald-600 transition-colors'>
                    {destination.name}
                  </h3>
                  <svg
                    className='w-5 h-5 text-green-500 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5l7 7-7 7'
                    />
                  </svg>
                </div>
                <p className='text-sm text-green-600 mb-2 font-medium'>
                  {destination.description}
                </p>
                <p className='text-green-500 text-sm'>{destination.hotels}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer removed per request */}
    </div>
  );
}
