import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../stores/auth.store';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { profileApi } from '../api/profile';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Calendar,
  Camera,
  Lock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Facebook Icon
const FacebookIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loadUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isFacebookUser = !!user?.facebookId;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSaveMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setSaveMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await profileApi.updateProfile({
        name: name.trim(),
        profilePic: profilePic || undefined,
      });

      if (response.success) {
        await loadUser();
        setIsEditing(false);
        setProfilePic(null);
        setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await profileApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        setPasswordMessage({ type: 'error', text: 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setName(user?.name || '');
    setProfilePic(null);
    setSaveMessage(null);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-500">Manage your account information</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Profile Information</h2>
          </CardHeader>
          <CardContent>
            {/* Messages */}
            {saveMessage && (
              <div className={`p-3 mb-4 rounded-lg flex items-center gap-2 ${
                saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {saveMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {saveMessage.text}
              </div>
            )}

            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {(profilePic || user?.profilePic) ? (
                      <img
                        src={profilePic || user?.profilePic}
                        alt={user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  {isEditing && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <>
                    <Input
                      label="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                    <div className="flex gap-3">
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">{user?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Member since</p>
                          <p className="font-medium">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }) : '-'}
                          </p>
                        </div>
                      </div>

                      {isFacebookUser && (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 text-[#1877F2]">
                            <FacebookIcon />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Connected Account</p>
                            <p className="font-medium text-[#1877F2]">Facebook</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card - Only for non-Facebook users */}
        {!isFacebookUser && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Security</h2>
            </CardHeader>
            <CardContent>
              {passwordMessage && (
                <div className={`p-3 mb-4 rounded-lg flex items-center gap-2 ${
                  passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {passwordMessage.text}
                </div>
              )}

              {showPasswordForm ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      Change Password
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordMessage(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
