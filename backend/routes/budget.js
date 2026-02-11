import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Ottieni impostazioni attuali
router.get('/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get(1);
  res.json(settings || {});
});

// Aggiorna impostazioni
router.put('/settings', (req, res) => {
  const { monthly_income, necessita_percent, svago_percent, risparmio_percent } = req.body;

  // Verifica che le percentuali sommino a 100
  if (necessita_percent + svago_percent + risparmio_percent !== 100) {
    return res.status(400).json({ error: 'Le percentuali devono sommare a 100' });
  }

  db.prepare(`
    UPDATE settings
    SET monthly_income = ?,
        necessita_percent = ?,
        svago_percent = ?,
        risparmio_percent = ?,
        updated_at = ?
    WHERE id = 1
  `).run(monthly_income, necessita_percent, svago_percent, risparmio_percent, new Date().toISOString());

  // Aggiorna/crea budget del mese corrente
  const currentMonth = new Date().toISOString().slice(0, 7);
  const necessitaBudget = monthly_income * (necessita_percent / 100);
  const svagoBudget = monthly_income * (svago_percent / 100);
  const risparmioBudget = monthly_income * (risparmio_percent / 100);

  // Controlla se esiste già
  const existing = db.prepare('SELECT id FROM monthly_budget WHERE month = ?').get(currentMonth);

  if (existing) {
    db.prepare(`
      UPDATE monthly_budget
      SET income = ?, necessita_budget = ?, svago_budget = ?, risparmio_budget = ?
      WHERE month = ?
    `).run(monthly_income, necessitaBudget, svagoBudget, risparmioBudget, currentMonth);
  } else {
    db.prepare(`
      INSERT INTO monthly_budget (month, income, necessita_budget, svago_budget, risparmio_budget)
      VALUES (?, ?, ?, ?, ?)
    `).run(currentMonth, monthly_income, necessitaBudget, svagoBudget, risparmioBudget);
  }

  res.json({ success: true });
});

// Ottieni budget del mese corrente (o specifico)
router.get('/monthly', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  let budget = db.prepare('SELECT * FROM monthly_budget WHERE month = ?').get(month);

  // Se non esiste, crealo dalle impostazioni
  if (!budget) {
    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get(1);

    if (settings && settings.monthly_income) {
      const necessitaBudget = settings.monthly_income * (settings.necessita_percent / 100);
      const svagoBudget = settings.monthly_income * (settings.svago_percent / 100);
      const risparmioBudget = settings.monthly_income * (settings.risparmio_percent / 100);

      db.prepare(`
        INSERT INTO monthly_budget (month, income, necessita_budget, svago_budget, risparmio_budget)
        VALUES (?, ?, ?, ?, ?)
      `).run(month, settings.monthly_income, necessitaBudget, svagoBudget, risparmioBudget);

      budget = db.prepare('SELECT * FROM monthly_budget WHERE month = ?').get(month);
    } else {
      budget = {
        month,
        income: 0,
        necessita_budget: 0,
        svago_budget: 0,
        risparmio_budget: 0,
        necessita_spent: 0,
        svago_spent: 0
      };
    }
  }

  // Calcola i rimanenti
  const remaining = {
    necessita: (budget.necessita_budget || 0) - (budget.necessita_spent || 0),
    svago: (budget.svago_budget || 0) - (budget.svago_spent || 0),
    risparmio: budget.risparmio_budget || 0
  };

  res.json({
    ...budget,
    remaining
  });
});

// Dashboard - riepilogo completo
router.get('/dashboard', (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Impostazioni
  const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get(1) || {};

  // Budget mensile
  let budget = db.prepare('SELECT * FROM monthly_budget WHERE month = ?').get(currentMonth);

  if (!budget && settings.monthly_income) {
    // Crea budget se non esiste
    const necessitaBudget = settings.monthly_income * ((settings.necessita_percent || 50) / 100);
    const svagoBudget = settings.monthly_income * ((settings.svago_percent || 30) / 100);
    const risparmioBudget = settings.monthly_income * ((settings.risparmio_percent || 20) / 100);

    db.prepare(`
      INSERT INTO monthly_budget (month, income, necessita_budget, svago_budget, risparmio_budget)
      VALUES (?, ?, ?, ?, ?)
    `).run(currentMonth, settings.monthly_income, necessitaBudget, svagoBudget, risparmioBudget);

    budget = db.prepare('SELECT * FROM monthly_budget WHERE month = ?').get(currentMonth);
  }

  if (!budget) {
    budget = {
      month: currentMonth,
      income: 0,
      necessita_budget: 0,
      svago_budget: 0,
      risparmio_budget: 0,
      necessita_spent: 0,
      svago_spent: 0
    };
  }

  // Transazioni recenti
  const recentTransactions = db.prepare(`
    SELECT * FROM transactions
    WHERE date LIKE ?
    ORDER BY date DESC
  `).all(`${currentMonth}%`).slice(0, 10);

  // Totali per categoria
  const categoryTotals = db.prepare(`
    SELECT
      category,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as spent,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as earned,
      COUNT(*) as count
    FROM transactions
    WHERE date LIKE ?
    GROUP BY category
  `).all(`${currentMonth}%`);

  res.json({
    settings,
    budget: {
      ...budget,
      remaining: {
        necessita: (budget.necessita_budget || 0) - (budget.necessita_spent || 0),
        svago: (budget.svago_budget || 0) - (budget.svago_spent || 0),
        risparmio: budget.risparmio_budget || 0
      }
    },
    recentTransactions,
    categoryTotals,
    bankConnected: !!(settings && settings.account_id)
  });
});

export default router;
