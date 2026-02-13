import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settingsRes = await getSettings();
      setSettings(settingsRes.data);
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

      <div className="card" style={{ maxWidth: 500 }}>
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
    </div>
  );
}

export default Settings;
