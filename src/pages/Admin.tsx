import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, PlusCircle, Sparkles, Check, AlertCircle, ArrowLeft, 
  Layers, ChevronRight, Users, Film, Settings, Trash2, Edit2, 
  CheckCircle, ShieldAlert, Shield, Globe, Award, RefreshCw, X, Save, 
  Video, HelpCircle, Activity, UserCheck, Play, Loader2, Receipt, Bell, Pin,
  Star, ShieldCheck, Trophy, Search, ChevronDown, ZoomIn, ZoomOut, RotateCw, Key, Lock,
  Flame, Upload, Eye, EyeOff, MessageSquare
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc,
  getDoc,
  ensureDefaultHeroVideosSeeded,
  ensureDefaultSpecialOffersSeeded,
  ensureDefaultStatisticsSeeded,
  ensureDefaultQuizzesSeeded,
  ensureDefaultPlansSeeded,
  DEFAULT_STATISTICS,
  DEFAULT_PLANS,
  query,
  where
} from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useRegion } from '../context/RegionContext';
import { DEFAULT_SOFTWARE_OPTIONS } from '../components/SoftwareSelectionModal';
import { CourseSoftwareOption } from '../types';
import { ImageUploader } from '../components/ImageUploader';
import { AdminCommunityManager } from '../components/AdminCommunityManager';

