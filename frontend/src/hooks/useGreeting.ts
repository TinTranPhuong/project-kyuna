import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook to generate a time-based greeting.
 * Updates automatically every minute.
 */
export function useGreeting() {
  const user = useAuthStore((state) => state.user);
  
  // Safely default to username, matching your auth.types.ts interface
  const displayName = user?.username || 'Guest';

  const getGreetingData = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return { greeting: 'Good morning', emoji: '☀️' };
    } else if (hour >= 12 && hour < 18) {
      return { greeting: 'Good afternoon', emoji: '🌤️' };
    } else if (hour >= 18 && hour < 21) {
      return { greeting: 'Good evening', emoji: '🌆' };
    } else {
      return { greeting: 'Good night', emoji: '🌙' };
    }
  };

  const [timeData, setTimeData] = useState(getGreetingData());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeData(getGreetingData());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fullGreeting = `${timeData.greeting}, ${displayName} ${timeData.emoji}`;

  return {
    greeting: timeData.greeting,
    emoji: timeData.emoji,
    fullGreeting,
  };
}

export default useGreeting;