import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FirefliesCounter() {
  const [count, setCount] = useState<number>(1);
  const [isVisible, setIsVisible] = useState(false);

  // Ping the server to register this visitor
  useEffect(() => {
    const pingServer = async () => {
      try {
        await fetch('/api/fireflies/ping', { 
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page: window.location.pathname,
            referrer: document.referrer || undefined
          })
        });
      } catch (error) {
        console.error('Failed to ping fireflies:', error);
      }
    };

    // Initial ping
    pingServer();

    // Ping every 5 minutes to stay active
    const pingInterval = setInterval(pingServer, 5 * 60 * 1000);
    
    // Also ping when the page changes (for single-page app navigation)
    const handleLocationChange = () => pingServer();
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Fetch the count regularly
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/fireflies/count');
        const data = await response.json();
        if (data.ok && typeof data.count === 'number') {
          setCount(data.count);
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Failed to fetch fireflies count:', error);
      }
    };

    // Initial fetch
    fetchCount();

    // Update every 30 seconds
    const interval = setInterval(fetchCount, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md rounded-full px-3 py-2 sm:px-4 sm:py-2.5 border border-copper-500/20"
      data-testid="fireflies-counter"
    >
      {/* Glowing Orb */}
      <div className="relative">
        {/* Outer glow animation */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-copper-500 blur-md"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Middle glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-copper-400 blur-sm"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        />
        
        {/* Core orb */}
        <motion.div
          className="relative w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-amber-300 to-copper-400"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4
          }}
        >
          {/* Inner bright spot */}
          <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-white/80" />
        </motion.div>
      </div>

      {/* Count Display */}
      <div className="flex items-baseline gap-1 sm:gap-1.5">
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-base sm:text-lg font-bold text-copper-400"
            data-testid="fireflies-count"
          >
            {count}
          </motion.span>
        </AnimatePresence>
        <span className="text-xs sm:text-sm text-copper-400/80">
          <span className="hidden sm:inline">{count === 1 ? 'firefly' : 'fireflies'} here now</span>
          <span className="sm:hidden">{count === 1 ? 'firefly' : 'fireflies'}</span>
        </span>
      </div>

      {/* Subtle sparkles animation */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-400/60"
          style={{
            top: `${20 + i * 25}%`,
            left: `${10 + i * 30}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );
}