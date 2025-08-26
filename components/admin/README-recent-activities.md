# RecentActivities Component

Un componente avanzato per la visualizzazione e gestione delle attività recenti nel dashboard amministrativo di Omnia Holiday Tracker.

## 🎯 Funzionalità

### ✅ Funzionalità Base
- **Visualizzazione attività**: Mostra una lista di attività recenti con dettagli completi
- **Design responsivo**: Ottimizzato per desktop, tablet e mobile
- **Loading states**: Skeleton loader durante il caricamento
- **Empty state**: Messaggio informativo quando non ci sono attività

### ✅ Paginazione Avanzata
- **Dimensioni pagina configurabili**: 10, 25, 50, 100 elementi per pagina
- **Navigazione completa**: Prima pagina, precedente, successiva, ultima pagina
- **Indicatori**: Mostra "Pagina X di Y" e range elementi correnti

### ✅ Selezione e Azioni Bulk
- **Selezione individuale**: Checkbox per ogni attività
- **Seleziona tutto**: Checkbox master per selezionare tutte le attività visibili
- **Eliminazione bulk**: Elimina più attività contemporaneamente
- **Dialog di conferma**: Conferma prima dell'eliminazione con avviso

### ✅ Ricerca e Filtri
- **Ricerca testuale**: Cerca in titolo, descrizione, nome utente, email
- **Filtri per tipo**: Filtra per tipo di attività
- **Ordinamento**: Per data (più recenti/più vecchie)
- **Reset filtri**: Pulsante per rimuovere tutti i filtri

### ✅ UX/UI Avanzate
- **Icone specifiche**: Ogni tipo di attività ha la sua icona
- **Badge colorati**: Codifica colore per tipo di attività
- **Timestamps intelligenti**: "2 ore fa", "Ieri", etc.
- **Feedback visivo**: Stati di selezione e hover
- **Accessibilità**: ARIA labels e navigazione da tastiera

## 📋 Interfacce TypeScript

```typescript
interface Activity {
  id: string;
  type: 'holiday_request' | 'employee_registration' | 'holiday_approved' | 'holiday_rejected';
  title: string;
  description: string;
  date: string; // ISO date
  user: {
    name: string;
    email: string;
  };
  status?: string;
}

interface RecentActivitiesProps {
  activities: Activity[];
  loading: boolean;
  onDeleteActivities: (activityIds: string[]) => Promise<void>;
  onRefresh: () => void;
}
```

## 🚀 Utilizzo Basico

```tsx
import { RecentActivities } from '@/components/admin/recent-activities';

function AdminDashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDeleteActivities = async (activityIds: string[]) => {
    // Implementa la logica di eliminazione
    await deleteActivitiesFromServer(activityIds);
    // Aggiorna lo stato locale
    setActivities(prev => prev.filter(a => !activityIds.includes(a.id)));
  };

  const handleRefresh = () => {
    // Implementa la logica di refresh
    fetchActivitiesFromServer();
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
```

## 🎨 Tipologie di Attività

Il componente supporta quattro tipi di attività con icone e colori specifici:

| Tipo | Label | Icona | Colore Badge |
|------|-------|-------|-------------|
| `holiday_request` | Richiesta Ferie | FileText | Blu |
| `employee_registration` | Registrazione Dipendente | UserCheck | Viola |
| `holiday_approved` | Ferie Approvate | CheckCircle | Verde |
| `holiday_rejected` | Ferie Rifiutate | XCircle | Rosso |

## 📱 Design Responsivo

### Desktop (≥1024px)
- Layout a colonne complete
- Tutti i dettagli visibili
- Hover states completi

### Tablet (768px-1023px)
- Layout adattato per spazio ridotto
- Dettagli principali visibili
- Touch-friendly

### Mobile (≤767px)
- Layout compatto
- Informazioni essenziali
- Navigazione touch ottimizzata

## 🔧 Personalizzazione

### Modificare le Dimensioni di Paginazione
```typescript
// Modifica la costante PAGINATION_OPTIONS in recent-activities.tsx
const PAGINATION_OPTIONS = [5, 15, 30, 60] as const;
```

