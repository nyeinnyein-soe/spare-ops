
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardList, 
  Package, 
  CheckCircle, 
  XCircle, 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Store,
  ArrowRightLeft,
  Sparkles,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  Users as UsersIcon,
  Trash2,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  Camera,
  Image as ImageIcon,
  Edit2,
  X,
  Search,
  Save,
  Loader2
} from 'lucide-react';
import { 
  PartType, 
  RequestRecord, 
  RequestStatus, 
  UsageRecord, 
  SPARE_PARTS, 
  User,
  AVATAR_COLORS,
  AppView
} from './types';
import { analyzeUsage } from './services/geminiService';
import { db } from './services/dbService';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('spareops_current_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [usages, setUsages] = useState<UsageRecord[]>([]);
  const [view, setView] = useState<AppView>('dashboard');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch (Simulating SQL SELECT *)
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const [u, r, usg] = await Promise.all([
        db.users.select(),
        db.requests.select(),
        db.usages.select()
      ]);
      setUsers(u);
      setRequests(r);
      setUsages(usg);
      setLoading(false);
    };
    initData();
  }, []);

  // Sync session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('spareops_current_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('spareops_current_session');
    }
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
  };

  // --- DATABASE OPERATIONS (CRUD) ---

  const handleCreateUser = async (name: string, role: 'admin' | 'sales', password: string) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name, role, password,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    };
    await db.users.insert(newUser);
    setUsers(await db.users.select());
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await db.users.update(updatedUser);
    setUsers(await db.users.select());
    if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
  };

  const handleDeleteUser = async (id: string) => {
    if (currentUser?.id === id) return alert("Cannot delete self.");
    if (confirm("Are you sure you want to delete this user? All their history will remain but they cannot login.")) {
      await db.users.delete(id);
      setUsers(await db.users.select());
    }
  };

  const handleCreateRequest = async (items: { type: PartType; quantity: number }[]) => {
    if (!currentUser) return;
    const newRequest: RequestRecord = {
      id: `req-${Date.now()}`,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      items: items.filter(i => i.quantity > 0),
      status: RequestStatus.PENDING,
      createdAt: Date.now(),
    };
    await db.requests.insert(newRequest);
    setRequests(await db.requests.select());
    setView('dashboard');
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    const req = requests.find(r => r.id === id);
    if (req) {
      const updated = { ...req, status, approvedAt: status === RequestStatus.APPROVED ? Date.now() : req.approvedAt };
      await db.requests.update(updated);
      setRequests(await db.requests.select());
    }
  };

  const handleLogUsage = async (shopName: string, partType: PartType, voucherImage?: string) => {
    if (!currentUser) return;
    const newUsage: UsageRecord = {
      id: `use-${Date.now()}`,
      shopName, partType, usedAt: Date.now(),
      salespersonId: currentUser.id,
      salespersonName: currentUser.name,
      voucherImage
    };
    await db.usages.insert(newUsage);
    setUsages(await db.usages.select());
  };

  const onHandInventory = useMemo(() => {
    if (!currentUser || currentUser.role !== 'sales') return [];
    const counts: { [key in PartType]?: number } = {};
    requests.filter(r => r.requesterId === currentUser.id && r.status === RequestStatus.RECEIVED)
            .forEach(r => r.items.forEach(i => counts[i.type] = (counts[i.type] || 0) + i.quantity));
    usages.filter(u => u.salespersonId === currentUser.id)
          .forEach(u => counts[u.partType] = (counts[u.partType] || 0) - 1);
    return Object.entries(counts).filter(([_, q]) => q! > 0).map(([t, q]) => ({ type: t as PartType, quantity: q! }));
  }, [requests, usages, currentUser]);

  if (!currentUser) return <Login users={users} onLogin={setCurrentUser} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shadow-sm shrink-0 z-30">
        <div className="flex items-center gap-2 px-2 py-4 mb-4 border-b">
          <div className="bg-indigo-600 p-2 rounded-lg text-white"><Package size={24} /></div>
          <span className="font-bold text-xl tracking-tight text-slate-800">SpareOps</span>
        </div>
        <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        {currentUser.role === 'sales' && <NavItem icon={<PlusCircle size={20}/>} label="New Request" active={view === 'form'} onClick={() => setView('form')} />}
        <NavItem icon={<History size={20}/>} label="Activity Log" active={view === 'history'} onClick={() => setView('history')} />
        {currentUser.role === 'admin' && (
          <>
            <NavItem icon={<UsersIcon size={20}/>} label="User Accounts" active={view === 'users'} onClick={() => setView('users')} />
            <NavItem icon={<FileText size={20}/>} label="Manage Reports" active={view === 'reports'} onClick={() => setView('reports')} />
            <NavItem icon={<Sparkles size={20}/>} label="AI Insights" active={view === 'insights'} onClick={() => setView('insights')} />
          </>
        )}
        <div className="mt-auto pt-4 border-t">
          <div className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 mb-2">
            <div className={`h-8 w-8 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>{currentUser.name.charAt(0)}</div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{currentUser.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-sm transition-all"><LogOut size={18} />Logout</button>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 capitalize">{view === 'users' ? 'User Management' : view === 'reports' ? 'Manage Reports' : view}</h1>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
            {currentUser.role === 'admin' ? <ShieldCheck size={16} className="text-indigo-600" /> : <UserIcon size={16} className="text-emerald-600" />}
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{currentUser.role} Mode</span>
          </div>
        </header>

        <section className="max-w-6xl mx-auto">
          {view === 'dashboard' && (
            currentUser.role === 'admin' ? 
              <AdminDashboard requests={requests} usages={usages} onApprove={(id) => handleUpdateStatus(id, RequestStatus.APPROVED)} onReject={(id) => handleUpdateStatus(id, RequestStatus.REJECTED)} /> : 
              <SalesDashboard requests={requests.filter(r => r.requesterId === currentUser.id)} onHand={onHandInventory} onMarkReceived={(id) => handleUpdateStatus(id, RequestStatus.RECEIVED)} onLogUsage={handleLogUsage} />
          )}
          {view === 'form' && <RequestForm onSubmit={handleCreateRequest} onCancel={() => setView('dashboard')} />}
          {view === 'history' && <ActivityLog requests={currentUser.role === 'admin' ? requests : requests.filter(r => r.requesterId === currentUser.id)} usages={currentUser.role === 'admin' ? usages : usages.filter(u => u.salespersonId === currentUser.id)} userRole={currentUser.role} />}
          {view === 'users' && <UserManagement users={users} onAddUser={handleCreateUser} onDeleteUser={handleDeleteUser} onUpdateUser={handleUpdateUser} />}
          {view === 'reports' && <ReportsManager requests={requests} usages={usages} setRequests={setRequests} setUsages={setUsages} />}
          {view === 'insights' && <InsightsView usages={usages} requests={requests} isAnalyzing={isAnalyzing} setIsAnalyzing={setIsAnalyzing} aiInsights={aiInsights} setAiInsights={setAiInsights} />}
        </section>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Login({ users, onLogin }: { users: User[], onLogin: (user: User) => void }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser?.password === password) onLogin(selectedUser);
    else setError('Incorrect password.');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-500/40"><Package size={32} /></div>
          <h1 className="text-3xl font-bold text-white mb-2">SpareOps</h1>
          <p className="text-slate-400 text-sm">Secure Sales Inventory</p>
        </div>

        {!selectedUser ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all">
                <div className="flex items-center gap-4 text-left">
                  <div className={`h-12 w-12 rounded-xl ${u.avatarColor} flex items-center justify-center text-white font-bold text-lg`}>{u.name.charAt(0)}</div>
                  <div><div className="text-white font-bold">{u.name}</div><div className="text-xs font-bold text-slate-500 uppercase">{u.role}</div></div>
                </div>
                <ChevronRight className="text-slate-600" size={20} />
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className={`h-10 w-10 rounded-xl ${selectedUser.avatarColor} flex items-center justify-center text-white font-bold`}>{selectedUser.name.charAt(0)}</div>
              <div className="flex-1 font-bold text-white">{selectedUser.name}</div>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white text-xs font-bold underline">Change</button>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input autoFocus type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            {error && <div className="text-rose-400 text-xs font-bold text-center">{error}</div>}
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl">Sign In</button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- REPORTS MANAGER (Full CRUD on Usage & Requests) ---

function ReportsManager({ requests, usages, setRequests, setUsages }: { requests: RequestRecord[], usages: UsageRecord[], setRequests: any, setUsages: any }) {
  const [tab, setTab] = useState<'usage' | 'request'>('usage');
  const [editingUsage, setEditingUsage] = useState<UsageRecord | null>(null);
  const [editingRequest, setEditingRequest] = useState<RequestRecord | null>(null);

  const handleDeleteUsage = async (id: string) => {
    if (confirm("Delete this usage log? This will adjust on-hand inventory.")) {
      await db.usages.delete(id);
      setUsages(await db.usages.select());
    }
  };

  const handleUpdateUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUsage) {
      await db.usages.update(editingUsage);
      setUsages(await db.usages.select());
      setEditingUsage(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm("Delete this request record permanently?")) {
      await db.requests.delete(id);
      setRequests(await db.requests.select());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit">
        <button onClick={() => setTab('usage')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'usage' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Usage Logs</button>
        <button onClick={() => setTab('request')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'request' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Requests</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">{tab === 'usage' ? 'Shop' : 'Requester'}</th>
              <th className="px-6 py-4">Item(s)</th>
              <th className="px-6 py-4">Status / Salesperson</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {tab === 'usage' ? usages.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-500">{new Date(u.usedAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{u.shopName}</td>
                <td className="px-6 py-4 text-indigo-600 font-bold">{u.partType}</td>
                <td className="px-6 py-4 font-medium">{u.salespersonName}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => setEditingUsage(u)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                  <button onClick={() => handleDeleteUsage(u.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            )) : requests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{r.requesterName}</td>
                <td className="px-6 py-4">{r.items.map(i => `${i.quantity}x ${i.type}`).join(', ')}</td>
                <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleDeleteRequest(r.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Usage Modal */}
      {editingUsage && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit Usage Entry</h2>
              <button onClick={() => setEditingUsage(null)}><X /></button>
            </div>
            <form onSubmit={handleUpdateUsage} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Shop Name</label>
                <input value={editingUsage.shopName} onChange={e => setEditingUsage({...editingUsage, shopName: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Part Type</label>
                <select value={editingUsage.partType} onChange={e => setEditingUsage({...editingUsage, partType: e.target.value as PartType})} className="w-full p-3 border rounded-xl mt-1 outline-none">
                  {SPARE_PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/>Update SQL Entry</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- USER MANAGEMENT (CRUD) ---

function UserManagement({ users, onAddUser, onDeleteUser, onUpdateUser }: { users: User[], onAddUser: any, onDeleteUser: any, onUpdateUser: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', role: 'sales' as 'admin' | 'sales', password: '' });

  const reset = () => { setFormData({ name: '', role: 'sales', password: '' }); setIsAdding(false); setEditingUser(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) onUpdateUser({...editingUser, ...formData});
    else onAddUser(formData.name, formData.role, formData.password);
    reset();
  };

  const startEdit = (u: User) => { setEditingUser(u); setFormData({ name: u.name, role: u.role, password: u.password }); setIsAdding(true); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Account Control</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
          {isAdding ? <XCircle size={18}/> : <UserPlus size={18}/>}{isAdding ? 'Cancel' : 'New User'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black uppercase text-slate-400">Full Name</label><input autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" required /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Role</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full p-3 border rounded-xl mt-1"><option value="sales">Sales</option><option value="admin">Admin</option></select></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Password</label><input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-xl mt-1 outline-none" required /></div>
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">{editingUser ? 'Update Account' : 'Create Account'}</button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y">
          {users.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl ${u.avatarColor} flex items-center justify-center text-white font-bold`}>{u.name.charAt(0)}</div>
                <div><div className="font-bold flex items-center gap-2">{u.name}{u.role === 'admin' && <ShieldCheck size={14} className="text-indigo-500" />}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{u.role}</div></div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(u)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18}/></button>
                <button onClick={() => onDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- SALES DASHBOARD (Image Upload Permission) ---

function SalesDashboard({ requests, onHand, onMarkReceived, onLogUsage }: { requests: RequestRecord[], onHand: any, onMarkReceived: any, onLogUsage: any }) {
  const approved = requests.filter(r => r.status === RequestStatus.APPROVED);
  const [shop, setShop] = useState('');
  const [part, setPart] = useState<PartType | ''>('');
  const [img, setImg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (shop && part) { onLogUsage(shop, part, img || undefined); setShop(''); setPart(''); setImg(null); }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="font-bold mb-6 flex items-center gap-2 text-slate-800"><Package className="text-emerald-500"/>Inventory On-Hand</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {onHand.length === 0 ? <div className="col-span-full py-6 text-center text-slate-400 bg-slate-50 border border-dashed rounded-xl">No items in possession.</div> : onHand.map((i: any) => (
            <div key={i.type} className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center"><div className="text-3xl font-black text-emerald-700">{i.quantity}</div><div className="text-[10px] font-black text-emerald-600 uppercase">{i.type}</div></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b bg-indigo-50/20 font-bold text-indigo-900 flex items-center gap-2"><CheckCircle size={18}/>Pickup Ready</div>
          <div className="divide-y">
            {approved.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm italic">Nothing to collect.</div> : approved.map(r => (
              <div key={r.id} className="p-6 flex justify-between items-center">
                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Approved Log</div><div className="text-xs font-bold">{r.items.map(i => `${i.quantity}x ${i.type}`).join(', ')}</div></div>
                <button onClick={() => onMarkReceived(r.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md">Mark Collected</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b bg-amber-50/20 font-bold text-amber-900 flex items-center gap-2"><Store size={18}/>Log Shop Visit</div>
          <div className="p-8 space-y-4">
            <input value={shop} onChange={e => setShop(e.target.value)} placeholder="Shop Name" className="w-full p-3 border rounded-xl outline-none" />
            <div className="flex gap-4">
              <select value={part} onChange={e => setPart(e.target.value as PartType)} className="flex-1 p-3 border rounded-xl outline-none"><option value="">Select Part...</option>{onHand.map((i: any) => <option key={i.type} value={i.type}>{i.type}</option>)}</select>
              <button onClick={() => fileInput.current?.click()} className={`px-4 py-3 rounded-xl border-2 border-dashed flex items-center gap-2 font-bold text-xs ${img ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-300 text-slate-400 hover:border-indigo-500 hover:text-indigo-600'}`}>
                {img ? <ImageIcon size={18}/> : <Camera size={18}/>}{img ? 'Attached' : 'Add Voucher'}
              </button>
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInput} onChange={handleCapture} />
            </div>
            <button disabled={!shop || !part} onClick={handleConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg disabled:opacity-20 active:scale-95 transition-all">Submit Deployment</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SHARED UI HELPERS ---

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: any }) {
  return <button onClick={onClick} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>{icon}<span className="font-semibold text-sm">{label}</span></button>;
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: any }) {
  return <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-all"><div className="p-4 bg-slate-50 rounded-2xl border">{icon}</div><div><div className="text-xs font-black text-slate-400 uppercase mb-1">{label}</div><div className="text-2xl font-black text-slate-900">{value}</div></div></div>;
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const styles = { [RequestStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-200', [RequestStatus.APPROVED]: 'bg-emerald-100 text-emerald-700 border-emerald-200', [RequestStatus.REJECTED]: 'bg-rose-100 text-rose-700 border-rose-200', [RequestStatus.RECEIVED]: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
  return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${styles[status]}`}>{status}</span>;
}

function AdminDashboard({ requests, usages, onApprove, onReject }: any) {
  const pending = requests.filter((r: any) => r.status === RequestStatus.PENDING);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard label="Pending Approval" value={pending.length.toString()} icon={<ClipboardList className="text-amber-500"/>}/><StatCard label="Total Disbursed" value={requests.filter((r: any) => r.status === RequestStatus.RECEIVED).length.toString()} icon={<CheckCircle className="text-emerald-500"/>}/><StatCard label="Live Shop Visits" value={usages.length.toString()} icon={<Store className="text-indigo-500"/>}/></div>
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-800">Pending Requests</h2><span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{pending.length} Waiting</span></div>
        <div className="divide-y">
          {pending.length === 0 ? <div className="p-16 text-center text-slate-400 font-medium italic">No pending requests.</div> : pending.map((r: any) => (
            <div key={r.id} className="p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex gap-4"><div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">{r.requesterName.charAt(0)}</div><div><h3 className="font-bold text-slate-900">{r.requesterName}</h3><p className="text-xs text-slate-500 mb-2">{new Date(r.createdAt).toLocaleString()}</p><div className="flex gap-2">{r.items.map((i: any, idx: number) => <span key={idx} className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded border">{i.quantity}x {i.type}</span>)}</div></div></div>
              <div className="flex gap-2"><button onClick={() => onApprove(r.id)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700">Approve</button><button onClick={() => onReject(r.id)} className="px-5 py-2.5 bg-white text-rose-600 border border-rose-100 rounded-xl text-sm font-bold hover:bg-rose-50">Reject</button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestForm({ onSubmit, onCancel }: any) {
  const [qtys, setQtys] = useState<{ [key in PartType]: number }>({ 'Remax Charger': 0, 'Charging Cable': 0, 'Micro Cable': 0, 'Battery': 0 });
  const has = Object.values(qtys).some(q => q > 0);
  return (
    <div className="bg-white rounded-3xl border shadow-2xl p-10 max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-black mb-8">Stock Request Form</h2>
      <div className="space-y-4 mb-10">{SPARE_PARTS.map(p => (
        <div key={p} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border group hover:bg-indigo-50/30 transition-colors">
          <div><div className="font-bold">{p}</div><div className="text-[10px] font-bold uppercase text-slate-400">Warehouse Stock</div></div>
          <div className="flex items-center gap-4"><button onClick={() => setQtys({...qtys, [p]: Math.max(0, qtys[p]-1)})} className="h-10 w-10 bg-white border rounded-xl flex items-center justify-center font-bold shadow-sm">-</button><span className="w-6 text-center font-black text-xl">{qtys[p]}</span><button onClick={() => setQtys({...qtys, [p]: qtys[p]+1})} className="h-10 w-10 bg-white border rounded-xl flex items-center justify-center font-bold shadow-sm text-indigo-600">+</button></div>
        </div>
      ))}</div>
      <div className="flex gap-4"><button onClick={() => onSubmit(Object.entries(qtys).map(([type, quantity]) => ({ type, quantity })))} disabled={!has} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl disabled:opacity-20 active:scale-95 transition-all">Submit Request</button><button onClick={onCancel} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl">Cancel</button></div>
    </div>
  );
}

function ActivityLog({ requests, usages, userRole }: any) {
  const [t, setT] = useState<'r' | 'u'>('r');
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="flex border-b"><button onClick={() => setT('r')} className={`flex-1 py-5 text-xs font-black uppercase tracking-widest ${t === 'r' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/10' : 'text-slate-400 hover:bg-slate-50'}`}>Requests</button><button onClick={() => setT('u')} className={`flex-1 py-5 text-xs font-black uppercase tracking-widest ${t === 'u' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/10' : 'text-slate-400 hover:bg-slate-50'}`}>Usages</button></div>
      <div className="p-8 space-y-4">
        {t === 'r' ? (requests.length === 0 ? <div className="p-20 text-center text-slate-300 italic">No request history.</div> : requests.map((r: any) => (
          <div key={r.id} className="p-5 bg-slate-50/50 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div><div className="font-bold text-sm mb-1">{r.requesterName}</div><div className="text-[10px] text-slate-400 font-bold mb-2">{new Date(r.createdAt).toLocaleString()}</div><div className="flex gap-1.5 flex-wrap">{r.items.map((i: any, idx: number) => <span key={idx} className="text-[10px] font-black px-2 py-0.5 bg-white border rounded-lg text-slate-600">{i.quantity}x {i.type}</span>)}</div></div><StatusBadge status={r.status} />
          </div>
        ))) : (usages.length === 0 ? <div className="p-20 text-center text-slate-300 italic">No shop deployments reported.</div> : usages.map((u: any) => (
          <div key={u.id} className="p-5 bg-slate-50/50 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-4 items-center">{u.voucherImage && <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => window.open(u.voucherImage)}><img src={u.voucherImage} className="w-full h-full object-cover"/></div>}<div><div className="font-bold text-sm mb-1">{u.shopName}</div><div className="text-[10px] text-slate-400 font-bold mb-1">{new Date(u.usedAt).toLocaleString()}</div><div className="text-xs font-black text-indigo-600 uppercase">{u.partType}</div></div></div><div className="text-right"><div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sales Rep</div><div className="text-xs font-bold text-slate-700 bg-white border px-3 py-1 rounded-full">{u.salespersonName}</div></div>
          </div>
        )))}
      </div>
    </div>
  );
}

function InsightsView({ usages, requests, isAnalyzing, setIsAnalyzing, aiInsights, setAiInsights }: any) {
  const handleAnalyze = async () => { setIsAnalyzing(true); setAiInsights(await analyzeUsage(usages, requests)); setIsAnalyzing(false); };
  return (
    <div className="bg-white rounded-3xl border p-10 shadow-sm space-y-6">
      <div className="flex items-center gap-3"><Sparkles className="text-indigo-600"/><h2 className="text-xl font-bold">Inventory Intelligence</h2></div>
      <p className="text-slate-600 leading-relaxed">Let AI analyze cross-shop consumption patterns and suggest restock levels.</p>
      {!aiInsights && !isAnalyzing && <button onClick={handleAnalyze} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95">Generate Report</button>}
      {isAnalyzing && <div className="flex items-center gap-3 text-indigo-600 animate-pulse font-black"><Loader2 className="animate-spin"/>Reading shop history...</div>}
      {aiInsights && <div className="prose prose-indigo max-w-none bg-slate-50 p-8 rounded-3xl border whitespace-pre-wrap font-medium text-slate-800 leading-relaxed shadow-inner">{aiInsights}</div>}
    </div>
  );
}
