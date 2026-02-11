import { useState, useEffect } from 'react';
import { getSettings, updateSettings, getBankStatus, getBanks, connectBank, disconnectBank } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [bankStatus, setBankStatus] = useState({ connected: false });
  const [banks, setBanks] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, bankRes] = await Promise.all([
        getSettings(),
        getBankStatus()
      ]);
      setSettings(settingsRes.data);
      setBankStatus(bankRes.data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        monthly_income: settings.monthly_income,
        necessita_percent: settings.necessita_percent,
        svago_percent: settings.svago_percent,
        risparmio_percent: settings.risparmio_percent
      });
      alert('Impostazioni salvate!');
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert(error.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleShowBanks = async () => {
    try {
      const response = await getBanks();
      setBanks(response.data);
      setShowBankModal(true);
    } catch (error) {
      console.error('Errore caricamento banche:', error);
      alert('Errore nel caricamento delle banche. Verifica le API key di Nordigen.');
    }
  };

  const handleConnectBank = async (bankId) => {
    try {
      const response = await connectBank(bankId);
      // Redirect alla pagina di autorizzazione della banca
      window.location.href = response.data.link;
    } catch (error) {
      console.error('Errore connessione banca:', error);
      alert('Errore nella connessione alla banca');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnettere la banca?')) return;

    try {
      await disconnectBank();
      setBankStatus({ connected: false });
    } catch (error) {
      console.error('Errore disconnessione:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading || !settings) {
    return <div className="card">Caricamento...</div>;
  }

  const total = settings.necessita_percent + settings.svago_percent + settings.risparmio_percent;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>⚙️ Impostazioni</h2>

      <div className="grid grid-2">
        {/* Budget Settings */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>💰 Budget Mensile</h3>

          <div className="form-group">
            <label className="form-label">Stipendio Mensile</label>
            <input
              type="number"
              className="form-input"
              value={settings.monthly_income}
              onChange={(e) => setSettings({ ...settings, monthly_income: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">🏠 Necessità (%)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="100"
              value={settings.necessita_percent}
              onChange={(e) => setSettings({ ...settings, necessita_percent: parseInt(e.target.value) || 0 })}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              = {formatCurrency(settings.monthly_income * settings.necessita_percent / 100)}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">🎮 Svago (%)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="100"
              value={settings.svago_percent}
              onChange={(e) => setSettings({ ...settings, svago_percent: parseInt(e.target.value) || 0 })}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              = {formatCurrency(settings.monthly_income * settings.svago_percent / 100)}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">💎 Risparmio (%)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="100"
              value={settings.risparmio_percent}
              onChange={(e) => setSettings({ ...settings, risparmio_percent: parseInt(e.target.value) || 0 })}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              = {formatCurrency(settings.monthly_income * settings.risparmio_percent / 100)}
            </small>
          </div>

          {total !== 100 && (
            <div style={{ color: 'var(--danger)', marginBottom: 16 }}>
              ⚠️ Le percentuali devono sommare a 100 (attuale: {total}%)
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || total !== 100}
            style={{ width: '100%' }}
          >
            {saving ? 'Salvataggio...' : '💾 Salva Impostazioni'}
          </button>
        </div>

        {/* Bank Connection */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>🏦 Connessione Banca</h3>

          <div style={{ marginBottom: 20 }}>
            <div className={`status-badge ${bankStatus.connected ? 'status-connected' : 'status-disconnected'}`}>
              {bankStatus.connected ? '● Banca collegata' : '○ Nessuna banca collegata'}
            </div>
          </div>

          {bankStatus.connected ? (
            <button className="btn btn-danger" onClick={handleDisconnect} style={{ width: '100%' }}>
              Disconnetti Banca
            </button>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                Collega la tua banca per sincronizzare automaticamente le transazioni.
              </p>
              <button className="btn btn-primary" onClick={handleShowBanks} style={{ width: '100%' }}>
                🏦 Collega Banca
              </button>
            </>
          )}

          <div style={{ marginTop: 30, padding: 20, background: 'var(--bg)', borderRadius: 12 }}>
            <h4 style={{ marginBottom: 12 }}>ℹ️ Come funziona</h4>
            <ol style={{ color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Clicca "Collega Banca"</li>
              <li>Seleziona la tua banca</li>
              <li>Autorizza l'accesso (sicuro con PSD2)</li>
              <li>Le transazioni verranno sincronizzate</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Bank Selection Modal */}
      {showBankModal && (
        <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🏦 Seleziona la tua banca</h3>

            {banks.length === 0 ? (
              <p>Caricamento banche...</p>
            ) : (
              <div className="bank-list">
                {banks.map(bank => (
                  <div
                    key={bank.id}
                    className="bank-item"
                    onClick={() => handleConnectBank(bank.id)}
                  >
                    {bank.logo && <img src={bank.logo} alt={bank.name} className="bank-logo" />}
                    <span>{bank.name}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => setShowBankModal(false)}
              style={{ width: '100%', marginTop: 20 }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
