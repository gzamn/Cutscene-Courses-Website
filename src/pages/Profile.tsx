import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { 
  db, auth, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, 
  addDoc, deleteDoc, serverTimestamp, updateProfile, updateEmail, updatePassword 
} from '../firebase';
import { ImageUploader } from '../components/ImageUploader';
import { 
  User, Mail, Lock, Camera, CheckCircle2, AlertCircle, Loader2, Upload, Eye, EyeOff, 
  Grid, Play, Film, Award, Heart, Share2, Plus, Edit3, ExternalLink, Trash2, 
  Check, Globe, Instagram, Youtube, Github, Twitter, Linkedin, 
  Palette, Menu, MoreVertical, X, ChevronRight, Sparkles, SlidersHorizontal
} from 'lucide-react';

interface UserPostItem {
  id: string;
  userId: string;
  username: string;
  userDisplayName: string;
  userAvatar: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  videoUrl?: string;
  software?: string[];
  category?: string;
  externalUrl?: string;
  likesCount: number;
  likes?: string[];
  createdAt: any;
}

interface CertificateItem {
  id: string;
  courseId: string;
  courseTitle: string;
  userName: string;
  issuedAt: string;
  certificateUrl?: string;
}

interface ProfileThemeGradient {
  color1: string;
  color2: string;
  name?: string;
}

const DEFAULT_GRADIENT: ProfileThemeGradient = {
  color1: '#8b5cf6', // Purple
  color2: '#ec4899', // Pink
  name: 'Neon Cyber'
};

const GRADIENT_PRESETS: ProfileThemeGradient[] = [
  { name: 'Neon Cyber', color1: '#8b5cf6', color2: '#ec4899' },
  { name: 'Deep Aurora', color1: '#06b6d4', color2: '#3b82f6' },
  { name: 'Emerald Wave', color1: '#10b981', color2: '#059669' },
  { name: 'Sunset Lava', color1: '#f43f5e', color2: '#fb923c' },
  { name: 'Electric Gold', color1: '#eab308', color2: '#d97706' },
  { name: 'Midnight Violet', color1: '#6366f1', color2: '#a855f7' },
  { name: 'Dark Slate', color1: '#475569', color2: '#1e293b' },
  { name: 'Crimson Blood', color1: '#dc2626', color2: '#7f1d1d' },
];

const AVAILABLE_SOFTWARE = [
  'Adobe Premiere Pro',
  'DaVinci Resolve',
  'Adobe After Effects',
  'CapCut Pro',
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Blender 3D',
  'Cinema 4D',
  'Final Cut Pro',
  'Audition'
];

