import { Router } from 'express';
import * as nordigen from '../services/nordigen.js';
import db from '../database.js';

const router = Router();

// Lista banche italiane disponibili
router.get('/banks', async (req, res) => {
  try {
    const banks = await nordigen.getBanks();
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero delle banche' });
  }
});

// Crea link per collegare banca
router.post('/connect', async (req, res) => {
  try {
    const { bankId } = req.body;
    if (!bankId) {
      return res.status(400).json({ error: 'bankId richiesto' });
    }

    const result = await nordigen.createBankLink(bankId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Errore nella creazione del link' });
  }
});

// Callback dopo autorizzazione banca
router.post('/callback', async (req, res) => {
  try {
    const settings = db.prepare('SELECT requisition_id FROM settings WHERE id = ?').get(1);

    if (!settings || !settings.requisition_id) {
      return res.status(400).json({ error: 'Nessuna richiesta in corso' });
    }

    const result = await nordigen.completeLink(settings.requisition_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel completamento del collegamento' });
  }
});

// Stato connessione banca
router.get('/status', (req, res) => {
  const settings = db.prepare('SELECT account_id FROM settings WHERE id = ?').get(1);
  res.json({
    connected: !!(settings && settings.account_id),
    accountId: settings ? settings.account_id : null
  });
});

// Saldo attuale
router.get('/balance', async (req, res) => {
  try {
    const settings = db.prepare('SELECT account_id FROM settings WHERE id = ?').get(1);

    if (!settings || !settings.account_id) {
      return res.status(400).json({ error: 'Nessun conto collegato' });
    }

    const balance = await nordigen.getBalance(settings.account_id);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero del saldo' });
  }
});

// Disconnetti banca
router.post('/disconnect', (req, res) => {
  db.prepare('UPDATE settings SET account_id = NULL, requisition_id = NULL WHERE id = ?').run(1);
  res.json({ success: true });
});

export default router;
