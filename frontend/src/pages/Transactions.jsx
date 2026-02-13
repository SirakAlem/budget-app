import { useState, useEffect, useRef } from 'react';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, deleteAllTransactions, importCSV } from '../services/api';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: 'non_categorizzato'
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await getTransactions();
      setTransactions(response.data);
    } catch (error) {
      console.error('Errore caricamento transazioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      alert('Compila tutti i campi');
      return;
    }

    try {
      await addTransaction({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      setShowModal(false);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category: 'non_categorizzato'
      });
      loadTransactions();
    } catch (error) {
      console.error('Errore aggiunta:', error);
    }
  };

  const handleCategoryChange = async (id, category) => {
    try {
      await updateTransaction(id, { category });
      loadTransactions();
    } catch (error) {
      console.error('Errore aggiornamento:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa transazione?')) return;

    try {
      await deleteTransaction(id);
      loadTransactions();
    } catch (error) {
      console.error('Errore eliminazione:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Sei sicuro di voler eliminare TUTTE le transazioni? Questa azione non è reversibile.')) return;

    try {
      const response = await deleteAllTransactions();
      alert(`Eliminate ${response.data.deleted} transazioni.`);
      loadTransactions();
    } catch (error) {
      console.error('Errore eliminazione totale:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isPDF = fileName.endsWith('.pdf');

      let requestData;

      if (isExcel || isPDF) {
        // Leggi come base64 per Excel e PDF
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (isPDF) {
          requestData = { pdfBase64: base64, fileType: 'pdf' };
        } else {
          requestData = { excelBase64: base64, fileType: 'excel' };
        }
      } else {
        // Leggi come testo per CSV
        const text = await file.text();
        requestData = { csvContent: text };
      }

      const response = await importCSV(requestData);
      setImportResult({
        success: true,
        message: `Importate ${response.data.imported} transazioni (${response.data.skipped} duplicate saltate)`
      });
      loadTransactions();
    } catch (error) {
      console.error('Errore import:', error);
      setImportResult({
        success: false,
        message: error.response?.data?.error || 'Errore durante l\'import'
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const categories = [
    { value: 'necessita', label: '🏠 Necessità', color: '#f59e0b' },
    { value: 'svago', label: '🎮 Svago', color: '#6366f1' },
    { value: 'risparmio', label: '💎 Risparmio', color: '#22c55e' },
    { value: 'entrata', label: '💵 Entrata', color: '#22c55e' },
    { value: 'non_categorizzato', label: '❓ Non categorizzato', color: '#64748b' }
  ];

  if (loading) {
    return <div className="card">Caricamento...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2>📝 Transazioni</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            📄 Importa File
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Aggiungi Manuale
          </button>
          {transactions.length > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteAll}>
              🗑️ Cancella Tutte
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            Nessuna transazione trovata.<br />
            Importa un file CSV dalla tua banca o aggiungi transazioni manualmente.
          </p>
        ) : (
          <ul className="transaction-list">
            {transactions.map(t => (
              <li key={t.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-desc">{t.description}</div>
                  <div className="transaction-date">
                    {new Date(t.date).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </div>
                </div>

                <div className={`transaction-amount ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                  {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                </div>

                <select
                  value={t.category}
                  onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                  className="form-input"
                  style={{ width: 180, marginLeft: 16 }}
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                <button
                  className="btn btn-danger"
                  style={{ marginLeft: 8, padding: '8px 12px' }}
                  onClick={() => handleDelete(t.id)}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">📄 Importa Movimenti dalla Banca</h3>

            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                Scarica i movimenti dal sito della tua banca e caricali qui. Sono supportati i formati CSV, Excel e PDF.
              </p>

              <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
                <h4 style={{ marginBottom: 12 }}>📋 Come fare:</h4>
                <ol style={{ color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 1.8 }}>
                  <li>Vai sul sito/app della tua banca</li>
                  <li>Cerca "Esporta movimenti" o "Scarica estratto conto"</li>
                  <li>Scegli il formato <strong>CSV</strong>, <strong>Excel</strong> o <strong>PDF</strong></li>
                  <li>Carica il file qui sotto</li>
                </ol>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.CSV,.txt,.xlsx,.xls,.XLSX,.XLS,.pdf,.PDF"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={{ width: '100%', padding: 16 }}
              >
                {importing ? '⏳ Importazione in corso...' : '📁 Seleziona file (CSV, Excel, PDF)'}
              </button>

              {importResult && (
                <div style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 8,
                  background: importResult.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: importResult.success ? 'var(--success)' : 'var(--danger)'
                }}>
                  {importResult.success ? '✅' : '❌'} {importResult.message}
                </div>
              )}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportResult(null);
              }}
              style={{ width: '100%' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Modal Aggiungi */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">➕ Aggiungi Transazione</h3>

            <div className="form-group">
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-input"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Importo (negativo per spese)</label>
              <input
                type="number"
                className="form-input"
                placeholder="-50.00"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descrizione</label>
              <input
                type="text"
                className="form-input"
                placeholder="Es: Spesa Esselunga"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select
                className="form-input"
                value={newTransaction.category}
                onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={handleAdd} style={{ flex: 1 }}>
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
