import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import Avatar from './Avatar';

const ImageUpload = ({ 
  currentImage, 
  onImageChange, 
  onImageRemove, 
  size='large',
  userName=''
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 5MB.');

      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/gif'].includes(file.type)) {
      alert('Invalid file type. Please select a PNG, JPG, or GIF.');

      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        const base64 = event.target.result;

        onImageChange(base64, file);
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);

      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className='flex flex-col items-center space-y-4'>
      <div className='relative'>
        <Avatar 
          src={currentImage} 
          size={size}
          fallbackText={userName}
          alt='Profile picture'
        />
        <button
          type='button'
          onClick={triggerFileSelect}
          disabled={uploading}
          className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 disabled:cursor-not-allowed'
        >
          <Camera className='w-6 h-6 text-white' />
        </button>

        {currentImage && (
          <button
            type='button'
            onClick={onImageRemove}
            className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>
      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileChange}
        className='hidden'
        accept='image/png,image/jpeg,image/jpg,image/gif'
        disabled={uploading}
      />
      <div className='flex space-x-2'>
        <button
          type='button'
          onClick={triggerFileSelect}
          disabled={uploading}
          className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {uploading ? 'Uploading...' : 'Change Picture'}
        </button>

        {currentImage && (
          <button
            type='button'
            onClick={onImageRemove}
            className='px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
