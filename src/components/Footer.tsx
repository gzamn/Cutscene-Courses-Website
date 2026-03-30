import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Instagram, Linkedin, Music, Phone, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-purple-900/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-600 rounded-md">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
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
                <a href="https://wa.me/213558006704" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="WhatsApp">
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="Instagram">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-purple-400 transition-colors" title="TikTok">
                  <Music className="w-5 h-5" />
                </a>
              </div>
              <div className="space-y-2 text-gray-400 text-sm">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-purple-500" />
                  <span className="font-mono">+213 791 575 149</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-900 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Cutscene. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
