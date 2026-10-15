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
  Link as LinkIcon,
} from 'lucide-react';

// Facebook Icon
const FacebookIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loadUser, loginWithFacebook } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connect Facebook state
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);

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
        setSaveMessage({ type: 'error', text: 'รูปใหญ่เกิน 5MB เลือกรูปที่เล็กกว่านี้' });
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
      setSaveMessage({ type: 'error', text: 'กรุณาใส่ชื่อ' });
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
        setSaveMessage({ type: 'success', text: 'บันทึกโปรไฟล์แล้ว' });
      } else {
        setSaveMessage({ type: 'error', text: 'บันทึกโปรไฟล์ไม่สำเร็จ ลองอีกครั้ง' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : 'บันทึกโปรไฟล์ไม่สำเร็จ ลองอีกครั้ง' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'รหัสผ่านใหม่สองช่องไม่ตรงกัน พิมพ์ให้ตรงกันอีกครั้ง' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await profileApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.success) {
        setPasswordMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านแล้ว' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        setPasswordMessage({ type: 'error', text: 'เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจรหัสผ่านปัจจุบันแล้วลองอีกครั้ง' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error instanceof Error ? error.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจรหัสผ่านปัจจุบันแล้วลองอีกครั้ง' });
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

  const handleConnectFacebook = async () => {
    setIsConnectingFacebook(true);
    try {
      await loginWithFacebook(true);
      // User will be redirected to Facebook OAuth
    } catch (error) {
      console.error('Failed to connect Facebook:', error);
      setSaveMessage({ type: 'error', text: 'เชื่อม Facebook ไม่สำเร็จ ลองกดเชื่อมอีกครั้ง' });
      setIsConnectingFacebook(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/bots')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="กลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์</h1>
            <p className="text-gray-500">ข้อมูลบัญชีของคุณ</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">ข้อมูลส่วนตัว</h2>
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
                        aria-label="เปลี่ยนรูปโปรไฟล์"
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
                      label="ชื่อ"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ชื่อของคุณ"
                    />
                    <div className="flex gap-3">
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        บันทึก
                      </Button>
                      <Button variant="secondary" onClick={handleCancelEdit}>
                        ยกเลิก
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">ชื่อ</p>
                          <p className="font-medium">{user?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">อีเมล</p>
                          <p className="font-medium">{user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">สมัครเมื่อ</p>
                          <p className="font-medium">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }) : '-'}
                          </p>
                        </div>
                      </div>

                    </div>

                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                      แก้ไขโปรไฟล์
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts Card */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">บัญชีที่เชื่อมไว้</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                  <FacebookIcon />
                </div>
                <div>
                  <p className="font-medium">Facebook</p>
                  <p className="text-sm text-gray-500">
                    {isFacebookUser ? 'เชื่อมแล้ว' : 'ยังไม่ได้เชื่อม'}
                  </p>
                </div>
              </div>
              {isFacebookUser ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">เชื่อมแล้ว</span>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleConnectFacebook}
                  disabled={isConnectingFacebook}
                >
                  {isConnectingFacebook ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="w-4 h-4 mr-2" />
                  )}
                  เชื่อม Facebook
                </Button>
              )}
            </div>
            {!isFacebookUser && (
              <p className="text-sm text-gray-500 mt-3">
                เชื่อมบัญชี Facebook เพื่อเข้าสู่ระบบได้เร็วขึ้น และใช้รูปโปรไฟล์จาก Facebook
              </p>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card - Only for non-Facebook users */}
        {!isFacebookUser && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">รหัสผ่าน</h2>
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
                    label="รหัสผ่านปัจจุบัน"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="ใส่รหัสผ่านปัจจุบัน"
                    required
                  />
                  <Input
                    label="รหัสผ่านใหม่"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    required
                  />
                  <Input
                    label="ยืนยันรหัสผ่านใหม่"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    required
                  />
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      เปลี่ยนรหัสผ่าน
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
                      ยกเลิก
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  เปลี่ยนรหัสผ่าน
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
