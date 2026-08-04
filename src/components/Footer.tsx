import { Link } from 'react-router-dom';
import { Mail, Instagram, Linkedin, Music, Phone, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-transparent border-t border-purple-900/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="https://i.imgur.com/GbSMeSE.png" 
                alt="Cutscene Logo" 
                className="w-8 h-8 object-cover rounded-xl"
              />
              <span className="text-lg font-bold text-white">Cutscene</span>
            </div>
            <p className="text-gray-400 max-w-sm">
              Empowering the next generation of video creators and motion designers with high-quality, 
              accessible education in modern production.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/" className="hover:text-purple-400 transition-colors">Home</Link></li>
              <li><Link to="/courses" className="hover:text-purple-400 transition-colors">Courses</Link></li>
              <li><Link to="/support" className="hover:text-purple-400 transition-colors">Support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <a href="mailto:cutscenedz@gmail.com" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="Email">
                  <Mail className="w-5 h-5" />
                </a>
                <a href="https://wa.me/213776762266" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="WhatsApp">
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/cutscene.dz/" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="Instagram">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.tiktok.com/@cutscenedz" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="TikTok">
                  <Music className="w-5 h-5" />
                </a>
              </div>
              <div className="space-y-2 text-gray-400 text-sm">
                <a href="tel:+213776762266" className="flex items-center gap-3 hover:text-purple-400 transition-colors">
                  <Phone className="w-4 h-4 text-purple-500" />
                  <span className="font-mono">+213 776 76 22 66</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-900 flex flex-col items-center gap-6 md:flex-row md:justify-between text-gray-500 text-sm">
          <div className="order-2 md:order-1 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span>© {new Date().getFullYear()} Cutscene. All rights reserved.</span>
            <span className="hidden sm:inline text-gray-800">•</span>
            <div className="flex gap-3 text-xs">
              <Link to="/terms-and-conditions" className="hover:text-purple-400 text-gray-400 transition-colors">Terms & Conditions</Link>
              <span className="text-gray-800">•</span>
              <Link to="/privacy-policy" className="hover:text-purple-400 text-gray-400 transition-colors">Privacy & Refund Policy</Link>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <Link 
              to="/support" 
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-950/25 hover:bg-purple-900/30 text-gray-300 hover:text-white font-bold text-xs sm:text-sm rounded-full border border-purple-900/40 hover:border-purple-500/50 shadow-lg shadow-purple-950/50 backdrop-blur-xs transition-all uppercase tracking-wider"
              id="footer-support-link"
            >
              Want help? Contact us.
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