type AdminTab = 'courses' | 'chapters' | 'store-products' | 'store-purchases' | 'useful-resources' | 'plans' | 'students' | 'receipts' | 'student-works' | 'hero-video' | 'settings' | 'offers' | 'statistics' | 'regions' | 'quizzes' | 'exercises' | 'seo' | 'community-control';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function AdminPanel() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Active sub-section
  const [activeTab, setActiveTab] = useState<AdminTab>('courses');

  // Multi-selection states for mass deletion
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedStoreProductIds, setSelectedStoreProductIds] = useState<string[]>([]);
  const [selectedUsefulResourceIds, setSelectedUsefulResourceIds] = useState<string[]>([]);
  const [selectedStudentWorkIds, setSelectedStudentWorkIds] = useState<string[]>([]);

  // Clear selections on tab swap
  useEffect(() => {
    setSelectedCourseIds([]);
    setSelectedStoreProductIds([]);
    setSelectedUsefulResourceIds([]);
    setSelectedStudentWorkIds([]);
  }, [activeTab]);
  
  // Custom Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Database lists
  const [courses, setCourses] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [exerciseSubmissions, setExerciseSubmissions] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);
  const [exerciseActiveSubTab, setExerciseActiveSubTab] = useState<'submissions' | 'configurator'>('submissions');
  const [selectedConfigChapterId, setSelectedConfigChapterId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    title: '',
    videoUrl: '',
    brief: '',
    tasksRaw: ''
  });
  const [showExerciseGradingModal, setShowExerciseGradingModal] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradingForm, setGradingForm] = useState<any>({
    score: 10,
    reviewerNote: '',
    taskResults: {} as { [key: string]: boolean }
  });
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [studentWorks, setStudentWorks] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [storePurchases, setStorePurchases] = useState<any[]>([]);
  const [usefulResources, setUsefulResources] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [planPurchases, setPlanPurchases] = useState<any[]>([]);
  const [loadingPlanPurchases, setLoadingPlanPurchases] = useState<boolean>(false);
  const [planActiveSubTab, setPlanActiveSubTab] = useState<'tiers' | 'receipts'>('tiers');
  const [heroVideos, setHeroVideos] = useState<any[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<any>({
    webName: 'CUTSCENE Academy',
    contactEmail: 'contact@cutscene-academy.com',
    instagram: 'https://www.instagram.com/cutscene.dz/',
    youtube: 'https://youtube.com/cutscene',
    discord: 'https://discord.gg/cutscene',
    // Dynamic Coming Soon Parameters
    isSoftwaresComingSoon: true,
    softwaresComingSoonText: 'We are preparing professional software applications, editors, and helper tool configuration bundles. Stay tuned!',
    isVideosComingSoon: true,
    videosComingSoonText: 'Exclusive raw 4K cinematic overlays and atmospheric video assets are currently rendering.',
    isImagesComingSoon: true,
    imagesComingSoonText: 'Studio high-definition lightmaps, background style textures, and photorealistic overlays are being sorted.',
    isMusicComingSoon: true,
    musicComingSoonText: 'Lofi background beats and epic orchestral tracks are under production by our studio composers.',
    isSoundEffectsComingSoon: true,
    soundEffectsComingSoonText: 'Acoustic swooshes, low loops, and tech feedback effects are being processed in our foley library.',
    isPlansComingSoon: false,
    plansComingSoonText: 'Membership sub-packages are coming soon. Access is strictly granted through direct course purchases for now!'
  });

  // Special promotional combo offers states
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [loadingSpecialOffers, setLoadingSpecialOffers] = useState(false);
  const [showSpecialOfferModal, setShowSpecialOfferModal] = useState(false);
  const [editingSpecialOfferId, setEditingSpecialOfferId] = useState<string | null>(null);

  // Shipped Accounts management states
  const [isShippedAccountsModalOpen, setIsShippedAccountsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentPurchases, setStudentPurchases] = useState<any[]>([]);
  const [studentShippedAccounts, setStudentShippedAccounts] = useState<any[]>([]);
  const [shippedAccountsLoading, setShippedAccountsLoading] = useState(false);
  const [accountEmails, setAccountEmails] = useState<{[key: string]: string}>({});
  const [accountPasswords, setAccountPasswords] = useState<{[key: string]: string}>({});

  // Direct Image upload handling states
  const [promoUploading, setPromoUploading] = useState(false);
  const promoFileRef = useRef<HTMLInputElement>(null);
  const storeProductFileRef = useRef<HTMLInputElement>(null);
  const usefulResourceFileRef = useRef<HTMLInputElement>(null);

  const uploadPromoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setPromoUploading(true);
    try {
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || 'promo_cover.jpg' })
      });
      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || `Signed URL signing failed with status ${signRes.status}`);
      }
      const signData = await signRes.json();

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`Upload proxy failed (${uploadRes.status}): ${errText}`);
      }
      const uploadResult = await uploadRes.json();
      
      setSpecialOfferForm(prev => ({ ...prev, imageUrl: uploadResult.publicUrl }));
      showToast('success', 'Promo Bundle Cover Image imported successfully!');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      showToast('error', `Failed to upload image: ${err.message || err}`);
    } finally {
      setPromoUploading(false);
    }
  };

  const [storeProductUploading, setStoreProductUploading] = useState(false);
  const [usefulResourceUploading, setUsefulResourceUploading] = useState(false);

  const uploadStoreProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setStoreProductUploading(true);
    try {
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || 'store_product.jpg' })
      });
      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || `Signed URL signing failed with status ${signRes.status}`);
      }
      const signData = await signRes.json();

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`Upload proxy failed (${uploadRes.status}): ${errText}`);
      }
      const uploadResult = await uploadRes.json();
      
      setStoreProductForm(prev => ({ ...prev, imageUrl: uploadResult.publicUrl }));
      showToast('success', 'Store Product Image imported successfully!');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      showToast('error', `Failed to upload image: ${err.message || err}`);
    } finally {
      setStoreProductUploading(false);
    }
  };

  const uploadUsefulResourceLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setUsefulResourceUploading(true);
    try {
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || 'resource_logo.jpg' })
      });
      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || `Signed URL signing failed with status ${signRes.status}`);
      }
      const signData = await signRes.json();

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`Upload proxy failed (${uploadRes.status}): ${errText}`);
      }
      const uploadResult = await uploadRes.json();
      
      setUsefulResourceForm(prev => ({ ...prev, logoUrl: uploadResult.publicUrl }));
      showToast('success', 'Resource logo imported successfully!');
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      showToast('error', `Failed to upload logo: ${err.message || err}`);
    } finally {
      setUsefulResourceUploading(false);
    }
  };

  const [specialOfferForm, setSpecialOfferForm] = useState({
    id: '',
    titleEn: '',
    titleFr: '',
    titleAr: '',
    descriptionEn: '',
    descriptionFr: '',
    descriptionAr: '',
    courseIds: [] as string[],
    originalPrice: '',
    price: '',
    currency: 'DA',
    imageUrl: '',
    badgeEn: '',
    badgeFr: '',
    badgeAr: '',
    active: true
  });

  // Homepage statistics console states
  const [statisticsList, setStatisticsList] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [statForm, setStatForm] = useState({
    id: '',
    value: '',
    labelEn: '',
    labelFr: '',
    labelAr: '',
    iconName: 'Users',
    order: 1
  });

  // Selected state for chapters course-filter
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Resource triggers console states
  const [resourceTriggers, setResourceTriggers] = useState<any[]>([]);
  const [loadingTriggers, setLoadingTriggers] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [triggerForm, setTriggerForm] = useState({
    courseId: '',
    chapter: '',
    type: 'session',
    timeMinutes: 0,
    timeSeconds: 0,
    isActive: true,
    alertTitle: 'Important Lesson Assets',
    alertText: 'Download the workspace material from the Resources card on the right to start your project.',
    showAlertOnScreen: true
  });

  // Regions Config States & syncing hooks
  const { regions, refreshRegions } = useRegion();
  const [selectedAdminRegionId, setSelectedAdminRegionId] = useState<string>('DZ');
  const [regionForm, setRegionForm] = useState({
    id: '',
    name: '',
    currency: '',
    symbol: '',
    multiplier: 1.0,
    isDefault: false
  });
  const [editingPaymentMethods, setEditingPaymentMethods] = useState<any[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [isSavingRegionSettings, setIsSavingRegionSettings] = useState(false);

  useEffect(() => {
    // Select first region when loaded if DZ doesn't exist
    if (regions.length > 0 && !regions.find(r => r.id === selectedAdminRegionId)) {
      setSelectedAdminRegionId(regions[0].id);
    }
  }, [regions]);

  useEffect(() => {
    const reg = regions.find(r => r.id === selectedAdminRegionId);
    if (reg) {
      setRegionForm({
        id: reg.id,
        name: reg.name,
        currency: reg.currency,
        symbol: reg.symbol,
        multiplier: reg.multiplier || 1.0,
        isDefault: reg.isDefault || false
      });
      setEditingPaymentMethods(reg.paymentMethods || []);
      
      // Sync overrides mapping for courses, plans, offers
      const overrides: Record<string, string> = {};
      courses.forEach(c => {
        if (c.regionalPrices && c.regionalPrices[selectedAdminRegionId] !== undefined) {
          overrides[c.id] = String(c.regionalPrices[selectedAdminRegionId]);
        }
      });
      plans.forEach(p => {
        if (p.regionalPrices && p.regionalPrices[selectedAdminRegionId] !== undefined) {
          overrides[p.id] = String(p.regionalPrices[selectedAdminRegionId]);
        }
      });
      specialOffers.forEach(o => {
        if (o.regionalPrices && o.regionalPrices[selectedAdminRegionId] !== undefined) {
          overrides[o.id] = String(o.regionalPrices[selectedAdminRegionId]);
        }
      });
      setPriceOverrides(overrides);
    }
  }, [selectedAdminRegionId, regions, courses, plans, specialOffers]);

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    isDanger: true,
  });

  const askConfirmation = (
    title: string, 
    message: string, 
    onConfirm: () => void | Promise<void>, 
    confirmText = 'Confirm', 
    isDanger = true
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      isDanger
    });
  };

  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
  const [loadingStorePurchases, setLoadingStorePurchases] = useState(false);
  const [loadingUsefulResources, setLoadingUsefulResources] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingHeroVideos, setLoadingHeroVideos] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // SEO / Social Media Cards Console States
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [seoImageUploading, setSeoImageUploading] = useState(false);
  const [seoPreviewPlatform, setSeoPreviewPlatform] = useState<'whatsapp' | 'facebook' | 'twitter' | 'telegram'>('whatsapp');
  const [selectedSeoRouteIndex, setSelectedSeoRouteIndex] = useState<number>(-1); // -1 = Global Fallback, >=0 = routes array index
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRouteForm, setNewRouteForm] = useState({ path: '', title: '', description: '', image: '' });
  const [seoSearchQuery, setSeoSearchQuery] = useState('');

  const [seoConfig, setSeoConfig] = useState<{
    globalTitle: string;
    globalDescription: string;
    globalImage: string;
    routes: Array<{
      id: string;
      path: string;
      title: string;
      description: string;
      image: string;
    }>;
  }>({
    globalTitle: "Cutscene - Video Editing Course",
    globalDescription: "Learn video editing from scratch with our complete course.",
    globalImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop",
    routes: [
      {
        id: "home",
        path: "/",
        title: "Cutscene - Video Editing Masterclasses",
        description: "Learn professional video editing, VFX, and web development with hands-on projects.",
        image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop"
      },
      {
        id: "courses",
        path: "/courses",
        title: "Cutscene - Video Editing & Tech Courses",
        description: "Explore our complete masterclass curricula in video editing, motion graphics, and web development.",
        image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop"
      },
      {
        id: "course-1",
        path: "/courses/1",
        title: "Cutscene - Video Editing 101",
        description: "Master professional video editing from scratch with Premiere Pro, DaVinci Resolve and After Effects.",
        image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop"
      },
      {
        id: "store",
        path: "/store",
        title: "Cutscene Store - Video Assets, Plugins & LUTs",
        description: "Download high-quality video editing templates, LUTs, light leaks, sound effects, and motion graphic presets.",
        image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop"
      },
      {
        id: "resources",
        path: "/resources",
        title: "Cutscene Resources - Free Editing Packs",
        description: "Access free editing assets, project files, keyboard shortcut cheat sheets, and creative tools.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
      },
      {
        id: "student-work",
        path: "/student-work",
        title: "Cutscene Showcase - Student Edits & Projects",
        description: "Discover amazing video edits, visual effects, and web apps created by Cutscene Academy students.",
        image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop"
      },
      {
        id: "support",
        path: "/support",
        title: "Cutscene Support & Help Desk",
        description: "Get instant assistance, reach technical support via WhatsApp or Email, and find FAQs.",
        image: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1200&auto=format&fit=crop"
      }
    ]
  });

  const fetchSeoConfig = async () => {
    setLoadingSeo(true);
    try {
      const docRef = doc(db, 'config', 'seo');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setSeoConfig({
          globalTitle: data.globalTitle || seoConfig.globalTitle,
          globalDescription: data.globalDescription || seoConfig.globalDescription,
          globalImage: data.globalImage || seoConfig.globalImage,
          routes: Array.isArray(data.routes) && data.routes.length > 0 ? data.routes : seoConfig.routes
        });
      } else {
        await setDoc(docRef, seoConfig);
      }
    } catch (err: any) {
      console.error('Fetch SEO config error:', err);
      showToast('error', 'Failed loading SEO configuration.');
    } finally {
      setLoadingSeo(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'seo') {
      fetchSeoConfig();
    }
  }, [activeTab]);

  const handleSaveSeoConfig = async () => {
    setSavingSeo(true);
    try {
      const docRef = doc(db, 'config', 'seo');
      await setDoc(docRef, {
        ...seoConfig,
        updatedAt: new Date().toISOString()
      });
      showToast('success', 'Social Media Cards & SEO metadata saved successfully!');
    } catch (err: any) {
      console.error('Save SEO config error:', err);
      showToast('error', 'Failed saving SEO configuration.');
    } finally {
      setSavingSeo(false);
    }
  };

  const uploadSeoImageForRoute = async (e: React.ChangeEvent<HTMLInputElement>, routeIndex: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setSeoImageUploading(true);
    try {
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || 'seo_card.jpg' })
      });
      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || `Signed URL signing failed with status ${signRes.status}`);
      }
      const signData = await signRes.json();

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`Upload proxy failed (${uploadRes.status}): ${errText}`);
      }
      const uploadResult = await uploadRes.json();

      if (routeIndex === -1) {
        setSeoConfig(prev => ({ ...prev, globalImage: uploadResult.publicUrl }));
      } else {
        setSeoConfig(prev => {
          const newRoutes = [...prev.routes];
          newRoutes[routeIndex] = { ...newRoutes[routeIndex], image: uploadResult.publicUrl };
          return { ...prev, routes: newRoutes };
        });
      }
      showToast('success', 'Card thumbnail image uploaded successfully!');
    } catch (err: any) {
      console.error('SEO Image upload failed:', err);
      showToast('error', `Failed to upload card image: ${err.message || err}`);
    } finally {
      setSeoImageUploading(false);
    }
  };

  const handleAddCustomRouteSeo = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedPath = newRouteForm.path.trim();
    if (!formattedPath.startsWith('/')) formattedPath = '/' + formattedPath;

    if (seoConfig.routes.some(r => r.path.toLowerCase() === formattedPath.toLowerCase())) {
      showToast('error', `A rule for path "${formattedPath}" already exists.`);
      return;
    }

    const newRule = {
      id: 'route-' + Date.now(),
      path: formattedPath,
      title: newRouteForm.title.trim() || seoConfig.globalTitle,
      description: newRouteForm.description.trim() || seoConfig.globalDescription,
      image: newRouteForm.image.trim() || seoConfig.globalImage
    };

    setSeoConfig(prev => ({
      ...prev,
      routes: [...prev.routes, newRule]
    }));

    setSelectedSeoRouteIndex(seoConfig.routes.length);
    setShowAddRouteModal(false);
    setNewRouteForm({ path: '', title: '', description: '', image: '' });
    showToast('success', `Added SEO card rule for route "${formattedPath}"! Click "Save Social Cards" to apply.`);
  };

  const handleDeleteRouteSeo = (index: number, pathName: string) => {
    askConfirmation(
      'Remove Route Card Rule',
      `Are you sure you want to remove the custom social media card rule for "${pathName}"? It will fall back to the Global Default Card.`,
      () => {
        setSeoConfig(prev => ({
          ...prev,
          routes: prev.routes.filter((_, i) => i !== index)
        }));
        if (selectedSeoRouteIndex === index) {
          setSelectedSeoRouteIndex(-1);
        } else if (selectedSeoRouteIndex > index) {
          setSelectedSeoRouteIndex(selectedSeoRouteIndex - 1);
        }
        showToast('success', `Removed rule for "${pathName}". Click "Save Social Cards" to apply.`);
      }
    );
  };

  // Modal forms states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseModalTab, setCourseModalTab] = useState<'general' | 'media' | 'curriculum'>('general');
  const [chapterModalTab, setChapterModalTab] = useState<'core' | 'media' | 'handouts' | 'exercise'>('core');
  const [enlargedReceiptUrl, setEnlargedReceiptUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomRotation, setZoomRotation] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!enlargedReceiptUrl) {
      setZoomScale(1);
      setZoomRotation(0);
    }
  }, [enlargedReceiptUrl]);

  const [activeReceiptFilter, setActiveReceiptFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    thumbnail_url: '',
    is_free: false,
    instructor: '',
    instructor_avatar: '',
    instructor_bio: '',
    price: '15000',
    level: 'Beginner',
    duration: '8 weeks',
    certificateUrl: '',
    trailerUrl: '',
    is_coming_soon: false,
    requirements: '',
    outcomes: ''
  });

  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [workForm, setWorkForm] = useState({
    student_name: '',
    title: '',
    image_url: '',
    video_url: '',
    approved: true,
    is_featured: false,
    course_id: '',
    course_name: ''
  });

  const handleEditWorkClick = (work: any) => {
    setEditingWorkId(work.id);
    setWorkForm({
      student_name: work.student_name || work.studentName || '',
      title: work.title || '',
      image_url: work.image_url || work.thumbnail || '',
      video_url: work.video_url || work.url || '',
      approved: work.approved === true || work.status === 'approved',
      is_featured: !!work.is_featured,
      course_id: work.course_id || work.courseId || '',
      course_name: work.course_name || work.courseTitle || ''
    });
    setShowWorkModal(true);
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkId) return;
    try {
      const { doc, updateDoc } = await import('../firebase');
      await updateDoc(doc(db, 'student_works', editingWorkId), {
        student_name: workForm.student_name,
        studentName: workForm.student_name,
        title: workForm.title,
        image_url: workForm.image_url,
        thumbnail: workForm.image_url,
        video_url: workForm.video_url,
        url: workForm.video_url,
        approved: workForm.approved,
        status: workForm.approved ? 'approved' : 'pending',
        is_featured: workForm.is_featured,
        course_id: workForm.course_id,
        course_name: workForm.course_name,
        courseTitle: workForm.course_name
      });
      showToast('success', 'Showcase work updated successfully!');
      setShowWorkModal(false);
      setEditingWorkId(null);
      await fetchStudentWorks();
    } catch (err: any) {
      showToast('error', `Error updating work: ${err.message}`);
    }
  };

  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [selectedSoftwareFilter, setSelectedSoftwareFilter] = useState<string>('all');
  const [editingSoftwareOptions, setEditingSoftwareOptions] = useState<CourseSoftwareOption[]>(DEFAULT_SOFTWARE_OPTIONS);

  const [chapterForm, setChapterForm] = useState({
    courseId: '',
    softwareId: 'premiere',
    title: '',
    position: '1',
    is_preview: false,
    session_url: '',
    thumbnail_url: '',
    exercise_url: '',
    homework_url: '',
    exercise_title: '',
    exercise_brief: '',
    exercise_tasks_raw: '',
    session_url_1: '',
    session_url_2: '',
    session_url_3: '',
    session_url_4: '',
    session_name_1: '',
    session_name_2: '',
    session_name_3: '',
    session_name_4: '',
    session_name: '',
    sessions: [] as Array<{ url: string; name: string }>
  });


  const [showStoreProductModal, setShowStoreProductModal] = useState(false);
  const [editingStoreProductId, setEditingStoreProductId] = useState<string | null>(null);
  const [storeProductForm, setStoreProductForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    durationsText: '1 Month: 4500\n3 Months: 12500\n6 Months: 23000\n12 Months: 42000',
    defaultDuration: '1 Month',
    active: true
  });

  const [showUsefulResourceModal, setShowUsefulResourceModal] = useState(false);
  const [editingUsefulResourceId, setEditingUsefulResourceId] = useState<string | null>(null);
  const [usefulResourceForm, setUsefulResourceForm] = useState({
    name: '',
    description: '',
    category: 'Free Stock Footage',
    logoUrl: '',
    url: '',
    order: '1',
    active: true
  });

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    tagline: '',
    price: '',
    interval: 'Per year',
    description: '',
    badge: '',
    buttonText: 'Choose Plan',
    featuresText: '',
    isPopular: false,
    active: true,
    order: '1'
  });

  const [showHeroVideoModal, setShowHeroVideoModal] = useState(false);
  const [editingHeroVideoId, setEditingHeroVideoId] = useState<string | null>(null);
  const [heroVideoForm, setHeroVideoForm] = useState({
    title: '',
    videoUrl: '',
    isActive: false
  });

  // Edit Enrollment Request states
  const [showEditEnrollmentModal, setShowEditEnrollmentModal] = useState(false);
  const [selectedEnrollmentToEdit, setSelectedEnrollmentToEdit] = useState<any>(null);
  const [editEnrollmentForm, setEditEnrollmentForm] = useState({
    fullName: '',
    paymentMethod: 'CCP',
    ccpRIP: '',
    price: '',
    status: 'pending_verification',
    rejectionReason: '',
    courseId: ''
  });

  // Edit Store Purchase Request states
  const [showEditStorePurchaseModal, setShowEditStorePurchaseModal] = useState(false);
  const [selectedStorePurchaseToEdit, setSelectedStorePurchaseToEdit] = useState<any>(null);
  const [editStorePurchaseForm, setEditStorePurchaseForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    productName: '',
    productId: '',
    duration: '',
    paymentMethod: 'CCP / BaridiMob',
    price: '',
    currency: 'DZD',
    status: 'pending',
    rejectionReason: ''
  });

  // Toast Helper
  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Enforce security role check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (!userProfile || userProfile.role !== 'admin') {
        showToast('error', 'Unauthorized Admin Access. Redirecting...');
        navigate('/');
      }
    }
  }, [user, userProfile, authLoading, navigate]);

  // Initial loads when tab or role alters
  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      fetchCourses();
      fetchUsers();
      fetchStudentWorks();
      fetchExerciseSubmissions();
      fetchEnrollments();
      fetchStoreProducts();
      fetchStorePurchases();
      fetchUsefulResources();
      fetchPlans();
      fetchPlanPurchases();
      fetchHeroVideos();
      fetchSettings();
      fetchSpecialOffers();
      fetchStatistics();
    }
  }, [user, userProfile]);

  // Sync chapters whenever the selected course alterations occur
  useEffect(() => {
    if (selectedCourseId) {
      fetchChaptersForCourse(selectedCourseId);
      const found = courses.find(c => c.id === selectedCourseId);
      if (found && Array.isArray(found.softwareOptions) && found.softwareOptions.length > 0) {
        setEditingSoftwareOptions(found.softwareOptions);
      } else {
        setEditingSoftwareOptions(DEFAULT_SOFTWARE_OPTIONS);
      }
    } else {
      setChapters([]);
      setEditingSoftwareOptions(DEFAULT_SOFTWARE_OPTIONS);
    }
  }, [selectedCourseId, courses]);

  const handleSaveSoftwareOptions = async () => {
    if (!selectedCourseId) {
      showToast('error', 'Please choose a course first.');
      return;
    }
    try {
      await updateDoc(doc(db, 'courses', selectedCourseId), {
        softwareOptions: editingSoftwareOptions
      });
      showToast('success', 'Software variations updated successfully for course.');
      await fetchCourses();
    } catch (err: any) {
      console.error('Error updating software options:', err);
      showToast('error', err.message || 'Failed to update software variations.');
    }
  };


  // ----------------------------------------------------
  // DATA FETCHING CONTROLLERS
  // ----------------------------------------------------

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(list);
      // Auto-select first course for chapters if none selected
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(list[0].id);
      }
    } catch (err: any) {
      console.error('Fetch courses error:', err);
      showToast('error', 'Failed loading courses from Firestore.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchChaptersForCourse = async (courseId: string) => {
    setLoadingChapters(true);
    try {
      // 1. First fetch separate subcollection documents
      const snap = await getDocs(collection(db, `courses/${courseId}/chapters`));
      
      const findVideo = (lessons: any[], type: string) => {
        if (!Array.isArray(lessons)) return '';
        const lesson = lessons.find((l: any) => l.type === type || l.id === type);
        return lesson ? (lesson.video_url || lesson.videoUrl || '') : '';
      };

      let list = snap.docs
        .map(doc => {
          const ch = doc.data() as any;
          const session_url = ch.session_url || ch.sessionUrl || findVideo(ch.lessons, 'session');
          const exercise_url = ch.exercise_url || ch.exerciseUrl || findVideo(ch.lessons, 'exercise');
          const homework_url = ch.homework_url || ch.homeworkUrl || findVideo(ch.lessons, 'homework');
          return {
            id: doc.id,
            ...ch,
            title: ch.title || '',
            position: ch.position !== undefined ? Number(ch.position) : 0,
            is_preview: !!ch.is_preview || !!ch.isPreview,
            session_url,
            exercise_url,
            homework_url
          };
        })
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));

      // 2. Fallback to course document's inner array chapters if subcollection has no chapters
      if (list.length === 0) {
        let matchCourse = courses.find((c: any) => c.id === courseId);
        if (!matchCourse) {
          const coursesSnap = await getDocs(collection(db, 'courses'));
          const foundDoc = coursesSnap.docs.find(d => d.id === courseId);
          if (foundDoc) {
            matchCourse = { id: foundDoc.id, ...foundDoc.data() };
          }
        }

        if (matchCourse && Array.isArray(matchCourse.chapters)) {
          list = matchCourse.chapters.map((ch: any, idx: number) => {
            const session_url = ch.session_url || ch.sessionUrl || findVideo(ch.lessons, 'session');
            const exercise_url = ch.exercise_url || ch.exerciseUrl || findVideo(ch.lessons, 'exercise');
            const homework_url = ch.homework_url || ch.homeworkUrl || findVideo(ch.lessons, 'homework');
            return {
              id: ch.id || `seeded_${idx}`,
              title: ch.title || `Chapter ${idx + 1}`,
              position: ch.position !== undefined ? Number(ch.position) : idx + 1,
              is_preview: !!ch.is_preview || !!ch.isPreview,
              session_url,
              exercise_url,
              homework_url,
              is_seeded: true
            };
          });
        }
      }

      setChapters(list);
    } catch (err: any) {
      console.error('Fetch chapters error:', err);
      showToast('error', 'Failed loading chapters for this program.');
    } finally {
      setLoadingChapters(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(list);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      showToast('error', 'Failed Loading user ledger.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchExerciseSubmissions = async () => {
    setLoadingExercises(true);
    try {
      const snap = await getDocs(collection(db, 'exercise_submissions'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by uploadedAt descending
      const sorted = list.sort((a: any, b: any) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
      setExerciseSubmissions(sorted);
    } catch (err: any) {
      console.error('Fetch exercises error:', err);
      showToast('error', 'Failed loading exercise submissions.');
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleOpenGradingModal = (sub: any) => {
    setSelectedSubmission(sub);
    setGradingForm({
      score: sub.score || 10,
      reviewerNote: sub.reviewerNote || '',
      taskResults: sub.taskResults || {}
    });
    setShowExerciseGradingModal(true);
  };

  const handleGradeSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      const docRef = doc(db, 'exercise_submissions', selectedSubmission.id);
      await updateDoc(docRef, {
        status: 'reviewed',
        score: Number(gradingForm.score),
        taskResults: gradingForm.taskResults,
        reviewerNote: gradingForm.reviewerNote,
        reviewedAt: new Date().toISOString()
      });

      showToast('success', 'Exercise submission reviewed and graded!');
      setShowExerciseGradingModal(false);
      setSelectedSubmission(null);
      fetchExerciseSubmissions();
    } catch (err: any) {
      console.error('Grading submission error:', err);
      showToast('error', `Failed to grade submission: ${err.message}`);
    }
  };

  const handleSaveConfiguredExercise = async (chapterId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      showToast('error', 'Please select a parent course first.');
      return;
    }
    try {
      const chRef = doc(db, `courses/${selectedCourseId}/chapters`, chapterId);
      const tasks = exerciseForm.tasksRaw
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      await updateDoc(chRef, {
        exercise_title: exerciseForm.title,
        exercise_url: exerciseForm.videoUrl,
        exercise_brief: exerciseForm.brief,
        exercise_tasks_raw: exerciseForm.tasksRaw,
        exercise_tasks: tasks
      });

      showToast('success', 'Exercise configuration & checklist updated successfully!');
      fetchChaptersForCourse(selectedCourseId);
    } catch (err: any) {
      console.error('Save configured exercise error:', err);
      showToast('error', `Failed to save exercise configuration: ${err.message}`);
    }
  };

  const selectChapterForConfig = (ch: any) => {
    setSelectedConfigChapterId(ch.id);
    setExerciseForm({
      title: ch.exercise_title || '',
      videoUrl: ch.exercise_url || '',
      brief: ch.exercise_brief || '',
      tasksRaw: ch.exercise_tasks_raw || ch.exercise_tasks?.join('\n') || ''
    });
  };

  const fetchStudentWorks = async () => {
    setLoadingWorks(true);
    try {
      const snap = await getDocs(collection(db, 'student_works'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudentWorks(list);
    } catch (err: any) {
      console.error('Fetch student works error:', err);
    } finally {
      setLoadingWorks(false);
    }
  };

  const fetchEnrollments = async () => {
    setLoadingEnrollments(true);
    try {
      const snap = await getDocs(collection(db, 'enrollments'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEnrollments(list);
    } catch (err: any) {
      console.error('Fetch enrollments error:', err);
      showToast('error', 'Failed loading enrollments receipts ledger.');
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleApproveEnrollment = async (enrollmentId: string) => {
    try {
      const docRef = doc(db, 'enrollments', enrollmentId);
      await updateDoc(docRef, {
        paid: true,
        status: 'approved',
        unlockedAt: new Date().toISOString()
      });
      showToast('success', 'Enrollment approved and course unlocked successfully!');
      setEditingReceiptId(null);
      fetchEnrollments();
    } catch (err: any) {
      console.error('Error approving enrollment:', err);
      showToast('error', 'Failed approving enrollment. Check permission rules.');
    }
  };

  const handleRejectEnrollment = async (enrollmentId: string) => {
    const feedback = prompt('Enter rejection reason (displayed to student or logged):') || 'Receipt invalid or illegible';
    try {
      const docRef = doc(db, 'enrollments', enrollmentId);
      await updateDoc(docRef, {
        paid: false,
        status: 'rejected',
        rejectionReason: feedback,
        rejectedAt: new Date().toISOString()
      });
      showToast('success', 'Enrollment updated as rejected.');
      setEditingReceiptId(null);
      fetchEnrollments();
    } catch (err: any) {
      console.error('Error rejecting enrollment:', err);
      showToast('error', 'Failed updating status.');
    }
  };

  const fetchStoreProducts = async () => {
    setLoadingStoreProducts(true);
    try {
      const snap = await getDocs(collection(db, 'store_products'));
      let list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (list.length === 0) {
        console.log('Seeding store products from Admin...');
        const defaults = [
          {
            name: "Adobe Creative Cloud",
            description: "Get full student access to Adobe Creative Cloud Apps, including Premiere Pro, After Effects, Photoshop, Illustrator, and more with official license verification.",
            imageUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop",
            durations: {
              "1 Month": 4500,
              "3 Months": 12500,
              "6 Months": 23000,
              "12 Months": 42000
            },
            active: true,
            createdAt: new Date().toISOString()
          }
        ];
        for (const item of defaults) {
          await addDoc(collection(db, 'store_products'), item);
        }
        const freshSnap = await getDocs(collection(db, 'store_products'));
        list = freshSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      setStoreProducts(list);
    } catch (err: any) {
      console.error('Fetch store products error:', err);
      showToast('error', 'Failed loading store products.');
    } finally {
      setLoadingStoreProducts(false);
    }
  };

  const fetchStorePurchases = async () => {
    setLoadingStorePurchases(true);
    try {
      const snap = await getDocs(collection(db, 'store_purchases'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      list.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setStorePurchases(list);
    } catch (err: any) {
      console.error('Fetch store purchases error:', err);
      showToast('error', 'Failed loading store purchase receipts.');
    } finally {
      setLoadingStorePurchases(false);
    }
  };

  const fetchUsefulResources = async () => {
    setLoadingUsefulResources(true);
    try {
      const snap = await getDocs(collection(db, 'useful_resources'));
      let list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (list.length === 0) {
        console.log('Seeding useful resources from Admin...');
        const defaults = [
          {
            name: "Pexels Free Stock Footage",
            description: "The best free stock videos, clips, and footage shared by the talented Pexels community.",
            category: "Free Stock Footage",
            logoUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=200&auto=format&fit=crop",
            url: "https://www.pexels.com/videos/",
            active: true,
            order: 1,
            createdAt: new Date().toISOString()
          },
          {
            name: "Adobe Firefly",
            description: "Use generative AI and simple text prompts to create highest quality creative variations, vectors, and effects.",
            category: "AI Tools",
            logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop",
            url: "https://firefly.adobe.com/",
            active: true,
            order: 2,
            createdAt: new Date().toISOString()
          },
          {
            name: "DaVinci Resolve Training",
            description: "Official Blackmagic Design interactive lessons, training books, and certification resources.",
            category: "Learning Resources",
            logoUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=200&auto=format&fit=crop",
            url: "https://www.blackmagicdesign.com/products/davinciresolve/training",
            active: true,
            order: 3,
            createdAt: new Date().toISOString()
          },
          {
            name: "Mixkit Asset Hub",
            description: "Awesome free assets for your next video project: Premiere Pro templates, transitions, sound effects, and stock music.",
            category: "Free Stock Footage",
            logoUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=200&auto=format&fit=crop",
            url: "https://mixkit.co/",
            active: true,
            order: 4,
            createdAt: new Date().toISOString()
          }
        ];
        for (const item of defaults) {
          await addDoc(collection(db, 'useful_resources'), item);
        }
        const freshSnap = await getDocs(collection(db, 'useful_resources'));
        list = freshSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      list.sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
      setUsefulResources(list);
    } catch (err: any) {
      console.error('Fetch useful resources error:', err);
      showToast('error', 'Failed loading useful resources.');
    } finally {
      setLoadingUsefulResources(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      let snap = await getDocs(collection(db, 'plans'));
      if (snap.empty) {
        await ensureDefaultPlansSeeded();
        snap = await getDocs(collection(db, 'plans'));
      }
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort plans by 'order' or fallback to numeric position
      list.sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
      setPlans(list);
    } catch (err: any) {
      console.error('Fetch plans error:', err);
      showToast('error', 'Failed loading subscription plans from database.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchPlanPurchases = async () => {
    setLoadingPlanPurchases(true);
    try {
      const snap = await getDocs(collection(db, 'plan_purchases'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      list.sort((a: any, b: any) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
      setPlanPurchases(list);
    } catch (err: any) {
      console.error('Fetch plan purchases error:', err);
    } finally {
      setLoadingPlanPurchases(false);
    }
  };

  const handleApprovePlanPurchase = async (purchaseId: string) => {
    try {
      const docRef = doc(db, 'plan_purchases', purchaseId);
      await updateDoc(docRef, {
        status: 'approved',
        paid: true,
        approvedAt: new Date().toISOString()
      });
      showToast('success', 'Plan subscription purchase approved successfully!');
      fetchPlanPurchases();
    } catch (err: any) {
      console.error('Error approving plan purchase:', err);
      showToast('error', 'Failed approving plan purchase.');
    }
  };

  const handleRejectPlanPurchase = async (purchaseId: string) => {
    const reason = prompt('Enter rejection reason for this subscription order:') || 'Receipt invalid or illegible';
    try {
      const docRef = doc(db, 'plan_purchases', purchaseId);
      await updateDoc(docRef, {
        status: 'rejected',
        paid: false,
        rejectionReason: reason,
        rejectedAt: new Date().toISOString()
      });
      showToast('success', 'Plan subscription purchase rejected.');
      fetchPlanPurchases();
    } catch (err: any) {
      console.error('Error rejecting plan purchase:', err);
      showToast('error', 'Failed rejecting plan purchase.');
    }
  };

  const handleDeletePlanPurchase = async (purchaseId: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase receipt record?')) return;
    try {
      await deleteDoc(doc(db, 'plan_purchases', purchaseId));
      showToast('success', 'Plan purchase record removed.');
      fetchPlanPurchases();
    } catch (err: any) {
      console.error('Error deleting plan purchase:', err);
      showToast('error', 'Failed deleting record.');
    }
  };

  const fetchHeroVideos = async () => {
    setLoadingHeroVideos(true);
    try {
      const snap = await getDocs(collection(db, 'hero_videos'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by active first, then created date desc
      list.sort((a: any, b: any) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setHeroVideos(list);
    } catch (err: any) {
      console.error('Fetch hero videos error:', err);
      showToast('error', 'Failed loading hero videos from database.');
    } finally {
      setLoadingHeroVideos(false);
    }
  };

  const fetchSpecialOffers = async () => {
    setLoadingSpecialOffers(true);
    try {
      let snap = await getDocs(collection(db, 'special_offers'));
      if (snap.empty) {
        console.log('Special offers empty in Admin panel. Seeding default special offers...');
        await ensureDefaultSpecialOffersSeeded();
        snap = await getDocs(collection(db, 'special_offers'));
      }
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));
      setSpecialOffers(list);
    } catch (err) {
      console.error('Error fetching special offers:', err);
      showToast('error', 'Could not load special offers from Firestore.');
    } finally {
      setLoadingSpecialOffers(false);
    }
  };

  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      let snap = await getDocs(collection(db, 'statistics'));
      if (snap.empty) {
        await ensureDefaultStatisticsSeeded();
        snap = await getDocs(collection(db, 'statistics'));
      }
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
      setStatisticsList(list);
    } catch (err: any) {
      console.error('Fetch statistics error:', err);
      showToast('error', 'Failed loading homepage statistics.');
    } finally {
      setLoadingStats(false);
    }
  };



  const handleCreateOrUpdateStat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statForm.id.trim() || !statForm.value.trim() || !statForm.labelEn.trim()) {
      showToast('error', 'ID, Value, and English Label are required.');
      return;
    }

    const cleanId = statForm.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanId) {
      showToast('error', 'Invalid Stat ID.');
      return;
    }

    try {
      const payload = {
        id: cleanId,
        value: statForm.value,
        labelEn: statForm.labelEn,
        labelFr: statForm.labelFr || '',
        labelAr: statForm.labelAr || '',
        iconName: statForm.iconName || 'Users',
        order: Number(statForm.order) || 1
      };

      await setDoc(doc(db, 'statistics', cleanId), payload);
      showToast('success', editingStatId ? 'Statistic updated successfully.' : 'Statistic created successfully.');
      setShowStatModal(false);
      setEditingStatId(null);
      setStatForm({
        id: '',
        value: '',
        labelEn: '',
        labelFr: '',
        labelAr: '',
        iconName: 'Users',
        order: 1
      });
      fetchStatistics();
    } catch (err: any) {
      console.error('Save statistic error:', err);
      showToast('error', 'Failed saving statistic.');
    }
  };

  const handleDeleteStat = async (statId: string) => {
    try {
      await deleteDoc(doc(db, 'statistics', statId));
      showToast('success', 'Statistic deleted successfully.');
      fetchStatistics();
    } catch (err: any) {
      console.error('Delete statistic error:', err);
      showToast('error', 'Failed deleting statistic.');
    }
  };

  // Regions Configuration Handlers
  const handleSaveRegionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionForm.id || !regionForm.name || !regionForm.currency || !regionForm.symbol) {
      showToast('error', 'All region fields are required.');
      return;
    }

    setIsSavingRegionSettings(true);
    try {
      const idUpper = regionForm.id.toUpperCase().trim();
      const updatedRegion = {
        id: idUpper,
        name: regionForm.name.trim(),
        currency: regionForm.currency.toUpperCase().trim(),
        symbol: regionForm.symbol.trim(),
        multiplier: Number(regionForm.multiplier),
        isDefault: regionForm.isDefault,
        paymentMethods: editingPaymentMethods
      };

      // Handle default toggling: if this region is set to isDefault: true, set all other regions to isDefault: false
      if (regionForm.isDefault) {
        for (const reg of regions) {
          if (reg.id !== idUpper && reg.isDefault) {
            await updateDoc(doc(db, 'regions', reg.id), { isDefault: false });
          }
        }
      }

      await setDoc(doc(db, 'regions', idUpper), updatedRegion);

      // Save price overrides!
      // Updating Courses
      for (const c of courses) {
        const overrideVal = priceOverrides[c.id];
        const currentOverride = c.regionalPrices?.[idUpper];
        const newOverride = overrideVal && overrideVal.trim() !== '' ? Number(overrideVal) : undefined;
        
        if (newOverride !== currentOverride) {
          const updatedPrices = { ...(c.regionalPrices || {}) };
          if (newOverride === undefined) {
            delete updatedPrices[idUpper];
          } else {
            updatedPrices[idUpper] = newOverride;
          }
          await updateDoc(doc(db, 'courses', c.id), { regionalPrices: updatedPrices });
        }
      }

      // Updating Membership Plans
      for (const p of plans) {
        const overrideVal = priceOverrides[p.id];
        const currentOverride = p.regionalPrices?.[idUpper];
        const newOverride = overrideVal && overrideVal.trim() !== '' ? Number(overrideVal) : undefined;
        
        if (newOverride !== currentOverride) {
          const updatedPrices = { ...(p.regionalPrices || {}) };
          if (newOverride === undefined) {
            delete updatedPrices[idUpper];
          } else {
            updatedPrices[idUpper] = newOverride;
          }
          await updateDoc(doc(db, 'plans', p.id), { regionalPrices: updatedPrices });
        }
      }

      // Updating Special Combo Packs
      for (const o of specialOffers) {
        const overrideVal = priceOverrides[o.id];
        const currentOverride = o.regionalPrices?.[idUpper];
        const newOverride = overrideVal && overrideVal.trim() !== '' ? Number(overrideVal) : undefined;
        
        if (newOverride !== currentOverride) {
          const updatedPrices = { ...(o.regionalPrices || {}) };
          if (newOverride === undefined) {
            delete updatedPrices[idUpper];
          } else {
            updatedPrices[idUpper] = newOverride;
          }
          await updateDoc(doc(db, 'special_offers', o.id), { regionalPrices: updatedPrices });
        }
      }

      showToast('success', `Region ${idUpper} and price overrides successfully persisted to cloud database!`);
      
      // Sync local context and main lists
      await refreshRegions();
      await fetchCourses();
      await fetchPlans();
      await fetchSpecialOffers();
      setSelectedAdminRegionId(idUpper);
    } catch (err: any) {
      console.error('Save region exception:', err);
      showToast('error', 'Failed saving region and overrides: ' + (err.message || err));
    } finally {
      setIsSavingRegionSettings(false);
    }
  };

  const handleDeleteAdminRegion = async (regId: string) => {
    if (regions.length <= 1) {
      showToast('error', 'Cannot delete the only remaining region.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Region Config',
      message: `Are you sure you want to permanently delete Region: ${regId}? All currency converters, multipliers, and payment directions will be lost.`,
      confirmText: 'YES, DELETE',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'regions', regId));
          showToast('success', `Region ${regId} successfully removed.`);
          await refreshRegions();
          setConfirmDialog(p => ({ ...p, isOpen: false }));
        } catch (err: any) {
          console.error('Delete region error:', err);
          showToast('error', 'Failed to delete region.');
        }
      }
    });
  };

  const handleAddNewRegionInit = () => {
    setSelectedAdminRegionId('');
    setRegionForm({
      id: '',
      name: '',
      currency: '',
      symbol: '',
      multiplier: 1.0,
      isDefault: false
    });
    setEditingPaymentMethods([
      { id: 'baridimob', name: 'BaridiMob Direct', active: true, instructions: 'Please transfer the exact amount to Rip...' },
      { id: 'ccp', name: 'CCP Post Agency', active: false, instructions: 'Virement bulletin coordinates...' },
      { id: 'stripe', name: 'Credit Card (Stripe)', active: false, instructions: 'Stripe gateway details...' },
      { id: 'paypal', name: 'PayPal Gateway', active: false, instructions: 'PayPal account details...' },
      { id: 'bank', name: 'SEPA Bank Wire', active: false, instructions: 'Bank IBAN details...' }
    ]);
    setPriceOverrides({});
  };

  const handleSaveSpecialOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialOfferForm.id) {
      showToast('error', 'Combination pack ID code is required.');
      return;
    }
    if (!specialOfferForm.titleEn) {
      showToast('error', 'English Title is required.');
      return;
    }
    if (specialOfferForm.courseIds.length === 0) {
      showToast('error', 'Please check at least one included course for this combo bundle.');
      return;
    }

    try {
      const origPriceVal = Number(specialOfferForm.originalPrice || 0);
      const prcVal = Number(specialOfferForm.price || 0);
      const payload = {
        ...specialOfferForm,
        originalPrice: origPriceVal,
        price: prcVal,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'special_offers', specialOfferForm.id), payload, { merge: true });
      showToast('success', editingSpecialOfferId ? 'Combo pack updated successfully!' : 'Combo pack created successfully!');
      setShowSpecialOfferModal(false);
      fetchSpecialOffers();
    } catch (error) {
      console.error('Error saving special offer:', error);
      showToast('error', 'Could not save combo offer. Check logs.');
    }
  };

  const handleDeleteSpecialOffer = (id: string) => {
    askConfirmation(
      'Delete Special Offer Pack?',
      'Are you sure you want to permanently delete this combination bundle? Existing orders will not be affected but users will no longer see this offer.',
      async () => {
        try {
          await deleteDoc(doc(db, 'special_offers', id));
          showToast('success', 'Combination bundle successfully deleted.');
          fetchSpecialOffers();
        } catch (error) {
          console.error(error);
          showToast('error', 'Failed deleting combination offer.');
        }
      }
    );
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const snap = await getDocs(collection(db, 'config'));
      const settingsDoc = snap.docs.find(d => d.id === 'settings');
      if (settingsDoc) {
        setWebsiteSettings((prev: any) => ({
          ...prev,
          ...settingsDoc.data()
        }));
      } else {
        // Document settings initial setup draft
        await setDoc(doc(db, 'config', 'settings'), websiteSettings);
      }
    } catch (err: any) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // ----------------------------------------------------
  // MUTATION CONTROLLERS
  // ----------------------------------------------------

  // COURSES
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        image: courseForm.thumbnail_url, // map to image representation safely
        isFree: !!courseForm.is_free,
        price: courseForm.price,
        instructorName: courseForm.instructor,
        instructorAvatar: courseForm.instructor_avatar || '',
        instructor_avatar: courseForm.instructor_avatar || '',
        instructorBio: courseForm.instructor_bio || '',
        instructor: {
          name: courseForm.instructor,
          avatar: courseForm.instructor_avatar || '',
          bio: courseForm.instructor_bio || 'Professional Instructor'
        },
        level: courseForm.level,
        duration: courseForm.duration,
        certificateUrl: courseForm.certificateUrl || '',
        trailerUrl: courseForm.trailerUrl || '',
        isComingSoon: !!courseForm.is_coming_soon,
        requirements: courseForm.requirements
          ? courseForm.requirements.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
        outcomes: courseForm.outcomes
          ? courseForm.outcomes.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
        learningOutcomes: courseForm.outcomes
          ? courseForm.outcomes.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
        updatedAt: serverTimestamp()
      };

      if (editingCourseId) {
        await setDoc(doc(db, 'courses', editingCourseId), {
          ...payload,
          id: editingCourseId
        }, { merge: true });
        showToast('success', `Course "${courseForm.title}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'courses'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        // Save ID inside the document for safe client mappings
        await updateDoc(docRef, { id: docRef.id });
        showToast('success', `Course "${courseForm.title}" published successfully.`);
      }

      setShowCourseModal(false);
      setEditingCourseId(null);
      setCourseForm({
        title: '',
        description: '',
        category: '',
        thumbnail_url: '',
        is_free: false,
        instructor: '',
        instructor_avatar: '',
        instructor_bio: '',
        price: '15000',
        level: 'Beginner',
        duration: '8 weeks',
        certificateUrl: '',
        trailerUrl: '',
        is_coming_soon: false,
        requirements: '',
        outcomes: ''
      });
      fetchCourses();
    } catch (err: any) {
      console.error('Course processing failure:', err);
      showToast('error', err.message || 'Course save failure.');
    }
  };

  const startEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setCourseModalTab('general');
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      thumbnail_url: course.image || '',
      is_free: !!course.isFree,
      price: course.price || '15000',
      instructor: course.instructorName || course.instructor?.name || '',
      instructor_avatar: course.instructorAvatar || course.instructor_avatar || course.instructor?.avatar || '',
      instructor_bio: course.instructorBio || course.instructor_bio || course.instructor?.bio || '',
      level: course.level || 'Beginner',
      duration: course.duration || '8 weeks',
      certificateUrl: course.certificateUrl || '',
      trailerUrl: course.trailerUrl || '',
      is_coming_soon: !!course.isComingSoon,
      requirements: Array.isArray(course.requirements)
        ? course.requirements.join('\n')
        : typeof course.requirements === 'string'
          ? course.requirements
          : '',
      outcomes: Array.isArray(course.outcomes)
        ? course.outcomes.join('\n')
        : Array.isArray(course.learningOutcomes)
          ? course.learningOutcomes.join('\n')
          : typeof course.outcomes === 'string'
            ? course.outcomes
            : ''
    });
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    askConfirmation(
      'Delete Course',
      `Are you absolutely sure you want to permanently delete the course "${courseTitle}"? This will lock students and cannot be undone.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'courses', courseId));
          showToast('success', `Course "${courseTitle}" deleted from database.`);
          fetchCourses();
        } catch (err: any) {
          console.error('Delete course failure:', err);
          showToast('error', err.message || 'Error occurred while dropping course.');
        }
      },
      'Delete Permanently',
      true
    );
  };

  const handleMassDeleteCourses = () => {
    if (selectedCourseIds.length === 0) return;
    askConfirmation(
      'Bulk Delete Courses',
      `Are you absolutely sure you want to permanently delete the ${selectedCourseIds.length} selected courses? This will lock students and cannot be undone.`,
      async () => {
        try {
          await Promise.all(selectedCourseIds.map(id => deleteDoc(doc(db, 'courses', id))));
          showToast('success', `${selectedCourseIds.length} courses successfully deleted from the database.`);
          setSelectedCourseIds([]);
          fetchCourses();
        } catch (err: any) {
          console.error('Bulk course deletion failure:', err);
          showToast('error', 'Failed to delete selected courses.');
        }
      },
      'Delete Selected',
      true
    );
  };


  // CURRICULUM SESSIONS
  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.courseId) {
      showToast('error', 'Please associate this session to an active course program.');
      return;
    }
    try {
      const url = chapterForm.session_url || '';
      const name = chapterForm.title || '';

      const payload = {
        courseId: chapterForm.courseId,
        softwareId: chapterForm.softwareId || 'premiere',
        title: name,
        position: Number(chapterForm.position),
        is_preview: !!chapterForm.is_preview,
        session_url: url,
        thumbnail_url: chapterForm.thumbnail_url || '',
        exercise_url: chapterForm.exercise_url || '',
        homework_url: chapterForm.homework_url || '',
        exercise_title: chapterForm.exercise_title || '',
        exercise_brief: chapterForm.exercise_brief || '',
        exercise_tasks_raw: chapterForm.exercise_tasks_raw || '',
        exercise_tasks: (chapterForm.exercise_tasks_raw || '')
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0),
        session_url_1: url,
        session_url_2: '',
        session_url_3: '',
        session_url_4: '',
        session_name_1: name,
        session_name_2: '',
        session_name_3: '',
        session_name_4: '',
        session_name: name,
        sessions: [{ url, name }], // Single session array for compatibility
        updatedAt: serverTimestamp()
      };

      if (editingChapterId) {
        await setDoc(doc(db, `courses/${chapterForm.courseId}/chapters`, editingChapterId), payload, { merge: true });
        showToast('success', `Session "${chapterForm.title}" updated successfully.`);
      } else {
        await addDoc(collection(db, `courses/${chapterForm.courseId}/chapters`), {
          ...payload,
          createdAt: serverTimestamp()
        });
        showToast('success', `Session "${chapterForm.title}" inserted into sequence.`);
      }

      setShowChapterModal(false);
      setEditingChapterId(null);
      setChapterForm({
        courseId: selectedCourseId,
        softwareId: selectedSoftwareFilter !== 'all' ? selectedSoftwareFilter : 'premiere',
        title: '',
        position: (chapters.length + 1).toString(),
        is_preview: false,
        session_url: '',
        thumbnail_url: '',
        exercise_url: '',
        homework_url: '',
        exercise_title: '',
        exercise_brief: '',
        exercise_tasks_raw: '',
        session_url_1: '',
        session_url_2: '',
        session_url_3: '',
        session_url_4: '',
        session_name_1: '',
        session_name_2: '',
        session_name_3: '',
        session_name_4: '',
        session_name: '',
        sessions: [] as Array<{ url: string; name: string }>
      });
      fetchChaptersForCourse(chapterForm.courseId);
    } catch (err: any) {
      console.error('Session process failure:', err);
      showToast('error', err.message || 'Session operation error.');
    }
  };

  const startEditChapter = (chapter: any) => {
    const url = chapter.session_url || chapter.session_url_1 || (chapter.sessions && chapter.sessions[0]?.url) || '';
    const title = chapter.title || chapter.session_name || '';

    setEditingChapterId(chapter.id);
    setChapterModalTab('core');
    setChapterForm({
      courseId: chapter.courseId || selectedCourseId,
      softwareId: chapter.softwareId || 'premiere',
      title: title,
      position: (chapter.position || '1').toString(),
      is_preview: !!chapter.is_preview,
      session_url: url,
      thumbnail_url: chapter.thumbnail_url || '',
      exercise_url: chapter.exercise_url || '',
      homework_url: chapter.homework_url || '',
      exercise_title: chapter.exercise_title || '',
      exercise_brief: chapter.exercise_brief || '',
      exercise_tasks_raw: chapter.exercise_tasks_raw || '',
      session_url_1: url,
      session_url_2: '',
      session_url_3: '',
      session_url_4: '',
      session_name_1: title,
      session_name_2: '',
      session_name_3: '',
      session_name_4: '',
      session_name: title,
      sessions: [{ url, name: title }]
    });
    setShowChapterModal(true);
  };

  const startAddChapter = () => {
    setEditingChapterId(null);
    setChapterModalTab('core');
    setChapterForm({
      courseId: selectedCourseId,
      softwareId: selectedSoftwareFilter !== 'all' ? selectedSoftwareFilter : 'premiere',
      title: '',
      position: (chapters.length + 1).toString(),
      is_preview: false,
      session_url: '',
      thumbnail_url: '',
      exercise_url: '',
      homework_url: '',

      exercise_title: '',
      exercise_brief: '',
      exercise_tasks_raw: '',
      session_url_1: '',
      session_url_2: '',
      session_url_3: '',
      session_url_4: '',
      session_name_1: '',
      session_name_2: '',
      session_name_3: '',
      session_name_4: '',
      session_name: '',
      sessions: [] as Array<{ url: string; name: string }>
    });
    setShowChapterModal(true);
  };

  const handleDeleteChapter = async (chapterId: string, title: string) => {
    askConfirmation(
      'Delete Session',
      `Are you absolutely sure you want to permanently delete session "${title}"?`,
      async () => {
        try {
          // 1. Delete from subcollection
          await deleteDoc(doc(db, `courses/${selectedCourseId}/chapters`, chapterId));

          // 2. Clear from custom inner chapters array inside parent course doc if any exists
          const courseRef = doc(db, 'courses', selectedCourseId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            if (Array.isArray(courseData.chapters)) {
              const updatedChapters = courseData.chapters.filter((ch: any, idx: number) => {
                if (ch.id === chapterId) return false;
                if (`seeded_${idx}` === chapterId) return false;
                if (`seeded_${idx + 1}` === chapterId) return false;
                if (ch.title === title) return false;
                return true;
              });
              await updateDoc(courseRef, { chapters: updatedChapters });
            }
          }

          showToast('success', `Session "${title}" removed successfully.`);
          await fetchCourses(); // Crucial: reload courses state to sync updated inner arrays
          fetchChaptersForCourse(selectedCourseId);
        } catch (err: any) {
          console.error('Delete session error:', err);
          showToast('error', err.message || 'Failed to remove session from database.');
        }
      },
      'Delete Session',
      true
    );
  };

  const handleUpdateChapterPosition = async (chapter: any, newPos: number) => {
    try {
      await setDoc(doc(db, `courses/${selectedCourseId}/chapters`, chapter.id), {
        position: newPos
      }, { merge: true });
      showToast('success', `Position altered dynamically.`);
      fetchChaptersForCourse(selectedCourseId);
    } catch (err: any) {
      showToast('error', 'Failed updating sorting indices.');
    }
  };

  const handleToggleChapterPreview = async (chapter: any) => {
    try {
      const newStatus = !chapter.is_preview;
      await setDoc(doc(db, `courses/${selectedCourseId}/chapters`, chapter.id), {
        is_preview: newStatus
      }, { merge: true });
      setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, is_preview: newStatus } : c));
      showToast('success', `Session "${chapter.title}" set to ${newStatus ? 'Public Free Preview' : 'Locked (Premium)'}`);
    } catch (err: any) {
      console.error('Toggle preview error:', err);
      showToast('error', `Failed to update session preview: ${err.message || err}`);
    }
  };


  // STUDENTS
  const handleToggleUserRole = async (targetUser: any) => {
    const nextRole = targetUser.role === 'admin' ? 'student' : 'admin';
    askConfirmation(
      'Change User Role',
      `Are you sure you want to change role of ${targetUser.displayName || targetUser.email} to "${nextRole}"?`,
      async () => {
        try {
          await setDoc(doc(db, 'users', targetUser.id), {
            role: nextRole
          }, { merge: true });
          showToast('success', `Role for ${targetUser.displayName || targetUser.email} is now ${nextRole}.`);
          fetchUsers();
        } catch (err: any) {
          console.error('Toggle role failed:', err);
          showToast('error', 'Permissions error updating database role.');
        }
      },
      'Change Role',
      false
    );
  };

  const handleDeleteUserDoc = async (targetUser: any) => {
    askConfirmation(
      'Delete User Registry',
      `CRITICAL WARNING: This will delete the user document for ${targetUser.displayName || targetUser.email} from Firestore. This will wipe their course progress database indexes. Proceed?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'users', targetUser.id));
          showToast('success', 'User profile discarded.');
          fetchUsers();
        } catch (err: any) {
          showToast('error', 'Error discarding user registry document.');
        }
      },
      'Delete User',
      true
    );
  };


  // SHIPPED ACCOUNTS / CREDENTIALS MANAGEMENT
  const handleOpenShippedAccountsModal = async (student: any) => {
    if (!student || (!student.id && !student.uid)) {
      console.error("handleOpenShippedAccountsModal called with invalid student object:", student);
      showToast('error', 'Student record has no valid identifier.');
      return;
    }
    const studentUid = student.id || student.uid;
    setSelectedStudent(student);
    setIsShippedAccountsModalOpen(true);
    setShippedAccountsLoading(true);
    setAccountEmails({});
    setAccountPasswords({});
    setStudentPurchases([]);
    setStudentShippedAccounts([]);

    let enrollList: any[] = [];
    let storeList: any[] = [];
    let shippedList: any[] = [];

    // 1. Fetch Enrollments
    try {
      const enrollQ = query(collection(db, 'enrollments'), where('uid', '==', studentUid));
      const enrollSnap = await getDocs(enrollQ);
      enrollList = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err: any) {
      console.error("Error fetching enrollments for student:", studentUid, err);
    }

    // 2. Fetch Store Purchases
    try {
      const storeQ = query(collection(db, 'store_purchases'), where('uid', '==', studentUid));
      const storeSnap = await getDocs(storeQ);
      storeList = storeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err: any) {
      console.error("Error fetching store purchases for student:", studentUid, err);
    }

    // 3. Fetch Shipped Accounts
    try {
      const shippedQ = query(collection(db, 'shipped_accounts'), where('uid', '==', studentUid));
      const shippedSnap = await getDocs(shippedQ);
      shippedList = shippedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudentShippedAccounts(shippedList);
    } catch (err: any) {
      console.error("Error fetching shipped accounts for student:", studentUid, err);
    }

    try {
      // 4. Combine into a single purchased list
      const combinedPurchases = [
        ...enrollList.filter((e: any) => e.format !== 'plan').map((e: any) => {
          const course = courses.find(c => c.id === e.courseId);
          return {
            id: e.id,
            type: 'course',
            itemId: e.courseId,
            name: course?.title || 'Academy Course',
            status: e.status === 'approved' || e.paid ? 'approved' : 'pending',
            enrolledAt: e.enrolledAt || '',
            rawRecord: e
          };
        }),
        ...storeList.map((p: any) => {
          return {
            id: p.id,
            type: 'store_product',
            itemId: p.productId,
            name: p.productName || 'Adobe Creative Cloud',
            status: p.status || 'pending',
            submittedAt: p.submittedAt || p.purchasedAt || '',
            rawRecord: p
          };
        })
      ];

      setStudentPurchases(combinedPurchases);

      // 5. Pre-populate input maps with any existing credentials
      const emailMap: {[key: string]: string} = {};
      const passwordMap: {[key: string]: string} = {};
      shippedList.forEach((acc: any) => {
        if (acc.productId) {
          emailMap[acc.productId] = acc.email || '';
          passwordMap[acc.productId] = acc.password || '';
        }
      });
      setAccountEmails(emailMap);
      setAccountPasswords(passwordMap);

    } catch (err: any) {
      console.error("Error compiling student purchases & credentials list:", err);
      showToast('error', 'Could not compile student purchases & credentials.');
    } finally {
      setShippedAccountsLoading(false);
    }
  };

  const handleSaveShippedAccount = async (itemId: string, itemType: string, name: string) => {
    if (!selectedStudent) return;
    const studentUid = selectedStudent.id || selectedStudent.uid;
    const email = accountEmails[itemId] || '';
    const password = accountPasswords[itemId] || '';

    try {
      const docId = `${studentUid}_${itemId}`;
      await setDoc(doc(db, 'shipped_accounts', docId), {
        uid: studentUid,
        productId: itemId,
        email,
        password,
        itemType,
        itemName: name,
        updatedAt: new Date().toISOString()
      });

      // Update local state list
      setStudentShippedAccounts(prev => {
        const index = prev.findIndex(a => a.productId === itemId);
        const updatedObj = { id: docId, uid: studentUid, productId: itemId, email, password, itemType, itemName: name };
        if (index > -1) {
          const nextList = [...prev];
          nextList[index] = updatedObj;
          return nextList;
        } else {
          return [...prev, updatedObj];
        }
      });

      showToast('success', `Credentials for ${name} saved successfully.`);
    } catch (err: any) {
      console.error("Error saving shipped account credentials:", err);
      showToast('error', 'Error saving account credentials.');
    }
  };


  // STUDENT SHOWCASE WORKS
  const handleToggleWorkFeature = async (work: any) => {
    const nextFeatured = !work.is_featured;
    try {
      await setDoc(doc(db, 'student_works', work.id), {
        is_featured: nextFeatured
      }, { merge: true });
      showToast('success', nextFeatured ? 'Work is now starred & featured at gallery top!' : 'Feature badge removed.');
      fetchStudentWorks();
    } catch (err: any) {
      showToast('error', 'Vulnerability saving featured work flag.');
    }
  };

  const handleDeleteWork = async (workId: string, studentName: string) => {
    askConfirmation(
      'Delete Showcase Work',
      `Confirm deleting student artwork for "${studentName}" from the museum showcase?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'student_works', workId));
          showToast('success', 'Showcase discarded.');
          fetchStudentWorks();
        } catch (err: any) {
          showToast('error', 'Unable to delete database showcase.');
        }
      },
      'Delete Artwork',
      true
    );
  };

  const handleMassDeleteStudentWorks = () => {
    if (selectedStudentWorkIds.length === 0) return;
    askConfirmation(
      'Bulk Delete Showcase Works',
      `Confirm permanently deleting the ${selectedStudentWorkIds.length} selected student artwork submissions from the showcase?`,
      async () => {
        try {
          await Promise.all(selectedStudentWorkIds.map(id => deleteDoc(doc(db, 'student_works', id))));
          showToast('success', `${selectedStudentWorkIds.length} student works successfully discarded.`);
          setSelectedStudentWorkIds([]);
          fetchStudentWorks();
        } catch (err: any) {
          console.error('Bulk student works deletion failure:', err);
          showToast('error', 'Failed to delete selected student works.');
        }
      },
      'Delete Selected',
      true
    );
  };

  const handleApproveWork = async (work: any) => {
    try {
      await setDoc(doc(db, 'student_works', work.id), {
        approved: true,
        status: 'approved'
      }, { merge: true });
      showToast('success', 'Student artwork approved successfully and is now live!');
      fetchStudentWorks();
    } catch (err: any) {
      showToast('error', 'Error approving student artwork: ' + err.message);
    }
  };


  // STORE PRODUCTS
  const handleStoreProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Parse durationsText to durations object
      const durationsMap: { [key: string]: number } = {};
      const durationKeysOrder: string[] = [];
      storeProductForm.durationsText.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = Number(parts[1].trim());
          if (key && !isNaN(value)) {
            durationsMap[key] = value;
            durationKeysOrder.push(key);
          }
        }
      });

      const payload = {
        name: storeProductForm.name,
        description: storeProductForm.description,
        imageUrl: storeProductForm.imageUrl,
        durations: durationsMap,
        durationKeysOrder,
        defaultDuration: storeProductForm.defaultDuration || durationKeysOrder[0] || '1 Month',
        active: storeProductForm.active,
        updatedAt: new Date().toISOString()
      };

      if (editingStoreProductId) {
        await setDoc(doc(db, 'store_products', editingStoreProductId), {
          ...payload,
          id: editingStoreProductId
        }, { merge: true });
        showToast('success', `Product "${storeProductForm.name}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'store_products'), payload);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        showToast('success', `Product "${storeProductForm.name}" created successfully.`);
      }

      setShowStoreProductModal(false);
      setEditingStoreProductId(null);
      setStoreProductForm({
        name: '',
        description: '',
        imageUrl: '',
        durationsText: '1 Month: 4500\n3 Months: 12500\n6 Months: 23000\n12 Months: 42000',
        defaultDuration: '1 Month',
        active: true
      });
      fetchStoreProducts();
    } catch (err: any) {
      console.error('Store Product save error:', err);
      showToast('error', err.message || 'Error saving store product.');
    }
  };

  const startEditStoreProduct = (item: any) => {
    setEditingStoreProductId(item.id);
    const keys = item.durationKeysOrder || Object.keys(item.durations || {});
    const text = item.durations 
      ? keys.map(k => `${k}: ${item.durations[k]}`).join('\n')
      : '1 Month: 4500\n3 Months: 12500\n6 Months: 23000\n12 Months: 42000';
    setStoreProductForm({
      name: item.name || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      durationsText: text,
      defaultDuration: item.defaultDuration || keys[0] || '1 Month',
      active: item.active !== false
    });
    setShowStoreProductModal(true);
  };

  const handleDeleteStoreProduct = async (id: string, name: string) => {
    askConfirmation(
      'Delete Store Product',
      `Are you sure you want to permanently delete the product "${name}"?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'store_products', id));
          showToast('success', 'Product deleted successfully.');
          fetchStoreProducts();
        } catch (err: any) {
          console.error('Delete product failed:', err);
          showToast('error', 'Failed to delete product.');
        }
      },
      'Delete Product',
      true
    );
  };

  const handleMassDeleteStoreProducts = () => {
    if (selectedStoreProductIds.length === 0) return;
    askConfirmation(
      'Bulk Delete Products',
      `Are you sure you want to permanently delete the ${selectedStoreProductIds.length} selected products?`,
      async () => {
        try {
          await Promise.all(selectedStoreProductIds.map(id => deleteDoc(doc(db, 'store_products', id))));
          showToast('success', 'Products successfully deleted.');
          setSelectedStoreProductIds([]);
          fetchStoreProducts();
        } catch (err: any) {
          console.error('Bulk deletion failure:', err);
          showToast('error', 'Failed to delete selected products.');
        }
      },
      'Delete Selected',
      true
    );
  };

  // USEFUL RESOURCES
  const handleUsefulResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: usefulResourceForm.name,
        description: usefulResourceForm.description,
        category: usefulResourceForm.category,
        logoUrl: usefulResourceForm.logoUrl,
        url: usefulResourceForm.url,
        order: Number(usefulResourceForm.order) || 1,
        active: usefulResourceForm.active,
        updatedAt: new Date().toISOString()
      };

      if (editingUsefulResourceId) {
        await setDoc(doc(db, 'useful_resources', editingUsefulResourceId), {
          ...payload,
          id: editingUsefulResourceId
        }, { merge: true });
        showToast('success', `Resource "${usefulResourceForm.name}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'useful_resources'), payload);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        showToast('success', `Resource "${usefulResourceForm.name}" created successfully.`);
      }

      setShowUsefulResourceModal(false);
      setEditingUsefulResourceId(null);
      setUsefulResourceForm({
        name: '',
        description: '',
        category: 'Free Stock Footage',
        logoUrl: '',
        url: '',
        order: '1',
        active: true
      });
      fetchUsefulResources();
    } catch (err: any) {
      console.error('Useful Resource save error:', err);
      showToast('error', err.message || 'Error saving resource.');
    }
  };

  const startEditUsefulResource = (item: any) => {
    setEditingUsefulResourceId(item.id);
    setUsefulResourceForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'Free Stock Footage',
      logoUrl: item.logoUrl || '',
      url: item.url || '',
      order: item.order !== undefined ? String(item.order) : '1',
      active: item.active !== false
    });
    setShowUsefulResourceModal(true);
  };

  const handleDeleteUsefulResource = async (id: string, name: string) => {
    askConfirmation(
      'Delete Resource Link',
      `Are you sure you want to permanently delete the resource link "${name}"?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'useful_resources', id));
          showToast('success', 'Resource link deleted successfully.');
          fetchUsefulResources();
        } catch (err: any) {
          console.error('Delete resource failed:', err);
          showToast('error', 'Failed to delete resource.');
        }
      },
      'Delete Link',
      true
    );
  };

  const handleMassDeleteUsefulResources = () => {
    if (selectedUsefulResourceIds.length === 0) return;
    askConfirmation(
      'Bulk Delete Resources',
      `Are you sure you want to permanently delete the ${selectedUsefulResourceIds.length} selected resource links?`,
      async () => {
        try {
          await Promise.all(selectedUsefulResourceIds.map(id => deleteDoc(doc(db, 'useful_resources', id))));
          showToast('success', 'Resources successfully deleted.');
          setSelectedUsefulResourceIds([]);
          fetchUsefulResources();
        } catch (err: any) {
          console.error('Bulk resources deletion failure:', err);
          showToast('error', 'Failed to delete selected resources.');
        }
      },
      'Delete Selected',
      true
    );
  };

  // STORE PURCHASES VERIFICATION
  const handleApproveStorePurchase = async (purchase: any) => {
    try {
      await setDoc(doc(db, 'store_purchases', purchase.id), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', 'Store subscription purchase approved successfully!');
      fetchStorePurchases();
    } catch (err: any) {
      console.error('Error approving store purchase:', err);
      showToast('error', 'Error approving store purchase: ' + err.message);
    }
  };

  const handleRejectStorePurchase = async (purchase: any) => {
    const feedback = prompt('Enter rejection reason (displayed to student or logged):') || 'Receipt invalid or illegible';
    try {
      await setDoc(doc(db, 'store_purchases', purchase.id), {
        status: 'rejected',
        rejectionReason: feedback,
        rejectedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', 'Store subscription purchase rejected.');
      fetchStorePurchases();
    } catch (err: any) {
      console.error('Error rejecting store purchase:', err);
      showToast('error', 'Error rejecting store purchase: ' + err.message);
    }
  };

  const startEditEnrollment = (enrollment: any) => {
    setSelectedEnrollmentToEdit(enrollment);
    setEditEnrollmentForm({
      fullName: enrollment.fullName || '',
      paymentMethod: enrollment.paymentMethod || 'CCP',
      ccpRIP: enrollment.ccpRIP || '',
      price: String(enrollment.price || ''),
      status: enrollment.status || 'pending_verification',
      rejectionReason: enrollment.rejectionReason || '',
      courseId: enrollment.courseId || ''
    });
    setShowEditEnrollmentModal(true);
  };

  const handleEditEnrollmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentToEdit) return;
    try {
      const docRef = doc(db, 'enrollments', selectedEnrollmentToEdit.id);
      await setDoc(docRef, {
        fullName: editEnrollmentForm.fullName,
        paymentMethod: editEnrollmentForm.paymentMethod,
        ccpRIP: editEnrollmentForm.ccpRIP,
        price: Number(editEnrollmentForm.price) || editEnrollmentForm.price,
        status: editEnrollmentForm.status,
        paid: editEnrollmentForm.status === 'approved',
        rejectionReason: editEnrollmentForm.status === 'rejected' ? editEnrollmentForm.rejectionReason : '',
        courseId: editEnrollmentForm.courseId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', 'Course enrollment request updated successfully.');
      setShowEditEnrollmentModal(false);
      setSelectedEnrollmentToEdit(null);
      fetchEnrollments();
    } catch (err: any) {
      console.error('Edit enrollment submit error:', err);
      showToast('error', 'Failed to update enrollment request: ' + err.message);
    }
  };

  const handleDeleteEnrollment = (enrollmentId: string, studentName: string) => {
    askConfirmation(
      'Delete Enrollment Request',
      `Are you absolutely sure you want to permanently delete the course enrollment request for "${studentName}"? This will wipe their transaction record and revoke their active access (if approved).`,
      async () => {
        try {
          await deleteDoc(doc(db, 'enrollments', enrollmentId));
          showToast('success', 'Course enrollment request permanently deleted.');
          fetchEnrollments();
        } catch (err: any) {
          console.error('Delete enrollment error:', err);
          showToast('error', 'Failed to delete course enrollment request.');
        }
      },
      'Delete permanently',
      true
    );
  };

  const startEditStorePurchase = (purchase: any) => {
    setSelectedStorePurchaseToEdit(purchase);
    setEditStorePurchaseForm({
      displayName: purchase.displayName || '',
      email: purchase.email || '',
      phone: purchase.phone || '',
      productName: purchase.productName || '',
      productId: purchase.productId || '',
      duration: purchase.duration || '',
      paymentMethod: purchase.paymentMethod || 'CCP / BaridiMob',
      price: String(purchase.price || ''),
      currency: purchase.currency || 'DZD',
      status: purchase.status || 'pending',
      rejectionReason: purchase.rejectionReason || ''
    });
    setShowEditStorePurchaseModal(true);
  };

  const handleEditStorePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStorePurchaseToEdit) return;
    try {
      const docRef = doc(db, 'store_purchases', selectedStorePurchaseToEdit.id);
      await setDoc(docRef, {
        displayName: editStorePurchaseForm.displayName,
        email: editStorePurchaseForm.email,
        phone: editStorePurchaseForm.phone,
        productName: editStorePurchaseForm.productName,
        productId: editStorePurchaseForm.productId,
        duration: editStorePurchaseForm.duration,
        paymentMethod: editStorePurchaseForm.paymentMethod,
        price: Number(editStorePurchaseForm.price) || editStorePurchaseForm.price,
        currency: editStorePurchaseForm.currency,
        status: editStorePurchaseForm.status,
        rejectionReason: editStorePurchaseForm.status === 'rejected' ? editStorePurchaseForm.rejectionReason : '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', 'Software subscription request updated successfully.');
      setShowEditStorePurchaseModal(false);
      setSelectedStorePurchaseToEdit(null);
      fetchStorePurchases();
    } catch (err: any) {
      console.error('Edit store purchase submit error:', err);
      showToast('error', 'Failed to update software request: ' + err.message);
    }
  };

  const handleDeleteStorePurchase = (purchaseId: string, studentName: string) => {
    askConfirmation(
      'Delete Store Purchase Request',
      `Are you absolutely sure you want to permanently delete the software subscription request for "${studentName}"? This will wipe their transaction record and delete any metadata.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'store_purchases', purchaseId));
          showToast('success', 'Store purchase request permanently deleted.');
          fetchStorePurchases();
        } catch (err: any) {
          console.error('Delete store purchase error:', err);
          showToast('error', 'Failed to delete store purchase request.');
        }
      },
      'Delete permanently',
      true
    );
  };


  // PLANS
  const handleTogglePlanVisibility = async (plan: any) => {
    const currentActive = plan.active !== false && !plan.hidden && !plan.isHidden;
    const newActive = !currentActive;
    try {
      await setDoc(doc(db, 'plans', plan.id), {
        active: newActive,
        hidden: !newActive,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', `Plan "${plan.name}" is now ${newActive ? 'visible to public students' : 'hidden from public view (Draft)'}.`);
      fetchPlans();
    } catch (err: any) {
      console.error('Toggle plan visibility error:', err);
      showToast('error', 'Failed to update plan visibility: ' + err.message);
    }
  };

  const handleTogglePlansSectionVisibility = async () => {
    const newComingSoon = !websiteSettings.isPlansComingSoon;
    try {
      const updated = {
        ...websiteSettings,
        isPlansComingSoon: newComingSoon,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'config', 'settings'), updated, { merge: true });
      setWebsiteSettings(updated);
      showToast('success', newComingSoon ? 'Plans section is now HIDDEN (Coming Soon mode active).' : 'Plans section is now PUBLIC and LIVE.');
    } catch (err: any) {
      console.error('Toggle plans section visibility error:', err);
      showToast('error', 'Failed to update plans section visibility.');
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const features = planForm.featuresText
        ? planForm.featuresText.split('\n').map(f => f.trim()).filter(Boolean)
        : [];

      const payload = {
        name: planForm.name,
        tagline: planForm.tagline || '',
        price: planForm.price,
        interval: planForm.interval || 'Per year',
        description: planForm.description,
        badge: planForm.badge || '',
        buttonText: planForm.buttonText || 'Choose Plan',
        features,
        isPopular: !!planForm.isPopular,
        active: planForm.active !== false,
        hidden: planForm.active === false,
        order: Number(planForm.order || 1),
        updatedAt: new Date().toISOString()
      };

      if (editingPlanId) {
        await setDoc(doc(db, 'plans', editingPlanId), {
          ...payload,
          id: editingPlanId
        }, { merge: true });
        showToast('success', `Plan "${planForm.name}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'plans'), payload);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        showToast('success', `Plan "${planForm.name}" created successfully.`);
      }

      setShowPlanModal(false);
      setEditingPlanId(null);
      setPlanForm({
        name: '',
        tagline: '',
        price: '',
        interval: 'Per year',
        description: '',
        badge: '',
        buttonText: 'Choose Plan',
        featuresText: '',
        isPopular: false,
        active: true,
        order: '1'
      });
      fetchPlans();
    } catch (err: any) {
      console.error('Plan save error:', err);
      showToast('error', err.message || 'Error saving membership plan.');
    }
  };

  const startEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name || '',
      tagline: plan.tagline || '',
      price: plan.price || '',
      interval: plan.interval || 'Per year',
      description: plan.description || '',
      badge: plan.badge || '',
      buttonText: plan.buttonText || 'Choose Plan',
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      isPopular: !!plan.isPopular,
      active: plan.active !== false && !plan.hidden && !plan.isHidden,
      order: String(plan.order || 1)
    });
    setShowPlanModal(true);
  };

  const handleDeletePlan = async (id: string, name: string) => {
    askConfirmation(
      'Delete Membership Plan',
      `Are you sure you want to delete the plan "${name}"? This will remove it from the choice gallery page for the users.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'plans', id));
          showToast('success', 'Plan deleted successfully.');
          fetchPlans();
        } catch (err) {
          showToast('error', 'Failed to discard subscription plan.');
        }
      },
      'Delete Plan',
      true
    );
  };


  // HERO VIDEOS MUTATIONS
  const handleHeroVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroVideoForm.title || !heroVideoForm.videoUrl) {
      showToast('error', 'Fields title and videoUrl are required.');
      return;
    }

    try {
      setLoadingHeroVideos(true);
      const isEditing = !!editingHeroVideoId;
      const payload: any = {
        title: heroVideoForm.title,
        videoUrl: heroVideoForm.videoUrl,
        isActive: heroVideoForm.isActive,
        createdAt: isEditing ? (heroVideos.find((v: any) => v.id === editingHeroVideoId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      // If making this one active, we should deactivate all other videos first!
      if (payload.isActive) {
        for (const item of heroVideos) {
          if (item.id !== editingHeroVideoId && item.isActive) {
            await updateDoc(doc(db, 'hero_videos', item.id), { isActive: false });
          }
        }
      }

      if (isEditing) {
        await setDoc(doc(db, 'hero_videos', editingHeroVideoId!), payload, { merge: true });
        showToast('success', 'Hero video details updated successfully!');
      } else {
        const customId = `video_${Date.now()}`;
        await setDoc(doc(db, 'hero_videos', customId), payload);
        showToast('success', 'New Hero video added successfully!');
      }

      setShowHeroVideoModal(false);
      setEditingHeroVideoId(null);
      setHeroVideoForm({ title: '', videoUrl: '', isActive: false });
      await fetchHeroVideos();
    } catch (err: any) {
      console.error('Error saving hero video:', err);
      showToast('error', 'Error occurred while saving hero video.');
    } finally {
      setLoadingHeroVideos(false);
    }
  };

  const startEditHeroVideo = (video: any) => {
    setEditingHeroVideoId(video.id);
    setHeroVideoForm({
      title: video.title || '',
      videoUrl: video.videoUrl || '',
      isActive: !!video.isActive
    });
    setShowHeroVideoModal(true);
  };

  const handleToggleHeroVideoActive = async (videoId: string, currentStatus: boolean) => {
    try {
      setLoadingHeroVideos(true);
      // If toggling to active, deactivate others
      if (!currentStatus) {
        for (const item of heroVideos) {
          if (item.id !== videoId && item.isActive) {
            await updateDoc(doc(db, 'hero_videos', item.id), { isActive: false });
          }
        }
      }
      await updateDoc(doc(db, 'hero_videos', videoId), { isActive: !currentStatus });
      showToast('success', `Video status toggled successfully.`);
      await fetchHeroVideos();
    } catch (err: any) {
      console.error('Toggle video active error:', err);
      showToast('error', 'Failed updating active video status.');
    } finally {
      setLoadingHeroVideos(false);
    }
  };

  const handleDeleteHeroVideo = async (videoId: string) => {
    const video = heroVideos.find((v: any) => v.id === videoId);
    if (!video) return;

    askConfirmation(
      'Delete Hero Video Reference',
      `Are you sure you would like to permanently delete the video reference "${video.title}" from your database collection?`,
      async () => {
        try {
          setLoadingHeroVideos(true);
          await deleteDoc(doc(db, 'hero_videos', videoId));
          showToast('success', 'Hero video reference deleted successfully.');
          await fetchHeroVideos();
        } catch (err: any) {
          console.error('Delete hero video error:', err);
          showToast('error', 'Failed deleting hero video reference.');
        } finally {
          setLoadingHeroVideos(false);
        }
      },
      'Delete Document',
      true
    );
  };


  // WEBSITE SETTINGS
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'config', 'settings'), websiteSettings);
      showToast('success', 'Global configuration settings synchronized successfully.');
    } catch (err: any) {
      showToast('error', 'Error synchronizing website configuration.');
    }
  };

  // --- QUIZZES MANAGEMENT STATE & MUTATORS ---
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  
  const [quizForm, setQuizForm] = useState({
    title: '',
    sessionId: 1,
    status: 'draft' as 'draft' | 'published'
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [uploadingQuestionMedia, setUploadingQuestionMedia] = useState(false);

  const [currentQuestionForm, setCurrentQuestionForm] = useState({
    type: 'MCQ',
    text: '',
    videoTimestamp: '',
    optionsText: 'Option A\nOption B\nOption C\nOption D',
    correctAnswer: 'Option A',
    mediaUrl: '',
    secondMediaUrl: '',
    spotDiffVideosCount: 1,
    diffAreaX: 50,
    diffAreaY: 50,
    diffAreaR: 10,
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 1,
    sliderCorrect: 50,
    timerLimit: 15
  });

  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      await ensureDefaultQuizzesSeeded();
      const snap = await getDocs(collection(db, 'quizzes'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuizzes(list);
    } catch (err: any) {
      console.error('Error fetching quizzes:', err);
      showToast('error', 'Failed loading quizzes.');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'quizzes') {
      fetchQuizzes();
    }
    if (activeTab === 'exercises') {
      fetchExerciseSubmissions();
    }
  }, [activeTab]);

  const handleUploadQuestionMedia = async (e: React.ChangeEvent<HTMLInputElement>, field: 'mediaUrl' | 'secondMediaUrl') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setUploadingQuestionMedia(true);
    try {
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name || 'question_media.jpg' })
      });
      if (!signRes.ok) {
        const errData = await signRes.json().catch(() => ({}));
        throw new Error(errData.error || `Signed URL signing failed with status ${signRes.status}`);
      }
      const signData = await signRes.json();

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`Upload proxy failed (${uploadRes.status}): ${errText}`);
      }
      const uploadResult = await uploadRes.json();
      
      setCurrentQuestionForm(prev => ({ ...prev, [field]: uploadResult.publicUrl }));
      showToast('success', 'Media asset uploaded to Bunny CDN successfully!');
    } catch (err: any) {
      console.error('Bunny upload error:', err);
      showToast('error', `Media upload failed: ${err.message || err}`);
    } finally {
      setUploadingQuestionMedia(false);
    }
  };

  const handleOpenAddQuestion = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestionForm({
      type: 'MCQ',
      text: '',
      videoTimestamp: '',
      optionsText: 'Option A\nOption B\nOption C\nOption D',
      correctAnswer: 'Option A',
      mediaUrl: '',
      secondMediaUrl: '',
      spotDiffVideosCount: 1,
      diffAreaX: 50,
      diffAreaY: 50,
      diffAreaR: 10,
      sliderMin: 0,
      sliderMax: 100,
      sliderStep: 1,
      sliderCorrect: 50,
      timerLimit: 15
    });
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (index: number) => {
    const q = questions[index];
    setEditingQuestionIndex(index);
    setCurrentQuestionForm({
      type: q.type || 'MCQ',
      text: q.text || '',
      videoTimestamp: q.videoTimestamp || '',
      optionsText: Array.isArray(q.options) ? q.options.join('\n') : '',
      correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : Array.isArray(q.correctAnswer) ? q.correctAnswer.join('\n') : '',
      mediaUrl: q.mediaUrl || '',
      secondMediaUrl: q.secondMediaUrl || '',
      spotDiffVideosCount: q.spotDiffVideosCount !== undefined ? Number(q.spotDiffVideosCount) : (q.secondMediaUrl ? 2 : 1),
      diffAreaX: q.diffArea?.x || 50,
      diffAreaY: q.diffArea?.y || 50,
      diffAreaR: q.diffArea?.r || 10,
      sliderMin: q.sliderMin !== undefined ? q.sliderMin : 0,
      sliderMax: q.sliderMax !== undefined ? q.sliderMax : 100,
      sliderStep: q.sliderStep !== undefined ? q.sliderStep : 1,
      sliderCorrect: q.sliderCorrect !== undefined ? q.sliderCorrect : 50,
      timerLimit: q.timerLimit !== undefined ? q.timerLimit : 15
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestionForm.text) {
      showToast('error', 'Question Text is required.');
      return;
    }

    // Parse options and answers based on type
    const parsedOptions = currentQuestionForm.optionsText
      ? currentQuestionForm.optionsText.split('\n').map(o => o.trim()).filter(Boolean)
      : [];

    let parsedCorrectAnswer: any = currentQuestionForm.correctAnswer.trim();
    if (currentQuestionForm.type === 'Sequence' || currentQuestionForm.type === 'Match') {
      parsedCorrectAnswer = currentQuestionForm.correctAnswer.split('\n').map(a => a.trim()).filter(Boolean);
    }

    const questionObj: any = {
      type: currentQuestionForm.type,
      text: currentQuestionForm.text,
      videoTimestamp: currentQuestionForm.videoTimestamp || null,
      options: parsedOptions,
      correctAnswer: parsedCorrectAnswer,
      mediaUrl: currentQuestionForm.mediaUrl || null,
      secondMediaUrl: currentQuestionForm.secondMediaUrl || null,
      spotDiffVideosCount: currentQuestionForm.type === 'Spot-diff' ? Number(currentQuestionForm.spotDiffVideosCount || 1) : null,
      diffArea: currentQuestionForm.type === 'Spot-diff' ? {
        x: Number(currentQuestionForm.diffAreaX),
        y: Number(currentQuestionForm.diffAreaY),
        r: Number(currentQuestionForm.diffAreaR)
      } : null,
      sliderMin: currentQuestionForm.type === 'Slider' ? Number(currentQuestionForm.sliderMin) : null,
      sliderMax: currentQuestionForm.type === 'Slider' ? Number(currentQuestionForm.sliderMax) : null,
      sliderStep: currentQuestionForm.type === 'Slider' ? Number(currentQuestionForm.sliderStep) : null,
      sliderCorrect: currentQuestionForm.type === 'Slider' ? Number(currentQuestionForm.sliderCorrect) : null,
      timerLimit: currentQuestionForm.type === 'Timed MCQ' ? Number(currentQuestionForm.timerLimit) : null
    };

    const newQs = [...questions];
    if (editingQuestionIndex !== null) {
      newQs[editingQuestionIndex] = questionObj;
      showToast('success', 'Question updated in sequence.');
    } else {
      newQs.push(questionObj);
      showToast('success', 'Question appended to sequence.');
    }

    setQuestions(newQs);
    setShowQuestionModal(false);
    setEditingQuestionIndex(null);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQs = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newQs.length) {
      const temp = newQs[index];
      newQs[index] = newQs[targetIndex];
      newQs[targetIndex] = temp;
      setQuestions(newQs);
    }
  };

  const startEditQuiz = (quiz: any) => {
    setEditingQuizId(quiz.id);
    setQuizForm({
      title: quiz.title || '',
      sessionId: quiz.sessionId || 1,
      status: quiz.status || 'draft'
    });
    setQuestions(quiz.questions || []);
    setShowQuizModal(true);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title || !quizForm.sessionId) {
      showToast('error', 'Quiz Title and Session ID are required.');
      return;
    }
    try {
      const payload = {
        title: quizForm.title,
        sessionId: Number(quizForm.sessionId),
        status: quizForm.status,
        questions: questions,
        updatedAt: new Date().toISOString()
      };

      if (editingQuizId) {
        await setDoc(doc(db, 'quizzes', editingQuizId), payload, { merge: true });
        showToast('success', `Quiz "${quizForm.title}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'quizzes'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        await updateDoc(docRef, { id: docRef.id });
        showToast('success', `Quiz "${quizForm.title}" created successfully.`);
      }

      setShowQuizModal(false);
      setEditingQuizId(null);
      setQuizForm({ title: '', sessionId: 1, status: 'draft' });
      setQuestions([]);
      fetchQuizzes();
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      showToast('error', 'Error saving quiz: ' + err.message);
    }
  };

  const handleDeleteQuiz = (id: string, title: string) => {
    askConfirmation(
      'Delete Quiz',
      `Are you sure you want to permanently delete the quiz "${title}"? This cannot be undone.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'quizzes', id));
          showToast('success', `Quiz deleted successfully.`);
          fetchQuizzes();
        } catch (err) {
          showToast('error', 'Failed to delete quiz.');
        }
      }
    );
  };

  const handleOpenCreateQuiz = () => {
    setEditingQuizId(null);
    setQuizForm({
      title: '',
      sessionId: 1,
      status: 'draft'
    });
    setQuestions([]);
    setShowQuizModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <span className="text-sm text-gray-400">Verifying Admin Privileges...</span>
        </div>
      </div>
    );
  }

  // Double lock validation
  if (!user || !userProfile || userProfile.role !== 'admin') {
    return null;
  }

  interface NavTab {
    id: string;
    name: string;
    icon: any;
    badge?: string;
  }

  // Navigation groupings for improved usability & efficiency
  const navGroups: Array<{
    title: string;
    id: string;
    icon: any;
    tabs: NavTab[];
  }> = [
    {
      title: 'Curriculum & Core',
      id: 'curriculum',
      icon: BookOpen,
      tabs: [
        { id: 'courses', name: 'Course Modules', icon: BookOpen },
        { id: 'chapters', name: 'Course Sessions', icon: Layers },
        { id: 'student-works', name: 'Showcase Gallery', icon: Film },
        { id: 'quizzes', name: 'Curriculum Quizzes', icon: HelpCircle },
        { id: 'exercises', name: 'Exercise Submissions', icon: Flame },
      ]
    },
    {
      title: 'Sales & Products',
      id: 'sales',
      icon: Icons.ShoppingBag,
      tabs: [
        { id: 'store-products', name: 'Store Products', icon: Icons.ShoppingBag },
        { id: 'store-purchases', name: 'Store Receipts', icon: Receipt, badge: 'store-purchases' },
        { id: 'offers', name: 'Special Bundles', icon: Sparkles },
        { id: 'plans', name: 'Membership Plans', icon: Trophy },
        { id: 'regions', name: 'Regions & Currency', icon: Globe },
      ]
    },
    {
      title: 'Students & Verifications',
      id: 'students_verif',
      icon: Users,
      tabs: [
        { id: 'students', name: 'Students Ledger', icon: Users },
        { id: 'receipts', name: 'Receipt Verifications', icon: Receipt, badge: 'receipts' },
      ]
    },
    {
      title: 'Community & Guild',
      id: 'community_group',
      icon: MessageSquare,
      tabs: [
        { id: 'community-control', name: 'Community Control', icon: MessageSquare },
      ]
    },
    {
      title: 'Site Content & Settings',
      id: 'system',
      icon: Settings,
      tabs: [
        { id: 'seo', name: 'Social Cards & SEO', icon: Globe },
        { id: 'useful-resources', name: 'Useful Resources', icon: Globe },
        { id: 'hero-video', name: 'Homepage Hero Video', icon: Video },
        { id: 'statistics', name: 'Homepage Statistics', icon: Activity },
        { id: 'settings', name: 'Console Settings', icon: Settings },
      ]
    }
  ];

  const getTabBadge = (badgeType?: string) => {
    if (!badgeType) return null;
    if (badgeType === 'receipts') {
      const count = enrollments.filter(e => !e.paid && e.status !== 'rejected').length;
      return count > 0 ? count : null;
    }
    if (badgeType === 'store-purchases') {
      const count = storePurchases.filter(p => p.status === 'pending').length;
      return count > 0 ? count : null;
    }
    return null;
  };

  const pendingEnrollmentsCount = enrollments.filter(e => !e.paid && e.status !== 'rejected').length;
  const pendingStorePurchasesCount = storePurchases.filter(p => p.status === 'pending').length;

  const filteredNavGroups = navGroups.map(group => {
    const matchingTabs = group.tabs.filter(tab => 
      tab.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      group.title.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
    return { ...group, tabs: matchingTabs };
  }).filter(group => group.tabs.length > 0);

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col md:flex-row relative pt-20">
      
      {/* GLOBAL HUD TOAST NOTIFIER */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 backdrop-blur-md border border-white/5 pointer-events-auto ${
                t.type === 'success' ? 'bg-green-950/90 text-green-300' : 'bg-red-950/90 text-red-300'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed font-semibold">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* DASHBOARD SIDEBAR PANEL */}
      <aside className="w-full md:w-80 bg-zinc-950/45 backdrop-blur-md border-r border-purple-950/20 flex flex-col justify-between p-5 shrink-0 z-10 min-h-[calc(100vh-5rem)]">
        <div className="space-y-6">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/30 font-bold border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Master Console</span>
              <h2 className="text-base font-black tracking-tight text-white leading-none mt-0.5">ADMIN HUD</h2>
            </div>
          </div>

          {/* COCKPIT STATUS OVERVIEW */}
          <div className="bg-zinc-950/60 border border-purple-950/15 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-purple-300 uppercase tracking-widest">Console Cockpit</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-zinc-900/40 border border-white/5 p-1.5 rounded-xl text-center">
                <div className="text-gray-400 font-medium text-[9px]">Students</div>
                <div className="text-sm font-black text-white mt-0.5">{usersList.filter(u => u.role !== 'admin').length}</div>
              </div>
              <div className="bg-zinc-900/40 border border-white/5 p-1.5 rounded-xl text-center">
                <div className="text-gray-400 font-medium text-[9px]">Courses</div>
                <div className="text-sm font-black text-white mt-0.5">{courses.length}</div>
              </div>
              <div className="bg-zinc-900/40 border border-white/5 p-1.5 rounded-xl text-center relative">
                <div className="text-gray-400 font-medium text-[9px] leading-tight">Course Pnd</div>
                <div className={`text-sm font-black mt-0.5 ${pendingEnrollmentsCount > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                  {pendingEnrollmentsCount}
                </div>
              </div>
              <div className="bg-zinc-900/40 border border-white/5 p-1.5 rounded-xl text-center relative">
                <div className="text-gray-400 font-medium text-[9px] leading-tight">Store Pnd</div>
                <div className={`text-sm font-black mt-0.5 ${pendingStorePurchasesCount > 0 ? 'text-purple-400' : 'text-gray-400'}`}>
                  {pendingStorePurchasesCount}
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search console pages..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-950/50 hover:bg-zinc-950/80 focus:bg-zinc-950 border border-purple-950/30 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500/50 transition-all"
            />
            {sidebarSearch && (
              <button
                onClick={() => setSidebarSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* GROUPED NAVIGATION */}
          <div className="space-y-4">
            {filteredNavGroups.map(group => {
              const isCollapsed = collapsedGroups[group.id] && !sidebarSearch;
              
              const groupBadgeCount = group.tabs.reduce((acc, tab) => {
                const b = getTabBadge(tab.badge);
                return acc + (b || 0);
              }, 0);

              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                    className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-extrabold uppercase tracking-widest text-purple-400/80 hover:text-purple-350 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{group.title}</span>
                      {groupBadgeCount > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>
                    {!sidebarSearch && (
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-gray-500' : 'text-purple-400'}`} />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-0.5 overflow-hidden"
                      >
                        {group.tabs.map(tab => {
                          const Icon = tab.icon;
                          const badgeVal = getTabBadge(tab.badge);
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id as AdminTab)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-purple-950/45 text-purple-350 border border-purple-500/20 shadow-md'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[150px] text-[11px] font-medium tracking-wide normal-case">{tab.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {badgeVal && (
                                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${isActive ? 'bg-purple-600 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/15'}`}>
                                    {badgeVal}
                                  </span>
                                )}
                                <ChevronRight className={`w-3 h-3 transition-transform ${isActive ? 'translate-x-0.5 text-purple-300' : 'text-gray-600 opacity-40'}`} />
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>

        {/* User Identity bottom footer */}
        <div className="pt-4 border-t border-purple-950/20 mt-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-650 rounded-full flex items-center justify-center text-white text-xs font-bold border border-purple-500/30 uppercase">
              {userProfile?.fullName?.slice(0, 2) || user?.email?.slice(0, 2) || 'AD'}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">{userProfile?.fullName || 'Full Admin'}</div>
              <div className="text-[9px] text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all inline-flex items-center justify-center gap-1.5 border border-white/5 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            Home Website
          </button>
        </div>

      </aside>

      {/* DASHBOARD WORKSPACE AREA */}
      <main className="flex-grow p-8 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full z-0">
        
        {/* TAB 1: COURSES MANAGEMENT */}
        {activeTab === 'courses' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Courses Catalog</h1>
                <p className="text-gray-400 text-xs mt-1">Publish premium educational paths, assign level constraints and instructors</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedCourseIds.length > 0 && (
                  <button
                    onClick={handleMassDeleteCourses}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-500 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedCourseIds.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingCourseId(null);
                    setCourseForm({
                      title: '',
                      description: '',
                      category: 'Core',
                      thumbnail_url: '',
                      is_free: false,
                      instructor: userProfile?.fullName || 'Senior Instructor',
                      instructor_avatar: '',
                      instructor_bio: '',
                      price: '15000',
                      level: 'Beginner',
                      duration: '8 weeks',
                      certificateUrl: '',
                      trailerUrl: '',
                      is_coming_soon: false,
                      requirements: '',
                      outcomes: ''
                    });
                    setShowCourseModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/15 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add New Program
                </button>
              </div>
            </div>

            {loadingCourses ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-purple-950/20 rounded-3xl">
                <p className="text-gray-400 text-sm mb-1">No classes are live on your Firestore catalog.</p>
                <span className="text-[11px] text-gray-500">Initiate your inventory by clicking 'Add New Program'.</span>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                            checked={courses.length > 0 && selectedCourseIds.length === courses.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCourseIds(courses.map(c => c.id));
                              } else {
                                setSelectedCourseIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-4 px-6">Image</th>
                        <th className="py-4 px-6">Program Title</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Instructor</th>
                        <th className="py-4 px-6">Access Type</th>
                        <th className="py-4 px-6 text-right">Settings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                              checked={selectedCourseIds.includes(course.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCourseIds([...selectedCourseIds, course.id]);
                                } else {
                                  setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id));
                                }
                              }}
                            />
                          </td>
                          <td className="py-4 px-6">
                            <img
                              src={course.image || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=150'}
                              alt=""
                              className="w-16 h-10 object-cover rounded-xl border border-purple-950 shadow"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm">{course.title}</div>
                            <div className="text-[10px] text-gray-500 font-mono">DB ID: {course.id}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-purple-950/40 border border-purple-500/15 text-purple-300 text-[10px] uppercase font-bold tracking-wider rounded-lg">
                              {course.category || 'Core'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-300 font-semibold">{course.instructorName || 'Academy Staff'}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1.5 items-start">
                              {course.isComingSoon && (
                                <span className="text-orange-400 text-[10px] uppercase font-black bg-orange-950/40 border border-orange-500/30 px-2 py-0.5 rounded-md tracking-wider animate-pulse">
                                  Coming Soon
                                </span>
                              )}
                              {course.isFree ? (
                                <span className="text-green-400 text-xs font-bold bg-green-950/25 border border-green-500/20 px-2.5 py-1 rounded-lg">Free Sandbox</span>
                              ) : (
                                <span className="text-amber-400 text-xs font-bold bg-amber-950/25 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                  Premium ({course.price} DZD)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right space-x-1.5">
                            <button
                              onClick={() => startEditCourse(course)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 hover:bg-purple-950/25 text-purple-400 rounded-lg transition-all cursor-pointer"
                              title="Edit all fields"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id, course.title)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 hover:bg-red-950/25 text-red-400 rounded-lg transition-all cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COURSE SESSIONS MANAGEMENT */}
        {activeTab === 'chapters' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Structured Course Sessions</h1>
                <p className="text-gray-400 text-xs mt-1">Order sessions sequentially, attach project handouts, homework and video payloads</p>
              </div>
              <button
                onClick={startAddChapter}
                disabled={!selectedCourseId}
                className="inline-flex items-center gap-2 px-5 py-3 bg-brand-radial disabled:opacity-50 hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/15 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Session
              </button>
            </div>

            {/* SELECT DICTIONARY FILTER */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/60 border border-purple-950/30 p-6 rounded-3xl">
              <label className="text-xs font-black uppercase tracking-widest text-purple-400 whitespace-nowrap shrink-0">Select Curriculum Course:</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">-- Choose Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* SOFTWARE VARIATIONS MANAGER FOR SELECTED COURSE */}
            {selectedCourseId && (
              <div className="bg-black/60 border border-purple-950/30 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-500" />
                      Software Variations Configuration
                    </h3>
                    <p className="text-[11px] text-gray-400">Configure titles, square icons, and status ('Available' or 'Coming Soon') for each software variation.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSoftwareOptions}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer shrink-0"
                  >
                    Save Variations Config
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {(editingSoftwareOptions || DEFAULT_SOFTWARE_OPTIONS).map((opt, idx) => (
                    <div key={opt.id || idx} className="bg-zinc-950 border border-purple-900/20 rounded-2xl p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">{opt.id}</span>
                        <select
                          value={opt.status}
                          onChange={(e) => {
                            const updated = [...editingSoftwareOptions];
                            updated[idx] = { ...updated[idx], status: e.target.value as any };
                            setEditingSoftwareOptions(updated);
                          }}
                          className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                            opt.status === 'available'
                              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-950/50 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          <option value="available">Available</option>
                          <option value="coming_soon">Coming Soon</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Title</label>
                        <input
                          type="text"
                          value={opt.title}
                          onChange={(e) => {
                            const updated = [...editingSoftwareOptions];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setEditingSoftwareOptions(updated);
                          }}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <ImageUploader
                        label="Square Icon Image"
                        value={opt.imageUrl || ''}
                        onChange={(url) => {
                          const updated = [...editingSoftwareOptions];
                          updated[idx] = { ...updated[idx], imageUrl: url };
                          setEditingSoftwareOptions(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SESSIONS FILTER BY SOFTWARE VARIATION */}
            {selectedCourseId && (
              <div className="flex items-center gap-2 bg-zinc-950/80 border border-purple-950/30 p-2 rounded-2xl overflow-x-auto">
                <span className="text-xs font-bold text-gray-400 uppercase px-3 whitespace-nowrap">Filter Sessions:</span>
                {[
                  { id: 'all', name: 'All Variations' },
                  { id: 'premiere', name: 'Premiere Pro' },
                  { id: 'davinci', name: 'DaVinci Resolve' },
                  { id: 'capcut', name: 'CapCut' }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSoftwareFilter(s.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedSoftwareFilter === s.id
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-black text-gray-400 hover:text-white border border-purple-900/10'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {loadingChapters ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : !selectedCourseId ? (
              <div className="text-center py-12 text-gray-500 text-xs font-bold">Please pick or publish a course first to adjust course sessions.</div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-purple-950/20 rounded-3xl">
                <p className="text-gray-400 text-sm mb-1">No curriculum sessions stored for this course.</p>
                <span className="text-[11px] text-gray-500">Insert the first session block by clicking "Add New Session" at the top corner.</span>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto relative">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#09090b] text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6 bg-[#09090b]">Index/Pos</th>
                        <th className="py-4 px-6 bg-[#09090b]">Software</th>
                        <th className="py-4 px-6 bg-[#09090b]">Session Topic / Title</th>
                        <th className="py-4 px-6 bg-[#09090b]">Type Status</th>
                        <th className="py-4 px-6 bg-[#09090b]">Handouts & Exercises</th>
                        <th className="py-4 px-6 text-right sticky right-0 bg-[#09090b] border-l border-purple-950/20 z-20 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">Sequence Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {chapters.filter((chap) => {
                        if (!selectedSoftwareFilter || selectedSoftwareFilter === 'all') return true;
                        if (selectedSoftwareFilter === 'premiere') return !chap.softwareId || chap.softwareId === 'premiere';
                        return chap.softwareId === selectedSoftwareFilter;
                      }).map((chap) => (
                        <tr key={chap.id} className="hover:bg-white/5 transition-colors group">
                          <td className="py-4 px-6 font-mono text-xs font-black text-purple-400 flex items-center gap-2">
                            <span>{chap.position || 'N/A'}</span>
                            <div className="flex flex-col gap-1">
                              <button 
                                onClick={() => handleUpdateChapterPosition(chap, Number(chap.position || 0) + 1)}
                                className="text-[9px] hover:text-white transition-colors cursor-pointer"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={() => handleUpdateChapterPosition(chap, Math.max(1, Number(chap.position || 0) - 1))}
                                className="text-[9px] hover:text-white transition-colors cursor-pointer"
                              >
                                ▼
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                              chap.softwareId === 'davinci'
                                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                                : chap.softwareId === 'capcut'
                                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                                  : 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                            }`}>
                              {chap.softwareId === 'davinci' ? 'DaVinci' : chap.softwareId === 'capcut' ? 'CapCut' : 'Premiere'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-white text-sm">{chap.title}</div>
                              {chap.is_seeded && (
                                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-purple-500/20">
                                  Default Preset
                                </span>
                              )}
                            </div>
                            {chap.session_url && (
                              <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs flex items-center gap-1.5 mt-0.5">
                                <Video className="w-3 h-3 text-purple-500 shrink-0" />
                                Link: {chap.session_url}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <button
                              type="button"
                              onClick={() => handleToggleChapterPreview(chap)}
                              className={`px-3 py-1 text-[10px] uppercase font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                chap.is_preview 
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50' 
                                  : 'bg-zinc-900 border-purple-900/30 text-gray-400 hover:text-white hover:border-purple-500'
                              }`}
                              title="Click to toggle public free preview mode"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${chap.is_preview ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                              {chap.is_preview ? 'Public Free Preview' : 'Locked (Premium)'}
                            </button>
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-450">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {chap.exercise_title || chap.exercise_url || (chap.exercise_tasks && chap.exercise_tasks.length > 0) ? (
                                <span className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold uppercase rounded-md flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Exercise
                                </span>
                              ) : null}
                              {chap.homework_url ? (
                                <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase rounded-md flex items-center gap-1">
                                  📁 Handout
                                </span>
                              ) : null}
                              {!chap.exercise_title && !chap.exercise_url && !chap.homework_url && (
                                <span className="text-gray-650 text-xs">—</span>
                              )}
                            </div>
                          </td>
                           <td className="py-4 px-6 text-right space-x-1.5 sticky right-0 bg-[#09090b] group-hover:bg-[#18181b] transition-colors border-l border-purple-950/20 z-10 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">
                            <button
                              onClick={() => startEditChapter(chap)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 hover:bg-purple-950/25 text-purple-400 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteChapter(chap.id, chap.title)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 hover:bg-red-950/25 text-red-400 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENTS LEDGER (USERS MANAGEMENT) */}
        {activeTab === 'students' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">User Accounts & Roles</h1>
              <p className="text-gray-400 text-xs mt-1">Promote students to workspace administrators, manage profile schemas stored on Firestore</p>
            </div>

            {loadingUsers ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-20 text-gray-500">No registered users in Firestore. Use email or auth to generate.</div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6">Interactive Role Role</th>
                        <th className="py-4 px-6">Name & Student Profile</th>
                        <th className="py-4 px-6">Primary Contact</th>
                        <th className="py-4 px-6">Unique Username</th>
                        <th className="py-4 px-6 text-right">Registry Operation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleToggleUserRole(usr)}
                              className={`px-3 py-1.5 text-[10px] uppercase font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                usr.role === 'admin'
                                  ? 'bg-purple-950/50 border-purple-500/30 text-purple-300'
                                  : 'bg-zinc-900 border-white/5 text-gray-400 hover:text-white'
                              }`}
                              title="Click to toggle admin credentials"
                            >
                              <Shield className="w-3.5 h-3.5 shrink-0" />
                              {usr.role || 'student'}
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={usr.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100'}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-purple-950"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-bold text-white text-sm">{usr.fullName || usr.displayName || 'No name provided'}</div>
                                <div className="text-[9px] text-gray-600 font-mono">UID: {usr.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-300 font-semibold">{usr.email}</td>
                          <td className="py-4 px-6 text-xs text-gray-450 font-mono">{usr.username || '@not_configured'}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenShippedAccountsModal(usr)}
                                className="px-3 py-1.5 bg-purple-900/10 hover:bg-purple-900/30 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="Manage Account Credentials"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Credentials</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUserDoc(usr)}
                                className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                title="Delete user document from Firestore (WARNING: Doesn't drop from Authentication console)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: RECEIPTS VERIFICATION LEDGER */}
        {activeTab === 'receipts' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Receipt Verifications</h1>
                <p className="text-gray-400 text-xs mt-1">
                  Inspect user uploaded payment receipts (CCP &amp; BaridiMob). Verify and unlock access immediately.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-zinc-900/60 p-1 border border-white/5 rounded-2xl max-w-md shrink-0">
                {(['pending', 'approved', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveReceiptFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeReceiptFilter === filter
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter === 'pending' && `Pending (${enrollments.filter(e => (!e.paid || e.status === 'pending_verification') && e.status !== 'rejected').length})`}
                    {filter === 'approved' && `Approved (${enrollments.filter(e => e.paid || e.status === 'approved').length})`}
                    {filter === 'all' && `All (${enrollments.length})`}
                  </button>
                ))}
              </div>
            </div>

            {loadingEnrollments ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              (() => {
                const filteredList = enrollments.filter((enrollment) => {
                  if (activeReceiptFilter === 'pending') {
                    return (!enrollment.paid || enrollment.status === 'pending_verification') && enrollment.status !== 'rejected';
                  }
                  if (activeReceiptFilter === 'approved') {
                    return enrollment.paid || enrollment.status === 'approved';
                  }
                  return true;
                });

                if (filteredList.length === 0) {
                  return (
                    <div className="text-center py-20 text-gray-500 bg-zinc-900/10 border border-purple-950/10 rounded-[2rem] p-8">
                      No matching receipt transactions found on Firestore database.
                    </div>
                  );
                }

                return (
                  <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30 font-sans">
                          <tr>
                            <th className="py-4 px-6 font-sans">Student Account</th>
                            <th className="py-4 px-6 font-sans">Course Material</th>
                            <th className="py-4 px-6 font-sans">Amount Charged</th>
                            <th className="py-4 px-6 font-sans">Submitted Info</th>
                            <th className="py-4 px-6 font-sans">Voucher Document</th>
                            <th className="py-4 px-6 font-sans">Status Details</th>
                            <th className="py-4 px-6 text-right font-sans">Verification Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950/15 font-sans">
                          {filteredList.map((enrollment) => {
                            const student = usersList.find((u) => u.id === enrollment.uid);
                            const course = courses.find((c) => c.id === enrollment.courseId);
                            const isPending = (!enrollment.paid || enrollment.status === 'pending_verification') && enrollment.status !== 'rejected';
                            const rawDate = enrollment.createdAt || enrollment.submittedAt || enrollment.enrolledAt;
                            const dateFormatted = rawDate
                              ? new Date(
                                  rawDate.seconds
                                    ? rawDate.seconds * 1000
                                    : rawDate
                                ).toLocaleString()
                              : 'No Timestamp';

                            return (
                              <tr key={enrollment.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6 font-sans">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={student?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100'}
                                      alt=""
                                      className="w-10 h-10 rounded-full object-cover border border-purple-950"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div>
                                      <div className="font-bold text-white text-xs">{student?.name || student?.fullName || enrollment.fullName || 'Anonymous student'}</div>
                                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{student?.email || 'N/A Email'}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-6 font-sans">
                                  <div className="font-black text-xs text-white max-w-[200px] truncate">{course?.title || `Course ID: ${enrollment.courseId}`}</div>
                                  <div className="text-[10px] text-purple-400 mt-0.5 font-bold uppercase tracking-wider">Recorded Session</div>
                                </td>

                                <td className="py-4 px-6 font-mono text-xs font-black text-white">
                                  {enrollment.price || course?.price || '0'} DA
                                </td>

                                <td className="py-4 px-6 font-sans">
                                  <div className="text-xs text-gray-300 font-bold">{enrollment.fullName || 'No Name Submitted'}</div>
                                  <div className="text-[10.5px] text-gray-400 font-mono mt-1 flex flex-col gap-1">
                                    <span>Method: <strong className="text-purple-400 uppercase">{enrollment.paymentMethod || 'CCP/Baridi'}</strong></span>
                                    <span>RIP/Account: {enrollment.ccpRIP || 'N/A'}</span>
                                    <span>Submitted: <span className="text-amber-400 font-bold">{dateFormatted}</span></span>
                                  </div>
                                </td>

                                <td className="py-4 px-6 font-sans">
                                  {enrollment.receiptUrl ? (
                                    <div className="relative group/receipt w-14 h-14 bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                                      <img
                                        src={enrollment.receiptUrl}
                                        alt="Receipt Doc"
                                        className="w-full h-full object-cover group-hover/receipt:scale-110 transition-transform duration-300"
                                        referrerPolicy="no-referrer"
                                      />
                                      <button
                                        onClick={() => setEnlargedReceiptUrl(enrollment.receiptUrl)}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/receipt:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black cursor-pointer uppercase tracking-widest"
                                      >
                                        ZOOM
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-500 italic">No receipt file uploaded</span>
                                  )}
                                </td>

                                <td className="py-4 px-6 font-sans">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-gray-500 font-mono">{dateFormatted}</span>
                                    <div>
                                      {enrollment.status === 'approved' || enrollment.paid ? (
                                        <span className="px-2 py-0.5 bg-green-950/40 text-green-400 border border-green-500/15 rounded text-[10px] uppercase font-bold tracking-wider inline-block">
                                          Approved &amp; Active
                                        </span>
                                      ) : enrollment.status === 'rejected' ? (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-500/15 rounded text-[10px] uppercase font-bold tracking-wider inline-block">
                                            Receipt Rejected
                                          </span>
                                          <span className="text-[9px] text-gray-500 block leading-tight mt-1 max-w-[140px] truncate" title={enrollment.rejectionReason}>
                                            Reason: {enrollment.rejectionReason}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-yellow-950/40 text-yellow-400 border border-yellow-500/15 rounded text-[10px] uppercase font-bold tracking-wider animate-pulse inline-block">
                                          PENDING Verification
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-6 text-right font-sans">
                                  {isPending || editingReceiptId === enrollment.id ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleRejectEnrollment(enrollment.id)}
                                        className="px-3 py-1.5 bg-zinc-900 hover:bg-red-950 border border-white/5 hover:border-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleApproveEnrollment(enrollment.id)}
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/10 cursor-pointer flex items-center gap-1"
                                      >
                                        Approve &amp; Unlock
                                      </button>
                                      <button
                                        onClick={() => startEditEnrollment(enrollment)}
                                        className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/20 text-purple-400 rounded-xl transition-all cursor-pointer flex items-center"
                                        title="Detailed Edit"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEnrollment(enrollment.id, student?.name || enrollment.fullName || 'Anonymous student')}
                                        className="p-2 bg-zinc-900 hover:bg-red-950/20 border border-white/5 hover:border-red-500/20 text-red-500 rounded-xl transition-all cursor-pointer flex items-center"
                                        title="Delete request"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      {editingReceiptId === enrollment.id && (
                                        <button
                                          onClick={() => setEditingReceiptId(null)}
                                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider select-none">
                                        {enrollment.status === 'approved' || enrollment.paid ? 'Access Granted' : 'Rejected'}
                                      </span>
                                      <button
                                        onClick={() => startEditEnrollment(enrollment)}
                                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/20 text-purple-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                        title="Change Decision"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEnrollment(enrollment.id, student?.name || enrollment.fullName || 'Anonymous student')}
                                        className="p-2.5 bg-zinc-900 hover:bg-red-950/20 border border-white/5 hover:border-red-500/20 text-red-500 rounded-xl transition-all cursor-pointer flex items-center"
                                        title="Delete request"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* TAB 4: STUDENT SHOWCASE WORKS */}
        {activeTab === 'student-works' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Showcase Submissions Gallery</h1>
                <p className="text-gray-400 text-xs mt-1">Feature exceptional tasks on the homepage, remove entries representing improper concepts</p>
              </div>
              {selectedStudentWorkIds.length > 0 && (
                <button
                  onClick={handleMassDeleteStudentWorks}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-500 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer self-start"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedStudentWorkIds.length})
                </button>
              )}
            </div>

            {loadingWorks ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : studentWorks.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-purple-950/20 rounded-3xl">
                <p className="text-gray-400 text-sm">No artworks published on Firestore yet.</p>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                            checked={studentWorks.length > 0 && selectedStudentWorkIds.length === studentWorks.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentWorkIds(studentWorks.map(w => w.id));
                              } else {
                                setSelectedStudentWorkIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-4 px-6">Approval Status</th>
                        <th className="py-4 px-6">Featured</th>
                        <th className="py-4 px-6">Illustration</th>
                        <th className="py-4 px-6">Task Title</th>
                        <th className="py-4 px-6">Submitted Student</th>
                        <th className="py-4 px-6 text-right">Delete Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {studentWorks.map((work) => {
                        const s_img = work.image_url || work.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=150';
                        const s_student = work.student_name || work.studentName || 'Student';
                        const s_title = work.title || 'Masterpiece';
                        const isApproved = work.approved === true || work.status === 'approved';
                        return (
                          <tr key={work.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                              <input 
                                type="checkbox"
                                className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                                checked={selectedStudentWorkIds.includes(work.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentWorkIds([...selectedStudentWorkIds, work.id]);
                                  } else {
                                    setSelectedStudentWorkIds(selectedStudentWorkIds.filter(id => id !== work.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="py-4 px-6">
                              {isApproved ? (
                                <span className="px-3 py-1.5 bg-green-950/20 border border-green-500/30 text-green-400 text-[10px] uppercase font-black rounded-xl inline-flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Approved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApproveWork(work)}
                                  className="px-3 py-1.5 bg-purple-900/30 border border-purple-550/30 text-purple-300 hover:bg-purple-900/50 text-[10px] uppercase font-black rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Click to approve student work showcase"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Approve Request
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleToggleWorkFeature(work)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 text-[10px] uppercase font-black ${
                                  work.is_featured
                                    ? 'bg-amber-955/35 border-amber-500/40 text-amber-400'
                                    : 'bg-zinc-900 border-white/5 text-gray-500 hover:text-gray-300'
                                }`}
                                title="Click to feature on homepage"
                              >
                                <Award className="w-4 h-4" />
                                {work.is_featured ? 'Featured' : 'Regular'}
                              </button>
                            </td>
                            <td className="py-4 px-6">
                              <img
                                src={s_img}
                                alt=""
                                className="w-16 h-10 object-cover rounded-xl border border-purple-950"
                                referrerPolicy="no-referrer"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-white text-sm">{s_title}</div>
                              <div className="text-[10px] text-purple-400 font-semibold">{work.course_name || work.courseTitle || 'Creative Course'}</div>
                            </td>
                            <td className="py-4 px-6 text-xs text-gray-300 font-bold">{s_student}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditWorkClick(work)}
                                  className="p-2 hover:bg-purple-950/40 text-purple-400 hover:text-purple-300 rounded-lg transition-all cursor-pointer"
                                  title="Edit Showcase Work"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWork(work.id, s_student)}
                                  className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                  title="Delete Showcase Work"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.1: STORE PRODUCTS MANAGER */}
        {activeTab === 'store-products' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Software Store Products</h1>
                <p className="text-gray-400 text-xs mt-1">Manage subscription products, images, active durations, and pricing</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedStoreProductIds.length > 0 && (
                  <button
                    onClick={handleMassDeleteStoreProducts}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-500 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedStoreProductIds.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingStoreProductId(null);
                    setStoreProductForm({
                      name: '',
                      description: '',
                      imageUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop',
                      durationsText: '1 Month: 4500\n3 Months: 12500\n6 Months: 23000\n12 Months: 42000',
                      defaultDuration: '1 Month',
                      active: true
                    });
                    setShowStoreProductModal(true);
                  }}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all self-start flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer text-white"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Product
                </button>
              </div>
            </div>

            {loadingStoreProducts ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : storeProducts.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                <PlusCircle className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-400 font-bold">No products found in the store database</p>
                <p className="text-xs text-gray-650 mt-1">Click the top button to seed or list your first product!</p>
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-purple-950/20 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/30 text-gray-400 text-[10px] uppercase font-bold tracking-widest bg-zinc-950/60">
                        <th className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                            checked={storeProducts.length > 0 && selectedStoreProductIds.length === storeProducts.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStoreProductIds(storeProducts.map(item => item.id));
                              } else {
                                setSelectedStoreProductIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-4 px-6">Image</th>
                        <th className="py-4 px-6">Product Name</th>
                        <th className="py-4 px-6">Durations & Prices (DA)</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {storeProducts.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                              checked={selectedStoreProductIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStoreProductIds([...selectedStoreProductIds, item.id]);
                                } else {
                                  setSelectedStoreProductIds(selectedStoreProductIds.filter(id => id !== item.id));
                                }
                              }}
                            />
                          </td>
                          <td className="py-4 px-6">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                              alt=""
                              className="w-14 h-10 object-cover rounded-xl border border-purple-950"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm line-clamp-1">{item.name}</div>
                            <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {item.durations && Object.entries(item.durations).map(([dur, price]: any) => (
                                <span key={dur} className="px-2 py-0.5 rounded-md bg-zinc-900 border border-purple-950/35 text-[10px] font-mono text-gray-300">
                                  {dur}: <strong className="text-purple-400">{price} DA</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              item.active !== false 
                                ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                                : 'bg-red-950/40 border border-red-500/20 text-red-400'
                            }`}>
                              {item.active !== false ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2 shrink-0">
                            <button
                              onClick={() => startEditStoreProduct(item)}
                              className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStoreProduct(item.id, item.name)}
                              className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer inline-flex"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.2: STORE PURCHASES (RECEIPTS) */}
        {activeTab === 'store-purchases' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Software Receipts</h1>
              <p className="text-gray-400 text-xs mt-1">Verify payment screenshots and receipts uploaded by students for software subscriptions</p>
            </div>

            {loadingStorePurchases ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : storePurchases.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                <Receipt className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-400 font-bold">No store receipts found</p>
                <p className="text-xs text-gray-650 mt-1">Receipts will appear here when students request premium software subscriptions.</p>
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-purple-950/20 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/30 text-gray-400 text-[10px] uppercase font-bold tracking-widest bg-zinc-950/60">
                        <th className="py-4 px-6">Student Info</th>
                        <th className="py-4 px-6">Product Details</th>
                        <th className="py-4 px-6">Gateway</th>
                        <th className="py-4 px-6">Amount Paid</th>
                        <th className="py-4 px-6">Receipt</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {storePurchases.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm">{item.displayName}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.email}</div>
                            <div className="text-[10px] font-mono text-purple-350 mt-1">{item.phone}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-extrabold text-white text-sm">{item.productName}</div>
                            <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-500/20 text-[10px] text-purple-300 font-bold mt-1">
                              {item.duration}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs uppercase font-bold text-gray-300">
                            {item.paymentMethod || 'CCP / BaridiMob'}
                          </td>
                          <td className="py-4 px-6 font-mono text-sm font-black text-purple-400">
                            {item.price} {item.currency || 'DZD'}
                          </td>
                          <td className="py-4 px-6">
                            {item.receiptUrl ? (
                              <button
                                onClick={() => setEnlargedReceiptUrl(item.receiptUrl)}
                                className="w-14 h-10 overflow-hidden rounded-lg border border-purple-950 cursor-pointer hover:border-purple-500 transition-colors"
                              >
                                <img
                                  src={item.receiptUrl}
                                  alt="Receipt Screenshot"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-650 italic">No File</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              item.status === 'approved'
                                ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400'
                                : item.status === 'rejected'
                                  ? 'bg-red-950/40 border border-red-500/20 text-red-400'
                                  : 'bg-amber-950/40 border border-amber-500/20 text-amber-400 animate-pulse'
                            }`}>
                              {item.status}
                            </span>
                            {item.status === 'rejected' && item.rejectionReason && (
                              <p className="text-[10px] text-red-550 italic mt-1 max-w-[150px] truncate" title={item.rejectionReason}>
                                Reason: {item.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right space-x-2 shrink-0">
                            {item.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApproveStorePurchase(item)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectStorePurchase(item)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => startEditStorePurchase(item)}
                                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/20 text-purple-400 rounded-lg transition-all cursor-pointer inline-flex"
                                  title="Edit Request Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStorePurchase(item.id, item.displayName || 'Anonymous student')}
                                  className="p-1.5 bg-zinc-900 hover:bg-red-950/20 border border-white/5 hover:border-red-500/20 text-red-500 rounded-lg transition-all cursor-pointer inline-flex"
                                  title="Delete Request"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-gray-550 italic mr-2">Completed</span>
                                <button
                                  onClick={() => startEditStorePurchase(item)}
                                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/20 text-purple-400 rounded-lg transition-all cursor-pointer inline-flex"
                                  title="Edit Request Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStorePurchase(item.id, item.displayName || 'Anonymous student')}
                                  className="p-1.5 bg-zinc-900 hover:bg-red-950/20 border border-white/5 hover:border-red-500/20 text-red-500 rounded-lg transition-all cursor-pointer inline-flex"
                                  title="Delete Request"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.3: USEFUL RESOURCES MANAGER */}
        {activeTab === 'useful-resources' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Useful Resources</h1>
                <p className="text-gray-400 text-xs mt-1">Manage external resources, links, categories, and logos for students</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedUsefulResourceIds.length > 0 && (
                  <button
                    onClick={handleMassDeleteUsefulResources}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-500 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedUsefulResourceIds.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingUsefulResourceId(null);
                    setUsefulResourceForm({
                      name: '',
                      description: '',
                      category: 'Free Stock Footage',
                      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
                      url: '',
                      order: '1',
                      active: true
                    });
                    setShowUsefulResourceModal(true);
                  }}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all self-start flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer text-white"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Resource Link
                </button>
              </div>
            </div>

            {loadingUsefulResources ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : usefulResources.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                <PlusCircle className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-400 font-bold">No useful resources found</p>
                <p className="text-xs text-gray-650 mt-1">Click the top button to add your first useful creative website link!</p>
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-purple-950/20 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/30 text-gray-400 text-[10px] uppercase font-bold tracking-widest bg-zinc-950/60">
                        <th className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                            checked={usefulResources.length > 0 && selectedUsefulResourceIds.length === usefulResources.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsefulResourceIds(usefulResources.map(item => item.id));
                              } else {
                                setSelectedUsefulResourceIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-4 px-6">Logo</th>
                        <th className="py-4 px-6">Resource Name</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Display Order</th>
                        <th className="py-4 px-6">URL</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {usefulResources.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 w-12 text-center border-r border-purple-950/20">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                              checked={selectedUsefulResourceIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsefulResourceIds([...selectedUsefulResourceIds, item.id]);
                                } else {
                                  setSelectedUsefulResourceIds(selectedUsefulResourceIds.filter(id => id !== item.id));
                                }
                              }}
                            />
                          </td>
                          <td className="py-4 px-6">
                            <img
                              src={item.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                              alt=""
                              className="w-10 h-10 object-cover rounded-xl border border-purple-950"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm line-clamp-1">{item.name}</div>
                            <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 text-[10px] font-bold text-purple-300 uppercase">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-purple-350">
                            {item.order !== undefined ? item.order : '1'}
                          </td>
                          <td className="py-4 px-6">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-400 hover:underline truncate max-w-[150px] inline-block"
                            >
                              {item.url}
                            </a>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              item.active !== false 
                                ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                                : 'bg-red-950/40 border border-red-500/20 text-red-400'
                            }`}>
                              {item.active !== false ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2 shrink-0">
                            <button
                              onClick={() => startEditUsefulResource(item)}
                              className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex"
                              title="Edit Resource"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUsefulResource(item.id, item.name)}
                              className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer inline-flex"
                              title="Delete Resource"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: EXERCISE SUBMISSIONS */}
        {activeTab === 'exercises' && (
          <div className="space-y-8 animate-fade-in text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Practical Exercises Workspace</h1>
                <p className="text-gray-400 text-xs mt-1">Review student practical submissions or configure class session exercises and evaluation criteria checklists.</p>
              </div>
            </div>

            {/* Sub-tab selection */}
            <div className="flex border-b border-purple-950/20 pb-px gap-6">
              <button
                onClick={() => setExerciseActiveSubTab('submissions')}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
                  exerciseActiveSubTab === 'submissions'
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                TUTOR REVIEW DECK
                {exerciseActiveSubTab === 'submissions' && (
                  <motion.div layoutId="exerciseSubActiveBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                )}
              </button>
              <button
                onClick={() => setExerciseActiveSubTab('configurator')}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
                  exerciseActiveSubTab === 'configurator'
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                EXERCISE BUILDER & CONFIGURATOR
                {exerciseActiveSubTab === 'configurator' && (
                  <motion.div layoutId="exerciseSubActiveBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                )}
              </button>
            </div>

            {exerciseActiveSubTab === 'submissions' && (
              <>
                {loadingExercises ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                  </div>
                ) : exerciseSubmissions.length === 0 ? (
                  <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                    <Flame className="w-12 h-12 text-purple-500/40 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">No Submissions Found</h3>
                    <p className="text-gray-400 text-xs mt-1.5">No student has submitted an active chapter exercise for review yet.</p>
                  </div>
                ) : (
                  <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                          <tr>
                            <th className="py-4 px-6">Student</th>
                            <th className="py-4 px-6">Session / Module</th>
                            <th className="py-4 px-6">Submission File</th>
                            <th className="py-4 px-6">Evaluation Score</th>
                            <th className="py-4 px-6">Submitted At</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950/10 bg-zinc-950/10">
                          {exerciseSubmissions.map((sub: any) => {
                            const studentUser = usersList.find((u: any) => u.id === (sub.uid || sub.userId));
                            const matchCourse = courses.find((c: any) => c.id === sub.courseId);
                            
                            return (
                              <tr key={sub.id} className="hover:bg-purple-950/5 transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white text-xs">{studentUser?.fullName || 'Anonymous student'}</span>
                                    <span className="text-[10px] font-mono text-gray-500">{studentUser?.email || sub.userId || sub.uid}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white text-xs">
                                      {matchCourse?.title || 'Course Module'}
                                    </span>
                                    <span className="text-[10px] font-mono text-purple-400">
                                      Session Position: {sub.chapter ?? sub.chapterId}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <a 
                                    href={sub.downloadUrl || sub.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-all"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[150px]">{sub.name || sub.fileName || 'View Submission Link'}</span>
                                  </a>
                                </td>
                                <td className="py-4 px-6">
                                  {sub.status === 'reviewed' ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                                        {sub.score || 0} / 10
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold animate-pulse">
                                      Needs Review
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                                  {sub.uploadedAt ? new Date(sub.uploadedAt).toLocaleString() : 'N/A'}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button
                                    onClick={() => handleOpenGradingModal(sub)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                      sub.status === 'reviewed'
                                        ? 'bg-zinc-900 border border-purple-900/30 text-purple-300 hover:bg-zinc-850'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                                    }`}
                                  >
                                    {sub.status === 'reviewed' ? 'Re-grade / Edit' : 'Evaluate & Grade'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {exerciseActiveSubTab === 'configurator' && (
              <div className="space-y-6">
                <div className="bg-zinc-950/40 border border-purple-900/10 p-6 rounded-[2rem] space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="text-xs font-black uppercase tracking-widest text-purple-400 whitespace-nowrap shrink-0">Select Curriculum Course:</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        setSelectedConfigChapterId(null);
                        if (e.target.value) {
                          fetchChaptersForCourse(e.target.value);
                        }
                      }}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- Choose Course --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!selectedCourseId ? (
                  <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                    <HelpCircle className="w-12 h-12 text-purple-500/40 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Select a Course</h3>
                    <p className="text-gray-400 text-xs mt-1.5">Choose a course above to load sessions and configure their practical exercises & evaluation criteria.</p>
                  </div>
                ) : loadingChapters ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                    <HelpCircle className="w-12 h-12 text-purple-500/40 mx-auto mb-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">No Sessions Exist</h3>
                    <p className="text-gray-400 text-xs mt-1.5">Create sessions in the "Course Sessions" tab first for this course.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Panel: Course Sessions list */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Select a Session to Configure</div>
                      {chapters.map((ch: any) => {
                        const hasExercise = !!ch.exercise_title || !!ch.exercise_url || (ch.exercise_tasks && ch.exercise_tasks.length > 0);
                        const isSelected = selectedConfigChapterId === ch.id;
                        return (
                          <div
                            key={ch.id}
                            onClick={() => selectChapterForConfig(ch)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'bg-purple-950/30 border-purple-500/40 text-white'
                                : 'bg-black/20 hover:bg-black/45 border-purple-950/20 text-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-bold text-xs sm:text-sm">{ch.title || `Session ${ch.position}`}</div>
                              <span className="font-mono text-[9px] text-purple-400 shrink-0 uppercase tracking-wider font-extrabold px-1.5 py-0.5 bg-purple-950/40 border border-purple-900/20 rounded-md">
                                Pos {ch.position}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-purple-950/10">
                              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Exercise Status</span>
                              {hasExercise ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Configured ({ch.exercise_tasks?.length || 0} tasks)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-amber-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Missing Setup
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Panel: Configurations Form */}
                    <div className="lg:col-span-7">
                      {!selectedConfigChapterId ? (
                        <div className="p-12 text-center bg-zinc-950/20 border border-dashed border-purple-950/20 rounded-[2rem] text-xs text-gray-500 font-bold uppercase">
                          Please select a session on the left to edit its practical exercise payload
                        </div>
                      ) : (
                        <form onSubmit={(e) => handleSaveConfiguredExercise(selectedConfigChapterId, e)} className="bg-zinc-950/40 border border-purple-900/15 p-6 sm:p-8 rounded-[2rem] space-y-5 text-left">
                          <div className="border-b border-purple-950/20 pb-4">
                            <h3 className="font-bold text-white text-base font-sans tracking-tight">Configure Practical Exercise</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">Determine briefing media, tasks objectives, and checklist guidelines for active grading.</p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5">Exercise Title</label>
                            <input
                              type="text"
                              required
                              value={exerciseForm.title}
                              onChange={(e) => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                              placeholder="e.g. Cut the Interview: Sync & Assemblage"
                              className="w-full bg-black border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/60 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5">Exercise Video Briefing URL (Vimeo / YouTube / Bunny Player link)</label>
                            <input
                              type="url"
                              value={exerciseForm.videoUrl}
                              onChange={(e) => setExerciseForm({ ...exerciseForm, videoUrl: e.target.value })}
                              placeholder="e.g. https://iframe.mediadelivery.net/embed/..."
                              className="w-full bg-black border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/60 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5">Exercise Instructions & Description</label>
                            <textarea
                              rows={3}
                              value={exerciseForm.brief}
                              onChange={(e) => setExerciseForm({ ...exerciseForm, brief: e.target.value })}
                              placeholder="Type student task instruction details..."
                              className="w-full bg-black border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/60 h-20 resize-none leading-relaxed"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400">Evaluation Checklist Requirements</label>
                              <span className="text-[9px] font-mono text-gray-500">One per line</span>
                            </div>
                            <textarea
                              rows={5}
                              required
                              value={exerciseForm.tasksRaw}
                              onChange={(e) => setExerciseForm({ ...exerciseForm, tasksRaw: e.target.value })}
                              placeholder="Import footage and sync sequences&#10;Build rough assembly cut following beats&#10;Match color grading of target clip&#10;Integrate continuous audio pacing"
                              className="w-full bg-black border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/60 h-28 font-mono leading-relaxed"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-4 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-purple-600/15 cursor-pointer mt-2"
                          >
                            Save Exercise Configuration
                          </button>
                        </form>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: CURRICULUM QUIZZES */}
        {activeTab === 'quizzes' && (
          <div className="space-y-8 animate-fade-in text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Curriculum Quizzes</h1>
                <p className="text-gray-400 text-xs mt-1">Design academic challenges for your 10 course sessions. Built-in direct upload to Bunny CDN.</p>
              </div>
              <button
                onClick={handleOpenCreateQuiz}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all self-start flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer text-white"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Quiz
              </button>
            </div>

            {loadingQuizzes ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-400 font-bold">No quizzes found</p>
                <p className="text-xs text-gray-650 mt-1">Design an interactive NLE-style check for students! Click the top button to start.</p>
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-purple-950/20 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/30 text-gray-400 text-[10px] uppercase font-bold tracking-widest bg-zinc-950/60">
                        <th className="py-4 px-6">Session ID</th>
                        <th className="py-4 px-6">Quiz Title</th>
                        <th className="py-4 px-6">Questions</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {quizzes.slice().sort((a,b) => (a.sessionId || 1) - (b.sessionId || 1)).map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs text-purple-400 font-bold">
                            Session {item.sessionId || 1}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm">{item.title}</div>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-gray-400">
                            {item.questions?.length || 0} Questions
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              item.status === 'published'
                                ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400'
                                : 'bg-amber-950/40 border border-amber-500/20 text-amber-400'
                            }`}>
                              {item.status || 'draft'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              onClick={() => startEditQuiz(item)}
                              className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex"
                              title="Edit Quiz"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(item.id, item.title)}
                              className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer inline-flex"
                              title="Delete Quiz"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* QUIZ FORM PARAMETERS MODAL */}
            {showQuizModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer" onClick={() => setShowQuizModal(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative bg-zinc-950 border border-purple-900/20 rounded-[2rem] p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl z-10 text-left space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-purple-950/30 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
                        {editingQuizId ? 'Edit Academy Quiz' : 'Create Academy Quiz'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 font-sans">Build interactive NLE timelines and assign them to sessions</p>
                    </div>
                    <button onClick={() => setShowQuizModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleQuizSubmit} className="space-y-6 font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Quiz Title</label>
                        <input
                          type="text"
                          required
                          value={quizForm.title}
                          onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 font-bold font-sans"
                          placeholder="e.g. Session 1 Check — Basics"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Session Assignment</label>
                        <select
                          value={quizForm.sessionId}
                          onChange={(e) => setQuizForm({ ...quizForm, sessionId: Number(e.target.value) })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Session {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Publishing Status</label>
                        <select
                          value={quizForm.status}
                          onChange={(e) => setQuizForm({ ...quizForm, status: e.target.value as 'draft' | 'published' })}
                          className="bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer font-bold"
                        >
                          <option value="draft">Draft (Hidden)</option>
                          <option value="published">Published (Live)</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-purple-950/20 pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Question Sequence</h4>
                          <p className="text-xs text-gray-550 mt-0.5">Build curriculum steps ({questions.length} total)</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAddQuestion}
                          className="px-4 py-2 bg-purple-900/25 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>+ Add Question</span>
                        </button>
                      </div>

                      {questions.length === 0 ? (
                        <div className="text-center py-12 bg-black/40 border border-dashed border-purple-900/10 rounded-2xl">
                          <HelpCircle className="w-10 h-10 text-gray-600 mx-auto mb-2 animate-pulse" />
                          <p className="text-xs text-gray-450 font-bold font-mono">No questions defined yet</p>
                          <p className="text-[10px] text-gray-650 mt-0.5 font-sans">Click + Add Question to set up MCQ, slider compare, rapid fire, and more</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                          {questions.map((q, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-black/50 border border-purple-950/20 rounded-2xl group hover:border-purple-500/10 transition-all">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-black text-purple-400 bg-purple-500/5 px-2.5 py-1 rounded-lg border border-purple-500/10">
                                  Q{idx + 1}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-white line-clamp-1 font-sans">{q.text}</div>
                                  <div className="text-[10px] text-purple-350 font-mono mt-0.5 uppercase tracking-wider">{q.type}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveQuestion(idx, 'up')}
                                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === questions.length - 1}
                                  onClick={() => moveQuestion(idx, 'down')}
                                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white rounded-lg disabled:opacity-30 transition-all cursor-pointer"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditQuestion(idx)}
                                  className="p-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-purple-300 text-gray-400 rounded-lg transition-all cursor-pointer"
                                  title="Edit Question"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const list = [...questions];
                                    list.splice(idx, 1);
                                    setQuestions(list);
                                    showToast('success', 'Question removed.');
                                  }}
                                  className="p-1.5 bg-zinc-900 hover:bg-red-950/20 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                  title="Delete Question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-purple-950/20 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowQuizModal(false)}
                        className="px-5 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                      >
                        Save Quiz Parameters
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* DETAILED QUESTION SPECIFICATION MODAL */}
            {showQuestionModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md cursor-pointer" onClick={() => setShowQuestionModal(false)} />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative bg-zinc-950 border border-purple-900/35 rounded-[2rem] p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl z-10 text-left space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-purple-950/30 pb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
                        {editingQuestionIndex !== null ? 'Edit Question Specifications' : 'Add Question Sequence Step'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5 font-sans">Configure visual tools, interaction mechanisms, and answer keys</p>
                    </div>
                    <button onClick={() => setShowQuestionModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveQuestion} className="space-y-6 font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Challenge Mechanism Type</label>
                        <select
                          value={currentQuestionForm.type}
                          onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, type: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer font-bold"
                        >
                          <option value="MCQ">Multiple Choice (MCQ)</option>
                          <option value="Direct">Direct Answer (Exact Text/Key)</option>
                          <option value="True/False">True / False Statement</option>
                          <option value="Fill the Gap">Fill the Gap (Blank term)</option>
                          <option value="Media Quiz">Media Quiz (Bunny clip/still + MCQ)</option>
                          <option value="Spot-diff">Spot the Difference (Coordinates/Timing)</option>
                          <option value="Slider">Before / After Slider Compare</option>
                          <option value="Sequence">Drag to Reorder (List sequence)</option>
                          <option value="Match">Match Pairs (Match rows)</option>
                          <option value="Timed MCQ">Timed Rapid Fire MCQ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Video Sync Timestamp (e.g. 00:05)</label>
                        <input
                          type="text"
                          value={currentQuestionForm.videoTimestamp}
                          onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, videoTimestamp: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                          placeholder="e.g. 00:05 or 00:00:15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Question / Challenge Prompt</label>
                      <textarea
                        required
                        rows={3}
                        value={currentQuestionForm.text}
                        onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, text: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                        placeholder="What's the keyboard shortcut for the Razor tool in Premiere Pro?"
                      />
                    </div>

                    {/* MEDIA FILE UPLOAD INTEGRATION */}
                    {(currentQuestionForm.type === 'Media Quiz' || currentQuestionForm.type === 'Spot-diff' || currentQuestionForm.type === 'Slider') && (
                      <div className="space-y-4 bg-purple-950/5 border border-purple-950/20 p-5 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono">
                            Bunny CDN Direct Media Upload
                          </label>
                          {uploadingQuestionMedia && (
                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                              Piping stream to CDN...
                            </span>
                          )}
                        </div>

                        {currentQuestionForm.type === 'Spot-diff' && (
                          <div className="space-y-3 pb-3 border-b border-purple-900/10">
                            <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono">
                              Spot-diff Video Presentation Mode
                            </span>
                            <select
                              value={currentQuestionForm.spotDiffVideosCount}
                              onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, spotDiffVideosCount: Number(e.target.value) })}
                              className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                            >
                              <option value={1}>Show 1 Video (Edited/Difference Clip only)</option>
                              <option value={2}>Show 2 Videos (Reference Clip A & Edited Clip B side-by-side)</option>
                            </select>
                          </div>
                        )}

                        {currentQuestionForm.type === 'Slider' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono">Side A (Before Clip)</span>
                              <input
                                type="file"
                                accept="video/*,image/*,audio/*"
                                onChange={(e) => handleUploadQuestionMedia(e, 'mediaUrl')}
                                className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/30 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentQuestionForm.mediaUrl}
                                onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, mediaUrl: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                placeholder="Public Side A URL..."
                              />
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono">Side B (After Clip)</span>
                              <input
                                type="file"
                                accept="video/*,image/*,audio/*"
                                onChange={(e) => handleUploadQuestionMedia(e, 'secondMediaUrl')}
                                className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/30 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentQuestionForm.secondMediaUrl}
                                onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, secondMediaUrl: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                placeholder="Public Side B URL..."
                              />
                            </div>
                          </div>
                        ) : currentQuestionForm.type === 'Spot-diff' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono">
                                Clip A (Reference Video) {currentQuestionForm.spotDiffVideosCount === 1 && <span className="text-purple-400/70">(Optional in 1-Video Mode)</span>}
                              </span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleUploadQuestionMedia(e, 'mediaUrl')}
                                className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/30 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentQuestionForm.mediaUrl}
                                onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, mediaUrl: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                placeholder="Reference Video A URL..."
                              />
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono">Clip B (Difference Video)</span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleUploadQuestionMedia(e, 'secondMediaUrl')}
                                className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/30 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentQuestionForm.secondMediaUrl}
                                onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, secondMediaUrl: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                placeholder="Difference Video B URL..."
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold block font-mono">
                              Media Asset File
                            </span>
                            <input
                              type="file"
                              accept="video/*,image/*,audio/*"
                              onChange={(e) => handleUploadQuestionMedia(e, 'mediaUrl')}
                              className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/30 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={currentQuestionForm.mediaUrl}
                              onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, mediaUrl: e.target.value })}
                              className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                              placeholder="Direct HTTP URL path to CDN asset..."
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* INTERACTION COMPONENT FIELD PARAMETERS */}
                    {(currentQuestionForm.type === 'MCQ' || currentQuestionForm.type === 'Media Quiz' || currentQuestionForm.type === 'Timed MCQ') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-purple-950/20 pt-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Options (one option per line)
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={currentQuestionForm.optionsText}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, optionsText: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                            placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Exact Correct Answer Key string
                          </label>
                          <input
                            type="text"
                            required
                            value={currentQuestionForm.correctAnswer}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                            placeholder="Option A (Must exactly match one optionsText line)"
                          />

                          {currentQuestionForm.type === 'Timed MCQ' && (
                            <div className="mt-4">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                                Timer Limit (Seconds)
                              </label>
                              <input
                                type="number"
                                required
                                min={3}
                                value={currentQuestionForm.timerLimit}
                                onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, timerLimit: Number(e.target.value) || 15 })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {currentQuestionForm.type === 'Direct' && (
                      <div className="border-t border-purple-950/20 pt-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                          Exact Correct Answer (e.g. C)
                        </label>
                        <input
                          type="text"
                          required
                          value={currentQuestionForm.correctAnswer}
                          onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                          placeholder="e.g. C"
                        />
                      </div>
                    )}

                    {currentQuestionForm.type === 'True/False' && (
                      <div className="border-t border-purple-950/20 pt-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                          Correct Answer State
                        </label>
                        <select
                          value={currentQuestionForm.correctAnswer}
                          onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="True">TRUE</option>
                          <option value="False">FALSE</option>
                        </select>
                      </div>
                    )}

                    {currentQuestionForm.type === 'Fill the Gap' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-purple-950/20 pt-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Sentence Template (Use ___ for blank space)
                          </label>
                          <input
                            type="text"
                            required
                            value={currentQuestionForm.optionsText}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, optionsText: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                            placeholder="e.g. Gbel ma tbda t-edité, khass dima trattab l-projet f ___..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Blank Gap Correct Answer Term
                          </label>
                          <input
                            type="text"
                            required
                            value={currentQuestionForm.correctAnswer}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-bold"
                            placeholder="e.g. folder"
                          />
                        </div>
                      </div>
                    )}

                    {currentQuestionForm.type === 'Spot-diff' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-purple-950/20 pt-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Timecode / Exact Seconds Difference Occurs
                          </label>
                          <input
                            type="text"
                            required
                            value={currentQuestionForm.correctAnswer}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                            placeholder="e.g. 5.5"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">Area X (%)</label>
                            <input
                              type="number"
                              required
                              value={currentQuestionForm.diffAreaX}
                              onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, diffAreaX: Number(e.target.value) })}
                              className="w-full bg-black border border-purple-900/30 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">Area Y (%)</label>
                            <input
                              type="number"
                              required
                              value={currentQuestionForm.diffAreaY}
                              onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, diffAreaY: Number(e.target.value) })}
                              className="w-full bg-black border border-purple-900/30 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">Radius (%)</label>
                            <input
                              type="number"
                              required
                              value={currentQuestionForm.diffAreaR}
                              onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, diffAreaR: Number(e.target.value) })}
                              className="w-full bg-black border border-purple-900/30 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentQuestionForm.type === 'Slider' && (
                      <div className="border-t border-purple-950/20 pt-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                          Correct Side (Correct asset is:)
                        </label>
                        <select
                          value={currentQuestionForm.correctAnswer}
                          onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="A">Side A (Before Clip)</option>
                          <option value="B">Side B (After Clip)</option>
                        </select>
                      </div>
                    )}

                    {currentQuestionForm.type === 'Sequence' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-purple-950/20 pt-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Sequence Items (One item per line, in arbitrary default order)
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={currentQuestionForm.optionsText}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, optionsText: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                            placeholder="Step C&#10;Step A&#10;Step B"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Correct Sequence Key (One item per line, sorted EXACTLY in correct answer order)
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={currentQuestionForm.correctAnswer}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                            placeholder="Step A&#10;Step B&#10;Step C"
                          />
                        </div>
                      </div>
                    )}

                    {currentQuestionForm.type === 'Match' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-purple-950/20 pt-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Matching Prompt Items (One per line)
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={currentQuestionForm.optionsText}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, optionsText: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                            placeholder="Razor shortcut&#10;Selection shortcut"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                            Correct Matching Answer Keys (One per line, EXACT order matching prompt lines above)
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={currentQuestionForm.correctAnswer}
                            onChange={(e) => setCurrentQuestionForm({ ...currentQuestionForm, correctAnswer: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                            placeholder="C&#10;V"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-purple-950/20 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowQuestionModal(false)}
                        className="px-5 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {editingQuestionIndex !== null ? 'Save Changes' : 'Append Question'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.2: PLANS MANAGER */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Academy Membership Plans</h1>
                <p className="text-gray-400 text-xs mt-1">Configure pricing tiers, manage hide/show visibility, and review incoming subscription orders and receipts</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Restore and seed the 3 official starter membership tiers (Individual, Pro, Team) to Firestore?")) {
                      try {
                        setLoadingPlans(true);
                        for (const plan of DEFAULT_PLANS) {
                          await setDoc(doc(db, 'plans', plan.id), plan);
                        }
                        showToast('success', '3 Starter membership tiers seeded successfully.');
                        fetchPlans();
                      } catch (err: any) {
                        console.error('Seed plans error:', err);
                        showToast('error', 'Failed seeding plans.');
                      } finally {
                        setLoadingPlans(false);
                      }
                    }
                  }}
                  className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-900/30 font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Seed 3 Default Tiers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlanId(null);
                    setPlanForm({
                      name: '',
                      tagline: '',
                      price: '',
                      interval: 'Per year',
                      description: '',
                      badge: '',
                      buttonText: 'Choose Plan',
                      featuresText: '',
                      isPopular: false,
                      active: true,
                      order: String(plans.length + 1)
                    });
                    setShowPlanModal(true);
                  }}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer text-white"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Plan Tier
                </button>
              </div>
            </div>

            {/* Plans Section Visibility & Quick Controls Banner */}
            <div className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              websiteSettings.isPlansComingSoon
                ? 'bg-amber-950/20 border-amber-500/30'
                : 'bg-zinc-950/60 border-purple-900/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  websiteSettings.isPlansComingSoon
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {websiteSettings.isPlansComingSoon ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Global Plans Page Status:</h4>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      websiteSettings.isPlansComingSoon
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {websiteSettings.isPlansComingSoon ? 'Hidden (Coming Soon Mode)' : 'Public & Live'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {websiteSettings.isPlansComingSoon
                      ? 'The /plans route is in Coming Soon mode. Visitors see the launch teaser placeholder.'
                      : 'The /plans page is published and accepting student subscription requests.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] text-gray-400 font-mono">
                    <span className="text-emerald-400 font-bold">{plans.filter(p => p.active !== false && !p.hidden && !p.isHidden).length}</span> Visible / <span className="text-amber-400 font-bold">{plans.filter(p => p.active === false || p.hidden || p.isHidden).length}</span> Hidden
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">Tiers in catalog</div>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePlansSectionVisibility}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    websiteSettings.isPlansComingSoon
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20'
                  }`}
                >
                  {websiteSettings.isPlansComingSoon ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Make Plans Live</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Plans Page</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-3 border-b border-purple-950/20 pb-4">
              <button
                type="button"
                onClick={() => setPlanActiveSubTab('tiers')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  planActiveSubTab === 'tiers'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Subscription Tiers ({plans.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlanActiveSubTab('receipts');
                  fetchPlanPurchases();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  planActiveSubTab === 'receipts'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-zinc-900/80 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Subscription Receipts ({planPurchases.length})</span>
                {planPurchases.filter(p => p.status === 'pending' || (!p.status && !p.paid)).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono text-[10px] font-black">
                    {planPurchases.filter(p => p.status === 'pending' || (!p.status && !p.paid)).length}
                  </span>
                )}
              </button>
            </div>

            {planActiveSubTab === 'tiers' ? (
              loadingPlans ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                  <PlusCircle className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                  <p className="text-gray-400 font-bold">No tiers defined in plans database</p>
                  <p className="text-xs text-gray-650 mt-1">Click "Seed 3 Default Tiers" above to quickly initialize Individual, Pro, and Team packages!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((p) => {
                    const isVisible = p.active !== false && !p.hidden && !p.isHidden;
                    return (
                      <div 
                        key={p.id} 
                        className={`bg-zinc-950/60 p-6 rounded-[2rem] border relative flex flex-col justify-between transition-all ${
                          isVisible 
                            ? 'border-purple-950/20 hover:border-purple-500/30' 
                            : 'border-amber-500/20 bg-amber-950/5 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex items-center gap-2 absolute top-4 right-4">
                          <span className={`font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                            isVisible
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isVisible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                            {isVisible ? 'Visible' : 'Hidden (Draft)'}
                          </span>

                          {p.isPopular && (
                            <span className="bg-purple-600 text-white font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow shadow-purple-500/50">
                              Popular
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-2xl font-black text-white">{p.price}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Order: {p.order || '1'}</span>
                          </div>
                          {p.tagline && (
                            <p className="text-xs text-purple-400 font-medium mb-3">{p.tagline}</p>
                          )}
                          <h4 className="text-lg font-bold text-white mb-1.5">{p.name}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">{p.description}</p>
                          
                          <ul className="space-y-1.5 text-xs text-gray-400 mb-6">
                            {Array.isArray(p.features) && p.features.slice(0, 4).map((f: string, fi: number) => (
                              <li key={fi} className="truncate flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                            {Array.isArray(p.features) && p.features.length > 4 && (
                              <li className="italic text-[10px] mt-1 text-purple-400">+{p.features.length - 4} more perks</li>
                            )}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-purple-950/20 flex items-center justify-between gap-2">
                          {/* Hide / Show Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePlanVisibility(p)}
                            title={isVisible ? 'Hide this plan from visitors' : 'Make this plan public'}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isVisible
                                ? 'bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{isVisible ? 'Hide' : 'Show'}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditPlan(p)}
                              className="px-4 py-2 bg-zinc-900 border border-white/5 hover:border-purple-500/20 rounded-xl text-xs font-bold transition-all text-gray-300 cursor-pointer hover:bg-zinc-800"
                            >
                              Edit Plan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(p.id, p.name)}
                              className="px-3 py-2 bg-red-950/10 hover:bg-red-950/30 text-red-500 hover:text-red-400 rounded-xl text-xs transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* MEMBER SUBSCRIPTION RECEIPTS TAB */
              <div className="space-y-6">
                {loadingPlanPurchases ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : planPurchases.length === 0 ? (
                  <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto p-8">
                    <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold">No subscription purchase receipts yet</p>
                    <p className="text-xs text-gray-500 mt-1">When users choose a plan and upload a payment receipt, the ledger items will appear here for review.</p>
                  </div>
                ) : (
                  <div className="bg-black/60 border border-purple-950/30 rounded-[2.5rem] p-6 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-purple-950/20 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-4 px-6">User / Contact</th>
                            <th className="py-4 px-6">Plan & Price</th>
                            <th className="py-4 px-6">Payment Method</th>
                            <th className="py-4 px-6">Receipt</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950/10 text-xs">
                          {planPurchases.map((pur) => (
                            <tr key={pur.id} className="hover:bg-purple-950/10 transition-colors">
                              <td className="py-4 px-6 font-medium text-white">
                                <div>{pur.fullName || pur.userName || 'Anonymous'}</div>
                                <div className="text-[11px] text-gray-400 font-mono">{pur.email || pur.userEmail}</div>
                                {pur.phoneNumber && (
                                  <div className="text-[10px] text-purple-400 font-mono">{pur.phoneNumber}</div>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-bold text-white block">{pur.planName || 'Membership Plan'}</span>
                                <span className="text-[11px] text-purple-400 font-mono font-semibold">{pur.planPrice || pur.price || 'Free'}</span>
                              </td>
                              <td className="py-4 px-6 text-gray-300 font-mono text-xs">
                                {pur.paymentMethod || 'BaridiMob'}
                              </td>
                              <td className="py-4 px-6">
                                {pur.receiptUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setEnlargedReceiptUrl(pur.receiptUrl)}
                                    className="relative group block w-14 h-14 rounded-xl overflow-hidden border border-purple-900/30 hover:border-purple-500 transition-colors cursor-pointer"
                                  >
                                    <img 
                                      src={pur.receiptUrl} 
                                      alt="Receipt" 
                                      className="w-full h-full object-cover" 
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <ZoomIn className="w-4 h-4" />
                                    </div>
                                  </button>
                                ) : (
                                  <span className="text-gray-500 italic text-[11px]">No image</span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                {pur.status === 'approved' || pur.paid ? (
                                  <span className="px-2.5 py-1 rounded-full bg-green-950/60 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                    Approved
                                  </span>
                                ) : pur.status === 'rejected' ? (
                                  <span className="px-2.5 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                    Rejected
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {pur.status !== 'approved' && !pur.paid && (
                                    <button
                                      type="button"
                                      onClick={() => handleApprovePlanPurchase(pur.id)}
                                      className="px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-400 rounded-lg text-xs font-bold transition-all border border-green-500/30 cursor-pointer"
                                      title="Approve Subscription"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  {pur.status !== 'rejected' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRejectPlanPurchase(pur.id)}
                                      className="px-3 py-1.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-400 rounded-lg text-xs font-bold transition-all border border-amber-500/30 cursor-pointer"
                                      title="Reject Subscription"
                                    >
                                      Reject
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePlanPurchase(pur.id)}
                                    className="p-1.5 bg-red-950/20 text-red-400 hover:text-white rounded-lg border border-red-500/20 transition-all cursor-pointer"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4.5: HOMEPAGE HERO BACKGROUND VIDEOS */}
        {activeTab === 'hero-video' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Homepage Background Videos</h1>
                <p className="text-gray-400 text-xs mt-1">Manage, toggle, and audit the immersive looped videos running on the academy's homepage hero board</p>
              </div>
              <button
                onClick={() => {
                  setEditingHeroVideoId(null);
                  setHeroVideoForm({ title: '', videoUrl: '', isActive: false });
                  setShowHeroVideoModal(true);
                }}
                className="self-start px-5 py-3 bg-brand-radial hover:opacity-90 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Video Path</span>
              </button>
            </div>

            {loadingHeroVideos && heroVideos.length === 0 ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : heroVideos.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/40 rounded-[2rem] border border-dashed border-purple-900/20 max-w-xl mx-auto px-6">
                <Video className="w-12 h-12 text-purple-500/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No background videos listed</h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mb-6">
                  Create an independent Firestore document reference to direct the hero background layout dynamically to your own files or video assets.
                </p>
                <button
                  onClick={async () => {
                    await ensureDefaultHeroVideosSeeded();
                    await fetchHeroVideos();
                  }}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Seed Starter References
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Video Live Preview */}
                <div className="lg:col-span-1 bg-zinc-950/60 border border-purple-950/20 p-6 rounded-[2rem] flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-1">Live Monitor</h3>
                    <h2 className="text-xl font-black text-white">Active Background Video</h2>
                    <p className="text-gray-400 text-[11px] leading-relaxed mt-1">
                      This is the active video stream running live on the main hero background. Direct files loop and iframe streams embed perfectly.
                    </p>
                  </div>

                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-purple-500/10 group shadow-md shadow-black/80">
                    {(() => {
                      const active = heroVideos.find((v: any) => v.isActive) || heroVideos[0];
                      if (!active) return (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No active video</div>
                      );

                      const isDirect = active.videoUrl?.toLowerCase().includes('.mp4') || 
                                       active.videoUrl?.toLowerCase().includes('.webm') || 
                                       active.videoUrl?.toLowerCase().includes('.ogg') || 
                                       active.videoUrl?.toLowerCase().includes('vjs.zencdn.net') || 
                                       active.videoUrl?.toLowerCase().includes('mixkit.co') || 
                                       (!active.videoUrl?.toLowerCase().includes('youtube.com') && 
                                        !active.videoUrl?.toLowerCase().includes('youtu.be') && 
                                        !active.videoUrl?.toLowerCase().includes('drive.google.com') && 
                                        !active.videoUrl?.toLowerCase().includes('vimeo.com'));

                      return (
                        <>
                          {isDirect ? (
                            <video
                              key={active.videoUrl}
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
                            >
                              <source src={active.videoUrl} type="video/mp4" />
                            </video>
                          ) : (
                            <iframe
                              key={active.videoUrl}
                              title="Live Admin Preview"
                              className="w-full h-full pointer-events-none scale-[1.05]"
                              src={`${getEmbedVideoUrl(active.videoUrl)}?autoplay=1&mute=1&controls=0&loop=1`}
                              allow="autoplay; encrypted-media"
                            />
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/75 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5 truncate max-w-[90%]">
                            {active.title}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="bg-purple-950/10 border border-purple-500/10 p-4 rounded-2xl text-[11px] text-purple-300 leading-normal flex gap-2">
                    <Activity className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      Admins can add any number of video references. Simply click the star button to make any video the main live background.
                    </span>
                  </div>
                </div>

                {/* Video References List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-zinc-950/30 rounded-2xl border border-purple-950/15 overflow-hidden">
                    <div className="grid grid-cols-12 px-6 py-4 border-b border-purple-950/15 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      <div className="col-span-6 sm:col-span-5">Video Profile</div>
                      <div className="col-span-3 sm:col-span-3">Direct URL / Source</div>
                      <div className="col-span-3 sm:col-span-2 text-center">Status</div>
                      <div className="col-span-12 sm:col-span-2 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-purple-950/10">
                      {heroVideos.map((video: any) => (
                        <div key={video.id} className="grid grid-cols-12 items-center px-6 py-5 hover:bg-white/[0.01] transition-all gap-y-3 sm:gap-y-0">
                          <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-950/20 border border-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
                              <Video className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate max-w-[220px]">{video.title}</h4>
                              <p className="text-gray-400 text-[10px] mt-0.5">
                                Added: {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-3 text-xs text-gray-300 font-mono truncate max-w-[240px] pr-2">
                            <span className="text-[11px] truncate bg-zinc-900 px-2 py-1 rounded-md border border-white/5 inline-block">
                              {video.videoUrl}
                            </span>
                          </div>

                          <div className="col-span-6 sm:col-span-2 flex justify-center">
                            <button
                              onClick={() => handleToggleHeroVideoActive(video.id, video.isActive)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer border transition-all ${
                                video.isActive
                                  ? 'bg-purple-950/40 text-purple-400 border-purple-500/30'
                                  : 'bg-zinc-900 text-gray-500 border-transparent hover:border-purple-500/20 hover:text-gray-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${video.isActive ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
                              <span>{video.isActive ? 'Active' : 'Deploy'}</span>
                            </button>
                          </div>

                          <div className="col-span-6 sm:col-span-2 flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditHeroVideo(video)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500/20 rounded-xl text-xs font-bold transition-all text-gray-300 cursor-pointer hover:bg-zinc-800"
                              title="Edit reference"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHeroVideo(video.id)}
                              className="p-2 bg-red-950/10 hover:bg-red-950/20 text-red-500 hover:text-red-400 rounded-xl text-xs transition-colors cursor-pointer"
                              title="Delete reference"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WEBSITE CONFIGURATION SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-in max-w-2xl">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Console Configuration</h1>
              <p className="text-gray-400 text-xs mt-1">Synchronize site information, support mail addresses, and social links instantly</p>
            </div>

            {loadingSettings ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-6 bg-black/60 border border-purple-950/30 p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Academy/Website Title</label>
                    <input
                      type="text"
                      required
                      value={websiteSettings.webName || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, webName: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Central Contact Email</label>
                    <input
                      type="email"
                      required
                      value={websiteSettings.contactEmail || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, contactEmail: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Instagram Anchor</label>
                    <input
                      type="url"
                      value={websiteSettings.instagram || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, instagram: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">YouTube Anchor</label>
                    <input
                      type="url"
                      value={websiteSettings.youtube || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, youtube: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Discord Room Anchor</label>
                    <input
                      type="url"
                      value={websiteSettings.discord || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, discord: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* COMING SOON OVERRIDES HUB */}
                  <div className="pt-6 border-t border-purple-950/20 space-y-4">
                    <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      COMING SOON OVERRIDES
                    </h3>
                    <p className="text-[10px] text-gray-500 leading-normal">Configure which sections should act as "Coming Soon" and customize their presentation overlay text:</p>

                    {/* PREMIUM PLANS */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Premium Sub Plans Page</label>
                          <span className="text-[9px] text-gray-500 block">Controls visibility of the Plans/Pricing page.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isPlansComingSoon !== false ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={websiteSettings.isPlansComingSoon !== false}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isPlansComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isPlansComingSoon !== false ? 'The Category page is hidden behind a Coming Soon overlay. Input text is active below:' : 'Live! Content list is visible and accessible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Plans Coming Soon Custom Text..."
                        value={websiteSettings.plansComingSoonText || ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, plansComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* SOFTWARES */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Softwares Assets Section</label>
                          <span className="text-[9px] text-gray-500 block">Controls visibility of software archives under files catalog.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isSoftwaresComingSoon !== false ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={websiteSettings.isSoftwaresComingSoon !== false}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isSoftwaresComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isSoftwaresComingSoon !== false ? 'The Category page is hidden behind a Coming Soon overlay. Input text is active below:' : 'Live! Content list is visible and accessible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Softwares Coming Soon Custom Text..."
                        value={websiteSettings.softwaresComingSoonText || ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, softwaresComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* VIDEOS */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Videos Assets Section</label>
                          <span className="text-[9px] text-gray-500 block">Controls visibility of raw video templates and cinematic packs.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isVideosComingSoon !== false ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={websiteSettings.isVideosComingSoon !== false}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isVideosComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isVideosComingSoon !== false ? 'The Category page is hidden behind a Coming Soon overlay. Input text is active below:' : 'Live! Content list is visible and accessible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Videos Coming Soon Custom Text..."
                        value={websiteSettings.videosComingSoonText || ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, videosComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* IMAGES */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Images Assets Section</label>
                          <span className="text-[9px] text-gray-500 block">Controls visibility of HD overlays, backdrops, and photorealistic elements.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isImagesComingSoon !== false ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={websiteSettings.isImagesComingSoon !== false}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isImagesComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isImagesComingSoon !== false ? 'The Category page is hidden behind a Coming Soon overlay. Input text is active below:' : 'Live! Content list is visible and accessible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Images Coming Soon Custom Text..."
                        value={websiteSettings.imagesComingSoonText || ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, imagesComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* MUSIC */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Music Assets Section</label>
                          <span className="text-[9px] text-gray-500 block">Controls visibility of Lofi loop archives and ambient tracks.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isMusicComingSoon !== false ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={websiteSettings.isMusicComingSoon !== false}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isMusicComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isMusicComingSoon !== false ? 'The Category page is hidden behind a Coming Soon overlay. Input text is active below:' : 'Live! Content list is visible and accessible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Music Coming Soon Custom Text..."
                        value={websiteSettings.musicComingSoonText || ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, musicComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* SOUND EFFECTS */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Sound Effects Assets Section</label>
                          <span className="text-[9px] text-gray-500 block">Controls visibility of auditory swooshes, tech indicators and indicators.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isSoundEffectsComingSoon !== false ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={websiteSettings.isSoundEffectsComingSoon !== false}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isSoundEffectsComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isSoundEffectsComingSoon !== false ? 'The Category page is hidden behind a Coming Soon overlay. Input text is active below:' : 'Live! Content list is visible and accessible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Sound Effects Coming Soon Custom Text..."
                        value={websiteSettings.isSoundEffectsComingSoon !== false ? websiteSettings.soundEffectsComingSoonText || '' : ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, soundEffectsComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* MEMBERSHIP PLANS */}
                    <div className="bg-zinc-950/40 border border-purple-950/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-black text-white uppercase tracking-wider block">Membership Plans (3 Tiers) Section</label>
                          <span className="text-[9px] text-gray-500 block">Controls global visibility of the subscription tiers page at /plans.</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {websiteSettings.isPlansComingSoon ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">🔒 Coming Soon</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-green-950/40 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">✅ Section Active</span>
                          )}
                          <input
                            type="checkbox"
                            checked={!!websiteSettings.isPlansComingSoon}
                            onChange={(e) => setWebsiteSettings({ ...websiteSettings, isPlansComingSoon: e.target.checked })}
                            className="w-4 h-4 text-purple-600 bg-zinc-950 border-purple-950/30 rounded focus:ring-purple-500 cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 italic font-medium leading-relaxed bg-zinc-950/20 px-3 py-1.5 rounded-lg border border-white/5">
                        Status: {websiteSettings.isPlansComingSoon ? 'The Plans page is hidden behind a Coming Soon overlay.' : 'Live! Plans page and tier subscription checkout are fully visible.'}
                      </div>
                      <input
                        type="text"
                        placeholder="Plans Coming Soon Custom Text..."
                        value={websiteSettings.plansComingSoonText || ''}
                        onChange={(e) => setWebsiteSettings({ ...websiteSettings, plansComingSoonText: e.target.value })}
                        className="w-full bg-zinc-950 border border-purple-950/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-950/15">
                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* HOMEPAGE STATISTICS EDITING PANEL */}
        {activeTab === 'statistics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Homepage Statistics</h1>
                <p className="text-gray-400 text-xs mt-1">Configure and live-edit counters, achievements, and statistics on the main landing page.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to seed the 4 standard homepage statistics to Firestore? This will restore Students (590+), Courses (3+), Free Workshops (40+), and Certified (100%).")) {
                      try {
                        setLoadingStats(true);
                        // Force update/insert each default stat using setDoc to be absolutely sure they exist!
                        for (const stat of DEFAULT_STATISTICS) {
                          await setDoc(doc(db, 'statistics', stat.id), stat);
                        }
                        showToast('success', 'Default statistics successfully seeded.');
                        fetchStatistics();
                      } catch (err: any) {
                        console.error('Failed manual seed:', err);
                        showToast('error', 'Failed to seed default statistics.');
                      } finally {
                        setLoadingStats(false);
                      }
                    }
                  }}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-900/30 font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Seed Defaults
                </button>
                <button
                  onClick={() => {
                    setEditingStatId(null);
                    setStatForm({
                      id: '',
                      value: '',
                      labelEn: '',
                      labelFr: '',
                      labelAr: '',
                      iconName: 'Users',
                      order: statisticsList.length + 1
                    });
                    setShowStatModal(true);
                  }}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/10"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add New Stat
                </button>
              </div>
            </div>

            {loadingStats ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <div className="bg-black/60 border border-purple-950/30 rounded-[2.5rem] p-6 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/20 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">ID / Order</th>
                        <th className="py-4 px-6">Icon & Value</th>
                        <th className="py-4 px-6">Labels (EN / FR / AR)</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/10">
                      {statisticsList.map((stat, i) => {
                        const IconComponent = (Icons as any)[stat.iconName || 'Users'] || Icons.Users;
                        return (
                          <tr key={stat.id || i} className="hover:bg-white/5 transition-colors group">
                            <td className="py-4 px-6 text-sm">
                              <span className="font-bold text-white block">#{stat.order || i + 1}</span>
                              <span className="text-xs text-gray-500 font-mono italic">{stat.id}</span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-950/30 border border-purple-500/20 rounded-xl text-purple-400">
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <span className="text-lg font-black text-white">{stat.value}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs text-gray-400 space-y-1">
                              <div><span className="text-gray-600 font-semibold mr-1">EN:</span> {stat.labelEn}</div>
                              {stat.labelFr && <div><span className="text-gray-600 font-semibold mr-1">FR:</span> {stat.labelFr}</div>}
                              {stat.labelAr && <div><span className="text-gray-600 font-semibold mr-1">AR:</span> {stat.labelAr}</div>}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2 product-actions">
                                <button
                                  onClick={() => {
                                    setEditingStatId(stat.id);
                                    setStatForm({
                                      id: stat.id,
                                      value: stat.value || '',
                                      labelEn: stat.labelEn || '',
                                      labelFr: stat.labelFr || '',
                                      labelAr: stat.labelAr || '',
                                      iconName: stat.iconName || 'Users',
                                      order: stat.order || 1
                                    });
                                    setShowStatModal(true);
                                  }}
                                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-zinc-800 transition-all cursor-pointer"
                                  title="Edit Stat"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: 'Delete Statistic?',
                                      message: `Are you absolutely sure you want to delete the "${stat.labelEn}" statistic counter from the homepage? This action is immediate and cannot be undone.`,
                                      confirmText: 'Delete Counter',
                                      isDanger: true,
                                      onConfirm: () => handleDeleteStat(stat.id)
                                    });
                                  }}
                                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                                  title="Delete Stat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {statisticsList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-500 text-xs">
                            No homepage statistics found. Click "Add New Stat" to populate counters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}



        {/* TAB 6: SPECIAL BUNDLES & COMBO OFFERS */}
        {activeTab === 'offers' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Promotional Bundles</h1>
                <p className="text-gray-400 text-xs mt-1">Configure combined academic courses at custom discount prices with dynamic ordering landing pages.</p>
              </div>
              <button
                onClick={() => {
                  setEditingSpecialOfferId(null);
                  setSpecialOfferForm({
                    id: '',
                    titleEn: '',
                    titleFr: '',
                    titleAr: '',
                    descriptionEn: '',
                    descriptionFr: '',
                    descriptionAr: '',
                    courseIds: [],
                    originalPrice: '',
                    price: '',
                    currency: 'DA',
                    imageUrl: '',
                    badgeEn: 'Special Bundle',
                    badgeFr: 'Offre Spéciale',
                    badgeAr: 'عرض خاص',
                    active: true
                  });
                  setShowSpecialOfferModal(true);
                }}
                className="px-6 py-4 bg-brand-radial hover:opacity-95 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white shadow-xl shadow-purple-600/10 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                Add Combo Bundle
              </button>
            </div>

            {loadingSpecialOffers ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : specialOffers.length === 0 ? (
              <div className="text-center py-16 bg-zinc-950 border border-dashed border-purple-900/20 rounded-3xl max-w-4xl mx-auto w-full">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-sm font-bold text-white mb-1">No combo bundles available yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-normal">
                  Create a custom group package by clicking the "Add Combo Bundle" button.
                </p>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/30 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950 text-[10px] font-mono tracking-wider uppercase text-purple-400">
                        <th className="p-4 sm:p-5">Bundle visual</th>
                        <th className="p-4 sm:p-5">Title (EN)</th>
                        <th className="p-4 sm:p-5">Items count</th>
                        <th className="p-4 sm:p-5">Savings Promotion</th>
                        <th className="p-4 sm:p-5">Active Status</th>
                        <th className="p-4 sm:p-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30 text-xs text-gray-300 font-semibold">
                      {specialOffers.map((item) => (
                        <tr key={item.id} className="hover:bg-purple-950/10 transition-colors">
                          <td className="p-4 sm:p-5">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=150'}
                              alt="bundle thumbnail"
                              className="w-16 h-10 object-cover rounded-xl border border-white/5"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="p-4 sm:p-5">
                            <div className="font-bold text-white max-w-[200px] truncate">{item.titleEn}</div>
                            <div className="text-[9px] font-mono text-gray-500 mt-1 uppercase">ID: {item.id}</div>
                          </td>
                          <td className="p-4 sm:p-5 font-mono text-xs text-purple-400">
                            {item.courseIds?.length || 0} courses
                          </td>
                          <td className="p-4 sm:p-5">
                            <span className="line-through text-gray-500 font-normal mr-2">
                              {item.originalPrice?.toLocaleString()} {item.currency}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {item.price?.toLocaleString()} {item.currency}
                            </span>
                          </td>
                          <td className="p-4 sm:p-5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                              item.active 
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                                : 'bg-red-500/10 border border-red-500/30 text-red-400'
                            }`}>
                              {item.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 sm:p-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingSpecialOfferId(item.id);
                                  setSpecialOfferForm({
                                    id: item.id || '',
                                    titleEn: item.titleEn || '',
                                    titleFr: item.titleFr || '',
                                    titleAr: item.titleAr || '',
                                    descriptionEn: item.descriptionEn || '',
                                    descriptionFr: item.descriptionFr || '',
                                    descriptionAr: item.descriptionAr || '',
                                    courseIds: item.courseIds || [],
                                    originalPrice: item.originalPrice !== undefined ? String(item.originalPrice) : '',
                                    price: item.price !== undefined ? String(item.price) : '',
                                    currency: item.currency || 'DA',
                                    imageUrl: item.imageUrl || '',
                                    badgeEn: item.badgeEn || '',
                                    badgeFr: item.badgeFr || '',
                                    badgeAr: item.badgeAr || '',
                                    active: item.active !== false
                                  });
                                  setShowSpecialOfferModal(true);
                                }}
                                className="p-2.5 bg-zinc-900 border border-white/5 hover:border-purple-500/20 rounded-xl text-xs font-bold transition-all text-gray-300 cursor-pointer hover:bg-zinc-800"
                                title="Edit offer metadata"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSpecialOffer(item.id)}
                                className="p-2.5 bg-red-950/15 hover:bg-red-950/30 hover:border-red-500/20 border border-transparent text-red-500 hover:text-red-400 rounded-xl text-xs transition-all cursor-pointer"
                                title="Delete offer permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="space-y-8 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Regions & Currency Management</h1>
                <p className="text-gray-400 text-xs mt-1">Configure global countries/continents pricing multiplier, custom payment gateways, and absolute overrides.</p>
              </div>
              <button
                onClick={handleAddNewRegionInit}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/10"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Region
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Regions list sidebar panel */}
              <div className="lg:col-span-4 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono mb-2">Available Regions</h3>
                {regions.map(reg => {
                  const isActiveAdmin = selectedAdminRegionId === reg.id;
                  return (
                    <div
                      key={reg.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 relative ${
                        isActiveAdmin 
                          ? 'bg-purple-950/30 border-purple-500/40 text-white shadow-lg' 
                          : 'bg-zinc-900/40 border-white/5 text-gray-400 hover:border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAdminRegionId(reg.id)}
                        className="absolute inset-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold flex items-center gap-2">
                            <span>{reg.name}</span>
                            {reg.isDefault && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wide">Default</span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 mt-0.5 uppercase">ID: {reg.id} &bull; {reg.currency} ({reg.symbol})</div>
                        </div>
                        {regions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAdminRegion(reg.id);
                            }}
                            className="bg-red-950/40 text-red-400 p-2 rounded-xl border border-red-500/20 hover:bg-red-900 hover:text-white transition-colors cursor-pointer relative z-20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                        <span>Multiplier: <b>{reg.multiplier}</b></span>
                        <span className="text-[10px] font-mono bg-zinc-950 px-2 py-0.5 rounded text-purple-400 border border-white/5">
                          {reg.paymentMethods?.filter((p: any) => p.active).length || 0} active methods
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Edit / Configuration detail workspace */}
              <div className="lg:col-span-8">
                <form onSubmit={handleSaveRegionSettings} className="bg-black/60 border border-purple-950/30 rounded-[2.5rem] p-8 space-y-8 text-left">
                  <div className="border-b border-purple-950/20 pb-5">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedAdminRegionId ? `Region: ${regionForm.name || selectedAdminRegionId}` : 'Create Brand New Region Workspace'}
                    </h2>
                    <p className="text-gray-400 text-xs mt-1">Specify regional currency factors, configure active client payment options, and input absolute overrides.</p>
                  </div>

                  {/* Core Properties Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2">Region ID Code (e.g. CA, DZ, GB)</label>
                      <input
                        type="text"
                        disabled={selectedAdminRegionId !== ''}
                        value={regionForm.id}
                        onChange={(e) => setRegionForm(prev => ({ ...prev, id: e.target.value }))}
                        className="w-full bg-zinc-950 border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-40 font-mono uppercase"
                        placeholder="e.g. CA"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2">Region Common Name</label>
                      <input
                        type="text"
                        value={regionForm.name}
                        onChange={(e) => setRegionForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-zinc-950 border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g. Canada (CAD)"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2">Currency ISO Code (e.g. CAD, EUR)</label>
                      <input
                        type="text"
                        value={regionForm.currency}
                        onChange={(e) => setRegionForm(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-zinc-950 border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono uppercase"
                        placeholder="e.g. CAD"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2">Currency Symbol (e.g. $, €, £)</label>
                      <input
                        type="text"
                        value={regionForm.symbol}
                        onChange={(e) => setRegionForm(prev => ({ ...prev, symbol: e.target.value }))}
                        className="w-full bg-zinc-950 border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g. $"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-2">DZ/DA Multiplier factor (e.g. 0.007)</label>
                      <input
                        type="number"
                        step="any"
                        value={regionForm.multiplier}
                        onChange={(e) => setRegionForm(prev => ({ ...prev, multiplier: Number(e.target.value) }))}
                        className="w-full bg-zinc-950 border border-purple-900/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                        placeholder="e.g. 0.007"
                      />
                      <p className="text-[10px] text-gray-500 italic mt-1.5">*Conversion factor used: Base DA price &times; factor. Example: 15,000 DA &times; 0.007 = 105 EUR</p>
                    </div>

                    <div className="flex items-center pt-8">
                      <label className="relative flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={regionForm.isDefault}
                          onChange={(e) => setRegionForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-zinc-800 rounded-full peer-checked:bg-purple-600 transition-colors after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full relative" />
                        <span className="text-xs text-white font-semibold uppercase tracking-wider">Set as Fallback Default Region</span>
                      </label>
                    </div>
                  </div>

                  {/* Payment Methods Sub-Section */}
                  <div className="border-t border-purple-950/20 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span>Configure Region Payment Gateways</span>
                    </h3>
                    <p className="text-gray-400 text-xs">Decide what payment gateways are displayed on checkout. Fill instructions with transfer steps, IBAN, account names, etc.</p>

                    <div className="space-y-4">
                      {editingPaymentMethods.map((method, idx) => (
                        <div key={method.id} className="bg-zinc-950/60 border border-purple-900/10 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-purple-300">{method.name} ({method.id})</span>
                            <label className="relative flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={method.active}
                                onChange={(e) => {
                                  const updated = [...editingPaymentMethods];
                                  updated[idx].active = e.target.checked;
                                  setEditingPaymentMethods(updated);
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-zinc-800 rounded-full peer-checked:bg-purple-600 transition-colors after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full relative" />
                              <span className="text-[10px] uppercase font-bold text-gray-400">{method.active ? 'Active' : 'Inactive'}</span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-gray-500 mb-1">Payment Instructions shown to students</label>
                            <textarea
                              rows={3}
                              value={method.instructions}
                              onChange={(e) => {
                                const updated = [...editingPaymentMethods];
                                updated[idx].instructions = e.target.value;
                                setEditingPaymentMethods(updated);
                              }}
                              className="w-full bg-zinc-950 border border-purple-900/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                              placeholder="Describe bank transfer IBAN, account names, post slip wire steps..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Absolute Overrides Sub-Section */}
                  <div className="border-t border-purple-950/20 pt-6 space-y-4">
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Absolute Pricing Overrides</span>
                    </h3>
                    <p className="text-gray-400 text-xs">Optionally specify exact/static prices in native currency format instead of multiplier conversions. Leave empty to fallback to converted DA prices.</p>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                      {/* Courses Overrides */}
                      {courses.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-black">Course Packages</h4>
                          {courses.map(c => (
                            <div key={c.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/30 p-3 rounded-xl border border-white/5">
                              <div>
                                <span className="text-xs font-semibold text-white block">{c.title}</span>
                                <span className="text-[10px] font-mono text-gray-500">Base Price: {Number(c.price).toLocaleString()} DA &bull; Converted: {(Number(c.price) * (regionForm.multiplier || 1.0)).toLocaleString()} {regionForm.currency || 'USD'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={priceOverrides[c.id] || ''}
                                  onChange={(e) => setPriceOverrides(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="w-28 bg-zinc-950 border border-purple-900/20 rounded-xl px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-purple-500 font-mono"
                                  placeholder="converted"
                                />
                                <span className="text-xs font-mono text-gray-400">{regionForm.symbol || '$'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Special Combo Bundles Overrides */}
                      {specialOffers.length > 0 && (
                        <div className="space-y-3 pt-4">
                          <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-black">Special Promo Combos</h4>
                          {specialOffers.map(o => (
                            <div key={o.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/30 p-3 rounded-xl border border-white/5">
                              <div>
                                <span className="text-xs font-semibold text-white block">{o.titleEn}</span>
                                <span className="text-[10px] font-mono text-gray-500">Base Price: {Number(o.price).toLocaleString()} DA &bull; Converted: {(Number(o.price) * (regionForm.multiplier || 1.0)).toLocaleString()} {regionForm.currency || 'USD'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={priceOverrides[o.id] || ''}
                                  onChange={(e) => setPriceOverrides(prev => ({ ...prev, [o.id]: e.target.value }))}
                                  className="w-28 bg-zinc-950 border border-purple-900/20 rounded-xl px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-purple-500 font-mono"
                                  placeholder="converted"
                                />
                                <span className="text-xs font-mono text-gray-400">{regionForm.symbol || '$'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Membership / Plans Overrides */}
                      {plans.length > 0 && (
                        <div className="space-y-3 pt-4">
                          <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-black">Academic Membership Plans</h4>
                          {plans.map(p => {
                            const isFree = (p.name || '').toLowerCase().includes('free') || String(p.price).startsWith('0');
                            if (isFree) return null;
                            const numericPart = String(p.price).replace(/[^\d]/g, '');
                            const numericPrice = Number(numericPart) || 0;
                            return (
                              <div key={p.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/30 p-3 rounded-xl border border-white/5">
                                <div>
                                  <span className="text-xs font-semibold text-white block">{p.name}</span>
                                  <span className="text-[10px] font-mono text-gray-500">Base Price: {p.price} &bull; Converted: {(numericPrice * (regionForm.multiplier || 1.0)).toLocaleString()} {regionForm.currency || 'USD'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={priceOverrides[p.id] || ''}
                                    onChange={(e) => setPriceOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className="w-28 bg-zinc-950 border border-purple-900/20 rounded-xl px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-purple-500 font-mono"
                                    placeholder="converted"
                                  />
                                  <span className="text-xs font-mono text-gray-400">{regionForm.symbol || '$'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="border-t border-purple-950/20 pt-6 flex items-center justify-end gap-4">
                    {regions.length > 0 && selectedAdminRegionId && (
                      <button
                        type="button"
                        onClick={handleAddNewRegionInit}
                        className="px-5 py-3 bg-zinc-900 border border-white/5 text-gray-400 hover:text-white rounded-2xl text-xs uppercase font-extrabold tracking-wider transition-colors cursor-pointer"
                      >
                        Add Another Region
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingRegionSettings}
                      className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/10"
                    >
                      {isSavingRegionSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Settings & Overrides</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL MEDIA CARDS & OPEN GRAPH SEO MANAGEMENT CONSOLE */}
        {activeTab === 'seo' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-purple-900/30 p-6 rounded-2xl shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest">
                    Open Graph & Social Sharing
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Check className="w-3 h-3" /> Live Sync Active
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 flex items-center gap-3">
                  <Globe className="w-7 h-7 text-purple-400" />
                  Social Media Cards & Link Previews
                </h1>
                <p className="text-gray-400 text-xs mt-1 max-w-3xl leading-relaxed">
                  Control the visual preview card (Title, Description, and Thumbnail Image) displayed when sharing links or sub-links from your website on WhatsApp, Facebook, Twitter, iMessage, and LinkedIn.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowAddRouteModal(true)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-zinc-700 cursor-pointer shadow-md"
                >
                  <PlusCircle className="w-4 h-4 text-purple-400" />
                  Add Custom Link Rule
                </button>
                <button
                  onClick={handleSaveSeoConfig}
                  disabled={savingSeo}
                  className="px-6 py-2.5 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {savingSeo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Social Cards
                </button>
              </div>
            </div>

            {loadingSeo ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <span className="text-xs">Loading Open Graph Social Card Rules...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: LINKS & CARD EDITING FORM (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* SEARCH & ROUTE TABS */}
                  <div className="bg-zinc-900/60 border border-purple-950/30 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Icons.Link2 className="w-4 h-4 text-purple-400" />
                        Select Website Link or Sub-link
                      </h2>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {seoConfig.routes.length + 1} Total Rules
                      </span>
                    </div>

                    {/* Search bar for routes */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={seoSearchQuery}
                        onChange={(e) => setSeoSearchQuery(e.target.value)}
                        placeholder="Filter links (e.g. /courses, /store, /support)..."
                        className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-purple-950/40 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500/50"
                      />
                      {seoSearchQuery && (
                        <button
                          onClick={() => setSeoSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Link Tabs Horizontal Scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {/* Global Fallback tab */}
                      <button
                        onClick={() => setSelectedSeoRouteIndex(-1)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                          selectedSeoRouteIndex === -1
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                            : 'bg-zinc-950/80 text-gray-400 hover:text-white border-purple-950/30 hover:border-purple-800'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Global Default Fallback
                      </button>

                      {/* Routes tabs */}
                      {seoConfig.routes
                        .map((route, idx) => ({ route, idx }))
                        .filter(({ route }) => !seoSearchQuery || route.path.toLowerCase().includes(seoSearchQuery.toLowerCase()) || route.title.toLowerCase().includes(seoSearchQuery.toLowerCase()))
                        .map(({ route, idx }) => (
                          <button
                            key={route.id || idx}
                            onClick={() => setSelectedSeoRouteIndex(idx)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                              selectedSeoRouteIndex === idx
                                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                                : 'bg-zinc-950/80 text-gray-400 hover:text-white border-purple-950/30 hover:border-purple-800'
                            }`}
                          >
                            <span className="font-mono text-[11px] opacity-80">{route.path}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* EDIT FORM FOR CURRENTLY SELECTED ROUTE OR GLOBAL */}
                  {(() => {
                    const isGlobal = selectedSeoRouteIndex === -1;
                    const currentRoute = isGlobal ? null : seoConfig.routes[selectedSeoRouteIndex];
                    if (!isGlobal && !currentRoute) return null;

                    const title = isGlobal ? seoConfig.globalTitle : currentRoute!.title;
                    const description = isGlobal ? seoConfig.globalDescription : currentRoute!.description;
                    const image = isGlobal ? seoConfig.globalImage : currentRoute!.image;
                    const pathName = isGlobal ? 'All Unmatched Links (Global Default)' : currentRoute!.path;

                    const handleTitleChange = (val: string) => {
                      if (isGlobal) {
                        setSeoConfig(prev => ({ ...prev, globalTitle: val }));
                      } else {
                        setSeoConfig(prev => {
                          const updated = [...prev.routes];
                          updated[selectedSeoRouteIndex] = { ...updated[selectedSeoRouteIndex], title: val };
                          return { ...prev, routes: updated };
                        });
                      }
                    };

                    const handleDescriptionChange = (val: string) => {
                      if (isGlobal) {
                        setSeoConfig(prev => ({ ...prev, globalDescription: val }));
                      } else {
                        setSeoConfig(prev => {
                          const updated = [...prev.routes];
                          updated[selectedSeoRouteIndex] = { ...updated[selectedSeoRouteIndex], description: val };
                          return { ...prev, routes: updated };
                        });
                      }
                    };

                    const handleImageChange = (val: string) => {
                      if (isGlobal) {
                        setSeoConfig(prev => ({ ...prev, globalImage: val }));
                      } else {
                        setSeoConfig(prev => {
                          const updated = [...prev.routes];
                          updated[selectedSeoRouteIndex] = { ...updated[selectedSeoRouteIndex], image: val };
                          return { ...prev, routes: updated };
                        });
                      }
                    };

                    return (
                      <div className="bg-zinc-900/60 border border-purple-950/30 p-6 rounded-2xl space-y-5 shadow-lg">
                        <div className="flex items-center justify-between pb-4 border-b border-purple-950/20">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Editing Social Card Rule For</span>
                            <h3 className="text-base font-bold text-white font-mono mt-0.5 flex items-center gap-2">
                              {pathName}
                              {isGlobal && (
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[9px] font-sans font-bold uppercase">
                                  Default
                                </span>
                              )}
                            </h3>
                          </div>

                          {!isGlobal && (
                            <button
                              onClick={() => handleDeleteRouteSeo(selectedSeoRouteIndex, currentRoute!.path)}
                              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-all border border-rose-900/30 cursor-pointer"
                              title="Delete this custom route rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Title field */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-wider">
                              Social Card Title
                            </label>
                            <span className={`text-[10px] font-mono ${title.length > 60 ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>
                              {title.length}/60 Chars (Ideal: 40-60)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="e.g. Cutscene - Video Editing Course"
                            className="w-full bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                          />
                        </div>

                        {/* Description field */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-black text-gray-300 uppercase tracking-wider">
                              Social Card Description
                            </label>
                            <span className={`text-[10px] font-mono ${description.length > 160 ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>
                              {description.length}/160 Chars (Ideal: 110-155)
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="Summarize the page content for social media feeds..."
                            className="w-full bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium resize-none leading-relaxed"
                          />
                        </div>

                        {/* Thumbnail Image section */}
                        <div>
                          <label className="text-[10px] font-black text-gray-300 uppercase tracking-wider block mb-1.5">
                            Social Card Thumbnail Image
                          </label>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="url"
                                value={image}
                                onChange={(e) => handleImageChange(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                              />

                              {/* BunnyCDN image upload button */}
                              <label className={`px-4 py-2.5 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shrink-0 ${seoImageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {seoImageUploading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                ) : (
                                  <Upload className="w-4 h-4 text-purple-400" />
                                )}
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => uploadSeoImageForRoute(e, selectedSeoRouteIndex)}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {/* Unsplash Preset suggestions */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block">
                                Quick Preset HD Cover Images:
                              </span>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {[
                                  { label: 'Video Studio', url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop' },
                                  { label: 'Web Coding', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop' },
                                  { label: 'Store Assets', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop' },
                                  { label: 'VFX Motion', url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop' },
                                  { label: 'Resources', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' },
                                  { label: 'Support Desk', url: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1200&auto=format&fit=crop' }
                                ].map((preset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleImageChange(preset.url)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all border cursor-pointer ${
                                      image === preset.url
                                        ? 'bg-purple-950 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30'
                                        : 'bg-zinc-950 text-gray-400 hover:text-white border-zinc-800'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT COLUMN: LIVE INTERACTIVE SOCIAL MEDIA MOCKUP PREVIEW (5 Cols) */}
                <div className="lg:col-span-5 space-y-4 sticky top-6">
                  <div className="bg-zinc-900/60 border border-purple-950/30 p-6 rounded-2xl space-y-5 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-purple-950/20">
                      <div>
                        <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Icons.Eye className="w-4 h-4 text-purple-400" />
                          Live Card Preview
                        </h2>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          How this link card appears when sent on messaging apps & feeds
                        </p>
                      </div>

                      {/* Platform selector */}
                      <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-purple-950/30">
                        <button
                          onClick={() => setSeoPreviewPlatform('whatsapp')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            seoPreviewPlatform === 'whatsapp' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                          }`}
                          title="WhatsApp Preview"
                        >
                          WhatsApp
                        </button>
                        <button
                          onClick={() => setSeoPreviewPlatform('facebook')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            seoPreviewPlatform === 'facebook' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                          }`}
                          title="Facebook Meta Preview"
                        >
                          Facebook
                        </button>
                        <button
                          onClick={() => setSeoPreviewPlatform('twitter')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            seoPreviewPlatform === 'twitter' ? 'bg-zinc-800 text-white shadow border border-zinc-700' : 'text-gray-400 hover:text-white'
                          }`}
                          title="Twitter X Preview"
                        >
                          Twitter
                        </button>
                      </div>
                    </div>

                    {/* MOCKUP CONTAINER BASED ON CURRENT SELECTION */}
                    {(() => {
                      const isGlobal = selectedSeoRouteIndex === -1;
                      const currentRoute = isGlobal ? null : seoConfig.routes[selectedSeoRouteIndex];
                      const title = isGlobal ? seoConfig.globalTitle : (currentRoute?.title || seoConfig.globalTitle);
                      const description = isGlobal ? seoConfig.globalDescription : (currentRoute?.description || seoConfig.globalDescription);
                      const image = isGlobal ? seoConfig.globalImage : (currentRoute?.image || seoConfig.globalImage);
                      const displayPath = isGlobal ? '/' : (currentRoute?.path || '/');

                      if (seoPreviewPlatform === 'whatsapp') {
                        return (
                          <div className="bg-[#0b141a] p-4 rounded-2xl border border-emerald-950/30 font-sans">
                            <div className="bg-[#1f2c34] text-[#e9edef] p-2.5 rounded-2xl rounded-tr-none max-w-sm ml-auto space-y-2 shadow-lg border border-[#222d34]">
                              <div className="bg-[#111b21] rounded-xl overflow-hidden border border-[#202c33]">
                                <div className="aspect-[16/9] w-full bg-zinc-900 overflow-hidden relative">
                                  <img
                                    src={image}
                                    alt="Card Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop';
                                    }}
                                  />
                                </div>
                                <div className="p-3 space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-[#8696a0] tracking-wider font-mono">
                                    CUTSCENE-ACADEMY.COM
                                  </div>
                                  <div className="text-xs font-bold text-[#e9edef] line-clamp-2 leading-snug">
                                    {title}
                                  </div>
                                  <div className="text-[11px] text-[#8696a0] line-clamp-2 leading-relaxed">
                                    {description}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-[#8696a0] px-1 font-mono break-all text-emerald-400/90 underline">
                                https://cutscene-academy.com{displayPath}
                              </div>
                              <div className="text-[9px] text-[#8696a0] text-right pr-1 font-mono">
                                12:45 PM ✓✓
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (seoPreviewPlatform === 'facebook') {
                        return (
                          <div className="bg-[#242526] p-4 rounded-2xl border border-blue-950/30 text-[#e4e6eb] font-sans space-y-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-black text-white text-xs">
                                CA
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">Cutscene Academy</div>
                                <div className="text-[10px] text-gray-400 font-mono">Just now · 🌎</div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-200">
                              Check out this course session and resources on Cutscene Academy! 🚀
                            </div>

                            <div className="bg-[#18191a] rounded-xl overflow-hidden border border-[#3a3b3c]">
                              <div className="aspect-[1.91/1] w-full bg-zinc-900 overflow-hidden">
                                <img
                                  src={image}
                                  alt="Facebook Card Preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop';
                                  }}
                                />
                              </div>
                              <div className="p-3 bg-[#242526] space-y-1">
                                <div className="text-[10px] uppercase font-semibold text-gray-400 font-mono">
                                  CUTSCENE-ACADEMY.COM
                                </div>
                                <div className="text-sm font-bold text-white line-clamp-1">
                                  {title}
                                </div>
                                <div className="text-xs text-gray-400 line-clamp-2">
                                  {description}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-black p-4 rounded-2xl border border-zinc-800 text-white font-sans space-y-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-black text-white text-xs">
                              CA
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                Cutscene Academy <span className="text-blue-400">✓</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">@cutscene_academy</div>
                            </div>
                          </div>

                          <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800">
                            <div className="aspect-[1.91/1] w-full bg-zinc-900 overflow-hidden relative">
                              <img
                                src={image}
                                alt="Twitter Card Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop';
                                }}
                              />
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] text-white font-mono">
                                cutscene-academy.com
                              </div>
                            </div>
                            <div className="p-3 space-y-1 bg-zinc-950">
                              <div className="text-xs font-bold text-white line-clamp-1">
                                {title}
                              </div>
                              <div className="text-[11px] text-gray-400 line-clamp-2">
                                {description}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl text-[10px] text-purple-300 leading-relaxed">
                      💡 <strong>Tip for Social Media Crawlers:</strong> Facebook, WhatsApp, and Twitter fetch social card images directly from the page HTML meta tags. Saving your changes instantly updates both client visits and server crawler responses!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 18: COMMUNITY CONTROL COMMAND CENTER */}
        {activeTab === 'community-control' && (
          <AdminCommunityManager
            showToast={showToast}
            askConfirmation={askConfirmation}
          />
        )}

      </main>

      {/* ADD CUSTOM ROUTE SEO CARD RULE MODAL */}
      <AnimatePresence>
        {showAddRouteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-purple-900/40 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-purple-950/30">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Add Custom Link Rule</h3>
                </div>
                <button
                  onClick={() => setShowAddRouteModal(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomRouteSeo} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Route Path / URL (e.g. /courses/special-offer)
                  </label>
                  <input
                    type="text"
                    required
                    value={newRouteForm.path}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, path: e.target.value })}
                    placeholder="/courses/2 or /store/my-pack"
                    className="w-full bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Custom Card Title
                  </label>
                  <input
                    type="text"
                    value={newRouteForm.title}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, title: e.target.value })}
                    placeholder="e.g. Cutscene - Master Web Development"
                    className="w-full bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Custom Card Description
                  </label>
                  <textarea
                    rows={2}
                    value={newRouteForm.description}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, description: e.target.value })}
                    placeholder="e.g. Learn React, TypeScript, and full-stack development..."
                    className="w-full bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Custom Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={newRouteForm.image}
                    onChange={(e) => setNewRouteForm({ ...newRouteForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-zinc-950 border border-purple-950/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-purple-950/30 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddRouteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Card Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT SPECIAL OFFER */}
      <AnimatePresence>
        {showSpecialOfferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowSpecialOfferModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto font-sans text-white"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{editingSpecialOfferId ? 'Edit Combo Pack Details' : 'Design Combo Bundle'}</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Formulate Course Combinations, set price points & localized descriptions</p>
                </div>
                <button onClick={() => setShowSpecialOfferModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSpecialOffer} className="space-y-6">
                {/* ID segment */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5">Bundle ID Code (Slug key for ordering, e.g. bundle-creative)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingSpecialOfferId}
                    placeholder="e.g. combo-video-motion"
                    value={specialOfferForm.id}
                    onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                  {!editingSpecialOfferId && (
                    <p className="text-[10px] text-gray-500 mt-1">This forms the ordering landing page: /complete-order?offer={specialOfferForm.id || 'slug'}</p>
                  )}
                </div>

                {/* Localized titles section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 border-b border-purple-950/40 pb-1">Bundle Titles (Multi-language)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">English Title *</label>
                      <input
                        type="text"
                        required
                        value={specialOfferForm.titleEn}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, titleEn: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">French Title</label>
                      <input
                        type="text"
                        value={specialOfferForm.titleFr}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, titleFr: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Arabic Title</label>
                      <input
                        type="text"
                        value={specialOfferForm.titleAr}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, titleAr: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2.5 text-xs text-white text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Localized descriptions section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 border-b border-purple-950/40 pb-1">Bundle Descriptions (Multi-language)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">English Description</label>
                      <textarea
                        rows={2}
                        value={specialOfferForm.descriptionEn}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, descriptionEn: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">French Description</label>
                      <textarea
                        rows={2}
                        value={specialOfferForm.descriptionFr}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, descriptionFr: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Arabic Description</label>
                      <textarea
                        rows={2}
                        value={specialOfferForm.descriptionAr}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, descriptionAr: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2.5 text-xs text-white text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Localized badges section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 border-b border-purple-950/40 pb-1">Promotional Display Badges (optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">English Badge</label>
                      <input
                        type="text"
                        value={specialOfferForm.badgeEn}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, badgeEn: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 text-xs py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">French Badge</label>
                      <input
                        type="text"
                        value={specialOfferForm.badgeFr}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, badgeFr: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 text-xs py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Arabic Badge</label>
                      <input
                        type="text"
                        value={specialOfferForm.badgeAr}
                        onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, badgeAr: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-3 text-xs py-2 text-white text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Checklist selections */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 border-b border-purple-950/40 pb-1">
                    Bundled Courses Selection *
                  </h3>
                  <div className="bg-black/50 border border-purple-950 rounded-2xl p-4 space-y-2 max-h-44 overflow-y-auto">
                    {courses.length === 0 ? (
                      <p className="text-gray-500 text-xs text-center py-2">No courses registered in catalog yet.</p>
                    ) : (
                      courses.map((course) => {
                        const isChecked = specialOfferForm.courseIds.includes(course.id);
                        return (
                          <label key={course.id} className="flex items-center gap-3 py-1.5 hover:bg-white/5 px-2 rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const newIds = isChecked
                                  ? specialOfferForm.courseIds.filter(id => id !== course.id)
                                  : [...specialOfferForm.courseIds, course.id];
                                setSpecialOfferForm({ ...specialOfferForm, courseIds: newIds });
                              }}
                              className="accent-purple-500"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-white">{course.title}</span>
                              <span className="text-[10px] font-mono text-gray-500 ml-2 uppercase">({course.id})</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Image and Price metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Bundle Cover Image</label>
                    <div className="flex items-center gap-3">
                      {specialOfferForm.imageUrl ? (
                        <img 
                          src={specialOfferForm.imageUrl} 
                          alt="Bundle Cover Preview" 
                          className="w-10 h-10 object-cover rounded-lg border border-purple-900/40 bg-black shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-dashed border-purple-900/30 flex items-center justify-center text-gray-600 bg-black/50 text-[9px] uppercase font-mono shrink-0">
                          None
                        </div>
                      )}
                      <input 
                        type="file"
                        accept="image/*"
                        ref={promoFileRef}
                        className="hidden"
                        onChange={uploadPromoImage}
                      />
                      <button
                        type="button"
                        onClick={() => promoFileRef.current?.click()}
                        disabled={promoUploading}
                        className="flex-1 px-3 py-2.5 bg-purple-650 hover:bg-purple-600 border border-purple-500/20 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {promoUploading ? (
                          <Icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Icons.Upload className="w-3.5 h-3.5" />
                        )}
                        {specialOfferForm.imageUrl ? 'Replace Image' : 'Import File'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Target Currency</label>
                    <input
                      type="text"
                      required
                      value={specialOfferForm.currency}
                      onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, currency: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Standard Original Price ({specialOfferForm.currency})</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 30000"
                      value={specialOfferForm.originalPrice}
                      onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, originalPrice: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Special Combo Price ({specialOfferForm.currency})</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 19000"
                      value={specialOfferForm.price}
                      onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, price: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Active Switch status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active-offer-flag"
                    checked={specialOfferForm.active}
                    onChange={(e) => setSpecialOfferForm({ ...specialOfferForm, active: e.target.checked })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <label htmlFor="active-offer-flag" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                    Show this promotional bundle on the Homepage special category list
                  </label>
                </div>

                {/* Form Controls */}
                <div className="pt-4 border-t border-purple-950/25 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSpecialOfferModal(false)}
                    className="px-5 py-3 border border-purple-900/20 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10"
                  >
                    <Save className="w-4 h-4" />
                    Save Bundle Configuration
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 0: ADD / EDIT SHOWCASE WORK */}
      <AnimatePresence>
        {showWorkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowWorkModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Edit Showcase Work</h2>
                  <p className="text-gray-400 text-xs">Modify the student submission metadata</p>
                </div>
                <button onClick={() => setShowWorkModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleWorkSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Student Name</label>
                  <input
                    type="text"
                    required
                    value={workForm.student_name}
                    onChange={(e) => setWorkForm({ ...workForm, student_name: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Task / Artwork Title</label>
                  <input
                    type="text"
                    required
                    value={workForm.title}
                    onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Course ID</label>
                    <input
                      type="text"
                      value={workForm.course_id}
                      onChange={(e) => setWorkForm({ ...workForm, course_id: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Course Name</label>
                    <input
                      type="text"
                      value={workForm.course_name}
                      onChange={(e) => setWorkForm({ ...workForm, course_name: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <ImageUploader
                  label="Illustration / Showcase Cover Image"
                  value={workForm.image_url}
                  onChange={(url) => setWorkForm({ ...workForm, image_url: url })}
                />

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Video Player URL (Optional)</label>
                  <input
                    type="text"
                    value={workForm.video_url}
                    onChange={(e) => setWorkForm({ ...workForm, video_url: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-300">
                    <input
                      type="checkbox"
                      checked={workForm.approved}
                      onChange={(e) => setWorkForm({ ...workForm, approved: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 border-purple-900 bg-zinc-900 cursor-pointer accent-purple-600"
                    />
                    Is Approved / Published
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-300">
                    <input
                      type="checkbox"
                      checked={workForm.is_featured}
                      onChange={(e) => setWorkForm({ ...workForm, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 border-purple-900 bg-zinc-900 cursor-pointer accent-purple-600"
                    />
                    Is Featured on Homepage
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-900/10">
                  <button
                    type="button"
                    onClick={() => setShowWorkModal(false)}
                    className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10"
                  >
                    <Save className="w-4 h-4" />
                    Save Showcase Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: ADD / EDIT COURSE */}
      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowCourseModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingCourseId ? 'Edit Course' : 'Create Course'}</h2>
                  <p className="text-gray-400 text-xs">Configure course details, pricing, media & curriculum outcomes</p>
                </div>
                <button onClick={() => setShowCourseModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Course Modal Navigation Tabs */}
              <div className="flex items-center gap-2 mb-6 bg-black border border-purple-950/40 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCourseModalTab('general')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    courseModalTab === 'general'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📌 General Info
                </button>
                <button
                  type="button"
                  onClick={() => setCourseModalTab('media')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    courseModalTab === 'media'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🖼️ Media & Covers
                </button>
                <button
                  type="button"
                  onClick={() => setCourseModalTab('curriculum')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    courseModalTab === 'curriculum'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎯 Pricing & Details
                </button>
              </div>

              <form onSubmit={handleCourseSubmit} className="space-y-4">
                {courseModalTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Program Title</label>
                      <input
                        type="text"
                        required
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="e.g. Master Video Editing in Premiere Pro"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Description Summary</label>
                      <textarea
                        required
                        rows={3}
                        value={courseForm.description}
                        onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="Describe the course content and learning goals..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Instructor Name</label>
                        <input
                          type="text"
                          required
                          value={courseForm.instructor}
                          onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="e.g. Academy Staff"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Category</label>
                        <input
                          type="text"
                          required
                          value={courseForm.category}
                          onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="e.g. Editing, Sound Design"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/80 rounded-2xl border border-purple-900/30 space-y-3">
                      <ImageUploader
                        label="Instructor Headshot / Photo"
                        value={courseForm.instructor_avatar}
                        onChange={(url) => setCourseForm({ ...courseForm, instructor_avatar: url })}
                        helperText="Upload or provide an avatar headshot for the course instructor."
                      />
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">Instructor Bio / Subtitle</label>
                        <input
                          type="text"
                          value={courseForm.instructor_bio}
                          onChange={(e) => setCourseForm({ ...courseForm, instructor_bio: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="e.g. Professional Senior Video Editor & Colorist"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Level</label>
                        <select
                          value={courseForm.level}
                          onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none cursor-pointer"
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Course Duration</label>
                        <input
                          type="text"
                          required
                          value={courseForm.duration}
                          onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                          placeholder="e.g. 8 weeks"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {courseModalTab === 'media' && (
                  <div className="space-y-4">
                    <ImageUploader
                      label="Course Thumbnail Cover Image"
                      value={courseForm.thumbnail_url}
                      onChange={(url) => setCourseForm({ ...courseForm, thumbnail_url: url })}
                      helperText="Displayed on course catalog cards and header banner."
                    />

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Course Trailer Video Link (YouTube / Vimeo / Direct)</label>
                      <input
                        type="url"
                        value={courseForm.trailerUrl || ''}
                        onChange={(e) => setCourseForm({ ...courseForm, trailerUrl: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="e.g. https://www.youtube.com/watch?v=..."
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Adds a video trailer player button on the course details hero banner.
                      </p>
                    </div>

                    <ImageUploader
                      label="Custom Graduation Certificate Template"
                      value={courseForm.certificateUrl || ''}
                      onChange={(url) => setCourseForm({ ...courseForm, certificateUrl: url })}
                      helperText="Optional certificate image frame for graduates."
                    />
                  </div>
                )}

                {courseModalTab === 'curriculum' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-900 rounded-2xl border border-purple-900/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300">Free Sandbox Course?</span>
                        <input
                          type="checkbox"
                          checked={courseForm.is_free}
                          onChange={(e) => setCourseForm({ ...courseForm, is_free: e.target.checked })}
                          className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-purple-950/25">
                        <span className="text-xs font-bold text-gray-300">Flag as "Coming Soon"?</span>
                        <input
                          type="checkbox"
                          checked={courseForm.is_coming_soon || false}
                          onChange={(e) => setCourseForm({ ...courseForm, is_coming_soon: e.target.checked })}
                          className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                        />
                      </div>

                      {!courseForm.is_free && (
                        <div className="pt-2 border-t border-purple-950/25">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">Tuition Price (DZD)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={courseForm.price}
                              onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                              className="w-full bg-black border border-purple-900/30 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white focus:outline-none"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-purple-500 font-black">đ</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Learning Outcomes (One per line)</label>
                      <textarea
                        rows={3}
                        value={courseForm.outcomes || ''}
                        onChange={(e) => setCourseForm({ ...courseForm, outcomes: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="e.g. Master professional video editing&#10;Incorporate advanced color grading&#10;Optimize editing efficiency"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Course Requirements (One per line)</label>
                      <textarea
                        rows={3}
                        value={courseForm.requirements || ''}
                        onChange={(e) => setCourseForm({ ...courseForm, requirements: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="e.g. A computer capable of video editing&#10;Adobe Premiere Pro installed&#10;No prior experience required"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {courseModalTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => setCourseModalTab(courseModalTab === 'curriculum' ? 'media' : 'general')}
                      className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  {courseModalTab !== 'curriculum' ? (
                    <button
                      type="button"
                      onClick={() => setCourseModalTab(courseModalTab === 'general' ? 'media' : 'curriculum')}
                      className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      Save Course Configuration
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT CHAPTER */}
      <AnimatePresence>
        {showChapterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowChapterModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingChapterId ? 'Edit Session' : 'Create Session'}</h2>
                  <p className="text-gray-400 text-xs">Configure session video, software targeting, media & interactive exercises</p>
                </div>
                <button onClick={() => setShowChapterModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Session Modal Navigation Tabs */}
              <div className="flex items-center gap-2 mb-6 bg-black border border-purple-950/40 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setChapterModalTab('core')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    chapterModalTab === 'core'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📹 Core Video
                </button>
                <button
                  type="button"
                  onClick={() => setChapterModalTab('media')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    chapterModalTab === 'media'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🖼️ Thumb & Handout
                </button>
                <button
                  type="button"
                  onClick={() => setChapterModalTab('exercise')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    chapterModalTab === 'exercise'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎯 Exercise Builder
                </button>
              </div>

              <form onSubmit={handleChapterSubmit} className="space-y-4">
                {chapterModalTab === 'core' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Choose Parent Course</label>
                      <select
                        value={chapterForm.courseId}
                        onChange={(e) => setChapterForm({ ...chapterForm, courseId: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5 font-mono">Target Software Variation</label>
                      <select
                        value={chapterForm.softwareId || 'premiere'}
                        onChange={(e) => setChapterForm({ ...chapterForm, softwareId: e.target.value })}
                        className="w-full bg-zinc-900 border border-purple-500/40 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="premiere">Adobe Premiere Pro</option>
                        <option value="davinci">DaVinci Resolve</option>
                        <option value="capcut">CapCut</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Session Title</label>
                      <input
                        type="text"
                        required
                        value={chapterForm.title}
                        onChange={(e) => setFormChapterAndTitle(e.target.value)}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        placeholder="e.g. Session 1: Introduction to Video Editing"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Order Sequence Position</label>
                        <input
                          type="number"
                          required
                          value={chapterForm.position}
                          onChange={(e) => setChapterForm({ ...chapterForm, position: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-end pb-1.5">
                        <label className="flex items-center gap-2.5 bg-zinc-900 border border-white/5 p-3.5 rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chapterForm.is_preview}
                            onChange={(e) => setChapterForm({ ...chapterForm, is_preview: e.target.checked })}
                            className="w-4 h-4 accent-purple-650 rounded"
                          />
                          <span className="text-[11px] font-bold text-gray-300">Public Free Preview</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Session Video Stream URL (YouTube Embed / Bunny / Direct)</label>
                      <input
                        type="url"
                        required
                        value={chapterForm.session_url}
                        onChange={(e) => setChapterForm({ ...chapterForm, session_url: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                        placeholder="e.g. https://www.youtube.com/embed/..."
                      />
                    </div>
                  </div>
                )}

                {chapterModalTab === 'media' && (
                  <div className="space-y-4">
                    <ImageUploader
                      label="Session Card Thumbnail Image"
                      value={chapterForm.thumbnail_url}
                      onChange={(url) => setChapterForm({ ...chapterForm, thumbnail_url: url })}
                      helperText="Optional cover thumbnail for this specific video lesson."
                    />

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Homework / Project Files Download Link</label>
                      <input
                        type="url"
                        value={chapterForm.homework_url}
                        onChange={(e) => setChapterForm({ ...chapterForm, homework_url: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                        placeholder="e.g. Google Drive / Dropbox link with course materials"
                      />
                    </div>
                  </div>
                )}

                {chapterModalTab === 'exercise' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Exercise Briefing Video Stream URL</label>
                      <input
                        type="url"
                        value={chapterForm.exercise_url}
                        onChange={(e) => setChapterForm({ ...chapterForm, exercise_url: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                        placeholder="e.g. YouTube embed or direct stream link"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Exercise Title</label>
                      <input
                        type="text"
                        value={chapterForm.exercise_title}
                        onChange={(e) => setChapterForm({ ...chapterForm, exercise_title: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                        placeholder="e.g. Cut the Interview: Sync & Rough Assembly"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Exercise Briefing / Instructions</label>
                      <textarea
                        value={chapterForm.exercise_brief}
                        onChange={(e) => setChapterForm({ ...chapterForm, exercise_brief: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-20 resize-none"
                        placeholder="Describe exact instructions and goals for student submission..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Evaluation Checklist (One requirement per line)</label>
                      <textarea
                        value={chapterForm.exercise_tasks_raw}
                        onChange={(e) => setChapterForm({ ...chapterForm, exercise_tasks_raw: e.target.value })}
                        className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-24 font-mono leading-relaxed"
                        placeholder="Import footage and sync&#10;Build rough cut on the beat&#10;Color match camera angles&#10;Add J/L cut transition"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {chapterModalTab !== 'core' && (
                    <button
                      type="button"
                      onClick={() => setChapterModalTab(chapterModalTab === 'exercise' ? 'media' : 'core')}
                      className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  {chapterModalTab !== 'exercise' ? (
                    <button
                      type="button"
                      onClick={() => setChapterModalTab(chapterModalTab === 'core' ? 'media' : 'exercise')}
                      className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      Save Session Configuration
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.05: EXERCISE GRADING MODAL */}
      <AnimatePresence>
        {showExerciseGradingModal && selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowExerciseGradingModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Evaluate Practical Exercise</h2>
                  <p className="text-gray-400 text-xs">Verify student performance, check criteria off, and write tutor feedback</p>
                </div>
                <button onClick={() => setShowExerciseGradingModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGradeSubmissionSubmit} className="space-y-5">
                {/* Student Details Info Panel */}
                <div className="p-4 bg-zinc-900/50 border border-purple-900/10 rounded-2xl space-y-2">
                  <div className="text-[9px] font-mono uppercase text-purple-400 tracking-wider">Student Submission Details</div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Tutor/Student:</span>
                    <span className="text-white font-bold">
                      {usersList.find((u: any) => u.id === (selectedSubmission.uid || selectedSubmission.userId))?.fullName || 'Anonymous'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Class Session ID:</span>
                    <span className="text-white font-mono font-bold">
                      Chapter Position {selectedSubmission.chapter ?? selectedSubmission.chapterId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-purple-900/5">
                    <span className="text-gray-400">Delivered Work:</span>
                    <a 
                      href={selectedSubmission.downloadUrl || selectedSubmission.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 rounded-lg text-purple-400 text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-all"
                    >
                      <Upload className="w-3 h-3" />
                      View Project File
                    </a>
                  </div>
                </div>

                {/* Submission Video Preview Panel */}
                {(() => {
                  const mediaUrl = selectedSubmission.downloadUrl || selectedSubmission.fileUrl;
                  if (!mediaUrl) return null;

                  // Determine if direct video file
                  const isDirectVideo = mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.endsWith('.ogg') || mediaUrl.includes('storage.bunnycdn.com') || mediaUrl.includes('bunnycdn');
                  
                  return (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Student Submission Media Player</label>
                      <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-purple-900/30 shadow-inner group">
                        {isDirectVideo ? (
                          <video 
                            src={mediaUrl} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <iframe
                            src={mediaUrl}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Practical Checklist Criteria */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Checklist Criteria Evaluation</label>
                  {(() => {
                    const matchChapter = chapters.find((ch: any) => 
                      ch.courseId === selectedSubmission.courseId && 
                      Number(ch.position) === Number(selectedSubmission.chapter ?? selectedSubmission.chapterId)
                    );
                    const tasks = matchChapter?.exercise_tasks || [];

                    if (tasks.length === 0) {
                      return (
                        <div className="p-3.5 bg-zinc-950/40 rounded-xl text-center text-xs text-gray-500 border border-dashed border-purple-900/5">
                          No evaluation checklist items defined for this chapter.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {tasks.map((task: string, idx: number) => {
                          const isChecked = !!gradingForm.taskResults[idx.toString()];
                          return (
                            <label 
                              key={idx} 
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked 
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
                                  : 'bg-rose-950/10 border-rose-950/30 text-rose-300 hover:bg-rose-950/20'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isChecked ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-rose-950/20 border border-rose-500/30 flex items-center justify-center">
                                    <X className="w-3 h-3 text-rose-500 font-bold" />
                                  </div>
                                )}
                              </div>
                              <input 
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={(e) => {
                                  const updatedTasks = { ...gradingForm.taskResults };
                                  updatedTasks[idx.toString()] = e.target.checked;
                                  setGradingForm({ ...gradingForm, taskResults: updatedTasks });
                                }}
                              />
                              <span className="text-xs leading-tight font-medium mt-0.5">{task}</span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Dynamic Scoring Dial */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Award Performance Score</label>
                    <span className="text-xs font-mono font-extrabold text-purple-400">{gradingForm.score} / 10 Points</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={gradingForm.score}
                    onChange={(e) => setGradingForm({ ...gradingForm, score: Number(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-gray-650 mt-1">
                    <span>0 (Unacceptable)</span>
                    <span>5 (Passing)</span>
                    <span>10 (Outstanding)</span>
                  </div>
                </div>

                {/* Tutor Notes Feedback */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Reviewer Feedback & Guidance Notes</label>
                  <textarea
                    required
                    value={gradingForm.reviewerNote}
                    onChange={(e) => setGradingForm({ ...gradingForm, reviewerNote: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-24 resize-none leading-relaxed"
                    placeholder="Provide detailed, actionable feedback. E.g., 'Fantastic sync work! Your color grading matches beautifully, but look closely at the J-cut transition timing...'"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExerciseGradingModal(false)}
                    className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-850 text-gray-400 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-600/10"
                  >
                    Publish Review
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.1: ADD / EDIT STORE PRODUCT */}
      <AnimatePresence>
        {showStoreProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowStoreProductModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingStoreProductId ? 'Edit Store Product' : 'Add Store Product'}</h2>
                  <p className="text-gray-400 text-xs">Configure durations, pricing, and cover image</p>
                </div>
                <button onClick={() => setShowStoreProductModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStoreProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Product Name</label>
                  <input
                    type="text"
                    required
                    value={storeProductForm.name}
                    onChange={(e) => setStoreProductForm({ ...storeProductForm, name: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="e.g. Adobe Creative Cloud"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Description</label>
                  <textarea
                    required
                    value={storeProductForm.description}
                    onChange={(e) => setStoreProductForm({ ...storeProductForm, description: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-20"
                    placeholder="e.g. Professional creative applications suite membership"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Cover Image</label>
                  <div className="flex items-center gap-3">
                    {storeProductForm.imageUrl ? (
                      <img 
                        src={storeProductForm.imageUrl} 
                        alt="Product Thumbnail" 
                        className="w-10 h-10 object-cover rounded-lg border border-purple-900/40 bg-black shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg border border-dashed border-purple-900/30 flex items-center justify-center text-gray-600 bg-black/50 text-[9px] uppercase font-mono shrink-0">
                        None
                      </div>
                    )}
                    <input 
                      type="file"
                      accept="image/*"
                      ref={storeProductFileRef}
                      className="hidden"
                      onChange={uploadStoreProductImage}
                    />
                    <button
                      type="button"
                      onClick={() => storeProductFileRef.current?.click()}
                      disabled={storeProductUploading}
                      className="flex-1 px-3 py-2.5 bg-purple-650 hover:bg-purple-600 border border-purple-500/20 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {storeProductUploading ? (
                        <Icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icons.Upload className="w-3.5 h-3.5" />
                      )}
                      {storeProductForm.imageUrl ? 'Replace Image' : 'Import Image File'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Durations & Prices (DA)</label>
                  <textarea
                    required
                    value={storeProductForm.durationsText}
                    onChange={(e) => setStoreProductForm({ ...storeProductForm, durationsText: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-24 font-mono"
                    placeholder="1 Month: 4500&#10;3 Months: 12500&#10;6 Months: 23000&#10;12 Months: 42000"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Enter subscription options line-by-line in the format: "Duration: Price".
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Default Selected Duration</label>
                  <input
                    type="text"
                    required
                    value={storeProductForm.defaultDuration}
                    onChange={(e) => setStoreProductForm({ ...storeProductForm, defaultDuration: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="e.g. 1 Month (must match one of the durations above)"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    This duration will be pre-selected in the checkout and will also display on top of the "Buy" button in the Store card.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="storeProductActive"
                    checked={storeProductForm.active}
                    onChange={(e) => setStoreProductForm({ ...storeProductForm, active: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                  />
                  <label htmlFor="storeProductActive" className="text-xs text-gray-350 cursor-pointer select-none">
                    Enable this product in the Software Store catalog
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow"
                >
                  Save Store Product
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.2: ADD / EDIT USEFUL RESOURCE */}
      <AnimatePresence>
        {showUsefulResourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowUsefulResourceModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingUsefulResourceId ? 'Edit Resource Link' : 'Add Resource Link'}</h2>
                  <p className="text-gray-400 text-xs">Configure external URL directory listings</p>
                </div>
                <button onClick={() => setShowUsefulResourceModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUsefulResourceSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Website Name</label>
                  <input
                    type="text"
                    required
                    value={usefulResourceForm.name}
                    onChange={(e) => setUsefulResourceForm({ ...usefulResourceForm, name: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="e.g. Unsplash Stock Images"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Description</label>
                  <textarea
                    required
                    value={usefulResourceForm.description}
                    onChange={(e) => setUsefulResourceForm({ ...usefulResourceForm, description: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none h-20"
                    placeholder="e.g. Beautiful, free images and photos that you can download and use..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Category Directory</label>
                    <select
                      value={usefulResourceForm.category}
                      onChange={(e) => setUsefulResourceForm({ ...usefulResourceForm, category: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-gray-350 focus:outline-none"
                    >
                      <option value="Free Stock Footage">Free Stock Footage</option>
                      <option value="AI Tools">AI Tools</option>
                      <option value="Learning Resources">Learning Resources</option>
                    </select>
                  </div>

                <div>
                  <ImageUploader
                    label="Resource Brand Logo / Icon"
                    value={usefulResourceForm.logoUrl}
                    onChange={(url) => setUsefulResourceForm({ ...usefulResourceForm, logoUrl: url })}
                    helperText="Upload or provide a square logo image for this external resource."
                  />
                </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">External Website URL</label>
                  <input
                    type="url"
                    required
                    value={usefulResourceForm.url}
                    onChange={(e) => setUsefulResourceForm({ ...usefulResourceForm, url: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="https://unsplash.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Display Order Position</label>
                  <input
                    type="number"
                    required
                    value={usefulResourceForm.order}
                    onChange={(e) => setUsefulResourceForm({ ...usefulResourceForm, order: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="e.g. 1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usefulResourceActive"
                    checked={usefulResourceForm.active}
                    onChange={(e) => setUsefulResourceForm({ ...usefulResourceForm, active: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600"
                  />
                  <label htmlFor="usefulResourceActive" className="text-xs text-gray-350 cursor-pointer select-none">
                    Enable this website link directory listing
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow"
                >
                  Save Resource Link
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.2: ADD / EDIT PLAN BUNDLE */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowPlanModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingPlanId ? 'Edit Membership Plan' : 'Create Membership Plan'}</h2>
                  <p className="text-gray-400 text-xs">Fill out features, billing rates, and ordering indexes</p>
                </div>
                <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePlanSubmit} className="space-y-4">
                {/* Visibility Toggle */}
                <div className="p-4 bg-zinc-900/60 rounded-2xl border border-purple-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      planForm.active !== false 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {planForm.active !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Tier Visibility</span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase ${
                          planForm.active !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {planForm.active !== false ? 'Live (Visible)' : 'Hidden (Draft)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {planForm.active !== false 
                          ? 'This tier will be visible to all visitors on the /plans page.' 
                          : 'This tier will only be visible to admins for testing and draft preview.'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.active !== false}
                      onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Plan Name / Title</label>
                    <input
                      type="text"
                      required
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="e.g. Pro Creator Membership"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Price Display (e.g. DA)</label>
                    <input
                      type="text"
                      required
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="e.g. 18,000 DA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Tagline Sub-header</label>
                    <input
                      type="text"
                      value={planForm.tagline}
                      onChange={(e) => setPlanForm({ ...planForm, tagline: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      placeholder="e.g. For users who want to do more."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Billing Interval</label>
                    <input
                      type="text"
                      value={planForm.interval}
                      onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      placeholder="e.g. Per year / For a Lifetime"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Brief Description</label>
                  <input
                    type="text"
                    required
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="Short summary displayed under the name..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Ordering Sequence Position</label>
                    <input
                      type="number"
                      required
                      value={planForm.order}
                      onChange={(e) => setPlanForm({ ...planForm, order: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="1"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="planIsPopular"
                      type="checkbox"
                      checked={planForm.isPopular}
                      onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                      className="w-5 h-5 rounded bg-black border border-purple-900/30 accent-purple-600 focus:outline-none"
                    />
                    <label htmlFor="planIsPopular" className="text-xs font-semibold text-gray-350 cursor-pointer font-mono select-none">Mark as &quot;Most Popular&quot;</label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Included Advantages (Line by Line)</label>
                  <textarea
                    rows={4}
                    value={planForm.featuresText}
                    onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="Access to Basic Softwares&#10;100+ Premium Stock Sound Effects&#10;Standard 1080p Overlay Stock"
                  />
                  <span className="text-[10px] text-gray-500 italic mt-1 block font-mono">Write each unique bundle reward on a brand new line.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow"
                >
                  Save Membership Plan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.4: ADD / EDIT HOMEPAGE HERO VIDEO */}
      <AnimatePresence>
        {showHeroVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowHeroVideoModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingHeroVideoId ? 'Edit Hero Video Path' : 'Add Hero Video Path'}</h2>
                  <p className="text-gray-400 text-xs">Direct the homepage intro board immediately to any video stream</p>
                </div>
                <button onClick={() => setShowHeroVideoModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleHeroVideoSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Video Display Title</label>
                  <input
                    type="text"
                    required
                    value={heroVideoForm.title}
                    onChange={(e) => setHeroVideoForm({ ...heroVideoForm, title: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="e.g. Masterclass Intro Teaser"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Video stream URL / path</label>
                  <input
                    type="text"
                    required
                    value={heroVideoForm.videoUrl}
                    onChange={(e) => setHeroVideoForm({ ...heroVideoForm, videoUrl: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
                    placeholder="e.g. https://domain.com/my-intro-file.mp4"
                  />
                  <span className="text-[10px] text-gray-450 block mt-1 leading-normal">
                    Accepts direct .mp4 / .webm video file URL, or standard YouTube, Vimeo, Google Drive preview links.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="relative flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={heroVideoForm.isActive}
                      onChange={(e) => setHeroVideoForm({ ...heroVideoForm, isActive: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-450 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white relative" />
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Actively deploy as live homepage video</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loadingHeroVideos}
                  className="w-full py-4 mt-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-2"
                >
                  {loadingHeroVideos && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Video Document</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* MODAL: CREATE / EDIT HOMEPAGE STATISTICS */}
      <AnimatePresence>
        {showStatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => { setShowStatModal(false); setEditingStatId(null); }} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-left"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingStatId ? 'Edit Statistical Counter' : 'Create Statistical Counter'}</h2>
                  <p className="text-gray-400 text-xs">Configure the counter value, translations, and select the badge icon.</p>
                </div>
                <button 
                  onClick={() => { setShowStatModal(false); setEditingStatId(null); }} 
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateStat} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Stat ID (Unique Key)</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingStatId}
                      value={statForm.id}
                      onChange={(e) => setStatForm({ ...statForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono disabled:opacity-50"
                      placeholder="e.g. students"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold text-purple-400">Stat Value</label>
                    <input
                      type="text"
                      required
                      value={statForm.value}
                      onChange={(e) => setStatForm({ ...statForm, value: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold"
                      placeholder="e.g. 590, 3+, 100%"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Label (English)</label>
                  <input
                    type="text"
                    required
                    value={statForm.labelEn}
                    onChange={(e) => setStatForm({ ...statForm, labelEn: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="e.g. Active Students"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Label (French)</label>
                    <input
                      type="text"
                      value={statForm.labelFr}
                      onChange={(e) => setStatForm({ ...statForm, labelFr: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="e.g. Étudiants actifs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Label (Arabic)</label>
                    <input
                      type="text"
                      value={statForm.labelAr}
                      onChange={(e) => setStatForm({ ...statForm, labelAr: e.target.value })}
                      className="w-full bg-black border border-purple-900/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-right"
                      placeholder="طالب"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Sort Order</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={statForm.order}
                      onChange={(e) => setStatForm({ ...statForm, order: Number(e.target.value) || 1 })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Active Icon Name</label>
                    <select
                      value={statForm.iconName}
                      onChange={(e) => setStatForm({ ...statForm, iconName: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="Users">Users</option>
                      <option value="BookOpen">BookOpen</option>
                      <option value="Star">Star</option>
                      <option value="ShieldCheck">ShieldCheck</option>
                      <option value="Award">Award</option>
                      <option value="Activity">Activity</option>
                      <option value="Layers">Layers</option>
                      <option value="Trophy">Trophy</option>
                      <option value="HelpCircle">HelpCircle</option>
                    </select>
                  </div>
                </div>

                {/* Visual Icon Selection Row */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">Select Icon Preset</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: 'Users', icon: Users },
                      { name: 'BookOpen', icon: BookOpen },
                      { name: 'Star', icon: Star },
                      { name: 'ShieldCheck', icon: ShieldCheck },
                      { name: 'Award', icon: Award },
                      { name: 'Activity', icon: Activity },
                      { name: 'Layers', icon: Layers },
                      { name: 'Trophy', icon: Trophy },
                      { name: 'HelpCircle', icon: HelpCircle },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = statForm.iconName === item.name;
                      return (
                        <button
                          type="button"
                          key={item.name}
                          onClick={() => setStatForm({ ...statForm, iconName: item.name })}
                          className={`p-3 border rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                              : 'bg-black border-purple-900/20 text-gray-400 hover:text-white hover:border-purple-900/40'
                          }`}
                          title={item.name}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loadingStats}
                    className="w-full py-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-2"
                  >
                    {loadingStats && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingStatId ? 'Save Statistic' : 'Create Statistic'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2rem] p-8 w-full max-w-md shadow-2xl overflow-hidden z-10 text-left"
            >
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                {confirmDialog.title}
              </h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-gray-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    await confirmDialog.onConfirm();
                  }}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    confirmDialog.isDanger 
                      ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                      : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                  }`}
                >
                  {confirmDialog.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX POPUP SPECIFIC WITH INTERACTIVE ZOOM & ROTATION CONTROLS */}
      <AnimatePresence>
        {enlargedReceiptUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 md:p-8 select-none"
            onClick={() => setEnlargedReceiptUrl(null)}
          >
            {/* Top Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none z-10">
              <div className="bg-zinc-900/90 border border-white/5 backdrop-blur-md rounded-2xl px-4 py-2.5 flex items-center gap-2 pointer-events-auto shadow-xl">
                <span className="text-xs text-purple-300 font-extrabold uppercase tracking-widest mr-2">Voucher Inspector</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400">Scale: {(zoomScale * 100).toFixed(0)}% | Rot: {zoomRotation}°</span>
              </div>

              <div className="flex items-center gap-3 pointer-events-auto">
                {/* Control Panel */}
                <div className="flex items-center bg-zinc-900/90 border border-white/5 backdrop-blur-md rounded-2xl p-1 gap-1 shadow-xl">
                  <button
                    onClick={(e) => { e.stopPropagation(); setZoomScale(s => Math.min(s + 0.25, 4)); }}
                    className="p-2 hover:bg-zinc-850 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setZoomScale(s => Math.max(s - 0.25, 0.5)); }}
                    className="p-2 hover:bg-zinc-850 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setZoomRotation(r => (r + 90) % 360); }}
                    className="p-2 hover:bg-zinc-850 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setZoomScale(1); setZoomRotation(0); }}
                    className="p-2 hover:bg-zinc-850 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border-l border-white/5"
                    title="Reset Zoom & Rotation"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setEnlargedReceiptUrl(null)}
                  className="p-3 bg-zinc-900/90 hover:bg-zinc-800 text-white rounded-full border border-white/10 transition-all shadow-xl cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Interactive Image Container */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden p-8">
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="relative bg-zinc-950 border border-white/5 rounded-[2rem] p-3 shadow-2xl overflow-hidden max-w-4xl max-h-[80vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="overflow-auto max-h-[72vh] flex items-center justify-center">
                  <img
                    src={enlargedReceiptUrl}
                    alt="Enlarged Receipt Document"
                    className="max-w-full max-h-[68vh] object-contain rounded-2xl transition-all duration-200"
                    style={{ transform: `scale(${zoomScale}) rotate(${zoomRotation}deg)` }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            </div>
            
            {/* Help Info Footer */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 border border-white/5 backdrop-blur-md rounded-xl px-4 py-2 text-[11px] text-gray-400 font-medium">
              Use control panel at the top right to zoom or rotate the receipt image. Click outside to dismiss.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHIPPED ACCOUNTS / CREDENTIALS MANAGEMENT MODAL */}
      <AnimatePresence>
        {isShippedAccountsModalOpen && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsShippedAccountsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-[2.5rem] w-full max-w-2xl p-8 space-y-6 shadow-2xl overflow-hidden text-left relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2.5">
                    <Key className="w-6 h-6 text-purple-500" />
                    <span>Credentials & Shipped Accounts</span>
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Manage login credentials of software and course access keys for <span className="text-white font-bold">{selectedStudent.fullName || selectedStudent.displayName || 'this student'}</span>.
                  </p>
                </div>
                <button
                  onClick={() => setIsShippedAccountsModalOpen(false)}
                  className="p-2 hover:bg-white/5 border border-white/5 hover:border-purple-500/20 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Detail Info */}
              <div className="bg-black/40 border border-purple-900/10 p-4 rounded-2xl text-xs space-y-1.5 font-medium text-gray-400">
                <div><span className="text-purple-400">Student Email:</span> {selectedStudent.email}</div>
                <div><span className="text-purple-400">Firestore UID:</span> <span className="font-mono text-gray-500">{selectedStudent.id}</span></div>
              </div>

              {/* Shipped Accounts Content */}
              {shippedAccountsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  <p className="text-xs text-gray-500 font-medium">Scanning purchases & active credentials...</p>
                </div>
              ) : studentPurchases.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-purple-900/20 rounded-3xl bg-black/10">
                  <Lock className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-sm text-gray-400 font-bold">No Purchases Found</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">This student hasn't purchased any course formats or software licenses from the store yet.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
                  {studentPurchases.map((item) => {
                    const isApproved = item.status === 'approved';
                    const email = accountEmails[item.itemId] || '';
                    const password = accountPasswords[item.itemId] || '';

                    return (
                      <div key={item.id} className="bg-black/60 border border-purple-900/15 p-5 rounded-3xl space-y-4">
                        {/* Title Info */}
                        <div className="flex justify-between items-start gap-2 border-b border-purple-900/10 pb-3">
                          <div>
                            <span className="text-[9px] font-black uppercase text-purple-400 tracking-widest block">
                              {item.type === 'course' ? 'Academy Course' : 'Store Product'}
                            </span>
                            <h4 className="font-bold text-white text-sm mt-0.5">{item.name}</h4>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isApproved ? (
                              <span className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 tracking-wider">
                                Approved
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 tracking-wider">
                                Pending
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setIsShippedAccountsModalOpen(false);
                                if (item.type === 'course') {
                                  startEditEnrollment(item.rawRecord);
                                } else {
                                  startEditStorePurchase(item.rawRecord);
                                }
                              }}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-purple-400 rounded-lg transition-all border border-white/5 cursor-pointer inline-flex"
                              title="Edit Request Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setIsShippedAccountsModalOpen(false);
                                const studentName = selectedStudent.fullName || selectedStudent.displayName || 'this student';
                                if (item.type === 'course') {
                                  handleDeleteEnrollment(item.id, studentName);
                                } else {
                                  handleDeleteStorePurchase(item.id, studentName);
                                }
                              }}
                              className="p-1.5 bg-zinc-900 hover:bg-red-950/20 border border-white/5 hover:border-red-500/20 text-red-500 rounded-lg transition-all cursor-pointer inline-flex"
                              title="Delete Request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Input Credentials Form or Locked Message */}
                        {isApproved ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Account Email</label>
                                <input
                                  type="email"
                                  placeholder="student-adobe@example.com"
                                  value={email}
                                  onChange={(e) => setAccountEmails(prev => ({ ...prev, [item.itemId]: e.target.value }))}
                                  className="w-full bg-zinc-950 border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                />
                              </div>
                              <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Account Password</label>
                                <input
                                  type="text"
                                  placeholder="Enter Secure Password"
                                  value={password}
                                  onChange={(e) => setAccountPasswords(prev => ({ ...prev, [item.itemId]: e.target.value }))}
                                  className="w-full bg-zinc-950 border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleSaveShippedAccount(item.itemId, item.type, item.name)}
                              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/20 hover:scale-[1.01] active:scale-100 cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              Save Credentials & Ship
                            </button>
                          </div>
                        ) : (
                          <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                            <Lock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div className="text-left">
                              <div className="text-xs font-bold text-yellow-500">Locked pending verification</div>
                              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                                You cannot enter account credentials for this license yet. Go to the receipts ledger tab, inspect the proof of payment, and approve the purchase receipt first.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT ENROLLMENT MODAL */}
      <AnimatePresence>
        {showEditEnrollmentModal && selectedEnrollmentToEdit && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
              onClick={() => {
                setShowEditEnrollmentModal(false);
                setSelectedEnrollmentToEdit(null);
              }} 
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-[2.5rem] w-full max-w-lg p-8 space-y-6 shadow-2xl overflow-hidden text-left relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">Database Record Editor</span>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Edit2 className="w-6 h-6 text-purple-500" />
                    <span>Edit Course Enrollment Request</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEnrollmentModal(false);
                    setSelectedEnrollmentToEdit(null);
                  }}
                  className="p-2 hover:bg-white/5 border border-white/5 hover:border-purple-500/20 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditEnrollmentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={editEnrollmentForm.fullName}
                    onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, fullName: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Payment Method</label>
                    <select
                      value={editEnrollmentForm.paymentMethod}
                      onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, paymentMethod: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="CCP">CCP</option>
                      <option value="BaridiMob">BaridiMob</option>
                      <option value="CCP RIP">CCP RIP</option>
                      <option value="Stripe">Stripe</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Price (DZD)</label>
                    <input
                      type="text"
                      required
                      value={editEnrollmentForm.price}
                      onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, price: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">CCP Transaction RIP</label>
                  <input
                    type="text"
                    value={editEnrollmentForm.ccpRIP || ''}
                    onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, ccpRIP: e.target.value })}
                    placeholder="RIP Number (for ccp/baridimob transfers)"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Target Academy Course</label>
                  <select
                    value={editEnrollmentForm.courseId}
                    onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, courseId: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Verification Status</label>
                  <select
                    value={editEnrollmentForm.status}
                    onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, status: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="pending_verification">Pending Verification</option>
                    <option value="approved">Approved &amp; Active</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {editEnrollmentForm.status === 'rejected' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-black uppercase text-red-400 tracking-widest font-mono">Rejection Reason</label>
                    <textarea
                      required
                      value={editEnrollmentForm.rejectionReason}
                      onChange={(e) => setEditEnrollmentForm({ ...editEnrollmentForm, rejectionReason: e.target.value })}
                      placeholder="Why was this receipt validation request rejected? (visible to student)"
                      rows={3}
                      className="w-full bg-black border border-red-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEnrollmentModal(false);
                      setSelectedEnrollmentToEdit(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-gray-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-950/20"
                  >
                    Save Request Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT STORE PURCHASE MODAL */}
      <AnimatePresence>
        {showEditStorePurchaseModal && selectedStorePurchaseToEdit && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
              onClick={() => {
                setShowEditStorePurchaseModal(false);
                setSelectedStorePurchaseToEdit(null);
              }} 
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-[2.5rem] w-full max-w-lg p-8 space-y-6 shadow-2xl overflow-hidden text-left relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">Database Record Editor</span>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Edit2 className="w-6 h-6 text-purple-500" />
                    <span>Edit Software subscription request</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStorePurchaseModal(false);
                    setSelectedStorePurchaseToEdit(null);
                  }}
                  className="p-2 hover:bg-white/5 border border-white/5 hover:border-purple-500/20 rounded-xl transition-all text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditStorePurchaseSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Student Display Name</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.displayName}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, displayName: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Student Email</label>
                    <input
                      type="email"
                      required
                      value={editStorePurchaseForm.email}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, email: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Phone Number</label>
                    <input
                      type="text"
                      value={editStorePurchaseForm.phone || ''}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, phone: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Product Duration</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.duration}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, duration: e.target.value })}
                      placeholder="e.g. 1 Month, 12 Months"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Product Name</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.productName}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, productName: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Product ID</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.productId}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, productId: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Price</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.price}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, price: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Currency</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.currency}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, currency: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Payment Method</label>
                    <input
                      type="text"
                      required
                      value={editStorePurchaseForm.paymentMethod}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, paymentMethod: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-mono">Verification Status</label>
                    <select
                      value={editStorePurchaseForm.status}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, status: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved / Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {editStorePurchaseForm.status === 'rejected' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-black uppercase text-red-400 tracking-widest font-mono">Rejection Reason</label>
                    <textarea
                      required
                      value={editStorePurchaseForm.rejectionReason}
                      onChange={(e) => setEditStorePurchaseForm({ ...editStorePurchaseForm, rejectionReason: e.target.value })}
                      placeholder="Why was this software license verification request rejected? (visible to student)"
                      rows={3}
                      className="w-full bg-black border border-red-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditStorePurchaseModal(false);
                      setSelectedStorePurchaseToEdit(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-gray-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-950/20"
                  >
                    Save Request Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  function setFormChapterAndTitle(val: string) {
    setChapterForm({ ...chapterForm, title: val });
  }

  function getEmbedVideoUrl(url: string) {
    if (!url) return '';
    try {
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.includes('v=')) {
        const id = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.includes('drive.google.com/file/d/')) {
        const parts = url.split('drive.google.com/file/d/');
        if (parts[1]) {
          const fileId = parts[1].split('/')[0];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      if (url.includes('drive.google.com/open?id=')) {
        const parts = url.split('drive.google.com/open?id=');
        if (parts[1]) {
          const fileId = parts[1].split('&')[0];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      if (url.includes('embed/')) {
        return url;
      }
      return url;
    } catch {
      return url;
    }
  }
}
