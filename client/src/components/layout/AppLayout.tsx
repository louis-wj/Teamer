import { ReactNode, useEffect } from 'react';
import ServerSidebar from '@/components/navigation/ServerSidebar';
import { useThemeStore } from '@/stores/theme.store';

interface Props { children: ReactNode; serverContent?: ReactNode; }

export default function AppLayout({ children, serverContent }: Props) {
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const applyTheme = useThemeStore((s) => s.applyTheme);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme, applyTheme]);

  return (
    <div className="h-screen flex overflow-hidden bg-background relative selection:bg-discord-blurple/30 font-sans antialiased text-[#DBDEE1]">
      {/* Dynamic Background Layout */}
      {activeTheme?.backgroundImage && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transition-opacity duration-500"
          style={{ 
            backgroundImage: `url(${activeTheme.backgroundImage})`,
            opacity: activeTheme.backgroundOpacity ?? 0.3,
            filter: `blur(${activeTheme.backgroundBlur ?? 0}px)`
          }}
        />
      )}

      <div className="relative z-10 flex w-full h-full">
        {/* Server List (72px) */}
        <ServerSidebar />
        
        {/* Channel Sidebar (240px) */}
        {serverContent && (
          <div className="w-[240px] flex-shrink-0 flex flex-col z-20">
            {serverContent}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-discord-dark-3">
          {children}
        </main>
      </div>
    </div>
  );
}

