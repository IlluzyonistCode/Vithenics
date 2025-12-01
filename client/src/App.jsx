import React, { useEffect } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Skills from './pages/Skills';
import Progressions from './pages/Progressions';
import Exercises from './pages/Exercises';
import Workouts from './pages/Workouts';
import History from './pages/History';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import { Toaster } from './components/ui/sonner';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import './index.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hideStatusBar = async () => {
      try {
        await StatusBar.hide();
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch (e) {
      }
    };
    hideStatusBar();

    const setupBackButton = async () => {
      const backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const exitRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/dashboard', '/'];
        const currentPath = location.pathname;
        if (exitRoutes.includes(currentPath)) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });
      return () => {
        backButtonListener.remove();
      };
    };
    let cleanupListener;
    setupBackButton().then(cleanup => { cleanupListener = cleanup; });
    return () => {
      if (cleanupListener) cleanupListener();
    };
  }, [navigate, location]);

  return (
    <div className='App'>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route
          path='/onboarding'
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path='/'
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to='/dashboard' replace />} />
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='profile' element={<Profile />} />
          <Route path='skills' element={<Skills />} />
          <Route path='progressions' element={<Progressions />} />
          <Route path='exercises' element={<Exercises />} />
          <Route path='workouts' element={<Workouts />} />
          <Route path='history' element={<History />} />
        </Route>
      </Routes>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
