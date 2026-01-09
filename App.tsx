
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
  Download,
  Search,
  Filter
} from 'lucide-react';
import { 
  PartType, 
  RequestRecord, 
  RequestStatus, 
  UsageRecord, 
  SPARE_PARTS, 
  User,
  INITIAL_USERS,
  AVATAR_COLORS,
  AppView
} from './types';
import { analyzeUsage } from './services/geminiService';

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('spareops_users_list');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('spareops_user');
    const user = saved ? JSON.parse(saved) : null;
    if (user && !users.find(u => u.id === user.id)) return null;
    return user;
  });

  const [requests, setRequests] = useState<RequestRecord[]>(() => {
    const saved = localStorage.getItem('spare_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [usages, setUsages] = useState<UsageRecord[]>(() => {
    const saved = localStorage.getItem('spare_usages');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<AppView>('dashboard');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('spareops_users_list', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('spareops_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('spare_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('spare_usages', JSON.stringify(usages));
  }, [usages]);

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
  };

  const handleCreateUser = (name: string, role: 'admin' | 'sales', password: string) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      role,
      password,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (currentUser?.id === id) {
      alert("You cannot delete your own account.");
      return;
    }
    setUsers(users.filter(u => u.id !== id));
  };

  const handleCreateRequest = (items: { type: PartType; quantity: number }[]) => {
    if (!currentUser) return;
    const newRequest: RequestRecord = {
      id: `req-${Date.now()}`,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      items: items.filter(i => i.quantity > 0),
      status: RequestStatus.PENDING,
      createdAt: Date.now(),
    };
    setRequests([newRequest, ...requests]);
    setView('dashboard');
  };

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: RequestStatus.APPROVED, approvedAt: Date.now() } : r));
  };

  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: RequestStatus.REJECTED } : r));
  };

  const handleMarkReceived = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: RequestStatus.RECEIVED } : r));
  };

  const handleLogUsage = (shopName: string, partType: PartType, voucherImage?: string) => {
    if (!currentUser) return;
    const newUsage: UsageRecord = {
      id: `use-${Date.now()}`,
      shopName,
      partType,
      usedAt: Date.now(),
      salespersonId: currentUser.id,
      salespersonName: currentUser.name,
      voucherImage
    };
    setUsages([newUsage, ...usages]);
  };

  const triggerAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeUsage(usages, requests);
    setAiInsights(result);
    setIsAnalyzing(false);
  };

  const onHandInventory = useMemo(() => {
    if (!currentUser || currentUser.role !== 'sales') return [];
    const receivedItems: { [key in PartType]?: number } = {};
    
    requests
      .filter(r => r.requesterId === currentUser.id && r.status === RequestStatus.RECEIVED)
      .forEach(r => {
        r.items.forEach(item => {
          receivedItems[item.type] = (receivedItems[item.type] || 0) + item.quantity;
        });
      });

    usages
      .filter(u => u.salespersonId === currentUser.id)
      .forEach(u => {
        receivedItems[u.partType] = (receivedItems[u.partType] || 0) - 1;
      });

    return Object.entries(receivedItems)
      .filter(([_, qty]) => qty! > 0)
      .map(([type, qty]) => ({ type: type as PartType, quantity: qty! }));
  }, [requests, usages, currentUser]);

  if (!currentUser) {
    return <Login users={users} onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-2 px-2 py-4 mb-4 border-b">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Package size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">SpareOps</span>
        </div>

        <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        
        {currentUser.role === 'sales' && (
          <NavItem icon={<PlusCircle size={20}/>} label="New Request" active={view === 'form'} onClick={() => setView('form')} />
        )}
        
        <NavItem icon={<History size={20}/>} label="Activity Log" active={view === 'history'} onClick={() => setView('history')} />
        
        {currentUser.role === 'admin' && (
          <>
            <NavItem icon={<UsersIcon size={20}/>} label="User Management" active={view === 'users'} onClick={() => setView('users')} />
            <NavItem icon={<FileText size={20}/>} label="Reports" active={view === 'reports'} onClick={() => setView('reports')} />
            <NavItem icon={<Sparkles size={20}/>} label="AI Insights" active={view === 'insights'} onClick={() => setView('insights')} />
          </>
        )}

        <div className="mt-auto pt-4 border-t flex flex-col gap-2">
          <div className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-100 mb-2">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{currentUser.role}</div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-sm transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">
              {view === 'users' ? 'User Management' : view === 'reports' ? 'Inventory Reports' : view}
            </h1>
            <p className="text-slate-500 text-sm">Welcome back, {currentUser.name}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
            {currentUser.role === 'admin' ? <ShieldCheck size={16} className="text-indigo-600" /> : <UserIcon size={16} className="text-emerald-600" />}
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{currentUser.role} Access</span>
          </div>
        </header>

        <section className="max-w-6xl mx-auto">
          {view === 'dashboard' && (
            <div className="space-y-8">
              {currentUser.role === 'admin' ? (
                <AdminDashboard requests={requests} usages={usages} onApprove={handleApprove} onReject={handleReject} />
              ) : (
                <SalesDashboard 
                  requests={requests.filter(r => r.requesterId === currentUser.id)} 
                  onHand={onHandInventory}
                  onMarkReceived={handleMarkReceived}
                  onLogUsage={handleLogUsage}
                />
              )}
            </div>
          )}

          {view === 'form' && <RequestForm onSubmit={handleCreateRequest} onCancel={() => setView('dashboard')} />}
          
          {view === 'history' && (
            <ActivityLog 
              requests={currentUser.role === 'admin' ? requests : requests.filter(r => r.requesterId === currentUser.id)} 
              usages={currentUser.role === 'admin' ? usages : usages.filter(u => u.salespersonId === currentUser.id)} 
              userRole={currentUser.role}
            />
          )}

          {view === 'users' && currentUser.role === 'admin' && (
            <UserManagement 
              users={users} 
              onAddUser={handleCreateUser} 
              onDeleteUser={handleDeleteUser} 
              onUpdateUser={handleUpdateUser}
            />
          )}

          {view === 'reports' && currentUser.role === 'admin' && (
            <ReportsView requests={requests} usages={usages} />
          )}

          {view === 'insights' && currentUser.role === 'admin' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="text-indigo-600" />
                <h2 className="text-xl font-bold">Admin Intelligence</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Analyzing inventory movement across all sales teams.
              </p>
              {!aiInsights && !isAnalyzing && (
                <button 
                  onClick={triggerAiAnalysis}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  Generate AI Reports
                </button>
              )}
              {isAnalyzing && (
                <div className="flex items-center gap-3 text-indigo-600 animate-pulse font-medium">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
                  Gathering cross-team data...
                </div>
              )}
              {aiInsights && (
                <div className="prose prose-indigo max-w-none bg-slate-50 p-6 rounded-lg border border-slate-200 whitespace-pre-wrap">
                  {aiInsights}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// --- Login Component ---

function Login({ users, onLogin }: { users: User[], onLogin: (user: User) => void }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) return;

    if (password === selectedUser.password) {
      onLogin(selectedUser);
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 shadow-2xl relative z-10 transition-all duration-500">
        <div className="text-center mb-10">
          <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-500/40">
            <Package size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SpareOps</h1>
          <p className="text-slate-400 text-sm">Secure Sales Inventory Access</p>
        </div>

        {!selectedUser ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="w-full group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all duration-300 active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl ${user.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold group-hover:text-indigo-300 transition-colors">{user.name}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user.role}</div>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={20} />
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className={`h-12 w-12 rounded-xl ${selectedUser.avatarColor} flex items-center justify-center text-white font-bold text-lg`}>
                {selectedUser.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-white font-bold">{selectedUser.name}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedUser.role}</div>
              </div>
              <button 
                type="button" 
                onClick={() => { setSelectedUser(null); setPassword(''); setError(''); }}
                className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
              >
                Change
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enter Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input 
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Your secret key"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 text-xs font-bold">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl active:scale-95"
            >
              Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- Reports View ---

function ReportsView({ requests, usages }: { requests: RequestRecord[], usages: UsageRecord[] }) {
  const [reportType, setReportType] = useState<'usage' | 'request'>('usage');
  const [searchTerm, setSearchTerm] = useState('');

  const usageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    usages.forEach(u => {
      stats[u.partType] = (stats[u.partType] || 0) + 1;
    });
    return stats;
  }, [usages]);

  const requestStats = useMemo(() => {
    const stats: Record<string, number> = {};
    requests.forEach(r => {
      r.items.forEach(i => {
        stats[i.type] = (stats[i.type] || 0) + i.quantity;
      });
    });
    return stats;
  }, [requests]);

  const filteredUsages = usages.filter(u => 
    u.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.salespersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.partType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = requests.filter(r => 
    r.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-fit">
          <button 
            onClick={() => setReportType('usage')}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'usage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            Spare Usage Report
          </button>
          <button 
            onClick={() => setReportType('request')}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'request' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            Spare Request Report
          </button>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search report..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SPARE_PARTS.map(part => (
          <div key={part} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{part}</div>
            <div className="text-2xl font-black text-slate-900">
              {reportType === 'usage' ? usageStats[part] || 0 : requestStats[part] || 0}
              <span className="text-xs text-slate-400 font-medium ml-1">Total {reportType === 'usage' ? 'Deployed' : 'Requested'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">{reportType === 'usage' ? 'Shop / Client' : 'Requester'}</th>
              <th className="px-6 py-4">{reportType === 'usage' ? 'Part Used' : 'Details'}</th>
              <th className="px-6 py-4">{reportType === 'usage' ? 'Salesperson' : 'Status'}</th>
              <th className="px-6 py-4 text-center">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportType === 'usage' ? (
              filteredUsages.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(u.usedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{u.shopName}</td>
                  <td className="px-6 py-4 text-sm text-indigo-600 font-bold">{u.partType}</td>
                  <td className="px-6 py-4 text-sm font-medium">{u.salespersonName}</td>
                  <td className="px-6 py-4 text-center">
                    {u.voucherImage ? (
                      <button className="text-indigo-600 hover:text-indigo-800" onClick={() => window.open(u.voucherImage, '_blank')}>
                        <ImageIcon size={18} />
                      </button>
                    ) : '-'}
                  </td>
                </tr>
              ))
            ) : (
              filteredRequests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{r.requesterName}</td>
                  <td className="px-6 py-4 text-xs">
                    {r.items.map(i => `${i.quantity}x ${i.type}`).join(', ')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-4 text-center text-xs text-slate-400">#REQ-{r.id.slice(-4)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {(reportType === 'usage' ? filteredUsages : filteredRequests).length === 0 && (
          <div className="p-10 text-center text-slate-400 italic">No data matched your current selection.</div>
        )}
      </div>
    </div>
  );
}

// --- User Management ---

function UserManagement({ users, onAddUser, onDeleteUser, onUpdateUser }: { 
  users: User[], 
  onAddUser: (name: string, role: 'admin' | 'sales', password: string) => void, 
  onDeleteUser: (id: string) => void,
  onUpdateUser: (user: User) => void
}) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: 'sales' as 'admin' | 'sales', password: '' });

  const resetForm = () => {
    setFormData({ name: '', role: 'sales', password: '' });
    setIsAdding(false);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, role: user.role, password: user.password });
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.password.trim()) return;
    
    if (editingUser) {
      onUpdateUser({ ...editingUser, ...formData });
    } else {
      onAddUser(formData.name, formData.role, formData.password);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">System Accounts</h2>
        <button 
          onClick={() => { if(isAdding) resetForm(); else setIsAdding(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          {isAdding ? <XCircle size={18}/> : <UserPlus size={18}/>}
          {isAdding ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-black text-slate-900 mb-6">{editingUser ? 'Update Account' : 'New Account'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
              <input 
                autoFocus
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter user name"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Access Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'sales' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none font-medium"
              >
                <option value="sales">Sales (Field User)</option>
                <option value="admin">Admin (Manager)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Secret Key (Password)</label>
              <input 
                type="text" 
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="Set user password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95"
          >
            {editingUser ? 'Save Changes' : 'Create Account'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-slate-100">
          {users.map(user => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl ${user.avatarColor} flex items-center justify-center text-white font-bold shadow-sm`}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    {user.name}
                    {user.role === 'admin' && <ShieldCheck size={14} className="text-indigo-500" />}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 text-slate-300 mr-4">
                  <Lock size={12} />
                  <span className="text-[10px] font-mono select-none">••••••••</span>
                </div>
                <button 
                  onClick={() => handleEdit(user)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDeleteUser(user.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Sales Dashboard with Camera Integration ---

function SalesDashboard({ requests, onHand, onMarkReceived, onLogUsage }: { 
  requests: RequestRecord[], 
  onHand: {type: PartType, quantity: number}[],
  onMarkReceived: (id: string) => void,
  onLogUsage: (shopName: string, part: PartType, voucherImage?: string) => void
}) {
  const approvedNotReceived = requests.filter(r => r.status === RequestStatus.APPROVED);
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedPart, setSelectedPart] = useState<PartType | ''>('');
  const [voucherImg, setVoucherImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVoucherImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLog = () => {
    if (selectedShop && selectedPart) {
      onLogUsage(selectedShop, selectedPart as PartType, voucherImg || undefined);
      setSelectedShop('');
      setSelectedPart('');
      setVoucherImg(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Package className="text-emerald-600" size={20} />
          Current Spares on Hand
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {onHand.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              No inventory on hand. Request parts to get started.
            </div>
          ) : (
            onHand.map((item, idx) => (
              <div key={idx} className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center transition-transform hover:scale-105">
                <div className="text-3xl font-black text-emerald-700">{item.quantity}</div>
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{item.type}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-indigo-50/20">
            <h2 className="font-bold text-indigo-900 flex items-center gap-2">
              <CheckCircle size={18} className="text-indigo-600" />
              Approved & Ready
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {approvedNotReceived.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic text-sm">No items waiting for collection.</div>
            ) : (
              approvedNotReceived.map(req => (
                <div key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approved {new Date(req.approvedAt!).toLocaleDateString()}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {req.items.map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-black rounded-lg">
                          {item.quantity}x {item.type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => onMarkReceived(req.id)}
                    className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    Mark as Collected
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-amber-50/20">
            <h2 className="font-bold text-amber-900 flex items-center gap-2">
              <Store size={18} className="text-amber-600" />
              Log Shop Usage
            </h2>
          </div>
          <div className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Shop Detail</label>
              <input 
                type="text" 
                value={selectedShop}
                onChange={e => setSelectedShop(e.target.value)}
                placeholder="Shop name or location"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Item Used</label>
                <select 
                  value={selectedPart}
                  onChange={e => setSelectedPart(e.target.value as PartType)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 outline-none appearance-none bg-white font-medium"
                >
                  <option value="">Choose...</option>
                  {onHand.map(item => (
                    <option key={item.type} value={item.type}>{item.type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Voucher Photo</label>
                <div className="flex gap-2">
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-all ${voucherImg ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-500'}`}
                   >
                     {voucherImg ? <CheckCircle size={18}/> : <Camera size={18} />}
                     <span className="text-xs font-bold">{voucherImg ? 'Attached' : 'Add Pic'}</span>
                   </button>
                   {voucherImg && (
                     <button onClick={() => setVoucherImg(null)} className="p-3 text-rose-500 bg-rose-50 rounded-xl">
                       <Trash2 size={18} />
                     </button>
                   )}
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </div>
            </div>
            <button 
              disabled={!selectedShop || !selectedPart}
              onClick={handleLog}
              className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <ArrowRightLeft size={20} />
              Confirm Deployment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Supporting Components ---

function RequestForm({ onSubmit, onCancel }: { onSubmit: (items: {type: PartType, quantity: number}[]) => void, onCancel: () => void }) {
  const [quantities, setQuantities] = useState<{ [key in PartType]: number }>({
    'Remax Charger': 0,
    'Charging Cable': 0,
    'Micro Cable': 0,
    'Battery': 0
  });

  const updateQty = (type: PartType, delta: number) => {
    setQuantities(prev => ({ ...prev, [type]: Math.max(0, prev[type] + delta) }));
  };

  const hasItems = Object.values(quantities).some(q => q > 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-black text-slate-900 mb-8">New Stock Request</h2>
      <div className="space-y-4 mb-10">
        {SPARE_PARTS.map(part => (
          <div key={part} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-indigo-50/30 transition-colors">
            <div>
              <div className="font-bold text-slate-900">{part}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inventory Item</div>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => updateQty(part, -1)}
                className="h-12 w-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white hover:text-rose-600 hover:border-rose-200 transition-all font-bold shadow-sm"
              >
                -
              </button>
              <span className="w-6 text-center font-black text-xl text-slate-900">{quantities[part]}</span>
              <button 
                onClick={() => updateQty(part, 1)}
                className="h-12 w-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all font-bold shadow-sm"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <button 
          onClick={() => onSubmit(Object.entries(quantities).map(([type, quantity]) => ({ type: type as PartType, quantity })))}
          disabled={!hasItems}
          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-2xl font-black transition-all shadow-xl active:scale-95"
        >
          Submit for Approval
        </button>
        <button onClick={onCancel} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ActivityLog({ requests, usages, userRole }: { requests: RequestRecord[], usages: UsageRecord[], userRole: 'admin' | 'sales' }) {
  const [activeTab, setActiveTab] = useState<'requests' | 'usages'>('requests');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-5 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === 'requests' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/10' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          {userRole === 'admin' ? 'Global Requests' : 'My Requests'}
        </button>
        <button 
          onClick={() => setActiveTab('usages')}
          className={`flex-1 py-5 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === 'usages' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/10' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          {userRole === 'admin' ? 'Global Usage' : 'My Usage'}
        </button>
      </div>
      
      <div className="p-8">
        {activeTab === 'requests' ? (
          <div className="space-y-4">
            {requests.length === 0 ? <div className="text-center py-20 text-slate-300 font-medium italic">No requests recorded.</div> : 
              requests.map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors">
                  <div className="mb-4 sm:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">{req.requesterName.charAt(0)}</div>
                      <div className="font-bold text-slate-900 text-sm">{req.requesterName}</div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mb-3">{new Date(req.createdAt).toLocaleString()}</div>
                    <div className="flex flex-wrap gap-2">
                      {req.items.map((i, idx) => (
                        <span key={idx} className="text-[10px] font-black px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-600">{i.quantity}x {i.type}</span>
                      ))}
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))
            }
          </div>
        ) : (
          <div className="space-y-4">
            {usages.length === 0 ? <div className="text-center py-20 text-slate-300 font-medium italic">No deployments reported yet.</div> : 
              usages.map(use => (
                <div key={use.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-amber-100 transition-colors">
                  <div className="mb-4 sm:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                       <Store size={14} className="text-amber-500" />
                       <div className="font-bold text-slate-900 text-sm">{use.shopName}</div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mb-3">{new Date(use.usedAt).toLocaleString()}</div>
                    <div className="text-xs font-black text-indigo-600 uppercase tracking-wide">{use.partType}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {use.voucherImage && (
                       <button onClick={() => window.open(use.voucherImage, '_blank')} className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 hover:scale-110 transition-transform">
                          <img src={use.voucherImage} className="h-full w-full object-cover" />
                       </button>
                    )}
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">By Salesperson</div>
                      <div className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full inline-block">{use.salespersonName}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ requests, usages, onApprove, onReject }: { 
  requests: RequestRecord[], 
  usages: UsageRecord[], 
  onApprove: (id: string) => void,
  onReject: (id: string) => void
}) {
  const pending = requests.filter(r => r.status === RequestStatus.PENDING);
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Incoming Requests" value={pending.length.toString()} icon={<ClipboardList className="text-amber-500" />} />
        <StatCard label="Approved Total" value={requests.filter(r => r.status === RequestStatus.APPROVED || r.status === RequestStatus.RECEIVED).length.toString()} icon={<CheckCircle className="text-emerald-500" />} />
        <StatCard label="Shop Deployments" value={usages.length.toString()} icon={<Store className="text-indigo-500" />} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Pending Approvals</h2>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{pending.length} Waiting</span>
        </div>
        <div className="divide-y divide-slate-100">
          {pending.length === 0 ? (
            <div className="p-16 text-center">
              <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-medium">No pending requests to review.</p>
            </div>
          ) : (
            pending.map(req => (
              <div key={req.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                      {req.requesterName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{req.requesterName}</h3>
                      <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleString()}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {req.items.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                            {item.quantity}x {item.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onApprove(req.id)}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => onReject(req.id)}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 transition-all hover:translate-y-[-4px] hover:shadow-xl">
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
        {icon}
      </div>
      <div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const styles = {
    [RequestStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-200',
    [RequestStatus.APPROVED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [RequestStatus.REJECTED]: 'bg-rose-100 text-rose-700 border-rose-200',
    [RequestStatus.RECEIVED]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[status]}`}>{status}</span>;
}
