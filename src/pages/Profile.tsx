import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, storage, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { User, Mail, Lock, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [userProfile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Update Auth Profile (Display Name)
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // Update Email if changed
      if (email !== user.email) {
        // Note: This might require recent login
        await updateEmail(user, email);
      }

      // Update Password if provided
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        email,
        updatedAt: new Date().toISOString()
      });

      setMessage({ type: 'success', text: t('profile.success') });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Update Error:', error);
      let errorText = t('profile.error');
      if (error.code === 'auth/requires-recent-login') {
        errorText = 'This operation is sensitive and requires recent authentication. Please log in again.';
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update Auth
      await updateProfile(user, { photoURL });

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });

      setMessage({ type: 'success', text: 'Profile picture updated!' });
    } catch (error) {
      console.error('Avatar Upload Error:', error);
      setMessage({ type: 'error', text: 'Failed to upload picture.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">{t('profile.title')}</h1>
            <p className="text-gray-400">{t('profile.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative group">
                <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-2 border-purple-500/30 shadow-2xl shadow-purple-600/20">
                  {uploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                  ) : null}
                  <img
                    src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg">{userProfile?.displayName}</h3>
                <p className="text-xs text-purple-400 uppercase tracking-widest font-mono">{userProfile?.role}</p>
              </div>
            </div>

            {/* Form Section */}
            <div className="md:col-span-2">
              <form onSubmit={handleUpdateProfile} className="space-y-6 glass-surface-dark p-8 rounded-[2.5rem] border border-white/5">
                {message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-2xl flex items-center gap-3 ${
                      message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{message.text}</span>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-purple-500" />
                    {t('profile.personalInfo')}
                  </h2>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('profile.displayName')}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="Your Name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('profile.email')}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="Email Address"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-purple-500" />
                    Security
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('profile.password')}</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{t('profile.confirmPassword')}</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">Leave blank to keep current password.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-radial text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('profile.updating')}
                    </>
                  ) : (
                    t('profile.updateBtn')
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
