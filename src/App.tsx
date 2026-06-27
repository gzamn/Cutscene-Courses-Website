import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Support from './pages/Support';
import Login from './pages/Login';
import Payment from './pages/Payment';
import VideoPlayer from './pages/VideoPlayer';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminPanel from './pages/Admin';
import StudentWork from './pages/StudentWork';
import Store from './pages/Store';
import Resources from './pages/Resources';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CompleteOrder from './pages/CompleteOrder';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { RegionProvider } from './context/RegionContext';
import { ToastProvider } from './context/ToastContext';
import { useEffect } from 'react';
import { runOneTimeMigration } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0D0B1E] flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0D0B1E] flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile || userProfile.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: [0.21, 1.02, 0.43, 1.01] }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/store" element={<Store />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/student-work" element={<StudentWork />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/support" element={<Support />} />
          <Route path="/login" element={<Login />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/courses/:id/video/:chapter/:type" element={<VideoPlayer />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/complete-order" element={<CompleteOrder />} />
          {/* Catch-all route to redirect back to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    runOneTimeMigration();
  }, []);

  return (
    <LanguageProvider>
      <RegionProvider>
        <ToastProvider>
          <AuthProvider>
            <Router>
            <ScrollToTop />
            <div className="min-h-screen text-white selection:bg-purple-500/30 selection:text-purple-200 relative">
              {/* Global Background Gradients */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-900/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-purple-600/5 rounded-full blur-[120px]" />
                
                {/* Custom Background Stars/Dust Particles */}
                <div className="bg-animation">
                  <div id="stars" />
                  <div id="stars2" />
                  <div id="stars3" />
                  <div id="stars4" />
                </div>
              </div>

              <div className="relative z-10">
                <Navbar />
                <main>
                  <AnimatedRoutes />
                </main>
                <Footer />
              </div>
            </div>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </RegionProvider>
  </LanguageProvider>
  );
}

export default App;
