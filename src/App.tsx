import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import CutsceneAI from './pages/CutsceneAI';
import Profile from './pages/Profile';
import StudioPage from './pages/Studio';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 selection:text-purple-200 relative">
          {/* Global Background Gradients */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-900/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-purple-600/5 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/support" element={<Support />} />
                <Route path="/login" element={<Login />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/ai" element={<ProtectedRoute><CutsceneAI /></ProtectedRoute>} />
                <Route path="/courses/:id/video/:chapter/:type" element={<VideoPlayer />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/studio/*" element={<StudioPage />} />
                {/* Catch-all route to redirect back to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </div>
      </Router>
    </AuthProvider>
  </LanguageProvider>
  );
}

export default App;
