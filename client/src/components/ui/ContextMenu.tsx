import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface Props {
  items: MenuItem[];
  children: ReactNode;
}

export default function ContextMenu({ items, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Position menu, keeping it within viewport
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16);
    setPos({ x, y });
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos]);

  return (
    <>
      <div onContextMenu={handleContext} ref={ref}>{children}</div>
      <AnimatePresence>
        {pos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[100] min-w-[180px] py-1.5 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl"
            style={{ left: pos.x, top: pos.y }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); setPos(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
                  item.danger
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                {item.icon && <span className="w-4 flex-shrink-0 opacity-60">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
