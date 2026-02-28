import { useState, useEffect } from 'react';

export const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center drop-shadow-2xl text-white select-none">
      <h1 className="text-[8rem] md:text-[12rem] font-bold font-display leading-none tracking-tighter">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
      </h1>
      <p className="text-xl md:text-2xl font-medium tracking-widest uppercase opacity-80 mt-2">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
};

export default DigitalClock;