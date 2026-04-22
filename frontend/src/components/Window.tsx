'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { useWindowStore, WindowState } from '@/stores/window.store';
import { cn } from '@/lib/utils';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
}

export default function Window({ window: win, children }: WindowProps) {
  const { closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow, updatePosition } = useWindowStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-button')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - win.position.x,
      y: e.clientY - win.position.y,
    };
    focusWindow(win.id);
  }, [win.position, win.id, focusWindow]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(win.id, {
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, win.id, updatePosition]);

  if (win.isMinimized) return null;

  const style = win.isMaximized
    ? { top: 0, left: 0, width: '100vw', height: 'calc(100vh - 40px)', zIndex: win.zIndex }
    : { top: win.position.y, left: win.position.x, width: win.size.width, height: win.size.height, zIndex: win.zIndex };

  return (
    <div
      ref={windowRef}
      className={cn(
        'absolute bg-retro-window flex flex-col',
        'border-t-[2px] border-l-[2px] border-white',
        'border-b-[2px] border-r-[2px] border-black',
        isDragging && 'cursor-grabbing'
      )}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* Shadow borders */}
      <div className="absolute inset-[1px] border-t border-l border-[#dfdfdf] border-b border-r border-b-[#808080] border-r-[#808080] pointer-events-none" />

      {/* Title bar */}
      <div
        className={cn(
          'retro-title-bar flex-shrink-0 cursor-grab px-[3px] py-[2px]',
          !win.isFocused && 'inactive'
        )}
        onMouseDown={handleMouseDown}
      >
        <span className="text-[11px] font-bold truncate mr-2 select-none">
          {win.title}
        </span>
        <div className="flex gap-[2px] flex-shrink-0">
          <button
            className="window-button retro-window-button"
            onClick={() => minimizeWindow(win.id)}
            title="Minimize"
          >
            <Minus size={8} />
          </button>
          <button
            className="window-button retro-window-button"
            onClick={() => win.isMaximized ? restoreWindow(win.id) : maximizeWindow(win.id)}
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square size={7} />
          </button>
          <button
            className="window-button retro-window-button"
            onClick={() => closeWindow(win.id)}
            title="Close"
          >
            <X size={9} />
          </button>
        </div>
      </div>

      {/* Window content */}
      <div className="flex-1 overflow-auto p-[2px]">
        {children}
      </div>
    </div>
  );
}
