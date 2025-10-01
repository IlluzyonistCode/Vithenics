import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import api from '../lib/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');

    if (!email) {
      setError('Please enter an email address');
      setIsLoading(false);

      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);

      return;
    }

    try {
      await api.post('/auth/forgot-password', { email });

      setIsSubmitted(true);
    } catch (error) {
      if (error.response?.status === 404) setError('User with this email not found');

      else if (error.response?.status === 429) setError('Too many requests. Please try again later');
      
      else setError('An error occurred. Please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted)
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <Card>
            <CardHeader className='text-center'>
              <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
                <CheckCircle className='h-8 w-8 text-green-600' />
              </div>
              <CardTitle className='text-2xl font-bold text-gray-900'>
                Email Sent
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='text-center'>
                <p className='text-gray-600 mb-4'>
                  We have sent password recovery instructions to:
                </p>
                <p className='font-medium text-gray-900 mb-6'>{email}</p>
                <p className='text-sm text-gray-500 mb-6'>
                  Check your spam folder if you don't see the email within a few minutes.
                </p>
              </div>

              <div className='space-y-4'>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  variant='outline'
                  className='w-full'
                >
                  Send again
                </Button>
                
                <Link to='/login'>
                  <Button variant='outline' className='w-full'>
                    <ArrowLeft className='h-4 w-4 mr-2' />
                    Back to login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-bold text-gray-900'>
            Forgot Password
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            Enter your email address and we'll send you instructions to reset your password
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
                <Label htmlFor='email'>Email address</Label>
                <div className='relative mt-1'>
                  <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                  <Input
                    id='email'
                    name='email'
                    type='email'
                    autoComplete='email'
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='pl-10'
                    placeholder='your@email.com'
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type='submit'
                className='w-full'
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Sending...
                  </div>
                ) : (
                  'Send Instructions'
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

        <div className='text-center'>
          <p className='text-sm text-gray-600'>
            Don't have an account?{' '}
            <Link to='/register' className='font-medium text-black hover:text-white'>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
