import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

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
}

export const DeliveryDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
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

  useEffect(() => {
    loadDeliveries();
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
      setDeliveries(todays);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
      toast.success('Statut mis à jour');
    } catch (err:any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
    }
  };

  const sendLocationToBackend = async (orderId: string, lat: number, lng: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE_URL}/api/deliveries/${orderId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
    } catch (e) {
      console.error('Error sending location:', e);
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
      if (!res.ok) throw new Error('Erreur upload preuve');
      toast.success('Preuve enregistrée');
    } catch (err:any) {
      console.error(err);
      toast.error(err.message || 'Erreur');
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

  const openInMaps = (addr?: string) => {
    if (!addr) return toast.error('Adresse manquante');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    try {
      logout();
      toast.success('Déconnecté avec succès');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const stats = React.useMemo(() => {
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
    <div className="min-h-screen bg-neutral-950 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-white">Tableau Livreur</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-neutral-300">{user?.name || 'Livreur'}</div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-neutral-900/40 rounded-lg">
          <div className="text-sm text-neutral-400">Livraisons aujourd'hui</div>
          <div className="text-2xl font-bold text-white">{stats.count}</div>
        </div>
        <div className="p-4 bg-neutral-900/40 rounded-lg">
          <div className="text-sm text-neutral-400">Livrées</div>
          <div className="text-2xl font-bold text-white">{stats.delivered}</div>
        </div>
        <div className="p-4 bg-neutral-900/40 rounded-lg">
          <div className="text-sm text-neutral-400">Temps moyen (min)</div>
          <div className="text-2xl font-bold text-white">{stats.avgMin}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-neutral-900/40 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Livraisons du jour</h2>
            {loading ? <p className="text-gray-400">Chargement...</p> : (
              <div className="space-y-3">
                {deliveries.length === 0 && <p className="text-gray-400">Aucune livraison aujourd'hui</p>}
                {deliveries.map(d => (
                  <div key={d.id} className="p-3 bg-neutral-800/30 rounded-lg flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-white font-medium">{d.userName || 'Client'}</div>
                        <div className="text-xs text-neutral-400">{d.address}</div>
                      </div>
                      <div className="text-sm text-gray-400">{d.items?.slice(0,3).map(i=>`${i.name}×${i.quantity}`).join(', ')}</div>
                      <div className="text-xs text-neutral-400 mt-2">Statut: <span className="font-semibold">{d.status}</span></div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => { setSelected(d); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-3 py-1 bg-neutral-700 rounded text-white text-sm">Voir</button>
                      <button onClick={() => acceptDelivery(d.id)} className="px-3 py-1 bg-emerald-500 rounded text-black text-sm">Accepter</button>
                      <button onClick={() => refuseDelivery(d.id)} className="px-3 py-1 bg-red-600 rounded text-white text-sm">Refuser</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-neutral-900/40 rounded-lg p-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-3">Détails</h3>
            {!selected && <p className="text-gray-400">Sélectionnez une livraison</p>}
            {selected && (
              <div className="space-y-3">
                <div className="text-white font-medium">{selected.userName}</div>
                <div className="text-sm text-neutral-400">{selected.address}</div>
                <div className="text-sm text-neutral-400">{selected.phone && <a className="text-emerald-400 hover:underline" href={`tel:${selected.phone}`}>Appeler</a>}</div>
                <div className="text-sm text-neutral-400">Notes: {selected.notes || '-'}</div>

                <div className="flex gap-2 mt-2">
                  <button onClick={() => openInMaps(selected.address)} className="px-3 py-2 bg-blue-600 rounded text-white text-sm">Itinéraire</button>
                  <button onClick={() => setGpsEnabled(!gpsEnabled)} className={`px-3 py-2 rounded text-white text-sm ${gpsEnabled ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
                    {gpsEnabled ? '📍 GPS ON' : '📍 GPS OFF'}
                  </button>
                </div>

                {currentLocation && (
                  <div className="text-xs text-neutral-400 mt-2">
                    Position: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </div>
                )}

                <div className="border-t border-neutral-700 pt-2">
                  <label className="text-sm text-neutral-400">Preuve photo</label>
                  <input type="file" accept="image/*" onChange={(e)=>onPhoto(e.target.files?.[0])} className="block mt-2 text-sm" />
                  {photo && <img src={photo} alt="preuve" className="mt-2 w-full rounded max-h-32 object-cover" />}
                </div>

                <div className="border-t border-neutral-700 pt-2">
                  <label className="text-sm text-neutral-400">Signature client</label>
                  {!isSigning && <button onClick={()=>setIsSigning(true)} className="mt-2 px-3 py-2 bg-emerald-500 rounded text-black text-sm">Signer</button>}
                  {isSigning && (
                    <div className="mt-2">
                      <div className="border border-neutral-700 rounded bg-black">
                        <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} className="w-full h-32 cursor-crosshair" />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={saveSignature} className="px-2 py-1 bg-emerald-500 rounded text-black text-xs">Enregistrer</button>
                        <button onClick={clearSignature} className="px-2 py-1 bg-neutral-700 rounded text-white text-xs">Effacer</button>
                        <button onClick={()=>setIsSigning(false)} className="px-2 py-1 bg-red-600 rounded text-white text-xs">Annuler</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-700 pt-2">
                  <label className="text-sm text-neutral-400">QR/Barcode</label>
                  {!isScanning && <button onClick={startQRScan} className="mt-2 px-3 py-2 bg-purple-600 rounded text-white text-sm">Scanner QR</button>}
                  {isScanning && (
                    <div className="mt-2">
                      <video ref={videoRef} autoPlay className="w-full rounded max-h-40 bg-black" />
                      <div className="flex gap-2 mt-2">
                        <input type="text" placeholder="Ou saisissez le code" onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            validateQRCode((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }} className="flex-1 px-2 py-1 bg-neutral-800 rounded text-white text-xs" />
                        <button onClick={stopQRScan} className="px-2 py-1 bg-red-600 rounded text-white text-xs">Fermer</button>
                      </div>
                    </div>
                  )}
                  {scanResult && <div className="text-xs text-emerald-400 mt-2">Code: {scanResult}</div>}
                </div>

                <div className="border-t border-neutral-700 pt-2 flex gap-2">
                  <button onClick={()=>updateStatus(selected.id, 'en_route')} className="flex-1 px-3 py-2 bg-yellow-500 rounded text-black text-sm">En route</button>
                  <button onClick={()=>updateStatus(selected.id, 'delivered')} className="flex-1 px-3 py-2 bg-emerald-500 rounded text-black text-sm">Livré</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
