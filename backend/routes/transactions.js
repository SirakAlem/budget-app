import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as nordigen from '../services/nordigen.js';
import { categorize } from '../services/categorizer.js';
import { parseCSV, parseExcel } from '../services/csvParser.js';
import db from '../database.js';

const router = Router();

// Import CSV/Excel
router.post('/import-csv', (req, res) => {
  try {
    const { csvContent, excelBase64, fileType } = req.body;

    if (!csvContent && !excelBase64) {
      return res.status(400).json({ error: 'Contenuto file mancante' });
    }

    // Parse del file (CSV o Excel)
    let transactions;
    if (excelBase64 || fileType === 'excel') {
      transactions = parseExcel(excelBase64 || csvContent);
    } else {
      transactions = parseCSV(csvContent);
    }

    let added = 0;
    let skipped = 0;

    for (const t of transactions) {
      // Controlla se esiste già una transazione simile (stessa data, importo, descrizione)
      const existing = db.prepare(
        'SELECT id FROM transactions WHERE date = ? AND amount = ? AND description = ?'
      ).get(t.date, t.amount, t.description);

      if (!existing) {
        const category = categorize(t.description, t.amount);
        db.prepare(`
          INSERT INTO transactions (id, date, amount, description, category)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), t.date, t.amount, t.description, category);
        added++;
      } else {
        skipped++;
      }
    }

    // Aggiorna i totali
    updateMonthlySpent();

    res.json({
      success: true,
      imported: added,
      skipped,
      total: transactions.length
    });
  } catch (error) {
    console.error('Errore import CSV:', error);
    res.status(400).json({ error: error.message || 'Errore nel parsing del CSV' });
  }
});

// Sincronizza transazioni dalla banca
router.post('/sync', async (req, res) => {
  try {
    const settings = db.prepare('SELECT account_id FROM settings WHERE id = ?').get(1);

    if (!settings || !settings.account_id) {
      return res.status(400).json({ error: 'Nessun conto collegato' });
    }

    // Prendi transazioni dell'ultimo mese
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    const transactions = await nordigen.getTransactions(settings.account_id, fromDateStr);

    let added = 0;

    for (const t of transactions) {
      const category = categorize(t.description, t.amount);
      const existing = db.prepare('SELECT id FROM transactions WHERE bank_transaction_id = ?').get(t.id);

      if (!existing) {
        db.prepare(`
          INSERT INTO transactions (id, date, amount, description, category, bank_transaction_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), t.date, t.amount, t.description, category, t.id);
        added++;
      }
    }

    // Aggiorna i totali spesi nel budget mensile
    updateMonthlySpent();

    res.json({ synced: added, total: transactions.length });
  } catch (error) {
    console.error('Errore sync:', error);
    res.status(500).json({ error: 'Errore nella sincronizzazione' });
  }
});

// Ottieni tutte le transazioni
router.get('/', (req, res) => {
  const { month } = req.query;

  let transactions;
  if (month) {
    transactions = db.prepare('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC').all(`${month}%`);
  } else {
    transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
  }

  res.json(transactions);
});

// Aggiorna categoria di una transazione
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!['necessita', 'svago', 'risparmio', 'entrata', 'non_categorizzato'].includes(category)) {
    return res.status(400).json({ error: 'Categoria non valida' });
  }

  db.prepare('UPDATE transactions SET category = ? WHERE id = ?').run(category, id);

  // Aggiorna i totali
  updateMonthlySpent();

  res.json({ success: true });
});

// Aggiungi transazione manuale
router.post('/', (req, res) => {
  const { date, amount, description, category } = req.body;

  if (!date || amount === undefined || !description) {
    return res.status(400).json({ error: 'Campi mancanti' });
  }

  const id = uuidv4();
  const cat = category || categorize(description, amount);

  db.prepare(`
    INSERT INTO transactions (id, date, amount, description, category)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, date, amount, description, cat);

  updateMonthlySpent();

  res.json({ id, date, amount, description, category: cat });
});

// Elimina transazione
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  updateMonthlySpent();
  res.json({ success: true });
});

// Funzione helper per aggiornare i totali mensili
function updateMonthlySpent() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const totals = db.prepare(`
    SELECT
      category,
      SUM(ABS(amount)) as total
    FROM transactions
    WHERE date LIKE ? AND amount < 0
    GROUP BY category
  `).all(`${currentMonth}%`);

  let necessita = 0, svago = 0;

  for (const t of totals) {
    if (t.category === 'necessita') necessita = t.total || 0;
    if (t.category === 'svago') svago = t.total || 0;
  }

  db.prepare(`
    UPDATE monthly_budget
    SET necessita_spent = ?, svago_spent = ?
    WHERE month = ?
  `).run(necessita, svago, currentMonth);
}

export default router;
