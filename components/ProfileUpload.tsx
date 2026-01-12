import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface ProfileUploadProps {
  user: User;
  onProfileUpdate: (newAvatar: string) => void;
}

const ProfileUpload: React.FC<ProfileUploadProps> = ({ user, onProfileUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    setSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        const result = await api.uploadProfile(imageData, user.id, user.name);
        
        if (result.status === 'success' && result.data?.avatar) {
          onProfileUpdate(result.data.avatar);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          alert('Upload failed: ' + (result.message || 'Unknown error'));
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <img 
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=64748b&color=ffffff`}
          alt={user.name}
          className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : success ? (
            <Check className="w-4 h-4" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Change Photo'}
      </button>
    </div>
  );
};

export default ProfileUpload;