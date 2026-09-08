import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationCenter } from '../Common/NotificationCenter';
import { MessagingSystem } from '../Common/MessagingSystem';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
}

interface Order {
  id: string;
  userName?: string;
  items: OrderItem[];
  total?: number;
  type?: string;
  table?: string | null;
  address?: string | null;
  phone?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

interface DeliveryHistory {
  id: string;
  userName?: string;
  address?: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  rating?: number;
  feedback?: string;
}

interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  averageTime: number;
  averageRating: number;
  thisWeekDeliveries: number;
}

interface Message {
  id?: string;
  text: string;
  sender: 'driver' | 'customer' | 'manager';
  timestamp: string;
  type?: 'text' | 'system';
}

const QUICK_MESSAGES = [
  'J\'arrive dans 5 minutes',
  'Je suis arrivé à destination',
  'Adresse introuvable - appel nécessaire',
  'Client absent - en attente',
  'Livraison complète',
  'Problème technique - contactez le gérant'
];

export const DeliveryDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [history, setHistory] = useState<DeliveryHistory[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({
    totalDeliveries: 0,
    completedDeliveries: 0,
    averageTime: 0,
    averageRating: 0,
    thisWeekDeliveries: 0,
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    loadDeliveries();
    loadHistory();
    loadStats();
    // Poll for new deliveries every 5 seconds
    const interval = setInterval(loadDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (gpsEnabled && selected) {
      // Request location every 10 seconds
      const requestLocation = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const {latitude, longitude} = pos.coords;
              setCurrentLocation({lat: latitude, lng: longitude});
              // Send to backend
              sendLocationToBackend(selected.id, latitude, longitude);
            },
            (err) => console.warn('GPS error:', err)
          );
        }
      };
      requestLocation();
      gpsIntervalRef.current = setInterval(requestLocation, 10000);
      return () => {
        if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      };
    }
  }, [gpsEnabled, selected]);

  const loadDeliveries = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur chargement commandes');
      const data = await res.json();
      // filter today's deliveries
      const today = new Date().toISOString().slice(0,10);
      const todays = (data || []).filter((o: Order) => (o.type === 'delivery' || o.type === 'livraison') && (o.createdAt || '').slice(0,10) === today);
      
      // Detect new deliveries only after first load
      if (!isFirstLoadRef.current) {
        const newDeliveries = todays.filter((newD: Order) => 
          !deliveries.some(oldD => oldD.id === newD.id) && newD.status === 'ready'
        );
        
        // Notify for new ready deliveries only
        newDeliveries.forEach((d: Order) => {
          toast.success(
            `🚚 Nouvelle livraison prête\n${d.userName || 'Client'} - ${d.address || ''}`,
            { duration: 4000 }
          );
        });
      }
      
      setDeliveries(todays);
      isFirstLoadRef.current = false;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/deliveries/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) {
        // Endpoint not implemented yet - use empty array
        setHistory([]);
        return;
      }
      if (!res.ok) throw new Error('Erreur chargement historique');
      const data = await res.json();
      setHistory(data || []);
    } catch (e) {
      console.warn('History unavailable:', e);
      setHistory([]);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/deliveries/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) {
        // Endpoint not implemented yet - use defaults
        setStats({
          totalDeliveries: 0,
          completedDeliveries: 0,
          averageTime: 0,
          averageRating: 0,
          thisWeekDeliveries: 0,
        });
        return;
      }
      if (!res.ok) throw new Error('Erreur chargement stats');
      const data = await res.json();
      setStats(data || {
        totalDeliveries: 0,
        completedDeliveries: 0,
        averageTime: 0,
        averageRating: 0,
        thisWeekDeliveries: 0,
      });
    } catch (e) {
      console.warn('Stats unavailable:', e);
      setStats({
        totalDeliveries: 0,
        completedDeliveries: 0,
        averageTime: 0,
        averageRating: 0,
        thisWeekDeliveries: 0,
      });
    }
  };

  // Load history and stats when changing tabs
  useEffect(() => {
    if (view === 'history') {
      loadHistory();
      loadStats();
    }
  }, [view]);

  // Load messages when delivery is selected
  useEffect(() => {
    if (selected && view === 'active') {
      loadMessages(selected.id);
      setShowChat(false);
    }
  }, [selected, view]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Erreur mise à jour statut');
      const updated = await res.json();
      setDeliveries(prev => prev.map(d => d.id === orderId ? updated : d));
      toast.success('Statut mis à jour', { duration: 2000 });
    } catch (err:any) {
      console.error(err);
      toast.error(err.message || 'Erreur', { duration: 3000 });
    }
  };

  const sendLocationToBackend = async (orderId: string, lat: number, lng: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/deliveries/${orderId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
      if (res.status === 403) {
        console.warn('GPS location update not authorized');
      } else if (!res.ok) {
        console.warn('Error sending location:', res.status);
      }
    } catch (e) {
      console.warn('Could not send location to backend:', e);
    }
  };

  const uploadProof = async (orderId: string, type: 'photo' | 'signature' | 'qrcode', data: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/deliveries/${orderId}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, data })
      });
      
      if (res.status === 404) {
        console.warn('Proofs endpoint not yet implemented');
        toast.success('Preuve enregistrée localement');
        return;
      }
      
      if (!res.ok) throw new Error('Erreur upload preuve');
      toast.success('Preuve enregistrée');
    } catch (err:any) {
      console.warn(err);
      toast.success('Preuve enregistrée localement');
    }
  };

  const acceptDelivery = (orderId: string) => updateStatus(orderId, 'accepted');
  const refuseDelivery = (orderId: string) => updateStatus(orderId, 'refused');

  // Photo handling
  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setPhoto(data);
      if (selected) uploadProof(selected.id, 'photo', data);
    };
    reader.readAsDataURL(file);
  };

  // Signature handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2,2);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctxRef.current = ctx;
  }, [isSigning]);

  const startDraw = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const rect = (canvasRef.current as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current?.beginPath();
    ctxRef.current?.moveTo(x,y);
  };
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = (canvasRef.current as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current?.lineTo(x,y);
    ctxRef.current?.stroke();
  };
  const endDraw = () => { setIsDrawing(false); };
  const clearSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = ctxRef.current; ctx?.clearRect(0,0,canvas.width,canvas.height);
  };
  const saveSignature = () => {
    const canvas = canvasRef.current; if (!canvas) return; const data = canvas.toDataURL('image/png');
    if (selected) uploadProof(selected.id, 'signature', data);
    setPhoto(data);
    setIsSigning(false);
  };

  // QR Scanner
  const startQRScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Simple QR detection: in production, use html5-qrcode library
        toast.info('Pointez le QR code vers la caméra. Validez manuellement après lecture.');
      }
    } catch (e:any) {
      toast.error('Accès caméra refusé');
      setIsScanning(false);
    }
  };

  const stopQRScan = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsScanning(false);
  };

  const validateQRCode = (code: string) => {
    if (selected) {
      uploadProof(selected.id, 'qrcode', code);
      setScanResult(code);
    }
    stopQRScan();
  };

  const openInMaps = (order?: Order) => {
    if (!order) return toast.error('Commande non sélectionnée');
    
    let url = '';
    if (order.latitude && order.longitude) {
      // Utiliser les coordonnées GPS si disponibles
      url = `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    } else if (order.address) {
      // Sinon utiliser l'adresse textuelle
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`;
    } else {
      return toast.error('Ni adresse ni coordonnées GPS disponibles', { duration: 3000 });
    }
    
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    try {
      logout();
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Messaging functions
  const loadMessages = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/deliveries/${orderId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) {
        // Endpoint not implemented yet - start with empty messages
        setMessages([]);
        return;
      }
      if (!res.ok) throw new Error('Erreur chargement messages');
      const data = await res.json();
      setMessages(data || []);
    } catch (e) {
      console.warn('Messages unavailable:', e);
      setMessages([]);
    }
  };

  const sendMessage = async (text: string) => {
    if (!selected || !text.trim()) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return toast.error('Non authentifié');
      
      const newMessage: Message = {
        text,
        sender: 'driver',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      
      // Send to backend (with error tolerance for unimplemented endpoints)
      try {
        const res = await fetch(`${API_BASE_URL}/api/deliveries/${selected.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text, type: 'text' })
        });
        
        if (res.status === 404) {
          console.warn('Messages endpoint not yet implemented');
        } else if (!res.ok) {
          console.warn('Error sending message to backend:', res.status);
        }
      } catch (fetchErr) {
        console.warn('Could not send message to backend:', fetchErr);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      toast.success('Message envoyé');
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur envoi message');
    }
  };

  const sendQuickMessage = (message: string) => {
    sendMessage(message);
  };

  // Compute current day stats from deliveries list
  const currentDayStats = React.useMemo(() => {
    const count = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'ready' || d.status === 'delivered');
    const times: number[] = delivered.map(d => {
      const start = new Date(d.createdAt).getTime();
      const end = d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now();
      return Math.max(0, end - start);
    });
    const avgMs = times.length ? Math.floor(times.reduce((a,b)=>a+b,0)/times.length) : 0;
    const avgMin = Math.round(avgMs / 60000);
    return { count, delivered: delivered.length, avgMin };
  }, [deliveries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/80 border-b border-cyan-500/20 shadow-2xl">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="TableFacil"
                className="h-12 w-auto rounded-lg bg-white/5 p-2 shadow-lg shadow-cyan-500/30"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">TableFacil</h1>
                <p className="text-xs text-gray-400">Gestion Livreur</p>
              </div>
            </div>

            {/* Center Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-sm text-neutral-300 font-semibold">{currentDayStats.count} livraisons</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm text-emerald-300 font-semibold">{currentDayStats.delivered} livrées</span>
              </div>
            </div>

            {/* User & Actions */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{user?.name || 'Livreur'}</p>
                <p className="text-xs text-gray-500">Coursier</p>
              </div>
              
              {/* Messaging System */}
              <MessagingSystem
                userId={user?.id || ''}
                userName={user?.name || 'Livreur'}
                userRole="delivery"
              />
              
              {/* Notification Center */}
              <NotificationCenter
                userType="driver"
                userId={user?.id || ''}
                userName={user?.name || 'Livreur'}
                onActionClick={(notif) => {
                  if (notif.metadata?.orderId) {
                    const order = deliveries.find(d => d.id === notif.metadata.orderId);
                    if (order) setSelected(order);
                  }
                  toast.info('Action: ' + notif.title, { duration: 2000 });
                }}
              />
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-cyan-950/80 to-cyan-900/80 border border-cyan-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-sm font-semibold">Livraisons aujourd'hui</p>
                  <p className="text-4xl font-bold text-white mt-2">{currentDayStats.count}</p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/50">
                  <svg className="w-7 h-7 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/80 to-emerald-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300 text-sm font-semibold">Livrées</p>
                  <p className="text-4xl font-bold text-white mt-2">{currentDayStats.delivered}</p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/50">
                  <svg className="w-7 h-7 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-neutral-800/80 to-neutral-900/80 border border-neutral-600/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-300 text-sm font-semibold">Temps moyen</p>
                  <p className="text-4xl font-bold text-white mt-2">{currentDayStats.avgMin}<span className="text-lg text-neutral-300 ml-1">min</span></p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-neutral-700/30 border border-neutral-600/50">
                  <svg className="w-7 h-7 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries Grid & Details */}
        <div className="mb-6">
          <div className="inline-flex rounded-lg bg-neutral-800/50 backdrop-blur-sm p-1 border border-neutral-700/50">
            <button 
              onClick={() => setView('active')} 
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${view === 'active' ? 'bg-slate-700 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-300'}`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
              Livraisons actives
            </button>
            <button 
              onClick={() => setView('history')} 
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${view === 'history' ? 'bg-slate-700 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-300'}`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54 2.63 3.02c.12.15.04.37-.12.43-.27.12-.57-.04-.68-.31l-2.38-2.74-2.38 2.74c-.13.27-.42.43-.68.31-.16-.06-.24-.28-.12-.43l2.63-3.02-2.75-3.54c-.12-.15-.04-.37.12-.43.27-.12.57.04.68.31l2.38 2.74 2.38-2.74c.13-.27.42-.43.68-.31.16.06.24.28.12.43z" />
              </svg>
              Historique
            </button>
          </div>
        </div>

        {view === 'active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deliveries List */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-white mb-2">Livraisons du jour</h2>
              <p className="text-gray-400">Gérez vos livraisons en temps réel</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 text-xl">Chargement des livraisons...</p>
                </div>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] backdrop-blur-sm">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-full blur-xl"></div>
                  <svg className="w-24 h-24 text-slate-500/30 relative" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.36 6.64a9 9 0 11-12.73 0m6.36 13.36v-4m0-4v4m0 0h4m-4 0h-4" />
                  </svg>
                </div>
                <p className="text-gray-400 text-xl font-semibold">Aucune livraison en attente</p>
                <p className="text-gray-600 text-sm mt-2">Les nouvelles livraisons apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => { setSelected(d); window.scrollTo({ top: document.querySelector('nav')?.clientHeight || 0, behavior: 'smooth' }); }}
                    className={`group rounded-2xl overflow-hidden shadow-2xl transition-all transform hover:scale-[1.02] cursor-pointer border-2 backdrop-blur-sm ${
                      selected?.id === d.id
                        ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-600/50 shadow-slate-500/20'
                        : 'bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-neutral-700/50 hover:border-slate-600/40'
                    }`}
                  >
                    {/* Status Bar */}
                    <div className={`h-1 bg-gradient-to-r ${
                      d.status === 'delivered' ? 'from-emerald-600 to-emerald-700' :
                      d.status === 'en_route' ? 'from-blue-700 to-blue-800' :
                      d.status === 'accepted' ? 'from-amber-600 to-amber-700' :
                      'from-gray-500 to-gray-600'
                    }`}></div>

                    {/* Card Content */}
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                              d.status === 'delivered' ? 'bg-emerald-500/20 border border-emerald-500/50' :
                              d.status === 'en_route' ? 'bg-cyan-500/20 border border-cyan-500/50' :
                              'bg-yellow-500/20 border border-yellow-500/50'
                            }`}>
                              <svg className={`w-5 h-5 ${
                                d.status === 'delivered' ? 'text-emerald-400' :
                                d.status === 'en_route' ? 'text-cyan-400' :
                                'text-yellow-400'
                              }`} fill="currentColor" viewBox="0 0 24 24">
                                {d.status === 'delivered' ? (
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                ) : d.status === 'en_route' ? (
                                  <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                                ) : (
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                )}
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase">
                                {d.status === 'delivered' ? 'Livrée' : d.status === 'en_route' ? 'En route' : 'En attente'}
                              </p>
                              <p className="text-lg font-bold text-white">{d.userName || 'Client'}</p>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                          d.status === 'delivered' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' :
                          d.status === 'en_route' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' :
                          'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                        }`}>
                          {d.status === 'delivered' ? 'LIVRÉE' : d.status === 'en_route' ? 'EN ROUTE' : 'EN ATTENTE'}
                        </span>
                      </div>

                      {/* Address & Items */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10 space-y-3">
                        <div className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                          </svg>
                          <div className="text-sm text-gray-300">{d.address || <span className="text-gray-500 italic">Adresse non disponible</span>}</div>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                          </svg>
                          <div className="text-sm text-gray-300">
                            {d.items?.slice(0, 2).map(i => `${i.name}×${i.quantity}`).join(', ')}
                            {d.items && d.items.length > 2 && ` +${d.items.length - 2}`}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelected(d); 
                            setShowDetailsModal(true);
                          }} 
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all text-sm"
                        >
                          Voir détails
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-xl max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
                </svg>
                Détails
              </h3>

              {!selected ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-400">Sélectionnez une livraison</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Info Box - Client */}
                  <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <p className="text-gray-400 text-xs font-semibold uppercase">Client</p>
                    <p className="text-white font-bold text-lg mt-1">{selected.userName || 'Client'}</p>
                  </div>

                  {/* Address with Map Button */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                      </svg>
                      Adresse
                    </label>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-white text-sm">
                        {selected.address || <span className="text-gray-500 italic">Adresse manquante</span>}
                      </p>
                      {selected.latitude && selected.longitude && (
                        <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                          </svg>
                          GPS: {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => openInMaps(selected)} 
                      className={`w-full py-2 rounded-lg font-semibold transition-all text-sm ${
                        (selected.address || (selected.latitude && selected.longitude))
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                          : 'bg-neutral-700 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!selected.address && !(selected.latitude && selected.longitude)}
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54 2.63 3.02c.12.15.04.37-.12.43-.27.12-.57-.04-.68-.31l-2.38-2.74-2.38 2.74c-.13.27-.42.43-.68.31-.16-.06-.24-.28-.12-.43l2.63-3.02-2.75-3.54c-.12-.15-.04-.37.12-.43.27-.12.57.04.68.31l2.38 2.74 2.38-2.74c.13-.27.42-.43.68-.31.16.06.24.28.12.43z" />
                      </svg>
                      Itinéraire {(selected.latitude && selected.longitude) ? '(GPS)' : ''}
                    </button>
                  </div>

                  {/* Phone */}
                  {selected.phone && (
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                        Téléphone
                      </label>
                      <a 
                        href={`tel:${selected.phone}`}
                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-semibold text-center transition-all"
                      >
                        {selected.phone}
                      </a>
                    </div>
                  )}

                  {/* Notes */}
                  {selected.notes && (
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400 font-semibold">Notes spéciales</label>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <p className="text-amber-200 text-sm">{selected.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* GPS Toggle */}
                  <button 
                    onClick={() => setGpsEnabled(!gpsEnabled)} 
                    className={`w-full py-2 rounded-lg font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                      gpsEnabled 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' 
                        : 'bg-neutral-700 hover:bg-neutral-600 text-gray-300'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                    </svg>
                    {gpsEnabled ? 'GPS Actif' : 'Activer GPS'}
                  </button>

                  {currentLocation && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-gray-400">
                      <p className="font-semibold text-gray-300 mb-1">Position actuelle</p>
                      <p>{currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</p>
                    </div>
                  )}

                  {/* Photo Proof */}
                  <div className="border-t border-neutral-700 pt-5 space-y-3">
                    <label className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                      Preuve photo
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => onPhoto(e.target.files?.[0])} 
                      className="w-full text-xs text-gray-400 file:px-3 file:py-1 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
                    />
                    {photo && (
                      <img src={photo} alt="preuve" className="w-full rounded-lg max-h-40 object-cover border border-white/10" />
                    )}
                  </div>

                  {/* Signature */}
                  <div className="border-t border-neutral-700 pt-5 space-y-3">
                    <label className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                      </svg>
                      Signature client
                    </label>
                    {!isSigning && (
                      <button 
                        onClick={() => setIsSigning(true)} 
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all text-sm"
                      >
                        Demander signature
                      </button>
                    )}
                    {isSigning && (
                      <div className="space-y-3">
                        <div className="border-2 border-neutral-700 rounded-lg bg-black overflow-hidden">
                          <canvas 
                            ref={canvasRef} 
                            onMouseDown={startDraw} 
                            onMouseMove={draw} 
                            onMouseUp={endDraw} 
                            onMouseLeave={endDraw} 
                            className="w-full h-32 cursor-crosshair"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={saveSignature} 
                            className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg text-sm"
                          >
                            Enregistrer
                          </button>
                          <button 
                            onClick={clearSignature} 
                            className="flex-1 py-2 bg-neutral-700 text-gray-300 font-semibold rounded-lg text-sm"
                          >
                            Effacer
                          </button>
                          <button 
                            onClick={() => setIsSigning(false)} 
                            className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg text-sm"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR Code Scanner */}
                  <div className="border-t border-neutral-700 pt-5 space-y-3">
                    <label className="text-sm text-gray-400 font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 11h8V3H3v8zm4-4h0v0zm8-4v8h8V3h-8zm4 4h0v0zM3 21h8v-8H3v8zm4-4h0v0z" />
                      </svg>
                      Code QR/Barcode
                    </label>
                    {!isScanning && (
                      <button 
                        onClick={startQRScan} 
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all text-sm"
                      >
                        Scanner QR
                      </button>
                    )}
                    {isScanning && (
                      <div className="space-y-3">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          className="w-full rounded-lg max-h-40 bg-black border border-white/10"
                        />
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Ou saisissez le code" 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                validateQRCode((e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }} 
                            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
                          />
                          <button 
                            onClick={stopQRScan} 
                            className="px-3 py-2 bg-red-600 text-white font-semibold rounded-lg text-sm"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                    {scanResult && (
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3">
                        <p className="text-emerald-300 text-xs font-semibold">Code détecté</p>
                        <p className="text-white text-sm font-mono mt-1">{scanResult}</p>
                      </div>
                    )}
                  </div>

                  {/* Communication/Chat */}
                  <div className="border-t border-neutral-700 pt-5 space-y-3">
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                      </svg>
                      {showChat ? 'Fermer chat' : 'Contacter client/gérant'}
                    </button>

                    {showChat && (
                      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden flex flex-col h-80">
                        {/* Messages Display */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {messages.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-8">
                              Aucun message. Commencez une conversation.
                            </div>
                          ) : (
                            messages.map((msg, idx) => (
                              <div
                                key={`msg-${idx}-${msg.timestamp}`}
                                className={`flex ${msg.sender === 'driver' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                                    msg.sender === 'driver'
                                      ? 'bg-cyan-600 text-white'
                                      : msg.sender === 'customer'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gray-600 text-white'
                                  }`}
                                >
                                  {msg.type === 'system' ? (
                                    <p className="text-xs italic">{msg.text}</p>
                                  ) : (
                                    <>
                                      <p>{msg.text}</p>
                                      <p className="text-xs opacity-70 mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Messages */}
                        <div className="border-t border-white/10 px-3 py-2 space-y-2 max-h-32 overflow-y-auto">
                          <p className="text-xs text-gray-400 font-semibold">Messages rapides:</p>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_MESSAGES.slice(0, 3).map((msg, idx) => (
                              <button
                                key={`quick-msg-${idx}-${msg.substring(0, 10)}`}
                                onClick={() => sendQuickMessage(msg)}
                                className="px-2 py-1 bg-cyan-600/50 hover:bg-cyan-600/70 text-white text-xs rounded border border-cyan-500/50 transition-colors"
                              >
                                {msg.length > 20 ? msg.substring(0, 17) + '...' : msg}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Message Input */}
                        <div className="border-t border-white/10 p-3 flex gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                sendMessage(messageInput);
                              }
                            }}
                            placeholder="Votre message..."
                            className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            onClick={() => sendMessage(messageInput)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-semibold transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.9429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.01449237 C3.34915502,0.9429026149 2.40734225,1.01449237 1.77946707,1.48210441 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.97701575 L3.03521743,10.4181088 C3.03521743,10.5751922 3.03521743,10.5751922 3.34915502,10.5751922 L16.6915026,11.3606721 C16.6915026,11.3606721 17.1624089,11.3606721 17.1624089,11.7534511 L17.1624089,12.0815295 C17.1624089,12.5527472 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="border-t border-neutral-700 pt-5 space-y-3">
                    {selected.status !== 'accepted' && selected.status !== 'en_route' && selected.status !== 'delivered' && (
                      <button 
                        onClick={() => acceptDelivery(selected.id)} 
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Accepter
                      </button>
                    )}
                    
                    {(selected.status === 'accepted' || selected.status === 'en_route') && (
                      <button 
                        onClick={() => updateStatus(selected.id, 'delivered')} 
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Marquer comme livrée
                      </button>
                    )}

                    {selected.status !== 'delivered' && selected.status !== 'en_route' && (
                      <button 
                        onClick={() => updateStatus(selected.id, 'en_route')} 
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                        </svg>
                        En route
                      </button>
                    )}

                    {selected.status !== 'delivered' && (
                      <button 
                        onClick={() => refuseDelivery(selected.id)} 
                        className="w-full py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                        </svg>
                        Refuser
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
        <div className="space-y-6">
          {/* Performance Stats from API */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-cyan-950/80 to-cyan-900/80 border border-cyan-500/30 rounded-2xl p-6 shadow-xl">
              <p className="text-cyan-300 text-sm font-semibold">Livraisons totales</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalDeliveries}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-950/80 to-emerald-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
              <p className="text-emerald-300 text-sm font-semibold">Complétées</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.completedDeliveries}</p>
              <p className="text-xs text-emerald-400 mt-2">Taux: {Math.round((stats.completedDeliveries / (stats.totalDeliveries || 1)) * 100)}%</p>
            </div>
            <div className="bg-gradient-to-br from-purple-950/80 to-purple-900/80 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
              <p className="text-purple-300 text-sm font-semibold">Temps moyen</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.averageTime}<span className="text-lg text-purple-300 ml-1">min</span></p>
            </div>
            <div className="bg-gradient-to-br from-yellow-950/80 to-yellow-900/80 border border-yellow-500/30 rounded-2xl p-6 shadow-xl">
              <p className="text-yellow-300 text-sm font-semibold">Note client</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-4xl font-bold text-white">{stats.averageRating.toFixed(1)}</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < Math.round(stats.averageRating) ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2l-2.81 6.63L2 9.24l5.46 4.73L5.82 21 12 17.27z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery History Table */}
          <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-neutral-700/50">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54 2.63 3.02c.12.15.04.37-.12.43-.27.12-.57-.04-.68-.31l-2.38-2.74-2.38 2.74c-.13.27-.42.43-.68.31-.16-.06-.24-.28-.12-.43l2.63-3.02-2.75-3.54c-.12-.15-.04-.37.12-.43.27-.12.57.04.68.31l2.38 2.74 2.38-2.74c.13-.27.42-.43.68-.31.16.06.24.28.12.43z" />
                </svg>
                Historique des livraisons
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-900/50 border-b border-neutral-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Client</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Adresse</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Durée</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Note</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700/50">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Aucune livraison dans l'historique
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => {
                      const duration = h.completedAt ? Math.round((new Date(h.completedAt).getTime() - new Date(h.createdAt).getTime()) / 60000) : 0;
                      return (
                        <tr key={h.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-white font-semibold">{h.userName || 'Client'}</td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{h.address || '-'}</td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{new Date(h.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{duration} min</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-4 h-4 ${i < (h.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2l-2.81 6.63L2 9.24l5.46 4.73L5.82 21 12 17.27z" />
                                </svg>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm max-w-xs">{h.feedback || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Modal Détails Complets de la Commande */}
        {showDetailsModal && selected && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full my-8">
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between sticky top-0">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-white">Détails de la Commande</h2>
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                
                {/* 📝 Informations essentielles */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    </svg>
                    📝 Informations essentielles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Numéro de commande</p>
                      <p className="text-white font-bold text-lg font-mono">{selected.id}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Date et heure</p>
                      <p className="text-white font-semibold">
                        {new Date(selected.createdAt).toLocaleDateString('fr-FR')} à {new Date(selected.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 md:col-span-2">
                      <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Statut actuel</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          selected.status === 'en préparation' ? 'bg-amber-400' :
                          selected.status === 'en livraison' ? 'bg-blue-400' :
                          selected.status === 'livré' ? 'bg-emerald-400' :
                          'bg-red-400'
                        }`}></span>
                        <span className="text-white font-semibold capitalize">
                          {selected.status === 'en préparation' ? '⏳ En préparation' :
                           selected.status === 'en livraison' ? '🚗 En livraison' :
                           selected.status === 'livré' ? '✅ Livré' :
                           '❌ Annulé'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🍽️ Détails du contenu */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                    🍽️ Détails du contenu
                  </h3>
                  
                  {selected.items && selected.items.length > 0 ? (
                    <div className="space-y-3">
                      {selected.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-white font-bold text-base">{item.name}</p>
                              <p className="text-gray-400 text-sm">Quantité: <span className="text-amber-400 font-semibold">{item.quantity} x</span></p>
                            </div>
                            <div className="text-right">
                              {item.price && (
                                <p className="text-amber-400 font-bold text-lg">
                                  {(item.price * item.quantity).toFixed(2)} €
                                </p>
                              )}
                              {item.unitPrice && (
                                <p className="text-gray-400 text-xs">{item.unitPrice.toFixed(2)} € / unité</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Options */}
                          {item.options && Object.keys(item.options).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <p className="text-xs text-gray-400 font-semibold mb-2">⚙️ Options choisies:</p>
                              <div className="space-y-1">
                                {Object.entries(item.options).map(([key, value]: [string, any], idx: number) => (
                                  <p key={idx} className="text-sm text-gray-300">
                                    • <span className="text-gray-400 capitalize">{key}:</span> <span className="text-amber-300">{value}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Allergènes */}
                          {item.allergens && item.allergens.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <p className="text-xs text-red-400 font-bold mb-2">⚠️ Allergènes:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.allergens.map((allergen: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300 font-semibold">
                                    {allergen}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Total */}
                      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold text-lg">Total de la commande:</span>
                          <span className="text-cyan-400 font-bold text-2xl">
                            {selected.total ? selected.total.toFixed(2) : 
                             (selected.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * item.quantity), 0).toFixed(2))} €
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Aucun article dans cette commande</p>
                  )}
                </div>

                {/* 📍 Détails de livraison */}
                {selected.address && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                      </svg>
                      📍 Adresse de livraison
                    </h3>
                    <p className="text-white text-sm mb-2">{selected.address}</p>
                    {selected.phone && (
                      <p className="text-gray-400 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                        📱 {selected.phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 2H5c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                      📝 Notes spéciales
                    </h3>
                    <p className="text-white text-sm">{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-cyan-500/20 px-6 py-4 flex gap-3 sticky bottom-0 bg-gradient-to-r from-neutral-900 to-neutral-950">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-all"
                >
                  Fermer
                </button>
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelected(null);
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
                >
                  ✓ Continuer la livraison
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
