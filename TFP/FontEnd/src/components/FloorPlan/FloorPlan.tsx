import React, { useEffect, useMemo, useState } from 'react';

type TableItem = {
  id: string;
  number: number;
  zone: string;
  capacity: number;
  position: { x: number; y: number };
  shape?: string;
  status?: string;
  currentReservation?: any;
};

type AreaOverlay = {
  label: string;
  left: string;
  top: string;
  width: string;
  height: string;
  color: string;
  border: string;
  extra?: string;
};

const HOURS = ['12:00','12:30','13:00','13:30','14:00','19:00','19:30','20:00','20:30','21:00','21:30'];
const BASE_WIDTH = 900;
const BASE_HEIGHT = 750;

export const FloorPlan: React.FC<{
  imageSrc?: string;
  onSelectTable?: (table: TableItem) => void;
}> = ({ imageSrc = '/assets/floorplan.webp', onSelectTable }) => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('19:00');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const areaOverlays: AreaOverlay[] = useMemo(() => ([
    { label: 'Terrasse', left: '5%', top: '58%', width: '60%', height: '37%', color: 'bg-emerald-500/5', border: 'border-emerald-500/50', extra: 'backdrop-blur-sm' },
    { label: 'Zone VIP', left: '62%', top: '15%', width: '30%', height: '38%', color: 'bg-violet-500/10', border: 'border-violet-400/40', extra: 'backdrop-blur-sm' },
    { label: 'Bar', left: '10%', top: '10%', width: '25%', height: '22%', color: 'bg-amber-400/10', border: 'border-amber-400/60', extra: 'backdrop-blur-sm' },
    { label: 'Toilettes', left: '80%', top: '60%', width: '12%', height: '18%', color: 'bg-cyan-400/10', border: 'border-cyan-300/60', extra: 'backdrop-blur-sm' },
  ]), []);

  const structuralElements = useMemo(() => ([
    { label: 'Fenêtre', left: '15%', top: '8%', width: '25%', height: '2%', color: 'bg-white/70' },
    { label: 'Fenêtre', left: '55%', top: '8%', width: '15%', height: '2%', color: 'bg-white/70' },
    { label: 'Fenêtre', left: '20%', top: '55%', width: '40%', height: '1.5%', color: 'bg-white/60' },
    { label: 'Porte', left: '5%', top: '40%', width: '2%', height: '12%', color: 'bg-emerald-400/70' },
    { label: 'Porte', left: '90%', top: '40%', width: '2%', height: '12%', color: 'bg-emerald-400/70' }
  ]), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/tables?date=${date}&time=${time}`);
        if (!resp.ok) {
          throw new Error('Impossible de charger les tables');
        }
        const data = await resp.json();
        setTables(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('FloorPlan fetch error', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date, time]);

  const getPct = (value: number, base: number) => `${(value / base) * 100}%`;

  const tablesByZone = useMemo(() => {
    return tables.reduce<Record<string, TableItem[]>>((acc, table) => {
      acc[table.zone] = acc[table.zone] ? [...acc[table.zone], table] : [table];
      return acc;
    }, {});
  }, [tables]);

  const statusStyles = (table: TableItem) => {
    const isReserved = table.status === 'reserved' || (Array.isArray(table.currentReservations) && table.currentReservations.length > 0);
    const isSelected = selectedTableId === table.id;
    if (isReserved) {
      return 'bg-red-500/90 text-white border-red-100/60';
    }
    if (isSelected) {
      return 'bg-emerald-400 text-gray-900 border-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110';
    }
    return 'bg-emerald-500/90 text-white border-white/40 hover:scale-110';
  };

  const handleClick = (table: TableItem) => {
    setSelectedTableId(table.id);
    onSelectTable?.(table);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-3 text-xs md:text-sm">
        <label className="flex items-center gap-2">
          <span className="text-gray-400">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-white"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-400">Heure</span>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-white"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Réservée</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-white inline-block"></span>Votre sélection</span>
        </div>
      </div>

      <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl shadow-emerald-500/20">
        <img
          src={imageSrc}
          alt="Plan du restaurant"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* zone overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {areaOverlays.map((area) => (
            <div
              key={area.label}
              className={`${area.color} border ${area.border} ${area.extra ?? ''} absolute rounded-2xl flex items-start justify-between px-3 py-2 text-[12px] uppercase tracking-wide text-white/80`}
              style={{ left: area.left, top: area.top, width: area.width, height: area.height }}
            >
              <span>{area.label}</span>
            </div>
          ))}

          {structuralElements.map((el, idx) => (
            <div
              key={`${el.label}-${idx}`}
              className={`${el.color} absolute rounded-full opacity-70`}
              style={{ left: el.left, top: el.top, width: el.width, height: el.height }}
            ></div>
          ))}
        </div>

        {/* tables */}
        <div className="absolute inset-0 pointer-events-none">
          {tables.map((table) => {
            const left = getPct(table.position.x, BASE_WIDTH);
            const top = getPct(table.position.y, BASE_HEIGHT);
            const hasReservation = Array.isArray((table as any).currentReservations) ? (table as any).currentReservations.length > 0 : !!table.currentReservation;
            const tooltip = hasReservation && (table as any).currentReservations?.[0]
              ? `Table ${table.number} — déjà prise à ${time} par ${(table as any).currentReservations?.[0]?.customer ?? 'client'}`
              : `Table ${table.number} (${table.zone}) — ${table.capacity} pers.`;

            return (
              <button
                key={table.id}
                onClick={() => handleClick(table)}
                style={{ left, top, transform: 'translate(-50%, -50%)' }}
                className={`pointer-events-auto absolute flex items-center justify-center text-xs font-semibold rounded-full w-10 h-10 border-2 transition transform duration-200 ${statusStyles(table)}`}
                title={tooltip}
                disabled={hasReservation}
              >
                {table.number}
              </button>
            );
          })}
        </div>

        {/* loading state */}
        {loading && (
          <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center text-white text-sm">
            Chargement du plan...
          </div>
        )}
      </div>

      {/* quick stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300">
        {Object.entries(tablesByZone).map(([zone, zoneTables]) => {
          const reservedCount = zoneTables.filter((t) => t.status === 'reserved' || (t as any).currentReservations?.length).length;
          return (
            <div key={zone} className="rounded-xl border border-gray-700/60 bg-gray-900/80 px-4 py-3">
              <p className="text-emerald-400 text-sm font-semibold">{zone}</p>
              <p className="text-xs">{zoneTables.length - reservedCount} libres / {zoneTables.length} tables</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FloorPlan;
