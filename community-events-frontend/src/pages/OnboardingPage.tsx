import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api, errorMessage, unwrap } from '../api/client';
import { Card, PageHeader } from '../components/Ui';

export default function OnboardingPage() {
  const [form, setForm] = useState({ name: '', code: '', blockName: 'Block A', blockCode: 'A', flatCount: '10', firstFlat: '101' });
  const [message, setMessage] = useState('');
  const create = useMutation({ mutationFn: () => api.post('/onboarding/community', { ...form, flatCount: Number(form.flatCount), firstFlat: Number(form.firstFlat) }).then(unwrap<any>), onSuccess: (d) => setMessage(`${d.community.name} created with ${d.flatCount} flats. Community code: ${d.community.code}`), onError: (e) => setMessage(errorMessage(e)) });
  return <><PageHeader title="Community onboarding" subtitle="Create a new apartment community and its initial flats from the admin portal." /><Card className="onboarding-card"><div className="modal-icon"><Building2 /></div><h2>New community</h2><p className="section-copy">This creates the community, one block, and flats. No seed data is used.</p><div className="form-grid"><label>Community name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="SAI NILAYAM" /></label><label>Community code<input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="SAINILAYAM" /></label><label>Block name<input value={form.blockName} onChange={e=>setForm({...form,blockName:e.target.value})} /></label><label>Block code<input value={form.blockCode} onChange={e=>setForm({...form,blockCode:e.target.value.toUpperCase()})} /></label><label>Number of flats<input type="number" min="1" max="500" value={form.flatCount} onChange={e=>setForm({...form,flatCount:e.target.value})} /></label><label>First flat number<input type="number" min="1" value={form.firstFlat} onChange={e=>setForm({...form,firstFlat:e.target.value})} /></label></div>{message&&<div className={message.includes('created')?'notice':'form-error'}>{message}</div>}<button className="btn btn-primary" onClick={()=>{setMessage('');create.mutate()}} disabled={create.isPending||!form.name||!form.code}>{create.isPending?'Creating…':'Create community'}</button></Card></>;
}
