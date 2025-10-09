"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService, User } from "../../lib/auth";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!AuthService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    const userData = AuthService.getUser();
    if (!userData) {
      router.push("/auth");
      return;
    }

    setUser(userData);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    AuthService.clearAuthData();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <nav className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16'>
            <div className='flex items-center'>
              <h1 className='text-xl font-semibold'>Dashboard</h1>
            </div>
            <div className='flex items-center'>
              <button
                onClick={handleLogout}
                className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium'
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          <div className='bg-white overflow-hidden shadow rounded-lg'>
            <div className='px-4 py-5 sm:p-6'>
              <h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
                Welcome to your dashboard!
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wider'>
                    User Information
                  </h4>
                  <dl className='mt-3 space-y-3'>
                    <div>
                      <dt className='text-sm font-medium text-gray-600'>
                        Phone Number
                      </dt>
                      <dd className='text-sm text-gray-900'>
                        {user.phoneNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-sm font-medium text-gray-600'>
                        Role
                      </dt>
                      <dd className='text-sm text-gray-900'>{user.role}</dd>
                    </div>
                    <div>
                      <dt className='text-sm font-medium text-gray-600'>
                        Status
                      </dt>
                      <dd className='text-sm text-gray-900'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className='text-sm font-medium text-gray-600'>
                        User ID
                      </dt>
                      <dd className='text-sm text-gray-900 font-mono'>
                        {user.id}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wider'>
                    Quick Actions
                  </h4>
                  <div className='mt-3 space-y-3'>
                    <button className='w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium'>
                      View Profile
                    </button>
                    <button className='w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium'>
                      Settings
                    </button>
                    <button className='w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium'>
                      Help & Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
