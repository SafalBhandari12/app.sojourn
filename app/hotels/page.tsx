"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

interface Hotel {
  id: string;
  hotelName: string;
  category: string;
  totalRooms?: number;
  amenities: string[];
  checkInTime?: string;
  checkOutTime?: string;
  vendor: {
    businessName: string;
    businessAddress: string;
    contactNumbers: string[];
    images: Array<{
      id: string;
      imageUrl: string;
      thumbnailUrl: string;
      description: string;
      isPrimary: boolean;
    }>;
  };
  rooms: Array<{
    id: string;
    roomType: string;
    capacity: number;
    basePrice: number;
    amenities: string[];
  }>;
  avgRating: number;
  totalReviews: number;
  startingPrice?: number;
}

interface SearchFilters {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  category: string;
  minPrice: number;
  maxPrice: number;
  amenities: string[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function HotelsPage() {
  const searchParams = useSearchParams();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: searchParams.get("location") || "",
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    guests: parseInt(searchParams.get("guests") || "2"),
    category: searchParams.get("category") || "",
    minPrice: 0,
    maxPrice: 50000,
    amenities: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const categories = ["RESORT", "HOMESTAY", "HOUSEBOAT", "GUESTHOUSE"];
  const amenitiesList = [
    "wifi",
    "pool",
    "spa",
    "parking",
    "restaurant",
    "gym",
    "ac",
    "tv",
  ];

  useEffect(() => {
    searchHotels();
  }, []);

  const searchHotels = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.location && { location: filters.location }),
        ...(filters.checkIn && { checkIn: filters.checkIn }),
        ...(filters.checkOut && { checkOut: filters.checkOut }),
        ...(filters.guests && { guests: filters.guests.toString() }),
        ...(filters.category && { category: filters.category }),
        ...(filters.minPrice && { minPrice: filters.minPrice.toString() }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice.toString() }),
        ...(filters.amenities.length > 0 && {
          amenities: filters.amenities.join(","),
        }),
      });

      const apiUrl = `${BACKEND_URL}/api/hotels/search?${queryParams}`;
      console.log("API URL:", apiUrl);
      console.log("Search params:", Object.fromEntries(queryParams));

      const response = await fetch(apiUrl);
      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        setHotels(data.data.hotels || []);
        setPagination(
          data.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }
        );
      } else {
        console.error("API Error:", data.message);
        setHotels([]);
      }
    } catch (error) {
      console.error("Error searching hotels:", error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchHotels(1);
  };

  const handleAmenityChange = (amenity: string) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push("★");
    }
    if (hasHalfStar) {
      stars.push("☆");
    }
    while (stars.length < 5) {
      stars.push("☆");
    }
    return stars.join("");
  };

  return (
    <div className='min-h-screen bg-gray-50'>
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
            <nav className='hidden md:flex space-x-8'>
              <Link
                href='/hotels'
                className='text-gray-900 font-medium hover:text-gray-600 transition-colors'
              >
                Hotels
              </Link>
              <Link
                href='/about'
                className='text-gray-700 hover:text-gray-900 transition-colors'
              >
                About
              </Link>
              <Link
                href='/contact'
                className='text-gray-700 hover:text-gray-900 transition-colors'
              >
                Contact
              </Link>
            </nav>
            <div className='flex items-center space-x-4'>
              <Link
                href='/auth'
                className='bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md'
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <form
            onSubmit={handleSearch}
            className='flex flex-wrap gap-4 items-end'
          >
            <div className='flex-1 min-w-[200px]'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Destination
              </label>
              <input
                type='text'
                placeholder='City, hotel name, or area'
                value={filters.location}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, location: e.target.value }))
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-black'
              />
            </div>

            <div className='flex-1 min-w-[150px]'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Check In
              </label>
              <input
                type='date'
                value={filters.checkIn}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, checkIn: e.target.value }))
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-black'
              />
            </div>

            <div className='flex-1 min-w-[150px]'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Check Out
              </label>
              <input
                type='date'
                value={filters.checkOut}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, checkOut: e.target.value }))
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-black'
              />
            </div>

            <div className='min-w-[120px]'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Guests
              </label>
              <select
                value={filters.guests}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    guests: parseInt(e.target.value),
                  }))
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-black'
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} Guest{num > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl'
            >
              {loading ? "Searching..." : "Search"}
            </button>

            <button
              type='button'
              onClick={() => setShowFilters(!showFilters)}
              className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium'
            >
              Filters
            </button>
          </form>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className='bg-white border-b shadow-sm'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {/* Category Filter */}
              <div>
                <h3 className='text-sm font-medium text-gray-700 mb-3'>
                  Property Type
                </h3>
                <div className='space-y-2'>
                  {categories.map((category) => (
                    <label key={category} className='flex items-center'>
                      <input
                        type='radio'
                        name='category'
                        value={category}
                        checked={filters.category === category}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className='mr-2'
                      />
                      <span className='text-sm text-gray-600'>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className='text-sm font-medium text-gray-700 mb-3'>
                  Price Range (per night)
                </h3>
                <div className='space-y-3'>
                  <div>
                    <label className='block text-xs text-gray-500'>
                      Min Price
                    </label>
                    <input
                      type='number'
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          minPrice: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-3 py-1 border border-gray-300 rounded text-sm text-black'
                      placeholder='0'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500'>
                      Max Price
                    </label>
                    <input
                      type='number'
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxPrice: parseInt(e.target.value) || 50000,
                        }))
                      }
                      className='w-full px-3 py-1 border border-gray-300 rounded text-sm text-black'
                      placeholder='50000'
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className='text-sm font-medium text-gray-700 mb-3'>
                  Amenities
                </h3>
                <div className='grid grid-cols-2 gap-2'>
                  {amenitiesList.map((amenity) => (
                    <label key={amenity} className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={filters.amenities.includes(amenity)}
                        onChange={() => handleAmenityChange(amenity)}
                        className='mr-2'
                      />
                      <span className='text-sm text-gray-600 capitalize'>
                        {amenity}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-4 flex space-x-3'>
              <button
                onClick={() => searchHotels(1)}
                className='bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl'
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilters({
                    location: "",
                    checkIn: "",
                    checkOut: "",
                    guests: 2,
                    category: "",
                    minPrice: 0,
                    maxPrice: 50000,
                    amenities: [],
                  });
                }}
                className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium'
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {loading ? (
          <div className='flex flex-col justify-center items-center py-12'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4'></div>
            <p className='text-gray-600'>Searching for hotels...</p>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className='flex justify-between items-center mb-6'>
              <h1 className='text-2xl font-bold text-gray-900'>
                {hotels.length > 0
                  ? `${pagination.total} Hotels Found`
                  : "No Hotels Found"}
              </h1>
              {hotels.length > 0 && (
                <div className='flex items-center space-x-4'>
                  <select className='border border-gray-300 rounded-lg px-3 py-2 text-sm text-black'>
                    <option>Sort by: Popularity</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Rating</option>
                  </select>
                </div>
              )}
            </div>

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === "development" && (
              <div className='bg-gray-100 p-4 rounded-lg mb-6 text-sm'>
                <h3 className='font-semibold mb-2'>Debug Info:</h3>
                <p>
                  <strong>API URL:</strong> {BACKEND_URL}
                </p>
                <p>
                  <strong>Current Filters:</strong> {JSON.stringify(filters)}
                </p>
                <p>
                  <strong>Hotels Count:</strong> {hotels.length}
                </p>
                <p>
                  <strong>Loading:</strong> {loading ? "Yes" : "No"}
                </p>
              </div>
            )}

            {/* Hotel Cards or Empty State */}
            {hotels.length > 0 ? (
              <div className='space-y-6'>
                {hotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow'
                  >
                    <div className='flex flex-col md:flex-row'>
                      {/* Hotel Image */}
                      <div className='md:w-1/3 h-48 md:h-auto relative'>
                        <Image
                          src={
                            hotel.vendor?.images?.[0]?.thumbnailUrl ||
                            hotel.vendor?.images?.[0]?.imageUrl ||
                            "/placeholder-hotel.svg"
                          }
                          alt={hotel.hotelName || "Hotel Image"}
                          fill
                          className='object-cover'
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.src = "/placeholder-hotel.svg";
                          }}
                        />
                        <div className='absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium shadow'>
                          {hotel.category}
                        </div>
                        {hotel.vendor?.images?.length > 1 && (
                          <div className='absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs'>
                            +{hotel.vendor.images.length - 1} more
                          </div>
                        )}
                      </div>{" "}
                      {/* Hotel Info */}
                      <div className='md:w-2/3 p-6'>
                        <div className='flex justify-between items-start'>
                          <div className='flex-1'>
                            <h3 className='text-xl font-bold text-gray-900 mb-2'>
                              {hotel.hotelName}
                            </h3>

                            <div className='flex items-center mb-2'>
                              <span className='text-yellow-400 mr-1'>
                                {hotel.avgRating
                                  ? getRatingStars(hotel.avgRating)
                                  : "☆☆☆☆☆"}
                              </span>
                              <span className='text-sm text-gray-600'>
                                {hotel.avgRating
                                  ? `${hotel.avgRating}/5`
                                  : "No rating"}{" "}
                                ({hotel.totalReviews || 0} reviews)
                              </span>
                            </div>

                            <p className='text-gray-600 text-sm mb-3 flex items-center'>
                              <svg
                                className='h-4 w-4 mr-1 text-gray-400'
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
                              {hotel.vendor?.businessAddress ||
                                "Address not available"}
                            </p>

                            {/* Check-in/Check-out times */}
                            {(hotel.checkInTime || hotel.checkOutTime) && (
                              <div className='text-xs text-gray-500 mb-3'>
                                {hotel.checkInTime &&
                                  `Check-in: ${hotel.checkInTime}`}
                                {hotel.checkInTime &&
                                  hotel.checkOutTime &&
                                  " • "}
                                {hotel.checkOutTime &&
                                  `Check-out: ${hotel.checkOutTime}`}
                              </div>
                            )}

                            <div className='flex flex-wrap gap-2 mb-4'>
                              {hotel.amenities && hotel.amenities.length > 0 ? (
                                <>
                                  {hotel.amenities
                                    .slice(0, 4)
                                    .map((amenity) => (
                                      <span
                                        key={amenity}
                                        className='bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs'
                                      >
                                        {amenity}
                                      </span>
                                    ))}
                                  {hotel.amenities.length > 4 && (
                                    <span className='text-gray-600 text-xs'>
                                      +{hotel.amenities.length - 4} more
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className='text-gray-500 text-xs'>
                                  No amenities listed
                                </span>
                              )}
                            </div>

                            <div className='text-sm text-gray-600'>
                              <div className='flex items-center mb-1'>
                                <svg
                                  className='h-4 w-4 mr-1 text-gray-400'
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
                                Room types:{" "}
                                {hotel.rooms && hotel.rooms.length > 0
                                  ? hotel.rooms
                                      .map((r) => r.roomType)
                                      .join(", ")
                                  : "Various room types available"}
                              </div>
                              {hotel.totalRooms && (
                                <div className='text-xs text-gray-500'>
                                  Total rooms: {hotel.totalRooms}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Price and Book Button */}
                          <div className='text-right min-w-[140px]'>
                            <div className='mb-2'>
                              {(() => {
                                // Calculate starting price from hotel data
                                let displayPrice = hotel.startingPrice;

                                // If no starting price, calculate from rooms
                                if (
                                  !displayPrice &&
                                  hotel.rooms &&
                                  hotel.rooms.length > 0
                                ) {
                                  displayPrice = Math.min(
                                    ...hotel.rooms.map((room) => room.basePrice)
                                  );
                                }

                                return (
                                  <>
                                    <span className='text-2xl font-bold text-gray-900'>
                                      ₹
                                      {displayPrice && displayPrice > 0
                                        ? displayPrice.toLocaleString()
                                        : "Price on request"}
                                    </span>
                                    <span className='text-sm text-gray-600 block'>
                                      {displayPrice && displayPrice > 0
                                        ? "per night"
                                        : ""}
                                    </span>
                                  </>
                                );
                              })()}
                              {hotel.rooms && hotel.rooms.length > 0 && (
                                <span className='text-xs text-gray-500 block'>
                                  from {hotel.rooms.length} room
                                  {hotel.rooms.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>

                            <Link
                              href={`/hotels/${hotel.id}${
                                filters.checkIn && filters.checkOut
                                  ? `?checkIn=${filters.checkIn}&checkOut=${filters.checkOut}&guests=${filters.guests}`
                                  : ""
                              }`}
                              className='inline-block bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold mb-3 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                            >
                              View Details
                            </Link>

                            <div className='text-xs text-gray-500 mb-2'>
                              + taxes & fees
                            </div>

                            {/* Contact Info */}
                            {hotel.vendor?.contactNumbers?.[0] && (
                              <div className='text-xs text-gray-600 mt-2 flex items-center'>
                                <svg
                                  className='w-3 h-3 mr-1'
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
                                {hotel.vendor.contactNumbers[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className='text-center py-12'>
                <div className='max-w-md mx-auto'>
                  <svg
                    className='h-16 w-16 text-gray-400 mx-auto mb-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={1}
                      d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                    />
                  </svg>
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    No Hotels Found
                  </h3>
                  <p className='text-gray-600 mb-4'>
                    We couldn't find any hotels matching your search criteria.
                    Try adjusting your filters or search terms.
                  </p>
                  <button
                    onClick={() => {
                      setFilters({
                        location: "",
                        checkIn: "",
                        checkOut: "",
                        guests: 2,
                        category: "",
                        minPrice: 0,
                        maxPrice: 50000,
                        amenities: [],
                      });
                      searchHotels(1);
                    }}
                    className='bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl'
                  >
                    Clear Filters & Search Again
                  </button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {hotels.length > 0 && pagination.totalPages > 1 && (
              <div className='flex justify-center mt-8'>
                <div className='flex space-x-2'>
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => searchHotels(page)}
                      className={`px-3 py-2 rounded ${
                        page === pagination.page
                          ? "bg-gray-900 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
