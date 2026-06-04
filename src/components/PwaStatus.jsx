import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function PwaStatus() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    const refreshHandler = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        window.setInterval(() => {
          if (navigator.onLine) registration.update();
        }, 60 * 60 * 1000);
      },
    });

    setUpdateSW(() => refreshHandler);
  }, []);

  if (!needRefresh) return null;

  return (
    <section className="pwa-update-notice" aria-label="App update available">
      <div>
        <strong>New version available</strong>
        <span>Reload to update the app.</span>
      </div>
      <div>
        <button className="ghost-button pwa-update-button" type="button" onClick={() => updateSW?.(true)}>
          Reload to update
        </button>
      </div>
    </section>
  );
}
