import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, syncTransactions } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await getDashboard();
      setData(response.data);

      // Se non ha impostato lo stipendio, vai al setup
      if (!response.data.settings.monthly_income) {
        navigate('/setup');
      }
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncTransactions();
      await loadDashboard();
    } catch (error) {
      console.error('Errore sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getProgressClass = (spent, budget) => {
    const percent = (spent / budget) * 100;
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return 'good';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return <div className="card">Caricamento...</div>;
  }

  if (!data) {
    return <div className="card">Errore nel caricamento</div>;
  }

  const { budget, recentTransactions, bankConnected } = data;

  const pieData = [
    { name: 'Necessità', value: budget.necessita_spent, color: '#f59e0b' },
    { name: 'Svago', value: budget.svago_spent, color: '#6366f1' },
    { name: 'Risparmio', value: budget.risparmio_budget, color: '#22c55e' }
  ];

  return (
    <div>
      {/* Status banca */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={`status-badge ${bankConnected ? 'status-connected' : 'status-disconnected'}`}>
          {bankConnected ? '● Banca collegata' : '○ Banca non collegata'}
        </div>
        {bankConnected && (
          <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizzazione...' : '🔄 Sincronizza'}
          </button>
        )}
      </div>

      {/* Budget Cards */}
      <div className="grid grid-3">
        <div className="card budget-card necessita">
          <div className="card-title">🏠 Necessità</div>
          <div className="card-value">{formatCurrency(budget.remaining.necessita)}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Speso: {formatCurrency(budget.necessita_spent)} / {formatCurrency(budget.necessita_budget)}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressClass(budget.necessita_spent, budget.necessita_budget)}`}
              style={{ width: `${Math.min((budget.necessita_spent / budget.necessita_budget) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="card budget-card svago">
          <div className="card-title">🎮 Svago</div>
          <div className="card-value">{formatCurrency(budget.remaining.svago)}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Speso: {formatCurrency(budget.svago_spent)} / {formatCurrency(budget.svago_budget)}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressClass(budget.svago_spent, budget.svago_budget)}`}
              style={{ width: `${Math.min((budget.svago_spent / budget.svago_budget) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="card budget-card risparmio">
          <div className="card-title">💎 Risparmio</div>
          <div className="card-value">{formatCurrency(budget.risparmio_budget)}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Obiettivo mensile
          </div>
          <div className="progress-bar">
            <div className="progress-fill good" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Grafico e Transazioni recenti */}
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>📊 Distribuzione Spese</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20 }}>📝 Ultime Transazioni</h3>
          {recentTransactions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nessuna transazione questo mese</p>
          ) : (
            <ul className="transaction-list">
              {recentTransactions.slice(0, 5).map(t => (
                <li key={t.id} className="transaction-item">
                  <div className="transaction-info">
                    <div className="transaction-desc">{t.description}</div>
                    <div className="transaction-date">{new Date(t.date).toLocaleDateString('it-IT')}</div>
                  </div>
                  <div className={`transaction-amount ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                    {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                  </div>
                  <span className={`transaction-category category-${t.category}`}>
                    {t.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