export default function Profile() {
  const { userId: paramUserId, username: paramUsername } = useParams<{ userId?: string; username?: string }>();
  const { user: currentUser, userProfile: currentUserProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mode: is current user's own profile?
  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileUserId, setProfileUserId] = useState<string>('');
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  // Active tab: 'posts' | 'reels' | 'certificates'
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'certificates'>('posts');

  // Data lists
  const [posts, setPosts] = useState<UserPostItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);

  // Hamburger Menu Dropdown
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [showGradientModal, setShowGradientModal] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<UserPostItem | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateItem | null>(null);

  // Profile Box Custom Gradient
  const [themeGradient, setThemeGradient] = useState<ProfileThemeGradient>(DEFAULT_GRADIENT);
  const [tempGradient, setTempGradient] = useState<ProfileThemeGradient>(DEFAULT_GRADIENT);
  const [savingGradient, setSavingGradient] = useState<boolean>(false);

  // Avatar direct upload
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    headline: '',
    bio: '',
    website: '',
    location: '',
    skills: [] as string[],
    social_instagram: '',
    social_youtube: '',
    social_behance: '',
    social_github: '',
    social_twitter: '',
    social_linkedin: ''
  });
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Account Settings Form State (Security)
  const [emailInput, setEmailInput] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [savingSecurity, setSavingSecurity] = useState<boolean>(false);

  // New Post Form State
  const [postForm, setPostForm] = useState({
    title: '',
    caption: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video',
    videoUrl: '',
    software: [] as string[],
    externalUrl: ''
  });
  const [submittingPost, setSubmittingPost] = useState<boolean>(false);

  // Close hamburger menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Determine which user profile to fetch
  useEffect(() => {
    const resolveTargetUser = async () => {
      setLoadingProfile(true);
      try {
        let targetUid = '';

        if (paramUserId) {
          targetUid = paramUserId;
        } else if (paramUsername) {
          // Search user by username in Firestore
          const usersQuery = query(collection(db, 'users'), where('username', '==', paramUsername.toLowerCase()));
          const userSnap = await getDocs(usersQuery);
          if (!userSnap.empty) {
            targetUid = userSnap.docs[0].id;
          } else {
            toast.error('User with this username was not found.');
          }
        } else if (currentUser) {
          targetUid = currentUser.uid;
        }

        if (targetUid) {
          setProfileUserId(targetUid);
          const isCurrentUserOwner = currentUser ? currentUser.uid === targetUid : false;
          setIsOwner(isCurrentUserOwner);

          // Fetch user doc
          const userDoc = await getDoc(doc(db, 'users', targetUid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfileData(data);

            // Load saved theme gradient
            if (data.themeGradient && data.themeGradient.color1 && data.themeGradient.color2) {
              setThemeGradient(data.themeGradient);
              setTempGradient(data.themeGradient);
            }
            
            // Populate form state if owner
            if (isCurrentUserOwner) {
              setEditForm({
                displayName: data.displayName || currentUser?.displayName || '',
                username: data.username || (currentUser?.email ? currentUser.email.split('@')[0] : ''),
                headline: data.headline || 'Creative Video Editor & Visual Artist',
                bio: data.bio || '',
                website: data.website || '',
                location: data.location || 'Algiers, Algeria',
                skills: Array.isArray(data.skills) ? data.skills : ['Adobe Premiere Pro', 'DaVinci Resolve'],
                social_instagram: data.socialLinks?.instagram || '',
                social_youtube: data.socialLinks?.youtube || '',
                social_behance: data.socialLinks?.behance || '',
                social_github: data.socialLinks?.github || '',
                social_twitter: data.socialLinks?.twitter || '',
                social_linkedin: data.socialLinks?.linkedin || ''
              });
              setEmailInput(currentUser?.email || '');
            }
          } else if (isCurrentUserOwner && currentUser) {
            // Document doesn't exist yet, fallback to auth
            const initialData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Creative Student',
              email: currentUser.email,
              username: currentUser.email ? currentUser.email.split('@')[0] : 'creator',
              role: currentUser.email?.toLowerCase() === 'aminerouabhia14@gmail.com' ? 'admin' : 'student',
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
              headline: 'Creative Video Editor & Student',
              bio: 'Passionate about cinematic editing, color grading, and creative storytelling.',
              location: 'Algiers, Algeria',
              skills: ['Adobe Premiere Pro', 'DaVinci Resolve'],
              themeGradient: DEFAULT_GRADIENT
            };
            setProfileData(initialData);
            setEditForm({
              displayName: initialData.displayName,
              username: initialData.username,
              headline: initialData.headline,
              bio: initialData.bio,
              website: '',
              location: initialData.location,
              skills: initialData.skills,
              social_instagram: '',
              social_youtube: '',
              social_behance: '',
              social_github: '',
              social_twitter: '',
              social_linkedin: ''
            });
            setEmailInput(currentUser.email || '');
          }
        }
      } catch (err: any) {
        console.error('Error fetching target profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    resolveTargetUser();
  }, [paramUserId, paramUsername, currentUser]);

  // Fetch posts and certificates for this user
  const fetchUserContent = async (uid: string) => {
    if (!uid) return;
    setLoadingPosts(true);
    try {
      // 1. Fetch User Posts
      const postsQuery = query(collection(db, 'user_posts'), where('userId', '==', uid));
      const postsSnap = await getDocs(postsQuery);
      const postsList: UserPostItem[] = postsSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || uid,
          username: data.username || profileData?.username || 'creator',
          userDisplayName: data.userDisplayName || profileData?.displayName || 'Creative Student',
          userAvatar: data.userAvatar || profileData?.photoURL || '',
          title: data.title || 'Portfolio Work',
          caption: data.caption || '',
          mediaUrl: data.mediaUrl || '',
          mediaType: data.mediaType || (data.videoUrl ? 'video' : 'image'),
          videoUrl: data.videoUrl || '',
          software: Array.isArray(data.software) ? data.software : [],
          category: data.category || '',
          externalUrl: data.externalUrl || '',
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : (Array.isArray(data.likes) ? data.likes.length : 0),
          likes: Array.isArray(data.likes) ? data.likes : [],
          createdAt: data.createdAt
        };
      });

      // Sort newest first
      postsList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setPosts(postsList);

      // 2. Fetch Certificates
      const certsQuery = query(collection(db, 'certificates'), where('uid', '==', uid));
      const certsSnap = await getDocs(certsQuery);
      const certsList: CertificateItem[] = certsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as any));
      setCertificates(certsList);

    } catch (err: any) {
      console.error('Error fetching user portfolio items:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (profileUserId) {
      fetchUserContent(profileUserId);
    }
  }, [profileUserId]);

  // Derived user display variables
  const displayName = profileData?.displayName || currentUser?.displayName || 'Creative Creator';
  const username = profileData?.username || (profileData?.email ? profileData.email.split('@')[0] : 'creator');
  const avatarUrl = profileData?.photoURL || profileData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUserId || 'user'}`;
  const headline = profileData?.headline || 'Creative Video Editor & Digital Artist';
  const bio = profileData?.bio || 'Cinematic storytelling, visual pacing, and advanced color grading. Welcome to my creative portfolio!';
  const role = profileData?.role || (currentUser?.email?.toLowerCase() === 'aminerouabhia14@gmail.com' ? 'admin' : 'student');
  const website = profileData?.website || '';
  const location = profileData?.location || 'Algiers, Algeria';
  const skills: string[] = Array.isArray(profileData?.skills) ? profileData.skills : ['Adobe Premiere Pro', 'DaVinci Resolve'];
  const socialLinks = profileData?.socialLinks || {};

  // Total likes counter
  const totalLikes = posts.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
  const videoReelsPosts = posts.filter(p => p.mediaType === 'video' || !!p.videoUrl);

  // Avatar Upload Handler
  const handleDirectAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    const file = files[0];

    setUploadingAvatar(true);

    try {
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || 'avatar.jpg' })
      });

      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || `Upload authorization failed with status ${signRes.status}`);
      }
      const signData = await signRes.json();

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to stream upload payload to Bunny.');
      }

      const uploadResult = await uploadRes.json();
      const photoURL = uploadResult.publicUrl;

      // Update Auth Profile
      await updateProfile(currentUser, { photoURL });

      // Update Firestore User Profile
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { 
        photoURL,
        avatar: photoURL,
        photoUrl: photoURL
      });

      setProfileData((prev: any) => ({ ...prev, photoURL, avatar: photoURL }));
      toast.success('Profile picture updated successfully!');
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      toast.error(`Upload failed: ${err.message || 'Error occurred'}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);

    try {
      const cleanUsername = editForm.username.toLowerCase().replace(/[^a-z0-9._]/g, '');
      const userRef = doc(db, 'users', currentUser.uid);

      const updatedFields = {
        displayName: editForm.displayName,
        username: cleanUsername,
        headline: editForm.headline,
        bio: editForm.bio,
        website: editForm.website,
        location: editForm.location,
        skills: editForm.skills,
        socialLinks: {
          instagram: editForm.social_instagram,
          youtube: editForm.social_youtube,
          behance: editForm.social_behance,
          github: editForm.social_github,
          twitter: editForm.social_twitter,
          linkedin: editForm.social_linkedin
        },
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, updatedFields, { merge: true });

      // Also update Auth displayName if changed
      if (editForm.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: editForm.displayName });
      }

      setProfileData((prev: any) => ({ ...prev, ...updatedFields }));
      setShowEditProfileModal(false);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Custom Gradient Theme
  const handleSaveGradient = async () => {
    if (!currentUser) return;
    setSavingGradient(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        themeGradient: tempGradient
      });
      setThemeGradient(tempGradient);
      setShowGradientModal(false);
      toast.success('Profile gradient theme updated!');
    } catch (err: any) {
      console.error('Error updating profile gradient:', err);
      toast.error('Failed to save profile theme.');
    } finally {
      setSavingGradient(false);
    }
  };

  // Save Security Settings
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword && newPassword !== confirmPassword) {
      toast.warning('Passwords do not match.');
      return;
    }

    setSavingSecurity(true);
    try {
      if (emailInput && emailInput !== currentUser.email) {
        await updateEmail(currentUser, emailInput);
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { email: emailInput });
      }

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      setShowSecurityModal(false);
      toast.success('Security settings updated successfully!');
    } catch (err: any) {
      console.error('Security error:', err);
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Please log in again before changing credentials.');
      } else {
        toast.error(err.message || 'Error updating security settings.');
      }
    } finally {
      setSavingSecurity(false);
    }
  };

  // Create New Post Handler
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!postForm.title) {
      toast.warning('Please enter a project title.');
      return;
    }
    if (!postForm.mediaUrl && !postForm.videoUrl) {
      toast.warning('Please provide an image cover or video link.');
      return;
    }

    setSubmittingPost(true);
    try {
      const isVideo = postForm.mediaType === 'video' || !!postForm.videoUrl;
      const effectiveMediaUrl = postForm.mediaUrl || (postForm.videoUrl.includes('youtu') ? `https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800` : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800');
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

      const newPostPayload = {
        userId: currentUser.uid,
        username: username,
        userDisplayName: displayName,
        userAvatar: avatarUrl,
        title: postForm.title,
        caption: postForm.caption,
        mediaUrl: effectiveMediaUrl,
        mediaType: mediaType,
        videoUrl: postForm.videoUrl || '',
        software: postForm.software,
        externalUrl: postForm.externalUrl || '',
        likesCount: 0,
        likes: [],
        createdAt: serverTimestamp()
      };

      const postRef = await addDoc(collection(db, 'user_posts'), newPostPayload);
      
      // Update local state
      const createdItem: UserPostItem = {
        id: postRef.id,
        ...newPostPayload,
        createdAt: new Date().toISOString()
      };

      setPosts(prev => [createdItem, ...prev]);
      setShowCreatePostModal(false);
      setPostForm({
        title: '',
        caption: '',
        mediaUrl: '',
        mediaType: 'image',
        videoUrl: '',
        software: [],
        externalUrl: ''
      });
      toast.success('Portfolio post published successfully!');
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast.error('Failed to create post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Like Post Handler
  const handleToggleLike = async (post: UserPostItem) => {
    if (!currentUser) {
      toast.info('Please sign in to like portfolio posts.');
      return;
    }

    const currentLikes = post.likes || [];
    const isLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = isLiked
      ? currentLikes.filter(id => id !== currentUser.uid)
      : [...currentLikes, currentUser.uid];

    const updatedCount = updatedLikes.length;

    // Optimistic UI update
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: updatedLikes, likesCount: updatedCount } : p));
    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost({ ...selectedPost, likes: updatedLikes, likesCount: updatedCount });
    }

    try {
      const postRef = doc(db, 'user_posts', post.id);
      await updateDoc(postRef, {
        likes: updatedLikes,
        likesCount: updatedCount
      });
    } catch (err) {
      console.error('Failed to update like status:', err);
    }
  };

  // Delete Post Handler
  const handleDeletePost = async (postId: string) => {
    if (!isOwner && role !== 'admin') return;
    if (!window.confirm('Are you sure you want to delete this portfolio post?')) return;

    try {
      await deleteDoc(doc(db, 'user_posts', postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(null);
      }
      toast.success('Post removed from portfolio.');
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post.');
    }
  };

  // Share Profile Link
  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      navigator.share({
        title: `${displayName} (@${username}) - Creative Portfolio`,
        text: `Check out ${displayName}'s creative portfolio!`,
        url: profileUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Portfolio link copied to clipboard!');
    }
    setMenuOpen(false);
  };

  // Helper convert video URL to embed
  const getEmbedVideoUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (url.includes('watch?v=')) {
      const id = url.split('watch?v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return url;
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#07050f] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-sm font-mono text-gray-400 uppercase tracking-widest">Loading creator profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07050f] text-white pt-28 pb-28 px-4 sm:px-6 lg:px-8 selection:bg-purple-600 selection:text-white relative">
      <div className="max-w-5xl mx-auto">
        
        {/* ========================================================================= */}
        {/* CUSTOMIZABLE GRADIENT HERO PROFILE BOX                                     */}
        {/* ========================================================================= */}
        <div 
          className="bg-zinc-950/80 border border-white/10 rounded-[2.5rem] p-6 sm:p-10 mb-10 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-500"
          style={{
            borderColor: `${themeGradient.color1}33`
          }}
        >
          
          {/* Dynamic Ambient Background Glows from User's Editable Gradient */}
          <div 
            className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none -mr-28 -mt-28 transition-colors duration-700 opacity-20"
            style={{ backgroundColor: themeGradient.color1 }}
          />
          <div 
            className="absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full blur-3xl pointer-events-none -ml-28 -mb-28 transition-colors duration-700 opacity-20"
            style={{ backgroundColor: themeGradient.color2 }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
            
            {/* AVATAR (Clean, No Story Circle) */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-zinc-900 border-2 border-white/15 shadow-2xl relative">
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                  )}
                  <img 
                    src={avatarUrl} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Hover Camera Overlay if owner */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-10"
                      title="Change Profile Photo"
                    >
                      <Camera className="w-6 h-6 mb-1 text-purple-300" />
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Change</span>
                    </button>
                  )}
                </div>

                {/* Role Status Tag */}
                <div className="absolute bottom-0 right-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-widest border shadow-lg ${
                    role === 'admin' 
                      ? 'bg-purple-600 text-white border-purple-400 shadow-purple-600/50' 
                      : role === 'instructor' 
                      ? 'bg-amber-500 text-black border-amber-300 shadow-amber-500/50 font-extrabold'
                      : 'bg-zinc-900 text-purple-300 border-purple-500/40'
                  }`}>
                    {role === 'admin' ? 'ADMIN' : role === 'instructor' ? 'INSTRUCTOR' : 'CREATOR'}
                  </span>
                </div>
              </div>

              {/* Hidden Avatar Input */}
              <input 
                type="file" 
                ref={avatarFileRef} 
                onChange={handleDirectAvatarUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* PROFILE INFO & HAMBURGER MENU */}
            <div className="flex-1 text-center md:text-left space-y-4 w-full">
              
              {/* TOP ROW: BIG DISPLAY NAME ON TOP, @USERNAME UNDER, & HAMBURGER MENU */}
              <div className="flex items-start justify-between gap-4">
                
                {/* Display Name (Bigger on top) + @Username Under */}
                <div className="space-y-0.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {displayName}
                  </h1>
                  <p className="text-sm font-mono text-purple-400 font-medium">
                    {username.startsWith('@') ? username : `@${username}`}
                  </p>
                </div>

                {/* HAMBURGER MENU DROPDOWN */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-purple-500/40 text-gray-300 hover:text-white rounded-2xl transition-all cursor-pointer shadow-lg"
                    title="Profile Options"
                    aria-label="Profile Options Menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  {/* Dropdown Menu Popup */}
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 z-50 w-60 bg-zinc-950 border border-purple-900/40 rounded-2xl p-2 shadow-2xl backdrop-blur-xl space-y-1"
                      >
                        {isOwner ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpen(false);
                                setShowEditProfileModal(true);
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-950/60 transition-colors text-left cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 text-purple-400" />
                              <span>Edit Profile</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpen(false);
                                setTempGradient(themeGradient);
                                setShowGradientModal(true);
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-950/60 transition-colors text-left cursor-pointer"
                            >
                              <Palette className="w-4 h-4 text-pink-400" />
                              <span>Box Gradient & Theme</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpen(false);
                                setShowSecurityModal(true);
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-950/60 transition-colors text-left cursor-pointer"
                            >
                              <Lock className="w-4 h-4 text-emerald-400" />
                              <span>Security & Credentials</span>
                            </button>

                            <div className="h-px bg-white/10 my-1" />

                            <button
                              type="button"
                              onClick={handleShareProfile}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-950/60 transition-colors text-left cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-blue-400" />
                              <span>Share Profile Link</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleShareProfile}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-950/60 transition-colors text-left cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-blue-400" />
                              <span>Share Profile Link</span>
                            </button>
                            
                            {website && (
                              <a
                                href={website.startsWith('http') ? website : `https://${website}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setMenuOpen(false)}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-purple-950/60 transition-colors text-left"
                              >
                                <ExternalLink className="w-4 h-4 text-purple-400" />
                                <span>Visit Website</span>
                              </a>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* STATS ROW (Clean Counts) */}
              <div className="flex items-center justify-center md:justify-start gap-8 py-2.5 border-y border-white/5 font-mono text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-base">{posts.length}</span>
                  <span className="text-gray-400 text-xs uppercase tracking-wider">posts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-base">{certificates.length}</span>
                  <span className="text-gray-400 text-xs uppercase tracking-wider">certs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-purple-400 text-base">{totalLikes}</span>
                  <span className="text-gray-400 text-xs uppercase tracking-wider">likes</span>
                </div>
              </div>

              {/* HEADLINE & BIO */}
              <div className="space-y-2">
                {headline && (
                  <p className="text-xs text-purple-300 font-semibold font-mono tracking-wide">{headline}</p>
                )}

                {/* Multiline Bio */}
                {bio && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line max-w-2xl font-normal">
                    {bio}
                  </p>
                )}

                {/* Links & Location */}
                <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 pt-1">
                  {location && (
                    <span className="flex items-center gap-1">
                      <span className="text-purple-400">📍</span>
                      <span>{location}</span>
                    </span>
                  )}

                  {website && (
                    <a 
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>

                {/* Social Chips */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {socialLinks.instagram && (
                    <a 
                      href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-zinc-900/90 hover:bg-purple-950 border border-purple-900/40 rounded-lg text-[11px] text-pink-400 font-mono flex items-center gap-1.5 transition-all"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <span>@{socialLinks.instagram.replace('@', '')}</span>
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a 
                      href={socialLinks.youtube.startsWith('http') ? socialLinks.youtube : `https://youtube.com/${socialLinks.youtube}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-zinc-900/90 hover:bg-purple-950 border border-purple-900/40 rounded-lg text-[11px] text-red-400 font-mono flex items-center gap-1.5 transition-all"
                    >
                      <Youtube className="w-3.5 h-3.5" />
                      <span>YouTube</span>
                    </a>
                  )}
                  {socialLinks.behance && (
                    <a 
                      href={socialLinks.behance.startsWith('http') ? socialLinks.behance : `https://behance.net/${socialLinks.behance}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-zinc-900/90 hover:bg-purple-950 border border-purple-900/40 rounded-lg text-[11px] text-blue-400 font-mono flex items-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Behance</span>
                    </a>
                  )}
                  {socialLinks.github && (
                    <a 
                      href={`https://github.com/${socialLinks.github}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-zinc-900/90 hover:bg-purple-950 border border-purple-900/40 rounded-lg text-[11px] text-gray-300 font-mono flex items-center gap-1.5 transition-all"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                    </a>
                  )}
                </div>

                {/* Software Skills Pills */}
                {skills.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                    {skills.map((skill, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-0.5 bg-purple-950/50 border border-purple-500/20 text-purple-300 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CLEAN PROFILE TABS                                                         */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-center border-t border-purple-950/40 mb-8">
          <div className="flex items-center gap-2 sm:gap-8 overflow-x-auto py-2">
            
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold uppercase tracking-widest border-t-2 transition-all cursor-pointer ${
                activeTab === 'posts'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Posts ({posts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold uppercase tracking-widest border-t-2 transition-all cursor-pointer ${
                activeTab === 'reels'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Reels ({videoReelsPosts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('certificates')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold uppercase tracking-widest border-t-2 transition-all cursor-pointer ${
                activeTab === 'certificates'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Certificates ({certificates.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PORTFOLIO POSTS GRID (Simple & Clean, No Category Filters)          */}
        {/* ========================================================================= */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {loadingPosts ? (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                <p className="text-xs font-mono text-gray-500">Loading portfolio pieces...</p>
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {posts.map(post => {
                  const isVideo = post.mediaType === 'video' || !!post.videoUrl;
                  const isLikedByCurrentUser = currentUser && (post.likes || []).includes(currentUser.uid);

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square bg-zinc-950 rounded-2xl overflow-hidden border border-purple-950/30 cursor-pointer shadow-lg hover:border-purple-500/50 transition-all duration-300"
                    >
                      {/* Image / Video Thumbnail */}
                      <img
                        src={post.mediaUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />

                      {/* Video Indicator Badge */}
                      {isVideo && (
                        <div className="absolute top-3 right-3 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10">
                          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                        </div>
                      )}

                      {/* Dark Hover Overlay */}
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4 text-white">
                        <div className="flex justify-end items-start">
                          {(isOwner || role === 'admin') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePost(post.id);
                              }}
                              className="p-1.5 bg-red-950/80 text-red-400 hover:text-white rounded-lg border border-red-500/30 transition-colors"
                              title="Delete Post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Title & Stats */}
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-white line-clamp-1">{post.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="flex items-center gap-1 text-pink-400">
                              <Heart className={`w-3.5 h-3.5 ${isLikedByCurrentUser ? 'fill-current' : ''}`} />
                              <span>{post.likesCount || 0}</span>
                            </span>
                            {post.software && post.software.length > 0 && (
                              <span className="text-gray-400 text-[10px] truncate max-w-[140px]">
                                {post.software.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-950/40 rounded-3xl border border-dashed border-purple-900/20 p-8">
                <Grid className="w-12 h-12 text-purple-600/40 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Portfolio Posts Yet</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-5">
                  {isOwner 
                    ? 'Start building your creative portfolio by clicking the floating "+" button on the bottom right!'
                    : 'This creator has not published any portfolio pieces yet.'}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-600/30"
                  >
                    + Create First Post
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REELS / VIDEOS GRID                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'reels' && (
          <div className="space-y-6">
            {videoReelsPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {videoReelsPosts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="group bg-zinc-950 rounded-2xl overflow-hidden border border-purple-900/20 hover:border-purple-500/50 transition-all cursor-pointer shadow-lg"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <img
                        src={post.mediaUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 group-hover:scale-110 transition-transform flex items-center justify-center shadow-lg shadow-purple-600/40 text-white">
                          <Play className="w-5 h-5 fill-current translate-x-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-white line-clamp-1">{post.title}</h4>
                        <span className="text-xs font-mono text-pink-400 flex items-center gap-1 shrink-0">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          <span>{post.likesCount || 0}</span>
                        </span>
                      </div>
                      {post.caption && (
                        <p className="text-xs text-gray-400 line-clamp-2">{post.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-950/40 rounded-3xl border border-dashed border-purple-900/20 p-8">
                <Film className="w-12 h-12 text-purple-600/40 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Video Reels Yet</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-5">
                  Publish video projects with YouTube, Vimeo, or direct media links to showcase them here.
                </p>
                {isOwner && (
                  <button
                    onClick={() => {
                      setPostForm(prev => ({ ...prev, mediaType: 'video' }));
                      setShowCreatePostModal(true);
                    }}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-600/30"
                  >
                    + Add Video Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CERTIFICATES                                                       */}
        {/* ========================================================================= */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            {certificates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {certificates.map(cert => (
                  <div
                    key={cert.id}
                    onClick={() => setSelectedCertificate(cert)}
                    className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-6 hover:border-purple-500/50 transition-all cursor-pointer relative group overflow-hidden shadow-xl"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Verified Credential</div>
                        <div className="text-xs text-gray-400">Issued to {cert.userName || displayName}</div>
                      </div>
                    </div>

                    <h4 className="font-bold text-base text-white mb-2 line-clamp-1">{cert.courseTitle || 'Course Completion'}</h4>
                    <p className="text-[11px] text-gray-500 font-mono mb-4">
                      Issued on {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'Active Credential'}
                    </p>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-purple-400 font-bold">
                      <span>View Official Certificate</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-950/40 rounded-3xl border border-dashed border-purple-900/20 p-8">
                <Award className="w-12 h-12 text-purple-600/40 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Certificates Earned Yet</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-5">
                  Complete academy courses and pass curriculum assessments to earn official verifiable digital diplomas.
                </p>
                <Link
                  to="/courses"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-600/30 inline-block"
                >
                  Explore Courses
                </Link>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* FLOATING "+" CIRCULAR BUTTON (Bottom Right)                                */}
      {/* ========================================================================= */}
      {isOwner && (
        <button
          type="button"
          onClick={() => setShowCreatePostModal(true)}
          className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 hover:scale-110 active:scale-95 shadow-2xl shadow-purple-600/50 flex items-center justify-center text-white cursor-pointer transition-all duration-300 group border border-white/20"
          title="Create New Portfolio Post"
          aria-label="Create New Portfolio Post"
        >
          <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROFILE BOX GRADIENT / THEME CUSTOMIZER                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showGradientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full my-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-purple-950/40 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-pink-400" />
                    <span>Profile Box Gradient Colors</span>
                  </h3>
                  <p className="text-xs text-gray-400">Choose gradient presets or pick custom colors for your profile header.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGradientModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="mb-6">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-2">Live Preview</label>
                <div 
                  className="h-28 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden border border-white/20 shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${tempGradient.color1}40 0%, ${tempGradient.color2}40 100%)`
                  }}
                >
                  <div 
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-xl opacity-60"
                    style={{ backgroundColor: tempGradient.color1 }}
                  />
                  <div 
                    className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-xl opacity-60"
                    style={{ backgroundColor: tempGradient.color2 }}
                  />
                  <div className="relative z-10">
                    <span className="text-xs font-bold text-white">{displayName}</span>
                    <p className="text-[10px] font-mono text-purple-200">@{username}</p>
                  </div>
                  <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-gray-300">
                    <span>Color 1: {tempGradient.color1}</span>
                    <span>Color 2: {tempGradient.color2}</span>
                  </div>
                </div>
              </div>

              {/* GRADIENT PRESETS */}
              <div className="mb-6">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-2.5">Preset Palettes</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {GRADIENT_PRESETS.map((preset) => {
                    const isSelected = tempGradient.color1 === preset.color1 && tempGradient.color2 === preset.color2;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setTempGradient(preset)}
                        className={`p-2.5 rounded-xl border transition-all text-left flex flex-col gap-2 cursor-pointer ${
                          isSelected 
                            ? 'border-white bg-purple-950/60 shadow-md ring-1 ring-white/50' 
                            : 'border-purple-900/30 bg-zinc-900 hover:border-purple-500/40'
                        }`}
                      >
                        <div 
                          className="h-6 w-full rounded-lg shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${preset.color1}, ${preset.color2})`
                          }}
                        />
                        <span className="text-[10px] font-bold text-gray-300 truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM COLOR PICKERS */}
              <div className="mb-6 p-4 bg-zinc-900/80 rounded-2xl border border-purple-900/30 space-y-3">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">Custom Hex Pickers</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Color 1 (Top/Right Glow)</label>
                    <div className="flex items-center gap-2 bg-black border border-purple-900/30 rounded-xl p-1.5">
                      <input
                        type="color"
                        value={tempGradient.color1}
                        onChange={(e) => setTempGradient(prev => ({ ...prev, color1: e.target.value, name: 'Custom' }))}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={tempGradient.color1}
                        onChange={(e) => setTempGradient(prev => ({ ...prev, color1: e.target.value, name: 'Custom' }))}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Color 2 (Bottom/Left Glow)</label>
                    <div className="flex items-center gap-2 bg-black border border-purple-900/30 rounded-xl p-1.5">
                      <input
                        type="color"
                        value={tempGradient.color2}
                        onChange={(e) => setTempGradient(prev => ({ ...prev, color2: e.target.value, name: 'Custom' }))}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={tempGradient.color2}
                        onChange={(e) => setTempGradient(prev => ({ ...prev, color2: e.target.value, name: 'Custom' }))}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGradientModal(false)}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGradient}
                  disabled={savingGradient}
                  className="flex-1 py-3 bg-brand-radial text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  {savingGradient ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Gradient...</span>
                    </>
                  ) : (
                    <span>Apply & Save Gradient</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: SECURITY & CREDENTIALS                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSecurityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-md w-full my-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-purple-950/40 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-400" />
                    <span>Security & Credentials</span>
                  </h3>
                  <p className="text-xs text-gray-400">Update your email address or account password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-black border border-purple-900/30 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-purple-900/30 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-purple-900/30 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 italic">*Leave password fields empty if you don't want to change password.</p>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowSecurityModal(false)}
                    className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSecurity}
                    className="flex-1 py-3 bg-brand-radial text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    {savingSecurity ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Update Credentials</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROFILE                                                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full my-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-purple-950/40 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-purple-400" />
                    <span>Edit Profile Portfolio</span>
                  </h3>
                  <p className="text-xs text-gray-400">Customize your display name, handle, bio, social links, and skills.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Display Name (Prominent)</label>
                    <input
                      type="text"
                      required
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      placeholder="e.g. Amine Rouabhia"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Username Handle (@)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">@</span>
                      <input
                        type="text"
                        required
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })}
                        placeholder="aminerouabhia"
                        className="w-full bg-black border border-purple-900/30 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Headline / Role Subtitle</label>
                  <input
                    type="text"
                    value={editForm.headline}
                    onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                    placeholder="e.g. Senior Video Editor & Colorist 🎬"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">Bio Description</label>
                    <span className="text-[10px] text-gray-500 font-mono">{editForm.bio.length}/300</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write a brief, engaging bio for your profile..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Website Link</label>
                    <input
                      type="text"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      placeholder="e.g. aminerouabhia.com"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="e.g. Algiers, Algeria"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Software Skills Selector */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-2">Editing Software & Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SOFTWARE.map(soft => {
                      const isSelected = editForm.skills.includes(soft);
                      return (
                        <button
                          key={soft}
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              skills: isSelected
                                ? prev.skills.filter(s => s !== soft)
                                : [...prev.skills, soft]
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-zinc-900 text-gray-400 hover:text-white border border-purple-900/20'
                          }`}
                        >
                          {soft}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Social Handles */}
                <div className="border-t border-purple-950/40 pt-4 space-y-3">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">Social Accounts</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                      <input
                        type="text"
                        value={editForm.social_instagram}
                        onChange={(e) => setEditForm({ ...editForm, social_instagram: e.target.value })}
                        placeholder="Instagram handle"
                        className="w-full bg-black border border-purple-900/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="relative">
                      <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      <input
                        type="text"
                        value={editForm.social_youtube}
                        onChange={(e) => setEditForm({ ...editForm, social_youtube: e.target.value })}
                        placeholder="YouTube channel URL"
                        className="w-full bg-black border border-purple-900/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input
                        type="text"
                        value={editForm.social_behance}
                        onChange={(e) => setEditForm({ ...editForm, social_behance: e.target.value })}
                        placeholder="Behance profile link"
                        className="w-full bg-black border border-purple-900/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={editForm.social_github}
                        onChange={(e) => setEditForm({ ...editForm, social_github: e.target.value })}
                        placeholder="GitHub handle"
                        className="w-full bg-black border border-purple-900/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-purple-950/40">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 py-3 bg-brand-radial text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <span>Save Profile</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: CREATE PORTFOLIO POST                                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCreatePostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full my-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-purple-950/40 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-400" />
                    <span>Create Portfolio Post</span>
                  </h3>
                  <p className="text-xs text-gray-400">Share your latest video edit, artwork, or commercial project.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="e.g. Cinematic Color Grading Reel"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">External Project Link (Optional)</label>
                  <input
                    type="url"
                    value={postForm.externalUrl}
                    onChange={(e) => setPostForm({ ...postForm, externalUrl: e.target.value })}
                    placeholder="e.g. https://behance.net/..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <ImageUploader
                  label="Cover Image / Thumbnail"
                  value={postForm.mediaUrl}
                  onChange={(url) => setPostForm({ ...postForm, mediaUrl: url })}
                  helperText="Primary image card displayed on your portfolio grid."
                />

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Video Stream Link (YouTube / Vimeo / MP4)</label>
                  <input
                    type="url"
                    value={postForm.videoUrl}
                    onChange={(e) => setPostForm({ ...postForm, videoUrl: e.target.value, mediaType: e.target.value ? 'video' : 'image' })}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">If provided, this post will feature an embedded video player in Reels.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1">Caption / Project Breakdown</label>
                  <textarea
                    rows={3}
                    value={postForm.caption}
                    onChange={(e) => setPostForm({ ...postForm, caption: e.target.value })}
                    placeholder="Describe your workflow, concept, techniques, and narrative used..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Software Used */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-2">Software Used</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SOFTWARE.map(soft => {
                      const isSelected = postForm.software.includes(soft);
                      return (
                        <button
                          key={soft}
                          type="button"
                          onClick={() => {
                            setPostForm(prev => ({
                              ...prev,
                              software: isSelected
                                ? prev.software.filter(s => s !== soft)
                                : [...prev.software, soft]
                            }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-900 text-gray-400 hover:text-white border border-purple-900/20'
                          }`}
                        >
                          {soft}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-purple-950/40">
                  <button
                    type="button"
                    onClick={() => setShowCreatePostModal(false)}
                    className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPost}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    {submittingPost ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing Post...</span>
                      </>
                    ) : (
                      <span>Publish Portfolio Post</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: POST DETAIL LIGHTBOX                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 z-30 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* LEFT: MEDIA VIEWER */}
              <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
                {selectedPost.videoUrl ? (
                  <div className="w-full h-full aspect-video flex items-center justify-center">
                    <iframe
                      src={getEmbedVideoUrl(selectedPost.videoUrl)}
                      title={selectedPost.title}
                      className="w-full h-full border-0 min-h-[300px] md:min-h-[480px]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <img
                    src={selectedPost.mediaUrl}
                    alt={selectedPost.title}
                    className="w-full h-full max-h-[600px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* RIGHT: AUTHOR INFO & DETAILS */}
              <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto max-h-[500px] md:max-h-[600px] space-y-6">
                <div className="space-y-4">
                  
                  {/* Author Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-purple-950/40">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedPost.userAvatar || avatarUrl}
                        alt={selectedPost.userDisplayName}
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-bold text-sm text-white">{selectedPost.userDisplayName}</div>
                        <div className="text-[11px] text-purple-400 font-mono">@{selectedPost.username}</div>
                      </div>
                    </div>

                    {(isOwner || role === 'admin') && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">{selectedPost.title}</h3>
                  </div>

                  {/* Caption */}
                  {selectedPost.caption && (
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                      {selectedPost.caption}
                    </p>
                  )}

                  {/* Software Tags */}
                  {selectedPost.software && selectedPost.software.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Tools Used:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPost.software.map((sw, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-purple-900/30 text-purple-300 rounded text-[10px] font-mono font-semibold">
                            {sw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* External Project Link */}
                  {selectedPost.externalUrl && (
                    <div className="pt-2">
                      <a
                        href={selectedPost.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-mono underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Project Source</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="border-t border-purple-950/40 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(selectedPost)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-125 cursor-pointer ${
                          currentUser && (selectedPost.likes || []).includes(currentUser.uid)
                            ? 'text-pink-500'
                            : 'text-gray-400 hover:text-pink-400'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${currentUser && (selectedPost.likes || []).includes(currentUser.uid) ? 'fill-current' : ''}`} />
                        <span>{selectedPost.likesCount || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const postUrl = `${window.location.origin}/u/${username}`;
                          navigator.clipboard.writeText(postUrl);
                          toast.success('Post link copied!');
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Share Post"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-gray-500">
                      {selectedPost.createdAt?.toMillis 
                        ? new Date(selectedPost.createdAt.toMillis()).toLocaleDateString()
                        : 'Portfolio Item'}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: CERTIFICATE DETAIL VIEWER                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedCertificate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl text-center relative"
            >
              <button
                type="button"
                onClick={() => setSelectedCertificate(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">Official Academy Diploma</span>
              <h3 className="text-2xl font-black text-white mt-1 mb-2">{selectedCertificate.courseTitle}</h3>
              <p className="text-sm text-gray-400 mb-6">Awarded to <b className="text-white">{selectedCertificate.userName || displayName}</b> for outstanding mastery and practical completion.</p>

              {selectedCertificate.certificateUrl && (
                <div className="rounded-2xl overflow-hidden border border-purple-900/30 mb-6 max-h-60 bg-black">
                  <img src={selectedCertificate.certificateUrl} alt="Diploma Frame" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCertificate(null)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
