'use client';

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    async function initializeApp() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.authenticated) {
          window.location.href = '/login';
          return;
        }

        const shellResponse = await fetch('/app-shell.html');
        const shellHtml = await shellResponse.text();

        const root = document.getElementById('app-root');
        if (root) {
          root.innerHTML = shellHtml;
        } else {
          console.error('app-root element not found');
          return;
        }

        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/client/main.js';
        script.onerror = (e) => console.error('Failed to load client/main.js', e);
        document.body.appendChild(script);
      } catch (err) {
        console.error('Initialization failed:', err);
      }
    }

    initializeApp();
  }, []);

  return <div id="app-root" style={{ minHeight: '100vh' }}></div>;
}
