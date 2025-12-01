import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { authAPI } from '../lib/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter a new password');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword({ token, password });
      setIsSuccess(true);
    } catch (error) {
      if (error.response?.status === 400) {
        setError(error.response.data.error || 'Invalid or expired reset token');
      } else {
        setError('An error occurred. Please try again later');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <Card>
            <CardHeader className='text-center'>
              <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
                <CheckCircle className='h-8 w-8 text-green-600' />
              </div>
              <CardTitle className='text-2xl font-bold text-gray-900'>
                Password Reset Successful
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='text-center'>
                <p className='text-gray-600 mb-6'>
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>

              <Link to='/login'>
                <Button className='w-full'>
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-bold text-gray-900'>
            Reset Password
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            Enter your new password below
          </p>
        </div>

        <Card>
          <CardContent className='pt-6'>
            <form onSubmit={handleSubmit} className='space-y-6'>
              {error && (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor='password'>New Password</Label>
                <div className='relative mt-1'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                  <Input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='new-password'
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='pl-10 pr-10'
                    placeholder='Enter new password'
                    disabled={isLoading || !token}
                  />
                  <button
                    type='button'
                    className='absolute right-3 top-1/2 transform -translate-y-1/2'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4 text-gray-400' />
                    ) : (
                      <Eye className='h-4 w-4 text-gray-400' />
                    )}
                  </button>
                </div>
                <p className='mt-1 text-xs text-gray-500'>
                  Password must be at least 6 characters long
                </p>
              </div>

              <div>
                <Label htmlFor='confirmPassword'>Confirm New Password</Label>
                <div className='relative mt-1'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                  <Input
                    id='confirmPassword'
                    name='confirmPassword'
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete='new-password'
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='pl-10 pr-10'
                    placeholder='Confirm new password'
                    disabled={isLoading || !token}
                  />
                  <button
                    type='button'
                    className='absolute right-3 top-1/2 transform -translate-y-1/2'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='h-4 w-4 text-gray-400' />
                    ) : (
                      <Eye className='h-4 w-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type='submit'
                className='w-full'
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Resetting...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>

              <div className='text-center'>
                <Link
                  to='/login'
                  className='text-sm text-black hover:text-white flex items-center justify-center'
                >
                  <ArrowLeft className='h-4 w-4 mr-1' />
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

