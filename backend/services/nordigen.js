import NordigenClient from 'nordigen-node';
import db from '../database.js';

let client = null;
let accessToken = null;

// Inizializza il client Nordigen
export async function initNordigen() {
  if (!process.env.NORDIGEN_SECRET_ID || !process.env.NORDIGEN_SECRET_KEY) {
    console.log('⚠️  Chiavi Nordigen non configurate. Imposta NORDIGEN_SECRET_ID e NORDIGEN_SECRET_KEY nel file .env');
    return false;
  }

  client = new NordigenClient({
    secretId: process.env.NORDIGEN_SECRET_ID,
    secretKey: process.env.NORDIGEN_SECRET_KEY
  });

  try {
    const tokenData = await client.generateToken();
    accessToken = tokenData.access;
    console.log('✅ Nordigen connesso');
    return true;
  } catch (error) {
    console.error('❌ Errore connessione Nordigen:', error.message);
    return false;
  }
}

// Ottieni lista banche italiane
export async function getBanks() {
  if (!client) await initNordigen();

  try {
    const banks = await client.institution.getInstitutions({ country: 'IT' });
    return banks.map(bank => ({
      id: bank.id,
      name: bank.name,
      logo: bank.logo
    }));
  } catch (error) {
    console.error('Errore lista banche:', error);
    throw error;
  }
}

// Crea link per collegare la banca
export async function createBankLink(bankId) {
  if (!client) await initNordigen();

  try {
    // Crea un nuovo requisition (richiesta di accesso)
    const requisition = await client.requisition.createRequisition({
      redirectUrl: 'http://localhost:5173/callback',
      institutionId: bankId,
      reference: `budget-app-${Date.now()}`,
      userLanguage: 'IT'
    });

    // Salva il requisition_id
    db.prepare('UPDATE settings SET requisition_id = ? WHERE id = ?').run(requisition.id, 1);

    return {
      link: requisition.link,
      requisitionId: requisition.id
    };
  } catch (error) {
    console.error('Errore creazione link:', error);
    throw error;
  }
}

// Completa il collegamento dopo il redirect
export async function completeLink(requisitionId) {
  if (!client) await initNordigen();

  try {
    const requisition = await client.requisition.getRequisitionById(requisitionId);

    if (requisition.accounts && requisition.accounts.length > 0) {
      const accountId = requisition.accounts[0]; // Prendi il primo conto
      db.prepare('UPDATE settings SET account_id = ? WHERE id = ?').run(accountId, 1);
      return { success: true, accountId };
    }

    return { success: false, status: requisition.status };
  } catch (error) {
    console.error('Errore completamento link:', error);
    throw error;
  }
}

// Ottieni le transazioni dal conto
export async function getTransactions(accountId, fromDate) {
  if (!client) await initNordigen();

  try {
    const account = client.account(accountId);
    const transactions = await account.getTransactions({ dateFrom: fromDate });

    return transactions.transactions.booked.map(t => ({
      id: t.transactionId || t.internalTransactionId,
      date: t.bookingDate || t.valueDate,
      amount: parseFloat(t.transactionAmount.amount),
      description: t.remittanceInformationUnstructured ||
                   t.creditorName ||
                   t.debtorName ||
                   'Transazione'
    }));
  } catch (error) {
    console.error('Errore transazioni:', error);
    throw error;
  }
}

// Ottieni saldo del conto
export async function getBalance(accountId) {
  if (!client) await initNordigen();

  try {
    const account = client.account(accountId);
    const balances = await account.getBalances();

    const balance = balances.balances.find(b =>
      b.balanceType === 'expected' || b.balanceType === 'interimAvailable'
    );

    return balance ? parseFloat(balance.balanceAmount.amount) : 0;
  } catch (error) {
    console.error('Errore saldo:', error);
    throw error;
  }
}

export { client };
