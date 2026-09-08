import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const ClientVerification = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'present' | 'absent' | null>(null);

  const [debugInfo, setDebugInfo] = useState<{
    tokenPresent: boolean;
    backendOnline: boolean;
    lastStatus: number | null;
    lastError: string | null;
  }>({ tokenPresent: false, backendOnline: false, lastStatus: null, lastError: null });

  const [results, setResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    // Vérifier token local
    const token = localStorage.getItem('auth_token');
    setDebugInfo((d) => ({ ...d, tokenPresent: !!token }));

    // Ping health endpoint
    fetch('http://localhost:5000/').then((r) => {
      setDebugInfo((d) => ({ ...d, backendOnline: r.ok, lastStatus: r.status }));
    }).catch((e) => {
      setDebugInfo((d) => ({ ...d, backendOnline: false, lastError: String(e) }));
    });
  }, []);

  const loadAllClients = async () => {
    setLoadingResults(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Charger toutes les réservations
      const resResponse = await fetch('http://localhost:5000/api/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reservations = resResponse.ok ? await resResponse.json() : [];

      // Charger tous les utilisateurs (si autorisé)
      const usersResponse = await fetch('http://localhost:5000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const users = usersResponse.ok ? await usersResponse.json() : [];

      // Normaliser en une seule liste
      const normalized: any[] = [];

      (reservations || []).forEach((r: any) => {
        normalized.push({
          id: r.id,
          kind: 'reservation',
          name: r.customer,
          phone: r.phone,
          email: r.email,
          date: r.date,
          raw: r
        });
      });

      (users || []).forEach((u: any) => {
        normalized.push({
          id: u.id,
          kind: 'user',
          name: u.name || u.customer || u.email,
          phone: u.phone,
          email: u.email,
          raw: u
        });
      });

      setResults(normalized);
    } catch (e: any) {
      console.error('Erreur chargement clients:', e);
      setDebugInfo((d) => ({ ...d, lastError: String(e) }));
      toast.error('Impossible de charger la liste des clients');
    } finally {
      setLoadingResults(false);
    }
  };

  const searchClient = async () => {
    if (!searchTerm.trim()) {
      toast.error('Veuillez entrer un nom, email ou téléphone');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Rechercher dans les réservations
      const resResponse = await fetch('http://localhost:5000/api/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (resResponse.ok) {
        const reservations = await resResponse.json();
        const found = reservations.find((r: any) => 
          r.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.phone?.includes(searchTerm)
        );
        
        if (found) {
          setClient(found);
          setVerificationStatus(null);
          return;
        }
      }

      // Rechercher dans les utilisateurs
      const usersResponse = await fetch('http://localhost:5000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        const foundUser = users.find((u: any) => 
          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phone?.includes(searchTerm)
        );
        
        if (foundUser) {
          setClient({ ...foundUser, type: 'user' });
          setVerificationStatus(null);
          return;
        }
      }

      toast.error('Client non trouvé');
      setClient(null);
    } catch (error) {
      console.error('Erreur:', error);
      setDebugInfo((d) => ({ ...d, lastError: (error as any)?.message || String(error) }));
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const markPresence = async (status: 'present' | 'absent') => {
    setVerificationStatus(status);
    
    if (client && client.id && !client.type) {
      // C'est une réservation
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`http://localhost:5000/api/reservations/${client.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            status: status === 'present' ? 'seated' : 'no-show' 
          })
        });
        
        toast.success(status === 'present' ? 'Client marqué présent' : 'Absence enregistrée');
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de l\'enregistrement');
      }
    } else {
      toast.success(status === 'present' ? 'Client marqué présent' : 'Absence enregistrée');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-neutral-100 mb-2">Vérification des Clients</h1>
        <p className="text-neutral-400 text-lg">Vérifiez la présence des clients et validez leurs réservations</p>
      </div>

      {/* Debug info (visible pour diagnostic) */}
      <div className="mb-4 p-3 rounded-xl bg-neutral-900/40 border border-neutral-800 text-sm">
        <div className="flex gap-4">
          <div>Token présent: <strong className="ml-1">{debugInfo.tokenPresent ? 'oui' : 'non'}</strong></div>
          <div>Backend: <strong className="ml-1">{debugInfo.backendOnline ? `en ligne (${debugInfo.lastStatus})` : 'inaccessible'}</strong></div>
          {debugInfo.lastError && <div className="text-warning-DEFAULT">Erreur: {debugInfo.lastError}</div>}
        </div>
      </div>

      {/* Search */}
      <div className="card-elevated mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nom, email ou téléphone du client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchClient()}
            className="input-field flex-1"
          />
          <button
            onClick={searchClient}
            disabled={loading}
            className="btn-primary px-8 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Recherche...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Rechercher
              </>
            )}
          </button>
        </div>
      </div>

      {/* Actions: afficher tous */}
      <div className="mb-6 flex gap-3 items-center">
        <button
          onClick={loadAllClients}
          disabled={loadingResults}
          className="btn-secondary"
        >
          {loadingResults ? 'Chargement...' : 'Afficher tous les clients'}
        </button>
        <p className="text-sm text-neutral-400">Cliquez sur un client pour voir ses détails à droite</p>
      </div>

      {/* Liste des résultats */}
      {results.length > 0 && (
        <div className="card-elevated mb-6 p-2 max-h-64 overflow-auto">
          {results.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-md hover:bg-neutral-900/30 cursor-pointer flex justify-between items-center"
              onClick={() => {
                // Si c'est une réservation, ouvrir la réservation; si user, ouvrir profil
                if (r.kind === 'reservation') {
                  setClient(r.raw);
                } else {
                  setClient({ ...r.raw, type: 'user' });
                }
                setVerificationStatus(null);
              }}
            >
              <div>
                <div className="text-neutral-100 font-semibold">{r.name}</div>
                <div className="text-neutral-400 text-sm">{r.email || r.phone}</div>
              </div>
              <div className="text-neutral-400 text-sm">{r.kind === 'reservation' ? r.date : 'Client'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Client Info */}
      {client && (
        <div className="card-elevated">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-neutral-100">Informations du Client</h2>
              {verificationStatus && (
                <span className={verificationStatus === 'present' ? 'badge-success text-lg' : 'badge-error text-lg'}>
                  {verificationStatus === 'present' ? '✓ Présent' : '✗ Absent'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-neutral-900/50 rounded-xl p-4">
                  <p className="text-sm text-neutral-500 mb-1">Nom complet</p>
                  <p className="text-lg text-neutral-100 font-semibold">{client.customer || client.name}</p>
                </div>

                <div className="bg-neutral-900/50 rounded-xl p-4">
                  <p className="text-sm text-neutral-500 mb-1">Email</p>
                  <p className="text-neutral-100">{client.email}</p>
                </div>

                <div className="bg-neutral-900/50 rounded-xl p-4">
                  <p className="text-sm text-neutral-500 mb-1">Téléphone</p>
                  <p className="text-neutral-100">{client.phone || 'Non renseigné'}</p>
                </div>

                <div className="bg-neutral-900/50 rounded-xl p-4">
                  <p className="text-sm text-neutral-500 mb-1">Adresse</p>
                  <p className="text-neutral-100">{client.address || 'Non renseignée'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {client.date && (
                  <div className="bg-neutral-900/50 rounded-xl p-4">
                    <p className="text-sm text-neutral-500 mb-1">Date de réservation</p>
                    <p className="text-lg text-neutral-100 font-semibold">
                      {new Date(client.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}

                {client.time && (
                  <div className="bg-neutral-900/50 rounded-xl p-4">
                    <p className="text-sm text-neutral-500 mb-1">Heure</p>
                    <p className="text-lg text-neutral-100 font-semibold">{client.time}</p>
                  </div>
                )}

                {client.guests && (
                  <div className="bg-neutral-900/50 rounded-xl p-4">
                    <p className="text-sm text-neutral-500 mb-1">Nombre de personnes</p>
                    <p className="text-lg text-neutral-100 font-semibold">{client.guests} personne(s)</p>
                  </div>
                )}

                {client.table && (
                  <div className="bg-neutral-900/50 rounded-xl p-4">
                    <p className="text-sm text-neutral-500 mb-1">Table assignée</p>
                    <p className="text-lg text-neutral-100 font-semibold">{client.table}</p>
                  </div>
                )}

                {client.zone && (
                  <div className="bg-neutral-900/50 rounded-xl p-4">
                    <p className="text-sm text-neutral-500 mb-1">Zone</p>
                    <p className="text-lg text-neutral-100 font-semibold">{client.zone}</p>
                  </div>
                )}
              </div>
            </div>

            {client.notes && (
              <div className="mt-4 bg-warning-DEFAULT/10 border border-warning-DEFAULT/30 rounded-xl p-4">
                <p className="text-sm text-warning-light font-semibold mb-2">Notes spéciales</p>
                <p className="text-neutral-200">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => markPresence('present')}
              disabled={verificationStatus !== null}
              className="btn-success flex-1 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Marquer Présent
            </button>
            <button
              onClick={() => markPresence('absent')}
              disabled={verificationStatus !== null}
              className="btn-error flex-1 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Marquer Absent
            </button>
          </div>

          <button
            onClick={() => {
              setClient(null);
              setSearchTerm('');
              setVerificationStatus(null);
            }}
            className="w-full mt-4 btn-secondary"
          >
            Nouvelle recherche
          </button>
        </div>
      )}

      {/* Instructions */}
      {!client && !loading && (
        <div className="card-elevated">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-brand-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-100 mb-2">Rechercher un client</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              Entrez le nom, l'email ou le numéro de téléphone du client pour vérifier sa présence et consulter ses informations
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
