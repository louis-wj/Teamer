import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import HomePage from '@/pages/HomePage';
import ServerPage from '@/pages/ServerPage';
import ChannelPage from '@/pages/ChannelPage';
import SettingsPage from '@/pages/SettingsPage';
import DMPage from '@/pages/DMPage';
import DiscoverPage from '@/pages/DiscoverPage';

function Auth({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuth) connectSocket();
    return () => { if (!isAuth) disconnectSocket(); };
  }, [isAuth]);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}
function Guest({ children }: { children: React.ReactNode }) {
  return useAuthStore((s) => s.isAuthenticated) ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><LoginPage /></Guest>} />
      <Route path="/register" element={<Guest><RegisterPage /></Guest>} />
      <Route path="/" element={<Auth><HomePage /></Auth>} />
      <Route path="/discover" element={<Auth><DiscoverPage /></Auth>} />
      <Route path="/servers/:serverId" element={<Auth><ServerPage /></Auth>} />
      <Route path="/servers/:serverId/channels/:channelId" element={<Auth><ChannelPage /></Auth>} />
      <Route path="/dm/:conversationId" element={<Auth><DMPage /></Auth>} />
      <Route path="/settings" element={<Auth><SettingsPage /></Auth>} />
    </Routes>
  );
}
