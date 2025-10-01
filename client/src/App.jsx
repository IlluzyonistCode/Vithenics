import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
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
import { Toaster } from './components/ui/sonner';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className='App'>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
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
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
