import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase';

export default function Navbar() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
            
            {user ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-purple-900/30">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => 
                    `flex items-center gap-2 transition-colors font-medium text-sm sm:text-base ${
                      isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </NavLink>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors font-medium text-sm sm:text-base"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) => 
                  `ml-4 px-6 py-2 bg-brand-radial rounded-xl font-bold text-sm sm:text-base transition-opacity hover:opacity-90 ${
                    isActive ? 'opacity-100' : 'opacity-80'
                  }`
                }
              >
                Login
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
