import React from 'react';
import { User } from 'lucide-react';

const Avatar = ({ 
  src, 
  alt = 'User avatar', 
  size = 'medium', 
  className = '',
  fallbackText = ''
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-24 h-24',
    xlarge: 'w-32 h-32'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const textSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-xl',
    xlarge: 'text-2xl'
  };

  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const handleImageError = () => setImageError(true);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  if (src && !imageError)
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 ${className}`}>
        <img
          src={`http://192.168.1.57:3000${src}`}
          alt={alt}
          className='w-full h-full object-cover'
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
    );

  if (fallbackText) {
    const initials = fallbackText
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-500 text-white flex items-center justify-center ${textSizes[size]} font-medium ${className}`}>
        {initials}
      </div>
    );
  }

  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
      <User className={`${iconSizes[size]} text-gray-500`} />
    </div>
  );
};

export default Avatar;
