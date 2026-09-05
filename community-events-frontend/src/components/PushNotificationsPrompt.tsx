import { useState } from 'react';
import { Bell } from 'lucide-react';
import { api, unwrap } from '../api/client';

function base64ToBytes(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map(char => char.charCodeAt(0))); }

export default function PushNotificationsPrompt() {
  const [state, setState] = useState<'idle' | 'working' | 'enabled' | 'unsupported' | 'denied' | 'error'>('idle');
  const [error, setError] = useState('');
  async function enable() {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setState('unsupported'); return; }
    setState('working');
    setError('');
    try {
      if (await Notification.requestPermission() !== 'granted') { setState('denied'); return; }
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = unwrap<any>(await api.get('/notifications/public-key'));
      if (!publicKey) throw new Error('Push notifications are not configured on the server');
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
      await api.post('/notifications/subscriptions', subscription.toJSON()); setState('enabled');
    } catch (e: any) {
      const message = e?.response?.data?.error?.message ?? e?.message ?? 'Unable to enable notifications';
      setError(String(message)); setState('error');
    }
  }
  if (state === 'enabled') return <div className="hint"><Bell size={15}/> Push notifications enabled</div>;
  if (state === 'unsupported') return <div className="hint">Push notifications are unavailable in this browser.</div>;
  if (state === 'denied') return <div className="hint">Notifications are blocked. Allow them in Chrome site settings.</div>;
  if (state === 'error') return <div className="hint">Notification setup failed: {error}</div>;
  return <button className="btn btn-secondary" onClick={enable} disabled={state === 'working'}><Bell size={16}/> {state === 'working' ? 'Enabling…' : 'Enable notifications'}</button>;
}
