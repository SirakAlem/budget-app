import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeConnection, syncTransactions } from '../services/api';

function Callback() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Completamento connessione banca...');
  const navigate = useNavigate();

  useEffect(() => {
    completeLink();
  }, []);

  const completeLink = async () => {
    try {
      // Completa il collegamento
      const response = await completeConnection();

      if (response.data.success) {
        setMessage('Banca collegata! Sincronizzazione transazioni...');

        // Sincronizza le transazioni
        await syncTransactions();

        setStatus('success');
        setMessage('Tutto pronto! Reindirizzamento...');

        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(`Errore: ${response.data.status || 'Connessione non completata'}`);
      }
    } catch (error) {
      console.error('Errore callback:', error);
      setStatus('error');
      setMessage('Errore durante il collegamento. Riprova.');
    }
  };

  return (
    <div className="setup-container">
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
            <h2>{message}</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h2 style={{ color: 'var(--success)' }}>{message}</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>❌</div>
            <h2 style={{ color: 'var(--danger)' }}>{message}</h2>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/settings')}
              style={{ marginTop: 20 }}
            >
              Torna alle Impostazioni
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Callback;
