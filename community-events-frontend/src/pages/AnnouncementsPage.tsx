import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { api, errorMessage, unwrap } from '../api/client';
import { Badge, Card, Empty, PageHeader, Spinner } from '../components/Ui';

export default function AnnouncementsPage(){
  const qc=useQueryClient(); const [open,setOpen]=useState(false);
  const q=useQuery({queryKey:['announcements'],queryFn:()=>api.get('/announcements').then(unwrap<any[]>)});
  const events=useQuery({queryKey:['events'],queryFn:()=>api.get('/events').then(unwrap<any[]>)});
  if(q.isLoading||events.isLoading)return <Spinner/>;
  return <><PageHeader title="Announcements" subtitle="Publish structured notices while WhatsApp remains the share channel." action={<button className="btn btn-primary" onClick={()=>setOpen(true)}><Plus size={17}/>New announcement</button>}/><div className="stack">{q.data?.length?q.data.map((a:any)=><Card key={a.id}><div className="announcement admin-announcement"><Megaphone size={20}/><div><div className="announcement-title"><strong>{a.title}</strong>{a.isImportant&&<Badge tone="warning">Important</Badge>}</div><p>{a.message}</p><span>{a.publishedAt?format(new Date(a.publishedAt),'dd MMM yyyy, hh:mm a'):'Draft'}</span></div></div></Card>):<Empty title="No announcements"/>}</div>{open&&<AnnouncementModal events={events.data??[]} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);qc.invalidateQueries({queryKey:['announcements']})}}/>}</>;
}

function AnnouncementModal({events,onClose,onSaved}:{events:any[];onClose:()=>void;onSaved:()=>void}){
  const [v,setV]=useState({eventId:'',title:'',message:'',isImportant:false}),[error,setError]=useState('');
  const m=useMutation({mutationFn:()=>api.post('/announcements',{...v,eventId:v.eventId||undefined}).then(unwrap<any>),onSuccess:onSaved,onError:e=>setError(errorMessage(e))});
  return <div className="modal-backdrop" onClick={onClose}><div className="modal modal-wide" onClick={e=>e.stopPropagation()}><div className="modal-icon"><Megaphone/></div><h3>Publish announcement</h3><label>Related event (optional)<select value={v.eventId} onChange={e=>setV({...v,eventId:e.target.value})}><option value="">General community notice</option>{events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label>Title<input value={v.title} onChange={e=>setV({...v,title:e.target.value})}/></label><label>Message<textarea value={v.message} onChange={e=>setV({...v,message:e.target.value})}/></label><label className="checkbox-line"><input type="checkbox" checked={v.isImportant} onChange={e=>setV({...v,isImportant:e.target.checked})}/>Mark as important</label>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>m.mutate()} disabled={m.isPending}>Publish</button></div></div></div>;
}
