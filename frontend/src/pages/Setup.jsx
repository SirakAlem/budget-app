import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateSettings } from '../services/api';

function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState(900);
  const [necessita, setNecessita] = useState(50);
  const [svago, setSvago] = useState(30);
  const [risparmio, setRisparmio] = useState(20);
  const [saving, setSaving] = useState(false);

  const handleNecessitaChange = (value) => {
    const newNecessita = parseInt(value);
    setNecessita(newNecessita);
    // Ricalcola svago mantenendo il risparmio
    const newSvago = 100 - newNecessita - risparmio;
    if (newSvago >= 0) {
      setSvago(newSvago);
    }
  };

  const handleRisparmioChange = (value) => {
    const newRisparmio = parseInt(value);
    setRisparmio(newRisparmio);
    // Ricalcola svago mantenendo le necessità
    const newSvago = 100 - necessita - newRisparmio;
    if (newSvago >= 0) {
      setSvago(newSvago);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        monthly_income: income,
        necessita_percent: necessita,
        svago_percent: svago,
        risparmio_percent: risparmio
      });
      navigate('/');
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="setup-container">
      {step === 1 && (
        <>
          <h1 className="setup-title">👋 Benvenuto!</h1>
          <p className="setup-subtitle">
            Configuriamo insieme il tuo budget mensile
          </p>

          <div className="card" style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label className="form-label">Qual è il tuo stipendio mensile?</label>
              <input
                type="number"
                className="form-input"
                value={income}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                placeholder="Es: 1500"
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setStep(2)}
            disabled={income <= 0}
            style={{ marginTop: 20 }}
          >
            Continua →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="setup-title">💰 Dividi il tuo budget</h1>
          <p className="setup-subtitle">
            Stipendio: {formatCurrency(income)}
          </p>

          <div className="card" style={{ textAlign: 'left' }}>
            <div className="slider-container">
              <div className="slider-label">
                <span>🏠 Necessità</span>
                <span>{necessita}% = {formatCurrency(income * necessita / 100)}</span>
              </div>
              <input
                type="range"
                className="slider"
                min="0"
                max="100"
                value={necessita}
                onChange={(e) => handleNecessitaChange(e.target.value)}
              />
            </div>

            <div className="slider-container">
              <div className="slider-label">
                <span>💎 Risparmio</span>
                <span>{risparmio}% = {formatCurrency(income * risparmio / 100)}</span>
              </div>
              <input
                type="range"
                className="slider"
                min="0"
                max={100 - necessita}
                value={risparmio}
                onChange={(e) => handleRisparmioChange(e.target.value)}
              />
            </div>

            <div className="slider-container">
              <div className="slider-label">
                <span>🎮 Svago</span>
                <span>{svago}% = {formatCurrency(income * svago / 100)}</span>
              </div>
              <div className="progress-bar" style={{ height: 20 }}>
                <div className="progress-fill good" style={{ width: `${svago}%` }} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 8 }}>
                Calcolato automaticamente
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Indietro
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Continua →
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="setup-title">✅ Riepilogo</h1>
          <p className="setup-subtitle">
            Ecco come dividerai i tuoi {formatCurrency(income)}
          </p>

          <div className="grid grid-3" style={{ marginBottom: 30 }}>
            <div className="card budget-card necessita">
              <div className="card-title">🏠 Necessità</div>
              <div className="card-value">{formatCurrency(income * necessita / 100)}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                {necessita}% del budget
              </div>
            </div>

            <div className="card budget-card svago">
              <div className="card-title">🎮 Svago</div>
              <div className="card-value">{formatCurrency(income * svago / 100)}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                {svago}% del budget
              </div>
            </div>

            <div className="card budget-card risparmio">
              <div className="card-title">💎 Risparmio</div>
              <div className="card-value">{formatCurrency(income * risparmio / 100)}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                {risparmio}% del budget
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              ← Modifica
            </button>
            <button
              className="btn btn-success"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : '✓ Salva e Inizia'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Setup;
