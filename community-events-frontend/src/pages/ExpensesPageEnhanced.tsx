import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, WalletCards } from 'lucide-react';
import { format } from 'date-fns';
import { api, errorMessage, unwrap } from '../api/client';
import { Card, PageHeader, Spinner, Stat } from '../components/Ui';

type Expense = { id: string; eventId: string; categoryId?: string; description: string; vendorName?: string; amount: number | string; expenseDate: string; event: any; category?: any };

export default function ExpensesPageEnhanced() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/expenses').then(unwrap<Expense[]>) });
  const events = useQuery({ queryKey: ['events'], queryFn: () => api.get('/events').then(unwrap<any[]>) });
  const cats = useQuery({ queryKey: ['expense-categories'], queryFn: () => api.get('/masters/expense-categories').then(unwrap<any[]>) });
  if (expenses.isLoading || events.isLoading || cats.isLoading) return <Spinner />;
  const rows = expenses.data ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const refresh = () => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); };
  return <>
    <PageHeader title="Expenses" subtitle="Festival spending is tracked separately from contribution receipts." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={17} />Record expense</button>} />
    <div className="stats-grid three"><Stat label="Total recorded" value={`₹${total.toLocaleString('en-IN')}`} /><Stat label="Expense entries" value={rows.length} /><Stat label="Categories" value={cats.data?.length ?? 0} /></div>
    <Card><div className="table-wrap"><table><thead><tr><th>Date</th><th>Event</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th><th>Action</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td>{format(new Date(row.expenseDate), 'dd MMM yyyy')}</td><td>{row.event.name}</td><td>{row.category?.name ?? 'Other'}</td><td>{row.description}</td><td>{row.vendorName ?? '—'}</td><td><strong>₹{Number(row.amount).toLocaleString('en-IN')}</strong></td><td><div className="row-actions"><button className="btn btn-secondary" onClick={() => setEditing(row)}><Pencil size={14} />Edit</button><button className="btn btn-ghost" onClick={() => setDeleting(row)}><Trash2 size={14} />Delete</button></div></td></tr>)}
    </tbody></table></div></Card>
    {(open || editing) && <ExpenseModal expense={editing} events={events.data ?? []} cats={cats.data ?? []} onClose={() => { setOpen(false); setEditing(null); }} onSaved={refresh} />}
    {deleting && <DeleteExpenseModal expense={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); }} />}
  </>;
}

function ExpenseModal({ expense, events, cats, onClose, onSaved }: { expense: Expense | null; events: any[]; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState({ eventId: expense?.eventId ?? events[0]?.id ?? '', categoryId: expense?.categoryId ?? cats[0]?.id ?? '', description: expense?.description ?? '', vendorName: expense?.vendorName ?? '', amount: Number(expense?.amount ?? 0), expenseDate: expense ? new Date(expense.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: async (): Promise<any> => expense ? api.patch(`/expenses/${expense.id}`, { categoryId: value.categoryId, description: value.description, vendorName: value.vendorName, amount: value.amount, expenseDate: value.expenseDate }) : api.post('/expenses', value), onSuccess: onSaved, onError: error => setError(errorMessage(error)) });
  return <div className="modal-backdrop" onClick={onClose}><div className="modal modal-wide" onClick={event => event.stopPropagation()}><div className="modal-icon"><WalletCards /></div><h3>{expense ? 'Edit expense' : 'Record expense'}</h3><div className="form-grid">
    <label>Event<select value={value.eventId} disabled={!!expense} onChange={event => setValue({ ...value, eventId: event.target.value })}>{events.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label>Category<select value={value.categoryId} onChange={event => setValue({ ...value, categoryId: event.target.value })}>{cats.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label>Description<input value={value.description} onChange={event => setValue({ ...value, description: event.target.value })} /></label><label>Vendor<input value={value.vendorName} onChange={event => setValue({ ...value, vendorName: event.target.value })} /></label><label>Amount<input type="number" value={value.amount} onChange={event => setValue({ ...value, amount: Number(event.target.value) })} /></label><label>Date<input type="date" value={value.expenseDate} onChange={event => setValue({ ...value, expenseDate: event.target.value })} /></label>
  </div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{expense ? 'Save changes' : 'Save expense'}</button></div></div></div>;
}

function DeleteExpenseModal({ expense, onClose, onDeleted }: { expense: Expense; onClose: () => void; onDeleted: () => void }) {
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: () => api.delete(`/expenses/${expense.id}`), onSuccess: onDeleted, onError: error => setError(errorMessage(error)) });
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-icon"><Trash2 /></div><h3>Delete expense?</h3><p>This will permanently remove <strong>{expense.description}</strong> and its recorded amount. This action cannot be undone.</p>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Delete expense</button></div></div></div>;
}
