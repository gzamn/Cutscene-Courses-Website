import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Check, 
  HelpCircle, 
  Upload, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Lock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegion } from '../context/RegionContext';
import { 
  db, 
  handleFirestoreError, 
  OperationType, 
  collection, 
  addDoc, 
  getDocs,
  query,
  where
} from '../firebase';
import { SparkleButton, RainbowButton } from '../components/AnimatedButtons';
import AuthFlow from '../components/AuthFlow';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  durations: { [key: string]: number }; // duration label (e.g. "1 Month") -> price in DA
  active: boolean;
}

const DEFAULT_STORE_PRODUCTS = [
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
    active: true
  }
];

export default function Store() {
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const { currentRegion } = useRegion();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDurations, setSelectedDurations] = useState<{ [productId: string]: string }>({});
  
  // Checkout & Modal states
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(null);
  const [checkoutDuration, setCheckoutDuration] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'landing' | 'info' | 'payment'>('landing');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  
  // Agreement and receipt states
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Form translations
  const langText = {
    title: {
      en: "SOFTWARE STORE",
      fr: "BOUTIQUE LOGICIELS",
      ar: "متجر البرمجيات"
    },
    subtitle: {
      en: "Get official student subscriptions and premium digital licenses at exclusive rates.",
      fr: "Obtenez des abonnements étudiants officiels et des licences numériques premium à des tarifs exclusifs.",
      ar: "احصل على اشتراكات طلابية رسمية وتراخيص رقمية مميزة بأسعار حصرية."
    },
    durationLabel: {
      en: "Duration",
      fr: "Durée",
      ar: "المدة"
    },
    priceLabel: {
      en: "Price",
      fr: "Prix",
      ar: "السعر"
    },
    purchaseBtn: {
      en: "Purchase Subscription",
      fr: "Acheter l'Abonnement",
      ar: "شراء الاشتراك"
    },
    detailsBtn: {
      en: "Details",
      fr: "Détails",
      ar: "التفاصيل"
    },
    notAvailable: {
      en: "Out of Stock",
      fr: "En rupture de stock",
      ar: "غير متوفر حالياً"
    },
    loginRequired: {
      en: "Please sign in to complete your subscription purchase.",
      fr: "Veuillez vous connecter pour finaliser l'achat de votre abonnement.",
      ar: "يرجى تسجيل الدخول لإتمام عملية شراء الاشتراك."
    },
    checkoutTitle: {
      en: "Subscription Checkout",
      fr: "Finaliser l'Abonnement",
      ar: "إتمام الاشتراك"
    },
    studentInfo: {
      en: "Student Information",
      fr: "Informations de l'Étudiant",
      ar: "معلومات الطالب"
    },
    paymentDetails: {
      en: "Payment Details",
      fr: "Détails de Paiement",
      ar: "تفاصيل الدفع"
    },
    fullNameLabel: {
      en: "Full Name",
      fr: "Nom Complet",
      ar: "الاسم الكامل"
    },
    fullNamePlaceholder: {
      en: "Enter your full name",
      fr: "Saisissez votre nom complet",
      ar: "أدخل اسمك الكامل"
    },
    phoneLabel: {
      en: "Phone Number",
      fr: "Numéro de Téléphone",
      ar: "رقم الهاتف"
    },
    phonePlaceholder: {
      en: "e.g., +213 555 12 34 56",
      fr: "ex: +213 555 12 34 56",
      ar: "مثال: +213 555 12 34 56"
    },
    emailLabel: {
      en: "Email Address",
      fr: "Adresse E-mail",
      ar: "البريد الإلكتروني"
    },
    termsAgreeText: {
      en: "I agree to the Terms of Service & Refund Policy",
      fr: "J'accepte les Conditions d'Utilisation et la Politique de Remboursement",
      ar: "أوافق على شروط الخدمة وسياسة استرداد الأموال"
    },
    privacyAgreeText: {
      en: "I agree to the Privacy Policy",
      fr: "J'accepte la Politique de Confidentialité",
      ar: "أوافق على سياسة الخصوصية"
    },
    uploadReceipt: {
      en: "Upload Payment Receipt",
      fr: "Télécharger le reçu de paiement",
      ar: "تحميل وصل الدفع"
    },
    uploadInstructions: {
      en: "Drag and drop your receipt image here, or click to browse. (JPG, PNG, maximum 5MB)",
      fr: "Faites glisser l'image du reçu ici, ou cliquez pour parcourir. (JPG, PNG, max 5Mo)",
      ar: "اسحب وأسقط صورة الوصل هنا، أو انقر للتصفح. (JPG، PNG، بحد أقصى 5 ميجابايت)"
    },
    selectedFile: {
      en: "Selected Receipt File",
      fr: "Fichier reçu sélectionné",
      ar: "ملف الوصل المحدد"
    },
    completeBtn: {
      en: "Submit Receipt & Complete Order",
      fr: "Soumettre le Reçu & Finaliser",
      ar: "إرسال الوصل وإتمام الطلب"
    },
    submitting: {
      en: "Submitting request...",
      fr: "Soumission en cours...",
      ar: "جاري إرسال الطلب..."
    },
    successTitle: {
      en: "Order Submitted Successfully!",
      fr: "Commande soumise avec succès !",
      ar: "تم تقديم الطلب بنجاح!"
    },
    successMessage: {
      en: "Thank you for your purchase! Please wait for our administrators to verify your payment receipt. Once confirmed, the email and password for your new premium account will appear directly on your student dashboard.",
      fr: "Merci pour votre achat ! Veuillez patienter pendant que nos administrateurs vérifient votre reçu de paiement. Une fois validé, l'e-mail et le mot de passe de votre nouveau compte premium apparaîtront directement sur votre tableau de bord étudiant.",
      ar: "شكرًا لعملية الشراء! يرجى الانتظار حتى يقوم المشرفون لدينا بالتحقق من وصل الدفع الخاص بك. بمجرد تأكيد الدفع، سيظهر البريد الإلكتروني وكلمة المرور للحساب المميز الجديد مباشرةً في لوحة التحكم الخاصة بك."
    },
    nextBtn: {
      en: "Proceed to Payment",
      fr: "Passer au paiement",
      ar: "الذهاب إلى الدفع"
    },
    backBtn: {
      en: "Back",
      fr: "Retour",
      ar: "رجوع"
    },
    orderSummary: {
      en: "Order Summary",
      fr: "Résumé de la Commande",
      ar: "ملخص الطلب"
    },
    productText: {
      en: "Product",
      fr: "Produit",
      ar: "المنتج"
    },
    durationText: {
      en: "Duration",
      fr: "Durée",
      ar: "المدة"
    },
    totalAmountText: {
      en: "Total Amount",
      fr: "Montant Total",
      ar: "المبلغ الإجمالي"
    },
    oneTimeText: {
      en: "One-time manual payment transfer",
      fr: "Transfert manuel de paiement unique",
      ar: "تحويل يدوي لمرة واحدة، لا يوجد تجديد تلقائي"
    }
  };

  const getL = (key: keyof typeof langText) => {
    return langText[key][language as 'en' | 'fr' | 'ar'] || langText[key]['en'];
  };

  // Prepopulate personal details
  useEffect(() => {
    if (user) {
      setFullName(userProfile?.displayName || user.displayName || '');
      setPhone(userProfile?.phone || '');
    }
  }, [user, userProfile]);

  // Set default payment method when region changes
  useEffect(() => {
    const activeMethods = currentRegion?.paymentMethods?.filter((m: any) => m.active) || [];
    if (activeMethods.length > 0) {
      setSelectedMethod(activeMethods[0].id);
    } else {
      setSelectedMethod('');
    }
  }, [currentRegion]);

  // Fetch Store Products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'store_products'));
        let list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StoreProduct[];

        if (list.length === 0) {
          console.log('No store products found. Auto-seeding initial student product...');
          for (const item of DEFAULT_STORE_PRODUCTS) {
            try {
              await addDoc(collection(db, 'store_products'), {
                ...item,
                createdAt: new Date().toISOString()
              });
            } catch (seedErr) {
              console.warn('Auto-seeding product failed (expected for non-admins):', seedErr);
            }
          }
          const seededSnapshot = await getDocs(collection(db, 'store_products'));
          list = seededSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as StoreProduct[];
        }

        // Keep active products
        const activeList = list.filter(p => p.active !== false);
        setProducts(activeList);

        // Set default durations
        const defaultDurations: { [productId: string]: string } = {};
        activeList.forEach(p => {
          const keys = Object.keys(p.durations);
          if (keys.length > 0) {
            defaultDurations[p.id] = keys[0];
          }
        });
        setSelectedDurations(defaultDurations);

      } catch (err: any) {
        console.error('Failed to load store products:', err);
        handleFirestoreError(err, OperationType.LIST, 'store_products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDurationChange = (productId: string, duration: string) => {
    setSelectedDurations(prev => ({
      ...prev,
      [productId]: duration
    }));
  };

  // Price conversion
  const formatPrice = (daPrice: number) => {
    const multiplier = currentRegion?.multiplier || 1.0;
    const val = Number((daPrice * multiplier).toFixed(2));
    const formattedNum = val.toLocaleString(undefined, {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `${formattedNum} ${currentRegion?.symbol || 'DA'}`;
  };

  const getPriceValue = (daPrice: number) => {
    const multiplier = currentRegion?.multiplier || 1.0;
    return Number((daPrice * multiplier).toFixed(2));
  };

  const handleStartCheckout = (product: StoreProduct) => {
    const duration = selectedDurations[product.id] || Object.keys(product.durations)[0];
    setCheckoutProduct(product);
    setCheckoutDuration(duration);
    setCheckoutStep('landing');
    setTermsAgreed(false);
    setPolicyAgreed(false);
    setReceiptFile(null);
    setReceiptBase64('');
    setValidationErrors({});
  };

  // Image upload base64 converter
  const handleReceiptFileChange = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'ar' ? 'حجم الملف يجب أن يكون أقل من 5 ميجابايت' : 'Receipt file must be under 5MB');
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleReceiptFileChange(e.dataTransfer.files[0]);
    }
  };

  // Validate Info Step
  const validateInfo = () => {
    const errors: { [key: string]: string } = {};
    if (!fullName.trim()) {
      errors.fullName = language === 'ar' ? 'الاسم مطلوب' : 'Full Name is required';
    }
    if (!phone.trim()) {
      errors.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone Number is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validateInfo()) {
      setCheckoutStep('payment');
    }
  };

  // Submit purchase
  const handleSubmitPurchase = async () => {
    const errors: { [key: string]: string } = {};
    if (!receiptBase64) {
      errors.receipt = language === 'ar' ? 'يرجى تحميل وصل التحويل المالي لتأكيد الدفع' : 'Please upload transaction receipt image to proceed';
    }
    if (!termsAgreed) {
      errors.terms = language === 'ar' ? 'يجب الموافقة على الشروط' : 'You must agree to the Terms of Service';
    }
    if (!policyAgreed) {
      errors.policy = language === 'ar' ? 'يجب الموافقة على سياسة الخصوصية' : 'You must agree to the Privacy Policy';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!checkoutProduct) return;

    setProcessing(true);
    try {
      const originalPrice = checkoutProduct.durations[checkoutDuration];
      const finalPrice = getPriceValue(originalPrice);

      const payload = {
        uid: user?.uid,
        email: user?.email,
        displayName: fullName,
        phone: phone,
        productId: checkoutProduct.id,
        productName: checkoutProduct.name,
        duration: checkoutDuration,
        price: finalPrice,
        currency: currentRegion?.currency || 'DZD',
        paymentMethod: selectedMethod,
        receiptUrl: receiptBase64, // base64 representation
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'store_purchases'), payload);
      
      setShowSuccessModal(true);
      setCheckoutProduct(null);
    } catch (err: any) {
      console.error('Failed to submit subscription order:', err);
      handleFirestoreError(err, OperationType.CREATE, 'store_purchases');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white pt-28 pb-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الاشتراكات المميزة' : 'PREMIUM SUBSCRIPTIONS'}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4"
          >
            {getL('title')}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-400 text-sm sm:text-base leading-relaxed"
          >
            {getL('subtitle')}
          </motion.p>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/15 max-w-md mx-auto">
            <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">No items available in the Software Store right now.</p>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            {products.map((product) => {
              return (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -6 }}
                  className="bg-zinc-950/40 rounded-[2.5rem] border border-purple-950/25 p-6 flex flex-col justify-between overflow-hidden shadow-2xl relative group"
                >
                  <div>
                    {/* Image */}
                    <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 relative bg-zinc-900">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                    </div>

                    {/* Product Metadata */}
                    <h3 className="text-2xl font-black tracking-tight text-white mb-2">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-6 h-12 overflow-hidden text-ellipsis">
                      {product.description}
                    </p>
                  </div>

                  <div>
                    <RainbowButton
                      onClick={() => handleStartCheckout(product)}
                      className="w-full py-4 text-xs font-black uppercase tracking-wider text-center"
                    >
                      {language === 'ar' ? 'شراء الآن' : language === 'fr' ? 'Acheter Maintenant' : 'Buy Now'}
                    </RainbowButton>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* Auth Modal Trigger */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-8 max-w-md w-full relative"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-6">
                <Lock className="w-10 h-10 text-purple-500 mx-auto mb-3 animate-pulse" />
                <h3 className="text-xl font-bold">{language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Login Required'}</h3>
                <p className="text-xs text-gray-400 mt-1">{getL('loginRequired')}</p>
              </div>
              <AuthFlow onSuccess={() => { setShowAuthModal(false); if (checkoutProduct) setCheckoutStep('info'); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-950/30 rounded-[2.5rem] p-6 sm:p-8 max-w-4xl w-full my-8 relative shadow-2xl"
            >
              <button
                onClick={() => setCheckoutProduct(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white rounded-full bg-black/40 border border-purple-950/30 hover:border-purple-800/50 hover:bg-zinc-900 transition-all duration-200 cursor-pointer flex items-center justify-center shadow-lg"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                {getL('checkoutTitle')}
              </h2>
              <p className="text-gray-400 text-xs border-b border-purple-950/20 pb-3 mb-5">
                {checkoutProduct.name} &bull; {checkoutDuration}
              </p>

              {/* Steps indicators */}
              <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-purple-950/20 pb-3">
                <div className={`flex items-center gap-2 pb-1.5 border-b-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  checkoutStep === 'landing' ? 'border-purple-500 text-purple-400 font-black' : 'border-transparent text-gray-500'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    checkoutStep === 'landing' ? 'bg-purple-600 text-white' : 'bg-purple-950 border border-purple-900/30 text-purple-400'
                  }`}>1</span>
                  Overview
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-650 hidden sm:block" />
                
                <div className={`flex items-center gap-2 pb-1.5 border-b-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  checkoutStep === 'info' ? 'border-purple-500 text-purple-400 font-black' : 'border-transparent text-gray-500'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    checkoutStep === 'info' ? 'bg-purple-650 text-white' : 'bg-purple-950 border border-purple-900/30 text-purple-400'
                  }`}>2</span>
                  {getL('studentInfo')}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-650 hidden sm:block" />
                
                <div className={`flex items-center gap-2 pb-1.5 border-b-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  checkoutStep === 'payment' ? 'border-purple-500 text-purple-400 font-black' : 'border-transparent text-gray-500'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    checkoutStep === 'payment' ? 'bg-purple-650 text-white' : 'bg-purple-950 border border-purple-900/30 text-purple-400'
                  }`}>3</span>
                  {getL('paymentDetails')}
                </div>
              </div>

              {/* Step 1: Landing Page Details */}
              {checkoutStep === 'landing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Hero Image & Description */}
                  <div className="space-y-4">
                    {/* Hero Image */}
                    <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden relative bg-zinc-900 border border-purple-950/20">
                      <img 
                        src={checkoutProduct.imageUrl} 
                        alt={checkoutProduct.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                      
                      {/* Floating Product Name & Badge inside image */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="px-2 py-0.5 rounded bg-purple-600 text-white text-[8px] font-black tracking-widest uppercase mb-1 inline-block">
                          {language === 'ar' ? 'ترخيص رقمي مميز' : 'PREMIUM DIGITAL LICENSE'}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                          {checkoutProduct.name}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 font-black">
                        {language === 'ar' ? 'تفاصيل المنتج' : 'Product Description'}
                      </span>
                      <p className="text-gray-300 text-xs leading-relaxed mt-1 whitespace-pre-line max-h-36 overflow-y-auto pr-1">
                        {checkoutProduct.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-950/15">
                      <div>
                        <span className="text-[8px] font-mono uppercase tracking-wider text-gray-500 font-black block">
                          {language === 'ar' ? 'نوع الحساب' : 'License Type'}
                        </span>
                        <span className="text-[11px] font-bold text-white mt-0.5 block">
                          {language === 'ar' ? 'حساب طلابي مميز رسمي' : 'Official Student Premium'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono uppercase tracking-wider text-gray-500 font-black block">
                          {language === 'ar' ? 'طريقة الاستلام' : 'Delivery Method'}
                        </span>
                        <span className="text-[11px] font-bold text-purple-400 mt-0.5 block leading-tight">
                          {language === 'ar' ? 'لوحة التحكم بعد التأكيد' : 'Student Dashboard'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Pricing & Action */}
                  <div className="space-y-4">
                    {/* Duration Selector with Triangular Arrows */}
                    <div className="p-5 bg-zinc-900/40 rounded-3xl border border-purple-950/20 space-y-4">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 font-black block mb-2 text-center sm:text-left">
                          {language === 'ar' ? 'اختر مدة الاشتراك (انقر على الأسهم للتغيير)' : 'Select Duration (Click arrows to cycle)'}
                        </span>
                        
                        {/* Left and right triangular arrows */}
                        <div className="flex items-center gap-2 max-w-sm mx-auto sm:mx-0">
                          <button
                            type="button"
                            onClick={() => {
                              const durationKeys = Object.keys(checkoutProduct.durations);
                              const currentIndex = durationKeys.indexOf(checkoutDuration);
                              if (durationKeys.length > 1) {
                                const newIndex = (currentIndex - 1 + durationKeys.length) % durationKeys.length;
                                setCheckoutDuration(durationKeys[newIndex]);
                              }
                            }}
                            className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-purple-950/30 text-purple-400 hover:text-purple-355 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                            title="Previous Duration"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="flex-1 bg-black/60 border border-purple-950/25 rounded-xl py-2 px-3 flex items-center justify-center">
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                              {checkoutDuration}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const durationKeys = Object.keys(checkoutProduct.durations);
                              const currentIndex = durationKeys.indexOf(checkoutDuration);
                              if (durationKeys.length > 1) {
                                const newIndex = (currentIndex + 1) % durationKeys.length;
                                setCheckoutDuration(durationKeys[newIndex]);
                              }
                            }}
                            className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-purple-950/30 text-purple-400 hover:text-purple-355 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                            title="Next Duration"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Price display corresponding to duration selection */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-purple-950/15 pt-4 mt-2">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold block">
                            {getL('priceLabel')}
                          </span>
                          <div className="text-2xl font-black text-purple-400 tracking-tight leading-none mt-1">
                            {formatPrice(checkoutProduct.durations[checkoutDuration])}
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-0">
                          <RainbowButton
                            type="button"
                            onClick={() => {
                              if (!user) {
                                setShowAuthModal(true);
                                return;
                              }
                              setCheckoutStep('info');
                            }}
                            className="px-5 py-3 text-xs font-black uppercase tracking-wider text-center"
                          >
                            {language === 'ar' ? 'المتابعة إلى الدفع' : 'Continue to Payment'}
                          </RainbowButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Info Form */}
              {checkoutStep === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                        {getL('fullNameLabel')}
                      </label>
                      <input 
                        type="text"
                        className="w-full bg-black border border-purple-950/30 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={getL('fullNamePlaceholder')}
                      />
                      {validationErrors.fullName && <p className="text-red-500 text-xs mt-1">{validationErrors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                        {getL('phoneLabel')}
                      </label>
                      <input 
                        type="text"
                        className="w-full bg-black border border-purple-950/30 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={getL('phonePlaceholder')}
                      />
                      {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                        {getL('emailLabel')}
                      </label>
                      <input 
                        type="email"
                        className="w-full bg-zinc-900/50 border border-purple-950/30 rounded-2xl px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
                        value={user?.email || ''}
                        disabled
                      />
                    </div>

                    <div className="pt-6 flex justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep('landing')}
                        className="px-5 py-3.5 bg-zinc-900 hover:bg-zinc-850 text-gray-300 font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {getL('backBtn')}
                      </button>

                      <button
                        onClick={handleProceedToPayment}
                        className="px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                      >
                        {getL('nextBtn')}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Receipt Upload */}
              {checkoutStep === 'payment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Payment Gateway & Instructions */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                        Select Transfer Gateway
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {currentRegion?.paymentMethods?.filter((m: any) => m.active).map((method: any) => {
                          const isSelected = selectedMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              onClick={() => setSelectedMethod(method.id)}
                              className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-950/30 border-purple-500 text-white'
                                  : 'bg-black border-purple-950/20 text-gray-400 hover:border-purple-900/40 hover:text-white'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-purple-400 bg-purple-950' : 'border-gray-700'
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                              </div>
                              <div className="truncate">
                                <div className="text-[10px] font-bold uppercase tracking-wider truncate">{method.name}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Details Box */}
                    <div className="p-4 bg-zinc-950/60 rounded-2xl border border-purple-950/20 max-h-[160px] overflow-y-auto">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {currentRegion?.paymentMethods?.find((m: any) => m.id === selectedMethod)?.name || 'Payment Details'} Instructions
                      </h4>
                      <p className="text-[11px] text-gray-400 whitespace-pre-line leading-normal">
                        {currentRegion?.paymentMethods?.find((m: any) => m.id === selectedMethod)?.instructions || 'No details provided.'}
                      </p>
                    </div>

                    {/* Drag and Drop File Input */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                        {getL('uploadReceipt')}
                      </label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('receipt-input')?.click()}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          dragOver 
                            ? 'border-purple-400 bg-purple-950/20' 
                            : receiptFile 
                              ? 'border-purple-500/50 bg-purple-950/5' 
                              : 'border-purple-950/25 hover:border-purple-900/40 bg-black/40'
                        }`}
                      >
                        <input 
                          type="file" 
                          id="receipt-input"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleReceiptFileChange(e.target.files[0]);
                            }
                          }}
                        />
                        {receiptFile ? (
                          <div className="space-y-1">
                            <CheckCircle2 className="w-6 h-6 text-purple-400 mx-auto" />
                            <p className="text-[11px] font-bold text-white">{getL('selectedFile')}</p>
                            <p className="text-[9px] text-gray-550 truncate max-w-[200px] mx-auto">{receiptFile.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Upload className="w-6 h-6 text-gray-500 mx-auto" />
                            <p className="text-[11px] font-bold text-gray-400">{getL('uploadReceipt')}</p>
                            <p className="text-[9px] text-gray-550 max-w-xs">{getL('uploadInstructions')}</p>
                          </div>
                        )}
                      </div>
                      {validationErrors.receipt && <p className="text-red-500 text-xs mt-1">{validationErrors.receipt}</p>}
                    </div>
                  </div>

                  {/* Right Column: Order Summary, Consent and Confirm */}
                  <div className="space-y-4">
                    {/* Order summary checklist */}
                    <div className="bg-purple-950/5 border border-purple-900/10 p-4 rounded-2xl space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">{getL('orderSummary')}</h4>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>{getL('productText')}</span>
                        <span className="font-bold text-white truncate max-w-[150px]">{checkoutProduct.name}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>{getL('durationText')}</span>
                        <span className="font-bold text-white">{checkoutDuration}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 border-t border-purple-950/15 pt-2">
                        <span>{getL('totalAmountText')}</span>
                        <span className="font-black text-purple-400 text-sm">{formatPrice(checkoutProduct.durations[checkoutDuration])}</span>
                      </div>
                    </div>

                    {/* Consent Checkboxes */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <input 
                          type="checkbox" 
                          id="terms-agree"
                          className="w-3.5 h-3.5 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600 mt-0.5"
                          checked={termsAgreed}
                          onChange={(e) => setTermsAgreed(e.target.checked)}
                        />
                        <label htmlFor="terms-agree" className="text-[10px] sm:text-xs text-gray-400 cursor-pointer select-none leading-tight">
                          {getL('termsAgreeText')}
                        </label>
                      </div>
                      {validationErrors.terms && <p className="text-red-500 text-xs">{validationErrors.terms}</p>}

                      <div className="flex items-start gap-2">
                        <input 
                          type="checkbox" 
                          id="policy-agree"
                          className="w-3.5 h-3.5 rounded text-purple-600 border-purple-950 bg-zinc-900 cursor-pointer accent-purple-600 mt-0.5"
                          checked={policyAgreed}
                          onChange={(e) => setPolicyAgreed(e.target.checked)}
                        />
                        <label htmlFor="policy-agree" className="text-[10px] sm:text-xs text-gray-400 cursor-pointer select-none leading-tight">
                          {getL('privacyAgreeText')}
                        </label>
                      </div>
                      {validationErrors.policy && <p className="text-red-500 text-xs">{validationErrors.policy}</p>}
                    </div>

                    {/* Navigation/Submit Buttons */}
                    <div className="pt-3 flex items-center justify-between gap-4 border-t border-purple-950/15">
                      <button
                        onClick={() => setCheckoutStep('info')}
                        className="px-4 py-3 bg-zinc-900 hover:bg-zinc-850 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {getL('backBtn')}
                      </button>

                      <RainbowButton
                        onClick={handleSubmitPurchase}
                        disabled={processing}
                        className="px-6 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{getL('submitting')}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{getL('completeBtn')}</span>
                          </>
                        )}
                      </RainbowButton>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-500/30 rounded-[2.5rem] p-8 max-w-lg w-full text-center relative shadow-2xl shadow-purple-950/40"
            >
              <div className="w-16 h-16 bg-purple-950/50 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-purple-400 animate-pulse" />
              </div>
              
              <h3 className="text-2xl font-black text-white tracking-tight mb-3">
                {getL('successTitle')}
              </h3>
              
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                {getL('successMessage')}
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer shadow-lg shadow-purple-600/25 transition-all"
              >
                {language === 'ar' ? 'تم، العودة للمتجر' : 'Got it, return to store'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
