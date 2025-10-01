import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Dumbbell,
  Target,
  TrendingUp,
  History,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Flame
} from 'lucide-react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Skills', href: '/skills', icon: Target },
    { name: 'Progressions', href: '/progressions', icon: TrendingUp },
    { name: 'Exercises', href: '/exercises', icon: Dumbbell },
    { name: 'Workouts', href: '/workouts', icon: Flame },
    { name: 'History', href: '/history', icon: History }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className='fixed inset-0 bg-gray-600 bg-opacity-75' onClick={() => setSidebarOpen(false)} />
        <div className='fixed inset-y-0 left-0 flex w-64 flex-col bg-white'>
          <div className='flex h-16 items-center justify-between px-4'>
            <h1 className='text-xl font-bold text-black'>Vithenics</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className='text-gray-400 hover:text-gray-600'
            >
              <X className='h-6 w-6' />
            </button>
          </div>
          <nav className='flex-1 space-y-1 px-2 py-4'>
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-gray-300 text-black'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className='mr-3 h-5 w-5' />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className='border-t border-gray-200 p-4'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                {user?.profileImage ? (
                    <img src={`http://192.168.1.57:3000${user.profileImage}`} alt='Avatar' className='h-8 w-8 rounded-full' />
                ) : (
                    <div className='h-8 w-8 rounded-full bg-black flex items-center justify-center'>
                        <User className='h-5 w-5 text-white' />
                    </div>
                )}
              </div>
              <div className='ml-3'>
                <p className='text-sm font-medium text-gray-700'>
                  {user?.firstName || user?.email}
                </p>
              </div>
            </div>
            <div className='mt-3 space-y-1'>
              <Link
                to='/profile'
                onClick={() => setSidebarOpen(false)}
                className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md'
              >
                <Settings className='inline mr-2 h-4 w-4' />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md'
              >
                <LogOut className='inline mr-2 h-4 w-4' />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col'>
        <div className='flex flex-col flex-grow bg-white border-r border-gray-200'>
          <div className='flex h-16 items-center px-4'>
            <h1 className='text-xl font-bold text-black'>Vithenics</h1>
          </div>
          <nav className='flex-1 space-y-1 px-2 py-4'>
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-gray-300 text-black'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className='mr-3 h-5 w-5' />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className='border-t border-gray-200 p-4'>
            <div className='flex items-center'>
                <div className='flex-shrink-0'>
                    {user?.profileImage ? (
                      <img src={`http://192.168.1.57:3000${user.profileImage}`} alt='Avatar' className='h-8 w-8 rounded-full' />
                    ) : (
                      <div className='h-8 w-8 rounded-full bg-black flex items-center justify-center'>
                        <User className='h-5 w-5 text-white' />
                      </div>
                    )}
                </div>
              <div className='ml-3'>
                <p className='text-sm font-medium text-gray-700'>
                  {user?.firstName || user?.email}
                </p>
              </div>
            </div>
            <div className='mt-3 space-y-1'>
              <Link
                to='/profile'
                className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md'
              >
                <Settings className='inline mr-2 h-4 w-4' />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className='block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md'
              >
                <LogOut className='inline mr-2 h-4 w-4' />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='lg:pl-64'>
        <div className='sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8'>
          <button
            type='button'
            className='-m-2.5 p-2.5 text-gray-700 lg:hidden'
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className='h-6 w-6' />
          </button>

          <div className='flex flex-1 gap-x-4 self-stretch lg:gap-x-6'>
            <div className='flex flex-1'></div>
            <div className='flex items-center gap-x-4 lg:gap-x-6'>
              <div className='hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200' />
              <div className='flex items-center gap-x-4'>
                <span className='text-sm font-medium text-gray-700'>
                  {user?.firstName || user?.email}
                </span>
                <div className='flex-shrink-0'>
                    {user?.profileImage ? (
                      <img src={`http://192.168.1.57:3000${user.profileImage}`} alt={user.firstName} className='h-8 w-8 rounded-full' />
                    ) : (
                      <div className='h-8 w-8 rounded-full bg-black flex items-center justify-center'>
                        <User className='h-5 w-5 text-white' />
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className='py-6'>
          <div className='px-4 sm:px-6 lg:px-8'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
