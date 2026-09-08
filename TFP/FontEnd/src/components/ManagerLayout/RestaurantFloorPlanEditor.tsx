import { useState, useEffect, useRef } from 'react';

interface Table {
  id: string;
  number: number;
  zone: 'Standard' | 'VIP' | 'Terrasse';
  capacity: number;
  position: { x: number; y: number };
  shape: 'circle' | 'square' | 'rectangle';
  status?: 'available' | 'reserved' | 'occupied';
  currentReservation?: any;
  currentReservations?: any[]; // Toutes les réservations de la table
  reservationCount?: number; // Nombre de réservations
}

export const RestaurantFloorPlanEditor = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadTablesWithReservations();
  }, [selectedDate, selectedTime]);

  const loadTablesWithReservations = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      // Charger les tables
      const tablesResponse = await fetch('http://localhost:5000/api/tables', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!tablesResponse.ok) {
        console.error('Erreur chargement tables:', tablesResponse.status);
        setLoading(false);
        return;
      }

      const tablesData = await tablesResponse.json();

      // Charger les réservations pour la date sélectionnée
      const reservationsResponse = await fetch(`http://localhost:5000/api/reservations?date=${selectedDate}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      let reservations: any[] = [];
      if (reservationsResponse.ok) {
        reservations = await reservationsResponse.json();
        console.log('Réservations chargées:', reservations);
      }

      // Calculer le statut de chaque table en fonction des réservations
      const tablesWithStatus = tablesData.map((table: Table) => {
        // Trouver TOUTES les réservations pour cette table (pas juste la première)
        const tableReservations = reservations.filter(r => {
          if (r.table !== table.id) return false;
          if (r.status !== 'Confirmée') return false;
          if (r.depositStatus !== 'paid') return false; // Seulement les réservations avec acompte payé

          // Vérifier chevauchement d'horaire (2h par réservation)
          const rTime = r.time;
          const [rHour, rMin] = rTime.split(':').map(Number);
          const [selHour, selMin] = selectedTime.split(':').map(Number);
          const rMinutes = rHour * 60 + rMin;
          const selMinutes = selHour * 60 + selMin;
          
          // Chevauchement si moins de 2h d'écart
          return Math.abs(rMinutes - selMinutes) < 120;
        });

        return {
          ...table,
          status: tableReservations.length > 0 ? 'reserved' : 'available',
          currentReservation: tableReservations[0] || null, // Première réservation pour compatibilité
          currentReservations: tableReservations, // Toutes les réservations
          reservationCount: tableReservations.length
        };
      });

      console.log('Tables avec statut:', tablesWithStatus);
      setTables(tablesWithStatus);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (tableId: string) => {
    if (editMode) {
      setDraggingTable(tableId);
    }
  };

  const handleDragMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingTable && editMode && svgRef.current) {
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      setTables(tables.map(t => 
        t.id === draggingTable 
          ? { ...t, position: { x: svgP.x, y: svgP.y } }
          : t
      ));
    }
  };

  const handleDragEnd = async () => {
    if (draggingTable) {
      const table = tables.find(t => t.id === draggingTable);
      if (table) {
        await saveTablePosition(table);
      }
      setDraggingTable(null);
    }
  };

  const saveTablePosition = async (table: Table) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/tables/${table.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(table)
      });

      if (response.ok) {
        console.log('Position sauvegardée');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const handleTableClick = (table: Table) => {
    if (editMode) {
      setEditingTable(table);
      setShowEditModal(true);
    } else {
      setSelectedTable(table);
    }
  };

  const updateTable = async (updatedTable: Table) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/tables/${updatedTable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedTable)
      });

      if (response.ok) {
        setTables(tables.map(t => t.id === updatedTable.id ? updatedTable : t));
        setShowEditModal(false);
        setEditingTable(null);
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
    }
  };

  const addNewTable = async () => {
    const newTable: Table = {
      id: `T${(tables.length + 1).toString().padStart(2, '0')}`,
      number: tables.length + 1,
      zone: 'Standard',
      capacity: 4,
      position: { x: 400, y: 300 },
      shape: 'square',
      status: 'available'
    };

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTable)
      });

      if (response.ok) {
        const data = await response.json();
        setTables([...tables, data.table]);
      }
    } catch (error) {
      console.error('Erreur création table:', error);
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette table ?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setTables(tables.filter(t => t.id !== tableId));
        setShowEditModal(false);
        setEditingTable(null);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
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

  // Rendu d'une table 3D avec drag & drop
  const renderTable3D = (table: Table) => {
    const { x, y } = table.position;
    const size = table.capacity <= 2 ? 60 : table.capacity <= 4 ? 80 : 100;
    
    const isoX = (x - y) * 0.866;
    const isoY = (x + y) * 0.5;
    
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
        onMouseDown={() => handleDragStart(table.id)}
        onClick={() => handleTableClick(table)}
        className={`transition-all ${editMode ? 'cursor-move' : 'cursor-pointer'} hover:opacity-80`}
        style={{ cursor: editMode ? 'move' : 'pointer' }}
      >
        <ellipse cx={0} cy={size / 2 + 5} rx={size / 2} ry={size / 4} fill="rgba(0,0,0,0.3)" />
        
        {table.shape === 'circle' ? (
          <>
            <ellipse cx={0} cy={0} rx={size / 2} ry={size / 4} fill={color.side} />
            <ellipse cx={0} cy={-15} rx={size / 2} ry={size / 4} fill={color.top} stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
            <rect x={-size / 2} y={-15} width={size} height={15} fill={color.front} opacity="0.7" />
          </>
        ) : table.shape === 'square' ? (
          <>
            <path d={`M ${size / 2} 0 L ${size / 2 + 20} -10 L ${size / 2 + 20} ${size / 2 - 10} L ${size / 2} ${size / 2} Z`} fill={color.side} />
            <rect x={-size / 2} y={0} width={size} height={size / 2} fill={color.front} />
            <path d={`M ${-size / 2} 0 L ${-size / 2 + 20} -10 L ${size / 2 + 20} -10 L ${size / 2} 0 Z`} fill={color.top} stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
          </>
        ) : (
          <>
            <path d={`M ${size / 2} 0 L ${size / 2 + 25} -12 L ${size / 2 + 25} ${size / 3 - 12} L ${size / 2} ${size / 3} Z`} fill={color.side} />
            <rect x={-size / 2} y={0} width={size} height={size / 3} fill={color.front} />
            <path d={`M ${-size / 2} 0 L ${-size / 2 + 25} -12 L ${size / 2 + 25} -12 L ${size / 2} 0 Z`} fill={color.top} stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
          </>
        )}
        
        {renderChairs(table, size)}
        
        <text x={0} y={-5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {table.number}
        </text>
        
        {table.status === 'reserved' && table.reservationCount && (
          <g transform={`translate(${size / 2 - 10}, ${-size / 2 + 10})`}>
            <circle cx={0} cy={0} r={12} fill="#ef4444" stroke="#fff" strokeWidth="2" />
            <text x={0} y={4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
              {table.reservationCount}
            </text>
          </g>
        )}
        
        {editMode && (
          <g transform={`translate(${-size / 2 - 15}, ${-size / 2})`}>
            <circle cx={0} cy={0} r={10} fill="#3b82f6" />
            <text x={0} y={4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">✎</text>
          </g>
        )}
      </g>
    );
  };

  const renderChairs = (table: Table, tableSize: number) => {
    const chairs = [];
    const chairCount = table.capacity;
    const chairSize = 15;
    const offset = tableSize / 2 + 25;
    
    for (let i = 0; i < chairCount; i++) {
      const angle = (i * 2 * Math.PI) / chairCount;
      const chairX = Math.cos(angle) * offset;
      const chairY = Math.sin(angle) * offset * 0.5;
      
      chairs.push(
        <g key={`chair-${i}`} transform={`translate(${chairX}, ${chairY})`}>
          <rect x={-chairSize / 2} y={-chairSize / 2} width={chairSize} height={chairSize} fill="#8b4513" stroke="#654321" strokeWidth="1" rx="2" />
          <rect x={-chairSize / 2} y={-chairSize / 2 - 10} width={chairSize} height={5} fill="#654321" rx="1" />
        </g>
      );
    }
    return chairs;
  };

  // Éléments du restaurant avec architecture réelle
  const renderArchitecture = () => (
    <>
      {/* ENTRÉE PRINCIPALE avec portes doubles */}
      <g transform="translate(30, 300)">
        <rect x={0} y={0} width={15} height={150} fill="#1a202c" stroke="#0f172a" strokeWidth="3" />
        <rect x={15} y={20} width={50} height={110} fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
        <rect x={20} y={25} width={18} height={50} fill="#4a5568" stroke="#718096" strokeWidth="1" />
        <rect x={42} y={25} width={18} height={50} fill="#4a5568" stroke="#718096" strokeWidth="1" />
        <circle cx={24} cy={50} r={2} fill="#cbd5e0" />
        <circle cx={56} cy={50} r={2} fill="#cbd5e0" />
        <text x={32} y={100} textAnchor="middle" fill="#cbd5e0" fontSize="12" fontWeight="bold">ENTRÉE</text>
      </g>
      
      {/* FENÊTRES - Côté gauche (vue sur rue) */}
      {[150, 280, 410, 540].map((y, i) => (
        <g key={`window-left-${i}`} transform={`translate(10, ${y})`}>
          <rect x={0} y={0} width={20} height={80} fill="#4a90e2" opacity="0.6" stroke="#2563eb" strokeWidth="2" />
          <line x1={10} y1={0} x2={10} y2={80} stroke="#1e40af" strokeWidth="1" />
          <line x1={0} y1={40} x2={20} y2={40} stroke="#1e40af" strokeWidth="1" />
          <text x={-25} y={45} fill="#60a5fa" fontSize="10" transform="rotate(-90, -25, 45)">🪟</text>
        </g>
      ))}
      
      {/* FENÊTRES - Côté droit (vue jardin) */}
      {[150, 300, 450].map((y, i) => (
        <g key={`window-right-${i}`} transform={`translate(920, ${y})`}>
          <rect x={0} y={0} width={20} height={100} fill="#4a90e2" opacity="0.6" stroke="#2563eb" strokeWidth="2" />
          <line x1={10} y1={0} x2={10} y2={100} stroke="#1e40af" strokeWidth="1" />
          <line x1={0} y1={50} x2={20} y2={50} stroke="#1e40af" strokeWidth="1" />
          <text x={35} y={55} fill="#60a5fa" fontSize="10" transform="rotate(90, 35, 55)">🪟</text>
        </g>
      ))}
      
      {/* PORTE VERS TERRASSE - Grande baie vitrée */}
      <g transform="translate(200, 720)">
        <rect x={0} y={0} width={350} height={25} fill="#4a90e2" opacity="0.7" stroke="#2563eb" strokeWidth="3" />
        {[0, 87, 174, 261].map((x, i) => (
          <line key={`glass-${i}`} x1={x + 43} y1={0} x2={x + 43} y2={25} stroke="#1e40af" strokeWidth="2" />
        ))}
        <text x={175} y={17} textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="bold">🚪 ACCÈS TERRASSE 🌿</text>
      </g>
      
      {/* BAR - avec comptoir détaillé */}
      <g transform="translate(780, 50)">
        <path d="M 0 0 L 20 -10 L 140 -10 L 120 0 Z" fill="#4a5568" />
        <rect x={0} y={0} width={120} height={80} fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
        <rect x={5} y={5} width={110} height={30} fill="#4a5568" rx="3" />
        <circle cx={30} cy={20} r={8} fill="#f59e0b" opacity="0.6" />
        <circle cx={60} cy={20} r={8} fill="#f59e0b" opacity="0.6" />
        <circle cx={90} cy={20} r={8} fill="#f59e0b" opacity="0.6" />
        <text x={60} y={55} textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="bold">🍷 BAR</text>
        <text x={60} y={72} textAnchor="middle" fill="#cbd5e0" fontSize="9">Boissons</text>
      </g>
      
      {/* CUISINE - avec zone de service */}
      <g transform="translate(780, 520)">
        <path d="M 0 0 L 20 -10 L 140 -10 L 120 0 Z" fill="#4a5568" />
        <rect x={0} y={0} width={120} height={100} fill="#1a202c" stroke="#e53e3e" strokeWidth="3" />
        <rect x={10} y={10} width={100} height={35} fill="#2d3748" />
        <text x={60} y={32} textAnchor="middle" fill="#fc8181" fontSize="14" fontWeight="bold">🔥 CUISINE</text>
        <text x={60} y={60} textAnchor="middle" fill="#cbd5e0" fontSize="9">Zone préparation</text>
        <rect x={10} y={70} width={45} height={20} fill="#e53e3e" opacity="0.3" />
        <text x={32} y={84} textAnchor="middle" fill="#fc8181" fontSize="8">Chaud</text>
        <rect x={65} y={70} width={45} height={20} fill="#3b82f6" opacity="0.3" />
        <text x={87} y={84} textAnchor="middle" fill="#60a5fa" fontSize="8">Froid</text>
      </g>
      
      {/* TOILETTES */}
      <g transform="translate(780, 380)">
        <rect x={0} y={0} width={120} height={100} fill="#374151" stroke="#1f2937" strokeWidth="2" />
        <text x={60} y={35} textAnchor="middle" fill="#9ca3af" fontSize="16">🚻</text>
        <text x={60} y={55} textAnchor="middle" fill="#d1d5db" fontSize="12" fontWeight="bold">TOILETTES</text>
        <rect x={10} y={65} width={45} height={25} fill="#3b82f6" opacity="0.2" />
        <text x={32} y={81} textAnchor="middle" fill="#60a5fa" fontSize="10">♂</text>
        <rect x={65} y={65} width={45} height={25} fill="#ec4899" opacity="0.2" />
        <text x={87} y={81} textAnchor="middle" fill="#f472b6" fontSize="10">♀</text>
      </g>
      
      {/* PLANTES DÉCORATIVES */}
      {[
        { x: 160, y: 120 },
        { x: 160, y: 400 },
        { x: 600, y: 150 },
        { x: 600, y: 450 },
        { x: 540, y: 300 },
        { x: 200, y: 440 },
        { x: 740, y: 200 },
        { x: 740, y: 450 }
      ].map((pos, i) => (
        <g key={`plant-${i}`} transform={`translate(${pos.x}, ${pos.y})`}>
          <ellipse cx={0} cy={12} rx={18} ry={10} fill="#1a202c" />
          <circle cx={0} cy={0} r={15} fill="#48bb78" opacity="0.8" />
          <text x={0} y={6} textAnchor="middle" fontSize="20">🌿</text>
        </g>
      ))}
      
      {/* LABELS DES ZONES avec cadres */}
      <g transform="translate(350, 100)">
        <rect x={-100} y={-20} width={200} height={35} fill="#3b82f6" opacity="0.15" rx="5" />
        <text x={0} y={0} textAnchor="middle" fill="#3b82f6" fontSize="24" fontWeight="bold" opacity="0.4">
          🍽️ ZONE STANDARD
        </text>
      </g>
      
      <g transform="translate(700, 230)">
        <rect x={-70} y={-20} width={140} height={35} fill="#8b5cf6" opacity="0.2" rx="5" />
        <text x={0} y={0} textAnchor="middle" fill="#8b5cf6" fontSize="24" fontWeight="bold" opacity="0.5">
          ⭐ VIP ⭐
        </text>
      </g>
      
      <g transform="translate(380, 680)">
        <rect x={-110} y={-20} width={220} height={35} fill="#10b981" opacity="0.2" rx="5" />
        <text x={0} y={0} textAnchor="middle" fill="#10b981" fontSize="24" fontWeight="bold" opacity="0.5">
          🌞 TERRASSE 🌿
        </text>
      </g>
      
      {/* ZONES AU SOL avec bordures */}
      <g opacity="0.12">
        <rect x={180} y={120} width={380} height={280} fill="#3b82f6" rx="15" />
        <rect x={620} y={80} width={145} height={350} fill="#8b5cf6" rx="15" />
        <rect x={150} y={630} width={550} height={140} fill="#10b981" rx="15" />
      </g>
      
      {/* TERRASSE - Clôture et végétation */}
      <g opacity="0.6">
        <rect x={150} y={770} width={550} height={10} fill="#059669" />
        {Array.from({ length: 20 }).map((_, i) => (
          <circle key={`bush-${i}`} cx={160 + i * 28} cy={775} r={8} fill="#10b981" opacity="0.8" />
        ))}
        <text x={425} y={790} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
          🌳🌳 Végétation / Jardin 🌳🌳
        </text>
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

  if (!tables || tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Aucune table disponible</h2>
          <p className="text-gray-400 mb-4">Les tables ne sont pas encore configurées ou le serveur est inaccessible.</p>
          <button
            onClick={loadTablesWithReservations}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Header avec contrôles */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🏢</span>
              Plan du Restaurant - Éditeur
            </h1>
            
            {/* Bouton Mode Édition */}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center gap-2 ${
                editMode 
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
              }`}
            >
              {editMode ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Terminer l'édition
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Mode Édition
                </>
              )}
            </button>
          </div>
          
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
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
            {editMode && (
              <button
                onClick={addNewTable}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter Table
              </button>
            )}
          </div>
          
          {/* Filtres */}
          {!editMode && (
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
          )}
          
          {editMode && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
              <p className="text-orange-400 text-sm font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mode édition activé : Glissez-déposez les tables pour les repositionner, cliquez pour modifier les propriétés
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Plan 3D */}
      <div className="h-[calc(100vh-300px)] overflow-auto p-6">
        <div className="flex items-center justify-center min-h-full">
          <svg
            ref={svgRef}
            viewBox="0 0 950 800"
            className="w-full max-w-6xl drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))' }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
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
            
            {/* Architecture et décoration */}
            {renderArchitecture()}
            
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
            <span className="text-2xl">🪟</span>
            <span className="text-gray-300">Fenêtres</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚪</span>
            <span className="text-gray-300">Portes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-gray-300">Plantes</span>
          </div>
        </div>
      </div>

      {/* Modal d'édition de table */}
      {showEditModal && editingTable && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Modifier Table N° {editingTable.number}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Numéro</label>
                <input
                  type="number"
                  value={editingTable.number}
                  onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Zone</label>
                <select
                  value={editingTable.zone}
                  onChange={(e) => setEditingTable({ ...editingTable, zone: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Standard">Standard</option>
                  <option value="VIP">VIP</option>
                  <option value="Terrasse">Terrasse</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Capacité</label>
                <select
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  {[2, 4, 6, 8].map(cap => (
                    <option key={cap} value={cap}>{cap} personnes</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Forme</label>
                <select
                  value={editingTable.shape}
                  onChange={(e) => setEditingTable({ ...editingTable, shape: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="circle">Ronde</option>
                  <option value="square">Carrée</option>
                  <option value="rectangle">Rectangulaire</option>
                </select>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => updateTable(editingTable)}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  💾 Sauvegarder
                </button>
                <button
                  onClick={() => deleteTable(editingTable.id)}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails table (mode consultation) */}
      {selectedTable && !editMode && (
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
              
              {selectedTable.currentReservations && selectedTable.currentReservations.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-red-400 font-semibold flex items-center gap-2">
                    📋 Réservations ({selectedTable.currentReservations.length})
                  </h4>
                  {selectedTable.currentReservations.map((reservation: any, index: number) => (
                    <div key={reservation.id || index} className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-300">
                          Réservation #{index + 1}
                        </div>
                        <div className="text-lg font-bold text-red-400">
                          {reservation.time}
                        </div>
                      </div>
                      <div className="text-sm space-y-2 text-gray-300">
                        <p><strong className="text-gray-400">Client:</strong> {reservation.customer}</p>
                        <p><strong className="text-gray-400">Téléphone:</strong> {reservation.phone}</p>
                        <p><strong className="text-gray-400">Personnes:</strong> {reservation.guests}</p>
                        {reservation.occasion && (
                          <p><strong className="text-gray-400">Occasion:</strong> 🎉 {reservation.occasion}</p>
                        )}
                        {reservation.notes && (
                          <p className="text-xs bg-gray-700/50 p-2 rounded mt-2">
                            <strong className="text-gray-400">Note:</strong> {reservation.notes}
                          </p>
                        )}
                      </div>
                      {reservation.depositAmount && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          reservation.depositStatus === 'paid'
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-400">Acompte (25%)</span>
                            <span className={`text-sm font-bold ${
                              reservation.depositStatus === 'paid'
                                ? 'text-emerald-400'
                                : 'text-yellow-400'
                            }`}>
                              {reservation.depositAmount?.toLocaleString()} FCFA
                            </span>
                          </div>
                          {reservation.depositStatus === 'paid' ? (
                            <span className="text-xs text-emerald-400">✅ Payé - Remboursable si présent</span>
                          ) : (
                            <span className="text-xs text-yellow-400">⏳ En attente de paiement</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
