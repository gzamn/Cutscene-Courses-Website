import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Support from './pages/Support';
import Login from './pages/Login';
import Payment from './pages/Payment';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 selection:text-purple-200">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/support" element={<Support />} />
            <Route path="/login" element={<Login />} />
            <Route path="/payment" element={<Payment />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
