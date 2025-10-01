import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../lib/api';
import ImageUpload from '../components/ImageUpload';
import { Save, Edit, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    profileImage: user?.profileImage || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user)
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        profileImage: user.profileImage || '',
      });
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = async (base64Image, file) => {
    try {
      const formData = new FormData();

      formData.append('profileImage', file);

      const response = await userAPI.updateProfileImage(formData);
      
      setProfileData({
        ...profileData,
        profileImage: response.data.profileImage
      });

      updateUser({
        ...user,
        profileImage: response.data.profileImage
      });

      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
    } catch (error) {
      console.error('Error updating profile image:', error);

      setMessage({ type: 'error', text: 'Failed to update profile image' });
    }
  };

  const handleImageRemove = async () => {
    try {
      await userAPI.deleteProfileImage();
      
      setProfileData({
        ...profileData,
        profileImage: ''
      });

      updateUser({
        ...user,
        profileImage: ''
      });

      setMessage({ type: 'success', text: 'Profile image removed successfully!' });
    } catch (error) {
      console.error('Error removing profile image:', error);

      setMessage({ type: 'error', text: 'Failed to remove profile image' });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await userAPI.updateProfile(profileData);

      updateUser(response.data.user);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile';

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);

      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      setLoading(false);

      return;
    }

    try {
      await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to change password';

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-bold text-gray-900'>Profile Settings</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className='flex items-center px-4 py-2 text-sm font-medium text-black hover:text-gray-300'
          >
            <Edit className='w-4 h-4 mr-2' />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-1'>
            <div className='text-center'>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>Profile Picture</h3>
              <div className='flex justify-center'>
                <ImageUpload
                  currentImage={profileData.profileImage}
                  onImageChange={handleImageChange}
                  onImageRemove={handleImageRemove}
                  size='xlarge'
                  userName={`${profileData.firstName} ${profileData.lastName}`.trim()}
                />
              </div>
              <p className='mt-2 text-sm text-gray-500'>
                Click the upload button to change your profile picture
              </p>
            </div>
          </div>

          <div className='lg:col-span-2'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Personal Information</h3>
            <form onSubmit={handleProfileSubmit} className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label htmlFor='firstName' className='block text-sm font-medium text-gray-700'>
                    First Name
                  </label>
                  <input
                    type='text'
                    id='firstName'
                    name='firstName'
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500'
                  />
                </div>
                <div>
                  <label htmlFor='lastName' className='block text-sm font-medium text-gray-700'>
                    Last Name
                  </label>
                  <input
                    type='text'
                    id='lastName'
                    name='lastName'
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500'
                  />
                </div>
              </div>
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
                  Email Address
                </label>
                <input
                  type='email'
                  id='email'
                  name='email'
                  value={profileData.email}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500'
                />
              </div>
              {isEditing && (
                <div className='flex justify-end'>
                  <button
                    type='submit'
                    disabled={loading}
                    className='flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {loading ? (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    ) : (
                      <Save className='w-4 h-4 mr-2' />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
        <h2 className='text-lg font-medium text-gray-900 mb-4'>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className='space-y-4 max-w-md'>
          <div className='relative'>
            <label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700'>
              Current Password
            </label>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              id='currentPassword'
              name='currentPassword'
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              className='mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black'
            />
            <button
              type='button'
              className='absolute inset-y-0 right-0 pr-3 flex items-center mt-6'
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOff className='h-5 w-5 text-gray-400' />
              ) : (
                <Eye className='h-5 w-5 text-gray-400' />
              )}
            </button>
          </div>
          <div className='relative'>
            <label htmlFor='newPassword' className='block text-sm font-medium text-gray-700'>
              New Password
            </label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              id='newPassword'
              name='newPassword'
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              className='mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black'
            />
            <button
              type='button'
              className='absolute inset-y-0 right-0 pr-3 flex items-center mt-6'
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOff className='h-5 w-5 text-gray-400' />
              ) : (
                <Eye className='h-5 w-5 text-gray-400' />
              )}
            </button>
          </div>
          <div className='relative'>
            <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700'>
              Confirm New Password
            </label>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id='confirmPassword'
              name='confirmPassword'
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              className='mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black'
            />
            <button
              type='button'
              className='absolute inset-y-0 right-0 pr-3 flex items-center mt-6'
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className='h-5 w-5 text-gray-400' />
              ) : (
                <Eye className='h-5 w-5 text-gray-400' />
              )}
            </button>
          </div>
          <div>
            <button
              type='submit'
              disabled={loading}
              className='flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
              ) : (
                <Save className='w-4 h-4 mr-2' />
              )}
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
