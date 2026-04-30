import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const AfricanFlagCodes = [
  'sn', 'za', 'ng', 'ma', 'ke', 'eg', 'gh', 'dz', 'ci', 'et', 
  'ml', 'gn', 'cd', 'ao', 'mz', 'tz', 'cm', 'ga', 'bj', 'tg'
];

export const AfricaIntro = ({ onComplete }: { onComplete: () => void }) => {
  const [showContent, setShowContent] = useState(false);
  const [orbitRadius, setOrbitRadius] = useState(250);

  useEffect(() => {
    const updateRadius = () => {
      setOrbitRadius(window.innerWidth < 640 ? 140 : 250);
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);

    const startTimer = setTimeout(() => setShowContent(true), 50);
    const completeTimer = setTimeout(() => onComplete(), 1250);

    return () => {
      window.removeEventListener('resize', updateRadius);
      clearTimeout(startTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[9999] bg-[#f8fafc] flex items-center justify-center overflow-hidden p-4"
    >
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
        backgroundSize: 'clamp(40px, 10vw, 80px) clamp(40px, 10vw, 80px)'
      }} />

      <div className="relative flex items-center justify-center scale-[0.8] sm:scale-100">
        {/* Orbital Flags Crown - Faster Rotation */}
        <AnimatePresence>
          {showContent && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute w-[300px] h-[300px] sm:w-[540px] sm:h-[540px] pointer-events-none"
            >
              {AfricanFlagCodes.slice(0, 16).map((flag, i) => {
                const angle = (i * 360) / 16;
                return (
                  <motion.div
                    key={`orb-${flag}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 0.9, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-${orbitRadius}px) rotate(-${angle}deg)`
                    }}
                  >
                    <img 
                      src={`https://flagcdn.com/w80/${flag}.png`} 
                      alt=""
                      className="w-8 sm:w-12 h-auto rounded-sm border border-slate-200 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Title - High Contrast for White/Grey Theme */}
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center z-10"
            >
              <div className="relative px-8 py-6 sm:px-12 sm:py-8 bg-white/50 backdrop-blur-sm rounded-full">
                <h1 className="text-3xl sm:text-6xl md:text-8xl font-extrabold text-slate-900 tracking-tighter uppercase relative">
                  AFRICAN <span className="text-blue-600">GEODESY</span>
                </h1>
                <p className="text-[10px] sm:text-sm font-bold text-blue-500 tracking-[0.2em] mt-1 uppercase">Interactive Dashboard</p>
                
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.4, duration: 1 }}
                  className="h-[2px] sm:h-[4px] bg-slate-900 mt-2 mx-auto"
                />
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.8 }}
                  className="mt-4 sm:mt-6 text-slate-600 font-mono tracking-[0.3em] sm:tracking-[0.5em] text-[8px] sm:text-[11px] uppercase font-bold"
                >
                  Scientific Unity • Precise Measurement
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Authors Information (Bottom Left) - Refined for Light Theme */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 left-6 sm:bottom-12 sm:left-12 text-left border-l-[2px] sm:border-l-[4px] border-blue-600 pl-4 sm:pl-8 max-w-[calc(100%-3rem)]"
      >
        <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2 sm:mb-4 font-mono font-bold">DÉVELOPPÉ PAR :</p>
        <div className="space-y-0.5 sm:space-y-1 mb-3 sm:mb-6">
          <p className="text-sm sm:text-2xl font-black text-slate-900 uppercase leading-tight">Wonbleon Brice Emery PLEI</p>
          <p className="text-sm sm:text-2xl font-black text-slate-900 uppercase leading-tight">El Hadji Abdoul Aziz SALL</p>
        </div>
        <div className="h-[1px] w-12 sm:w-20 bg-slate-200 mb-2 sm:mb-4" />
        <p className="text-[8px] sm:text-[12px] text-slate-800 font-black uppercase tracking-tight">CIVIL ENGINEERING DEPARTMENT (UFR-SI)</p>
        <p className="text-[8px] sm:text-[12px] text-slate-500 font-bold uppercase tracking-widest leading-tight">UNIVERSITY IBA DER THIAM OF THIES (UIDT)</p>
      </motion.div>

      {/* Version Info (Bottom Right) */}
      <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 text-slate-300 text-[8px] sm:text-[10px] font-mono tracking-[0.3em] sm:tracking-[0.5em] uppercase hidden sm:block" style={{ writingMode: 'vertical-lr' }}>
        GEODETIC CONTROL SYSTEM V2.5
      </div>
    </motion.div>
  );
};
