import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  const location = useLocation();

  if (loading)
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-black'></div>
      </div>
    );

  if (!isAuthenticated) return <Navigate to='/login' state={{ from: location }} replace />;

  if (location.pathname !== '/onboarding' && user && !user.onboardingCompleted) {
    return <Navigate to='/onboarding' replace />;
  }

  return children;
};

export default ProtectedRoute;
