import { useState, useEffect } from 'react';

interface Table {
  id: string;
  number: number;
  zone: 'Standard' | 'VIP' | 'Terrasse';
  capacity: number;
  position: { x: number; y: number };
  shape: 'circle' | 'square' | 'rectangle';
  status?: 'available' | 'reserved' | 'occupied';
  currentReservation?: any;
}

export const RestaurantFloorPlan3D = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draggingTable, setDraggingTable] = useState<Table | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  useEffect(() => {
    loadTables();
  }, [selectedDate, selectedTime]);

  const loadTables = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        date: selectedDate,
        time: selectedTime
      });

      const response = await fetch(`http://localhost:5000/api/tables?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Tables chargées:', data);
        setTables(data);
      } else {
        console.error('Erreur HTTP:', response.status);
      }
    } catch (error) {
      console.error('Erreur chargement tables:', error);
      // En cas d'erreur, charger quand même les tables par défaut
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = zoneFilter === 'all' 
    ? tables 
    : tables.filter(t => t.zone === zoneFilter);

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    occupied: tables.filter(t => t.status === 'occupied').length
  };

  // Fonction pour créer une table 3D isométrique
  const renderTable3D = (table: Table) => {
    const { x, y } = table.position;
    const size = table.capacity <= 2 ? 60 : table.capacity <= 4 ? 80 : 100;
    
    // Transformation isométrique
    const isoX = (x - y) * 0.866;
    const isoY = (x + y) * 0.5;
    
    // Couleurs selon le statut
    const colors = {
      available: { top: '#10b981', front: '#059669', side: '#047857' },
      reserved: { top: '#ef4444', front: '#dc2626', side: '#b91c1c' },
      occupied: { top: '#f59e0b', front: '#d97706', side: '#b45309' }
    };
    
    const color = colors[table.status || 'available'];
    
    return (
      <g 
        key={table.id} 
        transform={`translate(${isoX + 400}, ${isoY + 200})`}
        onClick={() => setSelectedTable(table)}
        className="cursor-pointer transition-all hover:opacity-80"
      >
        {/* Ombre */}
        <ellipse
          cx={0}
          cy={size / 2 + 5}
          rx={size / 2}
          ry={size / 4}
          fill="rgba(0,0,0,0.3)"
        />
        
        {table.shape === 'circle' ? (
          <>
            {/* Côté de la table (cercle) */}
            <ellipse
              cx={0}
              cy={0}
              rx={size / 2}
              ry={size / 4}
              fill={color.side}
            />
            {/* Dessus de la table */}
            <ellipse
              cx={0}
              cy={-15}
              rx={size / 2}
              ry={size / 4}
              fill={color.top}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="2"
            />
            {/* Effet de profondeur */}
            <rect
              x={-size / 2}
              y={-15}
              width={size}
              height={15}
              fill={color.front}
              opacity="0.7"
            />
          </>
        ) : table.shape === 'square' ? (
          <>
            {/* Côté droit */}
            <path
              d={`M ${size / 2} 0 L ${size / 2 + 20} -10 L ${size / 2 + 20} ${size / 2 - 10} L ${size / 2} ${size / 2} Z`}
              fill={color.side}
            />
            {/* Face avant */}
            <rect
              x={-size / 2}
              y={0}
              width={size}
              height={size / 2}
              fill={color.front}
            />
            {/* Dessus */}
            <path
              d={`M ${-size / 2} 0 L ${-size / 2 + 20} -10 L ${size / 2 + 20} -10 L ${size / 2} 0 Z`}
              fill={color.top}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            {/* Table rectangulaire */}
            <path
              d={`M ${size / 2} 0 L ${size / 2 + 25} -12 L ${size / 2 + 25} ${size / 3 - 12} L ${size / 2} ${size / 3} Z`}
              fill={color.side}
            />
            <rect
              x={-size / 2}
              y={0}
              width={size}
              height={size / 3}
              fill={color.front}
            />
            <path
              d={`M ${-size / 2} 0 L ${-size / 2 + 25} -12 L ${size / 2 + 25} -12 L ${size / 2} 0 Z`}
              fill={color.top}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="2"
            />
          </>
        )}
        
        {/* Chaises autour de la table */}
        {renderChairs(table, size)}
        
        {/* Numéro de table */}
        <text
          x={0}
          y={-5}
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {table.number}
        </text>
        
        {/* Indicateur de réservation */}
        {table.status === 'reserved' && (
          <g transform={`translate(${size / 2 - 10}, ${-size / 2 + 10})`}>
            <circle cx={0} cy={0} r={8} fill="#ef4444" />
            <text x={0} y={4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">R</text>
          </g>
        )}
      </g>
    );
  };

  // Fonction pour dessiner les chaises
  const renderChairs = (table: Table, tableSize: number) => {
    const chairs = [];
    const chairCount = table.capacity;
    const chairSize = 15;
    const offset = tableSize / 2 + 25;
    
    for (let i = 0; i < chairCount; i++) {
      const angle = (i * 2 * Math.PI) / chairCount;
      const chairX = Math.cos(angle) * offset;
      const chairY = Math.sin(angle) * offset * 0.5; // Perspective isométrique
      
      chairs.push(
        <g key={`chair-${i}`} transform={`translate(${chairX}, ${chairY})`}>
          {/* Chaise en 3D */}
          <rect
            x={-chairSize / 2}
            y={-chairSize / 2}
            width={chairSize}
            height={chairSize}
            fill="#8b4513"
            stroke="#654321"
            strokeWidth="1"
            rx="2"
          />
          <rect
            x={-chairSize / 2}
            y={-chairSize / 2 - 10}
            width={chairSize}
            height={5}
            fill="#654321"
            rx="1"
          />
        </g>
      );
    }
    
    return chairs;
  };

  // Éléments décoratifs du restaurant
  const renderDecoration = () => (
    <>
      {/* Entrée principale */}
      <g transform="translate(30, 30)">
        <rect x={0} y={0} width={120} height={80} fill="#2d3748" stroke="#1a202c" strokeWidth="3" rx="5" />
        <text x={60} y={45} textAnchor="middle" fill="#cbd5e0" fontSize="18" fontWeight="bold">
          🚪 ENTRÉE
        </text>
      </g>
      
      {/* Bar */}
      <g transform="translate(750, 50)">
        <path
          d="M 0 0 L 20 -10 L 140 -10 L 120 0 Z"
          fill="#4a5568"
        />
        <rect x={0} y={0} width={120} height={80} fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
        <text x={60} y={45} textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="bold">
          🍷 BAR
        </text>
      </g>
      
      {/* Cuisine */}
      <g transform="translate(750, 500)">
        <path
          d="M 0 0 L 20 -10 L 140 -10 L 120 0 Z"
          fill="#4a5568"
        />
        <rect x={0} y={0} width={120} height={80} fill="#1a202c" stroke="#e53e3e" strokeWidth="2" />
        <text x={60} y={45} textAnchor="middle" fill="#fc8181" fontSize="16" fontWeight="bold">
          🔥 CUISINE
        </text>
      </g>
      
      {/* Plantes décoratives */}
      {[
        { x: 160, y: 120 },
        { x: 160, y: 400 },
        { x: 600, y: 150 },
        { x: 600, y: 450 },
        { x: 540, y: 300 },
        { x: 200, y: 440 }
      ].map((pos, i) => (
        <g key={`plant-${i}`} transform={`translate(${pos.x}, ${pos.y})`}>
          <ellipse cx={0} cy={12} rx={18} ry={10} fill="#2d3748" />
          <circle cx={0} cy={0} r={15} fill="#48bb78" opacity="0.8" />
          <text x={0} y={6} textAnchor="middle" fontSize="20">🌿</text>
        </g>
      ))}
      
      {/* Labels des zones */}
      <g transform="translate(350, 100)">
        <text x={0} y={0} textAnchor="middle" fill="#3b82f6" fontSize="24" fontWeight="bold" opacity="0.3">
          ZONE STANDARD
        </text>
      </g>
      
      <g transform="translate(700, 230)">
        <text x={0} y={0} textAnchor="middle" fill="#8b5cf6" fontSize="24" fontWeight="bold" opacity="0.3">
          VIP
        </text>
      </g>
      
      <g transform="translate(350, 550)">
        <text x={0} y={0} textAnchor="middle" fill="#10b981" fontSize="24" fontWeight="bold" opacity="0.3">
          TERRASSE
        </text>
      </g>
      
      {/* Tapis/Zones au sol */}
      <g opacity="0.12">
        {/* Zone Standard - Grande zone centrale */}
        <rect x={180} y={120} width={380} height={280} fill="#3b82f6" rx="15" />
        {/* Zone VIP - Côté droit */}
        <rect x={620} y={80} width={220} height={350} fill="#8b5cf6" rx="15" />
        {/* Terrasse - En bas */}
        <rect x={220} y={450} width={280} height={250} fill="#10b981" rx="15" />
      </g>
    </>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Chargement du plan...</p>
        </div>
      </div>
    );
  }

  // Si aucune table n'est chargée, afficher un message
  if (!tables || tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Aucune table disponible</h2>
          <p className="text-gray-400 mb-4">Les tables ne sont pas encore configurées ou le serveur est inaccessible.</p>
          <button
            onClick={loadTables}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
          >
            🔄 Réessayer
          </button>
          <div className="mt-4 text-sm text-gray-500">
            <p>Vérifiez que:</p>
            <ul className="list-disc list-inside text-left mt-2">
              <li>Le serveur backend est démarré (port 5000)</li>
              <li>Le fichier tables.json contient des données</li>
              <li>Vous êtes connecté</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Header avec contrôles */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            Plan du Restaurant 3D
          </h1>
          
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
              <div className="text-gray-400 text-xs mb-1">Total Tables</div>
              <div className="text-white text-2xl font-bold">{stats.total}</div>
              {zoneFilter !== 'all' && (
                <div className="text-xs text-emerald-400 mt-1">
                  ({filteredTables.length} affichées)
                </div>
              )}
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30">
              <div className="text-emerald-400 text-xs mb-1">Disponibles</div>
              <div className="text-emerald-400 text-2xl font-bold">{stats.available}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <div className="text-red-400 text-xs mb-1">Réservées</div>
              <div className="text-red-400 text-2xl font-bold">{stats.reserved}</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30">
              <div className="text-orange-400 text-xs mb-1">Occupées</div>
              <div className="text-orange-400 text-2xl font-bold">{stats.occupied}</div>
            </div>
          </div>
          
          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Heure</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Zone</label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Toutes les zones</option>
                <option value="Standard">Standard</option>
                <option value="VIP">VIP</option>
                <option value="Terrasse">Terrasse</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Plan 3D */}
      <div className="h-[calc(100vh-280px)] overflow-auto p-6">
        <div className="flex items-center justify-center min-h-full">
          <svg
            viewBox="0 0 950 800"
            className="w-full max-w-6xl drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))' }}
          >
            <defs>
              <filter id="shadow">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
              <linearGradient id="floorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#1a202c', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#2d3748', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            
            {/* Sol du restaurant avec effet parquet */}
            <rect x={0} y={0} width={950} height={800} fill="url(#floorGradient)" />
            <g opacity="0.05">
              {Array.from({ length: 24 }).map((_, i) => (
                <line key={`h-${i}`} x1={0} y1={i * 33} x2={950} y2={i * 33} stroke="white" strokeWidth="1" />
              ))}
              {Array.from({ length: 28 }).map((_, i) => (
                <line key={`v-${i}`} x1={i * 34} y1={0} x2={i * 34} y2={800} stroke="white" strokeWidth="1" />
              ))}
            </g>
            
            {/* Éléments décoratifs */}
            {renderDecoration()}
            
            {/* Tables en 3D */}
            {filteredTables.map((table) => renderTable3D(table))}
          </svg>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500"></div>
            <span className="text-gray-300">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-300">Réservée</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-gray-300">Occupée</span>
          </div>
          <div className="border-l border-gray-600 h-6 mx-2"></div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪑</span>
            <span className="text-gray-300">= Nombre de places</span>
          </div>
        </div>
      </div>

      {/* Modal détails table */}
      {selectedTable && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTable(null)}
        >
          <div 
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Table N° {selectedTable.number}</h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-400">Zone</span>
                <span className="text-white font-semibold">{selectedTable.zone}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-400">Capacité</span>
                <span className="text-white font-semibold">{selectedTable.capacity} personnes</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-400">Statut</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedTable.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedTable.status === 'reserved' ? 'bg-red-500/20 text-red-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {selectedTable.status === 'available' ? '✓ Disponible' :
                   selectedTable.status === 'reserved' ? '🔒 Réservée' :
                   '👥 Occupée'}
                </span>
              </div>
              
              {selectedTable.currentReservation && (
                <div className="mt-4 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="text-red-400 font-semibold mb-2">📋 Réservation en cours</h4>
                  <div className="text-sm space-y-1 text-gray-300">
                    <p><strong>Client:</strong> {selectedTable.currentReservation.customer}</p>
                    <p><strong>Heure:</strong> {selectedTable.currentReservation.time}</p>
                    <p><strong>Personnes:</strong> {selectedTable.currentReservation.guests}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
