import { useState } from 'react';
import { Bell } from 'lucide-react';
import { api, unwrap } from '../api/client';

function base64ToBytes(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map(char => char.charCodeAt(0))); }

export default function PushNotificationsPrompt() {
  const [state, setState] = useState<'idle' | 'working' | 'enabled' | 'unsupported' | 'denied'>('idle');
  async function enable() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setState('unsupported'); return; }
    setState('working');
    try {
      if (await Notification.requestPermission() !== 'granted') { setState('denied'); return; }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const { publicKey } = unwrap<any>(await api.get('/notifications/public-key'));
      if (!publicKey) { setState('unsupported'); return; }
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
      await api.post('/notifications/subscriptions', subscription.toJSON()); setState('enabled');
    } catch { setState('unsupported'); }
  }
  if (state === 'enabled') return <div className="hint"><Bell size={15}/> Push notifications enabled</div>;
  if (state === 'unsupported') return <div className="hint">Push notifications are unavailable in this browser.</div>;
  if (state === 'denied') return <div className="hint">Notifications are blocked. Allow them in Chrome site settings.</div>;
  return <button className="btn btn-secondary" onClick={enable} disabled={state === 'working'}><Bell size={16}/> {state === 'working' ? 'Enabling…' : 'Enable notifications'}</button>;
}
