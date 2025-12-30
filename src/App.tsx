
import React, { useState, useEffect } from 'react';
import LockScreen from './components/LockScreen';
import Dashboard from './components/Dashboard';
import { invoke } from '@tauri-apps/api/core';

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleUnlock = async (password: string) => {
    setIsAuthenticating(true);
    setAuthError(false);

    try {
      // Authenticate against system PAM
      const authenticated = await invoke<boolean>('authenticate', { password });

      if (authenticated) {
        setIsUnlocked(true);
        setAuthError(false);

        // Activate shield (disables monitoring while user session is active)
        await invoke('activate_shield');

        // Persist state during session (cleared on refresh for security)
        sessionStorage.setItem('ficha_auth', 'true');
      } else {
        setAuthError(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLock = async () => {
    try {
      // Lock shield (re-enables monitoring)
      await invoke('lock_shield');
    } catch (error) {
      console.error('Error locking shield:', error);
    }

    setIsUnlocked(false);
    sessionStorage.removeItem('ficha_auth');
  };

  useEffect(() => {
    const auth = sessionStorage.getItem('ficha_auth');
    if (auth === 'true') {
      setIsUnlocked(true);
      // Re-activate shield on reload
      invoke('activate_shield').catch(console.error);
    }
  }, []);

  return (
    <div className="antialiased select-none">
      {isUnlocked ? (
        <Dashboard onLock={handleLock} />
      ) : (
        <LockScreen
          onUnlock={handleUnlock}
          isError={authError}
          isLoading={isAuthenticating}
        />
      )}
    </div>
  );
};

export default App;
