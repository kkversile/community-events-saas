import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';

export default function ChangePasswordPage(){
  const {changePassword,isAdmin}=useAuth();
  const nav=useNavigate();
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function submit(e:any){
    e.preventDefault(); setError('');
    if(password.length<8)return setError('Use at least 8 characters.');
    if(password!==confirm)return setError('Passwords do not match.');
    setLoading(true);
    try{await changePassword(password);nav(isAdmin?'/admin/dashboard':'/app/dashboard');}
    catch(e){setError(errorMessage(e));}
    finally{setLoading(false);}
  }
  return <div className="login-page"><div className="login-panel"><div className="login-logo"><LockKeyhole size={22}/></div><h1>Set your password</h1><p>Your temporary password worked. Create a private password before continuing.</p><form onSubmit={submit}><label>New password<div className="input-icon"><LockKeyhole size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></div></label><label>Confirm password<div className="input-icon"><LockKeyhole size={18}/><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></label>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary btn-block" disabled={loading}>{loading?'Saving…':'Save password'}</button></form></div></div>
}
