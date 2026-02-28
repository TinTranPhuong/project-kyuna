import { useLocation } from 'react-router-dom';
import { useGreeting } from '@/hooks/useGreeting';
import { useAuthStore } from '@/store/authStore';

export const Topbar = () => {
  const location = useLocation();
  const { greeting, emoji } = useGreeting();
  const user = useAuthStore(state => state.user);

  // THE FIX: Only render the greeting if we are on the main "Focus" page
  if (location.pathname !== '/') {
    return null; 
  }

  return (
    <header className="absolute top-0 left-0 w-full pt-6 px-8 flex items-center z-20 pointer-events-none">
      <h1 className="text-white/90 text-lg font-medium drop-shadow-md tracking-wide select-none">
        {greeting} {emoji} <span className="font-bold">{user?.username || 'kyuna'}</span>
      </h1>
    </header>
  );
};

export default Topbar;