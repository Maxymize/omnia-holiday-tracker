// Example usage of the RecentActivities component
// This file demonstrates how to use the component with sample data

'use client';

import { useState } from 'react';
import { RecentActivities } from './recent-activities';

// Sample data for demonstration
const sampleActivities = [
  {
    id: '1',
    type: 'holiday_request' as const,
    title: 'Richiesta ferie estive',
    description: 'Mario Rossi ha richiesto 10 giorni di ferie dal 15 al 26 agosto 2024',
    date: '2024-08-01T10:30:00Z',
    user: {
      name: 'Mario Rossi',
      email: 'mario.rossi@omniaservices.net'
    },
    status: 'pending'
  },
  {
    id: '2',
    type: 'employee_registration' as const,
    title: 'Nuova registrazione dipendente',
    description: 'Laura Bianchi si è registrata nel sistema e attende approvazione',
    date: '2024-07-30T14:45:00Z',
    user: {
      name: 'Laura Bianchi',
      email: 'laura.bianchi@omniaservices.net'
    }
  },
  {
    id: '3',
    type: 'holiday_approved' as const,
    title: 'Ferie approvate',
    description: 'Le ferie di Giuseppe Verdi sono state approvate dal manager',
    date: '2024-07-28T09:15:00Z',
    user: {
      name: 'Giuseppe Verdi',
      email: 'giuseppe.verdi@omniaservices.net'
    },
    status: 'approved'
  },
  {
    id: '4',
    type: 'holiday_rejected' as const,
    title: 'Ferie rifiutate',
    description: 'Le ferie di Anna Neri sono state rifiutate per sovrapposizione con altri dipendenti',
    date: '2024-07-25T16:20:00Z',
    user: {
      name: 'Anna Neri',
      email: 'anna.neri@omniaservices.net'
    },
    status: 'rejected'
  },
  {
    id: '5',
    type: 'holiday_request' as const,
    title: 'Richiesta permesso personale',
    description: 'Francesco Blu ha richiesto 1 giorno di permesso personale per il 2 settembre',
    date: '2024-07-22T11:00:00Z',
    user: {
      name: 'Francesco Blu',
      email: 'francesco.blu@omniaservices.net'
    },
    status: 'pending'
  }
];

export function RecentActivitiesExample() {
  const [activities, setActivities] = useState(sampleActivities);
  const [loading, setLoading] = useState(false);

  // Simula la funzione di eliminazione
  const handleDeleteActivities = async (activityIds: string[]) => {
    setLoading(true);
    // Simula una chiamata API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Rimuove le attività selezionate
    setActivities(prev => prev.filter(activity => !activityIds.includes(activity.id)));
    setLoading(false);
  };

  // Simula la funzione di refresh
  const handleRefresh = () => {
    setLoading(true);
    // Simula una chiamata API
    setTimeout(() => {
      // In un caso reale, qui faresti una chiamata al server
      console.log('Refreshing activities...');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo - Componente Attività Recenti
        </h1>
        <p className="text-gray-600">
          Questo è un esempio di utilizzo del componente RecentActivities con dati di esempio.
          Il componente supporta tutte le funzionalità richieste: paginazione, selezione, 
          ordinamento, ricerca, e eliminazione bulk.
        </p>
      </div>

      <RecentActivities
        activities={activities}
        loading={loading}
        onDeleteActivities={handleDeleteActivities}
        onRefresh={handleRefresh}
      />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Funzionalità implementate:</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li><strong>Paginazione</strong>: 10, 25, 50, 100 elementi per pagina</li>
          <li><strong>Selezione</strong>: Checkbox individuali e &ldquo;seleziona tutto&rdquo;</li>
          <li><strong>Ordinamento</strong>: Per data (più recenti/più vecchie)</li>
          <li><strong>Ricerca</strong>: Per titolo, descrizione, nome utente, email</li>
          <li><strong>Filtri</strong>: Per tipo di attività</li>
          <li><strong>Eliminazione bulk</strong>: Con dialog di conferma</li>
          <li><strong>Loading states</strong>: Skeleton durante il caricamento</li>
          <li><strong>Empty state</strong>: Messaggio quando non ci sono attività</li>
          <li><strong>Responsive design</strong>: Ottimizzato per mobile e desktop</li>
          <li><strong>Accessibilità</strong>: ARIA labels e navigazione da tastiera</li>
        </ul>
      </div>
    </div>
  );
}

// Esempio di integrazione nel dashboard admin
export function AdminDashboardWithRecentActivities() {
  // In un caso reale, questi dati verrebbero dal server
  const [activities, setActivities] = useState(sampleActivities);
  const [loading, setLoading] = useState(false);

  const handleDeleteActivities = async (activityIds: string[]) => {
    try {
      // Chiamata API per eliminare le attività
      const baseUrl = window.location.origin;
      
      const response = await fetch(`${baseUrl}/.netlify/functions/delete-activities`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ activityIds }),
      });

      if (!response.ok) {
        throw new Error('Errore durante l&apos;eliminazione delle attività');
      }

      // Aggiorna lo stato locale
      setActivities(prev => prev.filter(activity => !activityIds.includes(activity.id)));
    } catch (error) {
      console.error('Errore:', error);
      throw error; // Rilancia l'errore per permettere al componente di gestirlo
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Chiamata API per recuperare le attività aggiornate
      const baseUrl = window.location.origin;
      
      const response = await fetch(`${baseUrl}/.netlify/functions/get-recent-activities`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Errore durante il refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecentActivities
      activities={activities}
      loading={loading}
      onDeleteActivities={handleDeleteActivities}
      onRefresh={handleRefresh}
    />
  );
}