# 💰 Budget App

App web personale per gestire il budget mensile con collegamento automatico alla banca.

## Funzionalità

- ✅ Collegamento automatico alla banca (Open Banking)
- ✅ Categorizzazione automatica delle spese (Necessità, Svago, Risparmio)
- ✅ Dashboard con visualizzazione budget rimanente
- ✅ Grafici distribuzione spese
- ✅ Aggiunta transazioni manuali
- ✅ Setup guidato del budget

## Requisiti

- Node.js 18+ **oppure** Docker
- Account GoCardless/Nordigen (gratuito) per l'Open Banking

## Avvio Rapido con Docker

```bash
# Clona il progetto
git clone <url-repo>
cd budget-app

# Avvia con Docker
docker-compose up --build
```

Apri http://localhost:8080

## Setup Manuale

### 1. Ottieni le API Key di GoCardless

1. Vai su https://bankaccountdata.gocardless.com/
2. Registrati (è gratuito per uso personale)
3. Crea un nuovo "Secret" e copia `secret_id` e `secret_key`

### 2. Configura il Backend

```bash
cd backend

# Crea il file .env
cp .env.example .env

# Modifica .env con le tue chiavi
# NORDIGEN_SECRET_ID=xxx
# NORDIGEN_SECRET_KEY=xxx

# Installa dipendenze
npm install

# Avvia il server
npm run dev
```

### 3. Configura il Frontend

```bash
cd frontend

# Installa dipendenze
npm install

# Avvia l'app
npm run dev
```

### 4. Apri l'app

Vai su http://localhost:5173

## Come Funziona

### Setup Iniziale
1. Inserisci il tuo stipendio mensile (es. 900€)
2. Decidi come dividere il budget:
   - **Necessità** (50%): Affitto, bollette, spesa, trasporti
   - **Svago** (30%): Ristoranti, shopping, intrattenimento
   - **Risparmio** (20%): Da mettere da parte

### Collegamento Banca
1. Vai in Impostazioni → Collega Banca
2. Seleziona la tua banca
3. Autorizza l'accesso (usa le credenziali della tua banca)
4. Le transazioni vengono sincronizzate automaticamente

### Categorizzazione
L'app categorizza automaticamente le spese in base al nome:
- **Necessità**: Supermercati (Esselunga, Conad...), bollette (Enel, TIM...), affitto
- **Svago**: Ristoranti, Netflix, Amazon, viaggi
- **Risparmio**: Obiettivo mensile fisso

Puoi sempre modificare manualmente la categoria di ogni transazione.

## Struttura Progetto

```
budget-app/
├── backend/
│   ├── server.js          # Server Express
│   ├── database.js        # Database SQLite
│   ├── routes/
│   │   ├── bank.js        # API connessione banca
│   │   ├── budget.js      # API budget/settings
│   │   └── transactions.js # API transazioni
│   └── services/
│       ├── nordigen.js    # Integrazione Open Banking
│       └── categorizer.js # Categorizzazione automatica
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Home con riepilogo
│   │   │   ├── Setup.jsx       # Setup iniziale
│   │   │   ├── Transactions.jsx # Lista transazioni
│   │   │   └── Settings.jsx    # Impostazioni
│   │   └── services/
│   │       └── api.js          # Chiamate API
│   └── index.html
│
└── README.md
```

## Tecnologie

- **Frontend**: React + Vite + Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite (locale)
- **Open Banking**: GoCardless (Nordigen)

## Note

- I dati sono salvati localmente in `backend/budget.db`
- L'app usa solo lettura dei dati bancari (non può fare movimenti)
- La connessione banca scade dopo 90 giorni (va ricollegata)