### Aggiungere Nuovi Tipi di Attività
```typescript
// 1. Aggiorna l'interfaccia Activity
type ActivityType = 'holiday_request' | 'employee_registration' | 'holiday_approved' | 'holiday_rejected' | 'new_type';

// 2. Aggiorna getActivityTypeInfo()
case 'new_type':
  return {
    label: 'Nuovo Tipo',
    icon: YourIcon,
    badgeClass: 'bg-indigo-100 text-indigo-800',
  };
```

### Personalizzare i Timestamp
```typescript
// Modifica la funzione formatDate() per cambiare il formato delle date
const formatDate = useCallback((dateString: string) => {
  // La tua logica di formattazione personalizzata
}, []);
```

## ⚠️ Gestione Errori

Il componente gestisce diversi scenari di errore:

### Eliminazione Fallita
```typescript
const handleDeleteActivities = async (activityIds: string[]) => {
  try {
    await deleteFromServer(activityIds);
  } catch (error) {
    // Il componente mostrerà lo stato di errore
    throw error; // Importante: rilancia l'errore
  }
};
```

### Dati Mancanti
- Se `activities` è vuoto, mostra l'empty state
- Se `user.name` è mancante, usa l'email come fallback
- Se la data è invalida, mostra "Data non valida"

## 🔒 Sicurezza

### Validazione Input
- Tutti i campi di ricerca sono sanitizzati
- I filtri validano i valori consentiti
- Le selezioni sono validate prima dell'eliminazione

### Autenticazione
```typescript
// Esempio di chiamata autenticata
const response = await fetch('/api/activities', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🧪 Testing

### Test di Unità Suggeriti
```typescript
// Esempio con React Testing Library
describe('RecentActivities', () => {
  it('mostra le attività correttamente', () => {
    render(<RecentActivities activities={mockActivities} />);
    expect(screen.getByText('Attività Recenti')).toBeInTheDocument();
  });

  it('gestisce la selezione', () => {
    // Test per selezione checkbox
  });

  it('filtra per tipo di attività', () => {
    // Test per filtri
  });
});
```

### Test E2E Suggeriti
- Flusso completo di selezione ed eliminazione
- Navigazione paginazione
- Ricerca e filtri
- Responsive behavior

## 🚀 Performance

### Ottimizzazioni Implementate
- **useMemo**: Per filtri e ordinamento costosi
- **useCallback**: Per funzioni che potrebbero causare re-render
- **Paginazione**: Limita gli elementi DOM renderizzati
- **Lazy loading**: Skeleton durante il caricamento

### Suggerimenti per Grandi Dataset
```typescript
// Per dataset molto grandi (>1000 elementi)
// Considera la paginazione server-side
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(25);

// Chiamata API con paginazione
const fetchActivities = async (page: number, size: number) => {
  const response = await fetch(`/api/activities?page=${page}&size=${size}`);
  return response.json();
};
```

## 🌍 Internazionalizzazione

Il componente è completamente in italiano come richiesto, ma può essere facilmente adattato per il sistema i18n del progetto:

```typescript
// Esempio di integrazione con il sistema i18n
const t = useTranslation();

// Sostituire le stringhe hardcoded con:
<span>{t('admin.activities.title')}</span>
```

## 📝 Note di Implementazione

### Integrazione con il Backend
Il componente si aspetta funzioni Netlify che gestiscano:
- `GET /get-recent-activities`: Recupera le attività
- `DELETE /delete-activities`: Elimina le attività selezionate

### Stato Globale
Se usi Zustand o altro state manager:
```typescript
// Esempio con Zustand
const useActivitiesStore = create((set) => ({
  activities: [],
  loading: false,
  deleteActivities: async (ids) => {
    // Logica di eliminazione
  }
}));
```

## 🤝 Contribuzione

Per modifiche o miglioramenti:
1. Mantieni la compatibilità dell'interfaccia
2. Aggiungi test per nuove funzionalità
3. Aggiorna questa documentazione
4. Segui i pattern di codice esistenti

---

**Creato per**: Omnia Holiday Tracker  
**Versione**: 1.0.0  
**Linguaggio**: Italiano  
**Framework**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui