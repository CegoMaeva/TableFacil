import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Table {
  id: string;
  number: string;
  zone: string;
  capacity: number;
  position: { x: number; y: number };
  shape: 'circle' | 'square' | 'rectangle';
  status: 'available' | 'reserved' | 'occupied';
  currentReservation?: any;
  currentReservations?: any[];
  reservationCount?: number;
}

interface Reservation {
  id: string;
  customer: string;
  date: string;
  time: string;
  guests: number;
  status: string;
}

const API_BASE_URL = 'http://127.0.0.1:5000';

export const RestaurantFloorPlan = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [debugRawTables, setDebugRawTables] = useState<any>(null);
  const [debugRawAvailabilities, setDebugRawAvailabilities] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    loadTables();
  }, [selectedDate, selectedTime]);

  // Poll for updates every 15 seconds to keep floor plan fresh
  useEffect(() => {
    const id = setInterval(() => {
      loadTables();
    }, 15000);
    return () => clearInterval(id);
  }, [selectedDate, selectedTime]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const url = new URL(`${API_BASE_URL}/api/tables`);
      if (selectedDate && selectedTime) {
        url.searchParams.append('date', selectedDate);
        url.searchParams.append('time', selectedTime);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur de chargement');

      const data = await response.json();
      setDebugRawTables(data);

      // Also load availabilities for the selected date to update reserved status
      try {
        const avUrl = new URL(`${API_BASE_URL}/api/reservations/admin/availability`);
        avUrl.searchParams.append('date', selectedDate);
        const avRes = await fetch(avUrl.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
        const avData = avRes.ok ? await avRes.json() : [];
        setDebugRawAvailabilities(avData);

        // For each table, check if there is any reserved availability overlapping selectedTime
        const merged = (data || []).map((t: any) => {
          const matching = (avData || []).filter((a: any) => a.tableId === t.id && a.status === 'reserved' && a.date === selectedDate);
          let isReserved = false;
          if (matching.length > 0) {
            // check overlap with selectedTime
            try {
              const [selH, selM] = selectedTime.split(':').map((s) => parseInt(s, 10));
              const selMinutes = selH * 60 + selM;
              for (const a of matching) {
                const [sH, sM] = a.timeStart.split(':').map((s: string) => parseInt(s, 10));
                const [eH, eM] = a.timeEnd.split(':').map((s: string) => parseInt(s, 10));
                const aStart = sH * 60 + sM;
                const aEnd = eH * 60 + eM;
                if (selMinutes >= aStart && selMinutes <= aEnd) {
                  isReserved = true;
                  break;
                }
              }
            } catch (e) {
              // ignore
            }
          }

          return { ...t, status: isReserved ? 'reserved' : (t.status || 'available') };
        });

        setTables(merged);
      } catch (err) {
        // fallback to raw data
        setTables(data);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger les tables');
    } finally {
      setLoading(false);
    }
  };

  const getTableColor = (table: Table) => {
    if (table.status === 'reserved') return '#ef4444'; // Rouge
    if (table.status === 'occupied') return '#f59e0b'; // Orange
    return '#10b981'; // Vert
  };

  const getTableSize = (shape: string, capacity: number) => {
    const baseSize = 40;
    const size = baseSize + (capacity * 5);
    
    if (shape === 'circle') {
      return { width: size, height: size };
    } else if (shape === 'rectangle') {
      return { width: size * 1.5, height: size * 0.7 };
    }
    return { width: size, height: size };
  };

  const filteredTables = zoneFilter === 'all' 
    ? tables 
    : tables.filter(t => t.zone === zoneFilter);

  const zones = ['Standard', 'VIP', 'Terrasse'];

  const tableStats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    occupied: tables.filter(t => t.status === 'occupied').length
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Plan du Restaurant
          </h1>
          <p className="text-gray-400">
            Visualisez et gérez les tables en temps réel
          </p>
        </div>

        {/* Filtres et Contrôles */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Heure */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Heure
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="12:00">12:00</option>
                <option value="12:30">12:30</option>
                <option value="13:00">13:00</option>
                <option value="13:30">13:30</option>
                <option value="14:00">14:00</option>
                <option value="19:00">19:00</option>
                <option value="19:30">19:30</option>
                <option value="20:00">20:00</option>
                <option value="20:30">20:30</option>
                <option value="21:00">21:00</option>
                <option value="21:30">21:30</option>
              </select>
            </div>

            {/* Filtre Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zone
              </label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Toutes les zones</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>

            {/* Bouton Actualiser */}
            <div className="flex items-end">
              <button
                onClick={loadTables}
                disabled={loading}
                className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
          </div>

          {/* Debug toggle and panel */}
          <div className="mb-6 flex items-center justify-end">
            <button onClick={() => setShowDebug((s) => !s)} className="text-xs text-neutral-400 hover:underline">{showDebug ? 'Cacher debug' : 'Afficher debug'}</button>
          </div>
          {showDebug && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 text-xs text-neutral-300">
              <div className="mb-2 font-semibold">Raw /api/tables response</div>
              <pre className="max-h-36 overflow-auto text-xs bg-gray-900 p-2 rounded">{JSON.stringify(debugRawTables, null, 2)}</pre>
              <div className="mt-3 mb-2 font-semibold">Raw /api/reservations/admin/availability response</div>
              <pre className="max-h-36 overflow-auto text-xs bg-gray-900 p-2 rounded">{JSON.stringify(debugRawAvailabilities, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Tables</p>
                <p className="text-2xl font-bold text-white">{tableStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Disponibles</p>
                <p className="text-2xl font-bold text-emerald-500">{tableStats.available}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Réservées</p>
                <p className="text-2xl font-bold text-red-500">{tableStats.reserved}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Occupées</p>
                <p className="text-2xl font-bold text-orange-500">{tableStats.occupied}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Légende */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Réservée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Occupée</span>
            </div>
          </div>
        </div>

        {/* Plan du Restaurant */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <div className="relative" style={{ height: '600px' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 600">
              {/* Zones de fond */}
              <rect x="0" y="0" width="450" height="280" fill="#1f2937" opacity="0.3" />
              <text x="225" y="25" fill="#9ca3af" fontSize="16" fontWeight="bold" textAnchor="middle">Zone Standard</text>
              
              <rect x="480" y="0" width="320" height="280" fill="#3730a3" opacity="0.2" />
              <text x="640" y="25" fill="#818cf8" fontSize="16" fontWeight="bold" textAnchor="middle">Zone VIP</text>
              
              <rect x="0" y="280" width="450" height="320" fill="#065f46" opacity="0.2" />
              <text x="225" y="305" fill="#34d399" fontSize="16" fontWeight="bold" textAnchor="middle">Terrasse</text>

              {/* Tables */}
              {filteredTables.map((table) => {
                const size = getTableSize(table.shape, table.capacity);
                const color = getTableColor(table);

                return (
                  <g
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    style={{ cursor: 'pointer' }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    {table.shape === 'circle' ? (
                      <circle
                        cx={table.position.x}
                        cy={table.position.y}
                        r={size.width / 2}
                        fill={color}
                        stroke="#374151"
                        strokeWidth="2"
                      />
                    ) : (
                      <rect
                        x={table.position.x - size.width / 2}
                        y={table.position.y - size.height / 2}
                        width={size.width}
                        height={size.height}
                        fill={color}
                        stroke="#374151"
                        strokeWidth="2"
                        rx={table.shape === 'square' ? 5 : 0}
                      />
                    )}
                    <text
                      x={table.position.x}
                      y={table.position.y}
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      T{table.number}
                    </text>
                    <text
                      x={table.position.x}
                      y={table.position.y + 15}
                      fill="white"
                      fontSize="10"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {table.capacity}p
                    </text>
                    {table.status === 'reserved' && table.reservationCount && table.reservationCount > 0 && (
                      <g>
                        <circle
                          cx={table.position.x + size.width / 2 - 10}
                          cy={table.position.y - size.height / 2 + 10}
                          r="12"
                          fill="#ef4444"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <text
                          x={table.position.x + size.width / 2 - 10}
                          y={table.position.y - size.height / 2 + 14}
                          fill="white"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {table.reservationCount}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Modal Détails Table */}
        {selectedTable && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Table {selectedTable.number}
                </h2>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-2 text-gray-400 hover:text-white transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-400">Zone</span>
                  <span className="text-white font-semibold">{selectedTable.zone}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-400">Capacité</span>
                  <span className="text-white font-semibold">{selectedTable.capacity} personnes</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-400">Statut</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedTable.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedTable.status === 'reserved' ? 'bg-red-500/20 text-red-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {selectedTable.status === 'available' ? 'Disponible' :
                     selectedTable.status === 'reserved' ? 'Réservée' : 'Occupée'}
                  </span>
                </div>

                {selectedTable.currentReservations && selectedTable.currentReservations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-white font-semibold">Réservations ({selectedTable.currentReservations.length})</h3>
                    {selectedTable.currentReservations.map((reservation: any, index: number) => (
                      <div key={reservation.id || index} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">Réservation #{index + 1}</span>
                          <span className="text-lg font-bold text-red-400">{reservation.time}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Client</span>
                            <span className="text-white">{reservation.customer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Personnes</span>
                            <span className="text-white">{reservation.guests}</span>
                          </div>
                          {reservation.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Téléphone</span>
                              <span className="text-white text-xs">{reservation.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedTable(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
