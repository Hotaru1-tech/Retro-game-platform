'use client';

import { useState, useEffect } from 'react';

interface BootScreenProps {
  onComplete: () => void;
}

export default function BootScreen({ onComplete }: BootScreenProps) {
  const [phase, setPhase] = useState<'black' | 'logo' | 'loading' | 'welcome' | 'done'>('black');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase 1: Black screen
    const t1 = setTimeout(() => setPhase('logo'), 500);

    // Phase 2: Logo + loading bar
    const t2 = setTimeout(() => setPhase('loading'), 1200);

    // Phase 3: Progress bar animation
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 15 + 5;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
      }
      setProgress(Math.min(prog, 100));
    }, 200);

    // Phase 4: Welcome screen
    const t3 = setTimeout(() => {
      setPhase('welcome');
      clearInterval(interval);
    }, 3800);

    // Phase 5: Done
    const t4 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearInterval(interval);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center select-none"
      style={{ background: phase === 'welcome' ? '#5a7edc' : '#000000' }}>

      {/* Black screen */}
      {phase === 'black' && (
        <div className="text-gray-600 text-[10px] font-mono">
          BIOS Loading...
        </div>
      )}

      {/* Logo + Loading phase */}
      {(phase === 'logo' || phase === 'loading') && (
        <div className="flex flex-col items-center gap-6">
          {/* Windows XP Flag Logo (CSS) */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-[3px]">
              <div className="w-[28px] h-[28px] bg-[#f44336] rounded-tl-[8px] rounded-br-[2px] skew-x-[-5deg]" />
              <div className="w-[28px] h-[28px] bg-[#4caf50] rounded-tr-[8px] rounded-bl-[2px] skew-x-[-5deg]" />
            </div>
            <div className="flex gap-[3px] -mt-[6px]">
              <div className="w-[28px] h-[28px] bg-[#2196f3] rounded-bl-[8px] rounded-tr-[2px] skew-x-[-5deg]" />
              <div className="w-[28px] h-[28px] bg-[#ffeb3b] rounded-br-[8px] rounded-tl-[2px] skew-x-[-5deg]" />
            </div>
          </div>

          <div className="text-white font-bold text-[22px] tracking-wide" style={{ fontFamily: 'Franklin Gothic Medium, Tahoma, sans-serif' }}>
            <span className="text-white">Retro</span>
            <span className="text-[#ff8c00]">Play</span>
            <span className="text-white text-[11px] ml-1 align-super">XP</span>
          </div>

          {/* Loading bar */}
          {phase === 'loading' && (
            <div className="w-[220px] mt-2">
              <div className="h-[22px] bg-[#1a1a2e] border border-[#333] rounded-sm overflow-hidden flex items-center px-[3px]">
                <div className="h-[14px] flex gap-[2px] transition-all duration-200" style={{ width: `${progress}%` }}>
                  {Array.from({ length: Math.floor(progress / 5) }, (_, i) => (
                    <div
                      key={i}
                      className="w-[8px] h-full rounded-[1px] flex-shrink-0"
                      style={{
                        background: 'linear-gradient(to bottom, #4a90d9, #2d6bc4, #1a4fa0)',
                        animation: `xpGlow 1.5s ease-in-out ${i * 0.05}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Welcome screen */}
      {phase === 'welcome' && (
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="text-white text-[15px] font-bold" style={{ fontFamily: 'Tahoma, sans-serif' }}>
            Welcome
          </div>

          {/* Loading dots */}
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes xpGlow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
    </div>
  );
}
