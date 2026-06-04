import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function PwaStatus() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const refreshHandler = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        window.setInterval(() => {
          if (navigator.onLine) registration.update();
        }, 60 * 60 * 1000);
      },
    });

    setUpdateSW(() => refreshHandler);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <section className="pwa-status-bar" aria-label="Offline app status">
      <div>
        <strong>{isOnline ? 'Offline-ready app' : 'Offline mode'}</strong>
        <span>
          {isOnline
            ? 'Load once online, then use this studio from your iPad Home Screen during meetings.'
            : 'You are offline. Cached pages and local client files remain available.'}
        </span>
      </div>
      <div className="pwa-status-actions">
        {offlineReady && <span className="pwa-pill">Saved for offline use</span>}
        {needRefresh && (
          <button className="ghost-button pwa-update-button" type="button" onClick={() => updateSW?.(true)}>
            New version available. Reload to update.
          </button>
        )}
        <button className="ghost-button pwa-help-button" type="button" onClick={() => setShowInstallHelp((current) => !current)}>
          iPad install steps
        </button>
      </div>
      {showInstallHelp && (
        <div className="pwa-install-help">
          <h2>How to install on iPad</h2>
          <ol>
            <li>Open the website in Safari.</li>
            <li>Tap Share.</li>
            <li>Tap Add to Home Screen.</li>
            <li>Tap Add.</li>
            <li>Open the app from the Home Screen.</li>
          </ol>
        </div>
      )}
    </section>
  );
}
