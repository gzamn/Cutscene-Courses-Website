import { Link, NavLink } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function Navbar() {
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Courses', path: '/courses' },
    { name: 'Contact', path: '/support' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-purple-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center py-3 gap-2">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="p-1.5 bg-brand-radial rounded-lg group-hover:opacity-90 transition-opacity">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-brand-gradient">
              Cutscene
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => 
                  `transition-colors font-medium whitespace-nowrap text-sm sm:text-base ${
                    isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
