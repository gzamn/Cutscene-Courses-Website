import React, { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  db, 
  auth, 
  signUpWithEmail, 
  loginWithEmail 
} from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc
} from 'firebase/firestore';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Facebook, 
  User, 
  Loader2, 
  Phone, 
  ShieldCheck, 
  Check, 
  Smartphone, 
  AlertCircle 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AuthFlowProps {
  onSuccess: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
  isEnrollmentFlow?: boolean;
}

export default function AuthFlow({ onSuccess, titleOverride, subtitleOverride, isEnrollmentFlow = false }: AuthFlowProps) {
  const { t, language } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'details' | 'username_google' | 'completed'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Unique identifier storage for OAuth setups
  const [tempOAuthUser, setTempOAuthUser] = useState<any>(null);

  // Check if username is already taken in the DB
  const isUsernameAvailable = async (usernameToCheck: string): Promise<boolean> => {
    const trimmed = usernameToCheck.trim().toLowerCase();
    if (!trimmed) return false;
    
    try {
      const q = query(collection(db, 'users'), where('username', '==', trimmed));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (err) {
      console.error('Error checking username unique lock:', err);
      return true; // assume safe or let firebase block it
    }
  };

  // Google Authentication Trigger
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists with a username in users collection
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.username) {
          // Completely configured user! Success
          if (isEnrollmentFlow) {
            await setDoc(userRef, {
              isEnroller: true,
              isUser: true,
              role: 'enroller',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          onSuccess();
          return;
        } else {
          // Has profile but needs a username & phone
          setTempOAuthUser(user);
          setStep('username_google');
        }
      } else {
        // Brand new OAuth sign up
        setTempOAuthUser(user);
        setStep('username_google');
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or open in a new tab to authenticate.');
      } else {
        setError(err.message || 'Google Auth failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Facebook Authentication Trigger
  const handleFacebookLogin = async () => {
    setIsLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in users database
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.username) {
          if (isEnrollmentFlow) {
            await setDoc(userRef, {
              isEnroller: true,
              isUser: true,
              role: 'enroller',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          onSuccess();
          return;
        } else {
          setTempOAuthUser(user);
          setStep('username_google');
        }
      } else {
        setTempOAuthUser(user);
        setStep('username_google');
      }
    } catch (err: any) {
      console.error('Facebook Sign-in failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or open in a new tab to authenticate.');
      } else {
        setError(err.message || 'Facebook Auth failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apple Authentication Trigger via OAuthProvider
  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists with a username in users collection
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.username) {
          // Completely configured user! Success
          if (isEnrollmentFlow) {
            await setDoc(userRef, {
              isEnroller: true,
              isUser: true,
              role: 'enroller',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          onSuccess();
          return;
        } else {
          // Has profile but needs a username & phone
          setTempOAuthUser(user);
          setStep('username_google');
        }
      } else {
        // Brand new OAuth sign up
        setTempOAuthUser(user);
        setStep('username_google');
      }
    } catch (err: any) {
      console.error('Apple Sign-in failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or open in a new tab to authenticate.');
      } else {
        setError(err.message || 'Apple Auth failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit First Step details for standard layout or verify credentials
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfoMessage('');

    if (!isSignUp) {
      // --- Standard SIGN IN flow ---
      try {
        const userCredential = await loginWithEmail(formData.email, formData.password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.uid));

        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (profile.username) {
            if (isEnrollmentFlow) {
              await setDoc(doc(db, 'users', userCredential.uid), {
                isEnroller: true,
                isUser: true,
                role: 'enroller',
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
            onSuccess();
            return;
          } else {
            setTempOAuthUser(userCredential);
            setStep('username_google');
          }
        } else {
          // Missing metadata doc
          setTempOAuthUser(userCredential);
          setStep('username_google');
        }
      } catch (err: any) {
        console.error('Email sign in failed:', err);
        if (err.code === 'auth/operation-not-allowed') {
          setError('Email/Password credentials are currently disabled in your Firebase console. To fix this, please navigate to your Firebase Console -> Authentication -> Sign-in Method, and enable the "Email/Password" provider.');
        } else {
          setError(err.message || 'Login details invalid.');
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // --- Standard SIGN UP flow ---
    const usernameClean = formData.username.trim().toLowerCase();
    if (usernameClean.length < 3) {
      setError('Username must be at least 3 characters long.');
      setIsLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required.');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      // Lock check unique username
      const available = await isUsernameAvailable(usernameClean);
      if (!available) {
        setError('This username is already taken. Please choose another one.');
        setIsLoading(false);
        return;
      }

      // Create standard authenticated mail user
      const user = await signUpWithEmail(formData.email, formData.password, formData.fullName);
      
      // Seed user doc immediately with complete state
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: formData.fullName,
        username: usernameClean,
        phone: formData.phone.trim(),
        role: isEnrollmentFlow ? 'enroller' : 'student',
        isEnroller: !!isEnrollmentFlow,
        isUser: true,
        phoneVerified: true, // Marked as auto-completed
        createdAt: new Date().toISOString()
      }, { merge: true });

      setStep('completed');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Sign-up failed:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password credentials are currently disabled in your Firebase console. To fix this, please navigate to your Firebase Console -> Authentication -> Sign-in Method, and enable the "Email/Password" provider.');
      } else {
        setError(err.message || 'Registration details failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Choose Username and transition for Google/Github/Apple/Phone users
  const handleOAuthUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const usernameClean = formData.username.trim().toLowerCase();
    if (usernameClean.length < 3) {
      setError('Username must be at least 3 characters long.');
      setIsLoading(false);
      return;
    }

    if (!tempOAuthUser) {
      setError('Authentication session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    const finalPhone = tempOAuthUser.phoneNumber || formData.phone.trim();
    if (!finalPhone) {
      setError('Please enter your phone number.');
      setIsLoading(false);
      return;
    }

    const finalEmail = tempOAuthUser.email || formData.email.trim();
    if (!finalEmail) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    try {
      const available = await isUsernameAvailable(usernameClean);
      if (!available) {
        setError('This username is already taken. Please choose another one.');
        setIsLoading(false);
        return;
      }

      // Save username to DB
      await setDoc(doc(db, 'users', tempOAuthUser.uid), {
        uid: tempOAuthUser.uid,
        email: finalEmail,
        displayName: tempOAuthUser.displayName || formData.fullName || finalEmail.split('@')[0] || 'Student',
        username: usernameClean,
        phone: finalPhone,
        phoneVerified: true,
        role: isEnrollmentFlow ? 'enroller' : 'student',
        isEnroller: !!isEnrollmentFlow,
        isUser: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Move to completed step
      setStep('completed');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('OAuth configuration failed:', err);
      setError(err.message || 'Failed to register username.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full text-white text-left">
      {step === 'completed' ? (
        <div className="text-center py-10 space-y-4">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <ShieldCheck className="w-10 h-10 text-green-400 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-white">Account Verified!</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            You have successfully completed registration with your unique username and telephone credentials. Loading your checkout...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-white">
              {titleOverride || (isSignUp ? 'Create Your Account' : 'Sign In')}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {subtitleOverride || (isSignUp ? 'Verify credentials & register unique nickname' : 'Access premium content and complete payments')}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl text-purple-300 text-sm flex items-center gap-2">
              <Check className="w-5 h-5 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Details Form (Email Signup / Login) */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4 text-left">
              {isSignUp && (
                <>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Choose unique username"
                      className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone Number (e.g. 0550 00 00 00)"
                      className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email Address"
                  className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {isSignUp && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm Password"
                    className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Alternate Login providers */}
              <div className="relative my-6 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-purple-900/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-zinc-950 text-gray-500 uppercase tracking-wider">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-black border border-purple-900/30 rounded-2xl text-[10px] font-semibold hover:bg-zinc-900 transition-all disabled:opacity-50 text-gray-300"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                     <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                     <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                     <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                     <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-black border border-purple-900/30 rounded-2xl text-[10px] font-semibold hover:bg-zinc-900 transition-all disabled:opacity-50 text-gray-300"
                >
                  <Facebook className="w-4 h-4 text-blue-500" />
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={handleAppleLogin}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-black border border-purple-900/30 rounded-2xl text-[10px] font-semibold hover:bg-zinc-900 transition-all disabled:opacity-50 text-gray-300"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.1.01.21.01.31.01.92 0 2.01-.56 2.51-1.34z"/>
                  </svg>
                  Apple
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Free"}
                </button>
              </div>
            </form>
          )}

          {/* OAuth username & phone config */}
          {step === 'username_google' && (
            <form onSubmit={handleOAuthUsernameSubmit} className="space-y-4 text-left">
              <p className="text-xs text-purple-300 text-center bg-purple-900/10 border border-purple-500/20 p-4 rounded-2xl leading-relaxed">
                Successful connection! Please pick your unique username and enter your phone number to associate with your profile.
              </p>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Pick a unique username"
                  className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone Number (e.g. +21355000000)"
                  className="w-full bg-black border border-purple-900/30 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Complete & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
