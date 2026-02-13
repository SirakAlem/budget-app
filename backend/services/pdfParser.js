// Parser PDF per estratti conto bancari italiani
import pdf from 'pdf-parse';
import { parseDate, parseAmount } from './csvParser.js';

// Mappa mesi italiani → numero
const MESI = {
  'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
  'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
  'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12'
};

/**
 * Estrae transazioni da un PDF di estratto conto bancario.
 *
 * @param {string} base64Content - contenuto PDF in base64
 * @returns {Promise<Array<{date: string, amount: number, description: string}>>}
 */
export async function parsePDF(base64Content) {
  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
    throw new Error('Il file non sembra essere un PDF valido.');
  }

  let data;
  try {
    data = await pdf(buffer);
  } catch (err) {
    if (err.message && err.message.includes('password')) {
      throw new Error('Il PDF è protetto da password. Rimuovi la protezione e riprova.');
    }
    throw new Error(`Errore nella lettura del PDF: ${err.message}`);
  }

  const text = data.text;

  if (!text || text.trim().length < 20) {
    throw new Error(
      'Il PDF non contiene testo estraibile. Potrebbe essere un PDF basato su immagini (scansione). ' +
      'Prova ad esportare l\'estratto conto in formato CSV dal sito della tua banca.'
    );
  }

  // Prova le strategie di parsing in ordine
  let transactions = strategyItalianDateSections(text);

  if (transactions.length === 0) {
    transactions = strategyDateLeading(text);
  }

  if (transactions.length === 0) {
    transactions = strategyTabular(text);
  }

  if (transactions.length === 0) {
    throw new Error(
      'Nessuna transazione trovata nel PDF. Verifica che il file sia un estratto conto bancario. ' +
      'Se il formato non è supportato, prova ad esportare in formato CSV dal sito della tua banca.'
    );
  }

  console.log(`PDF: trovate ${transactions.length} transazioni`);
  return transactions;
}

/**
 * Strategia per formato UniCredit/banche italiane:
 * Le date sono intestazioni come "12 febbraio", "03 febbraio"
 * Le transazioni seguono con descrizione su più righe
 * L'importo è alla fine con €: -0,10€  5,00€
 */
function strategyItalianDateSections(text) {
  const transactions = [];

  // Unisci tutto il testo e lavora riga per riga
  const lines = text.split('\n');

  // Pattern per intestazione data italiana: "12 febbraio", "3 gennaio"
  const mesiPattern = Object.keys(MESI).join('|');
  const italianDateRegex = new RegExp(`^(\\d{1,2})\\s+(${mesiPattern})\\s*$`, 'i');

  // Pattern per importo con €: -0,10€  5,00€  1.234,56€
  const amountEuroRegex = /([+-]?\d{1,3}(?:\.\d{3})*,\d{2})€/;

  // Cerca l'anno dalle date nel testo (es: "del 10/02/2026")
  const yearMatch = text.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](20\d{2})\b/);
  const year = yearMatch ? yearMatch[3] : String(new Date().getFullYear());

  let currentDate = null;

  // Prima passata: unisci righe spezzate (le righe che non iniziano con una data
  // e non contengono € sono continuazioni della riga precedente)
  const mergedLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Salta numeri di pagina isolati e righe "TOTALE:"
    if (/^\d{1,3}$/.test(trimmed)) continue;
    if (/^TOTALE\s*:?\s*$/i.test(trimmed)) continue;

    if (italianDateRegex.test(trimmed)) {
      mergedLines.push(trimmed);
    } else if (
      mergedLines.length > 0 &&
      !italianDateRegex.test(mergedLines[mergedLines.length - 1]) &&
      !amountEuroRegex.test(mergedLines[mergedLines.length - 1])
    ) {
      // Continua la riga precedente (ma non se è un'intestazione data)
      mergedLines[mergedLines.length - 1] += ' ' + trimmed;
    } else {
      mergedLines.push(trimmed);
    }
  }

  // Seconda passata: estrai transazioni
  for (const line of mergedLines) {
    // Controlla se è un'intestazione data
    const dateMatch = line.match(italianDateRegex);
    if (dateMatch) {
      const day = String(dateMatch[1]).padStart(2, '0');
      const month = MESI[dateMatch[2].toLowerCase()];
      currentDate = `${year}-${month}-${day}`;
      continue;
    }

    if (!currentDate) continue;

    // Cerca importo con €
    const amountMatch = line.match(amountEuroRegex);
    if (!amountMatch) continue;

    const amountStr = amountMatch[1];
    const amount = parseAmount(amountStr);
    if (amount === null || amount === 0) continue;

    // La descrizione è tutto prima dell'importo€
    let description = line.substring(0, line.indexOf(amountMatch[0])).trim();

    // Salta righe TOTALE e righe senza descrizione (es. importo isolato da sommario)
    if (/^TOTALE\s*:?\s*$/i.test(description)) continue;
    if (!description) continue;

    // Rimuovi prefissi comuni come "PAGAMENTO POS", "BONIFICO A VOSTRO FAVORE" ecc
    // ma teniamoli come info utile. Puliamo solo spazi multipli
    description = description.replace(/\s+/g, ' ').trim();

    // Rimuovi "COMM SERV:" o "COMM:" alla fine della descrizione
    description = description.replace(/\s*COMM\s*:?\s*COMM\s*SERV\s*:?\s*$/i, '').trim();
    description = description.replace(/\s*COMM\s*SERV\s*:?\s*$/i, '').trim();
    description = description.replace(/\s*COMM\s*:?\s*$/i, '').trim();

    if (!description) description = 'Transazione PDF';
    description = description.substring(0, 200);

    transactions.push({ date: currentDate, amount, description });
  }

  return transactions;
}

/**
 * Strategia Date-Leading:
 * Righe che iniziano con data numerica (dd/mm/yyyy), importo a fine riga
 */
function strategyDateLeading(text) {
  const transactions = [];
  const lines = text.split('\n');

  const dateStartPattern = /^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/;
  const amountEndPattern = /([+-]?\s?\d{1,3}(?:[.\s]\d{3})*[,]\d{2})\s*$/;
  const amountEndPatternEn = /([+-]?\s?\d{1,3}(?:[,]\d{3})*[.]\d{2})\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 10) continue;

    const dateMatch = line.match(dateStartPattern);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    let rest = line.substring(dateMatch[0].length).trim();

    const secondDateMatch = rest.match(/^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\s*/);
    if (secondDateMatch) {
      rest = rest.substring(secondDateMatch[0].length).trim();
    }

    let amountMatch = rest.match(amountEndPattern) || rest.match(amountEndPatternEn);
    if (!amountMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const combinedMatch = nextLine.match(/^([+-]?\s?\d{1,3}(?:[.\s]\d{3})*[,]\d{2})\s*$/) ||
                             nextLine.match(/^([+-]?\s?\d{1,3}(?:[,]\d{3})*[.]\d{2})\s*$/);
      if (combinedMatch) {
        amountMatch = combinedMatch;
        i++;
      }
    }
    if (!amountMatch) continue;

    const amount = parseAmount(amountMatch[1].replace(/\s/g, ''));
    if (amount === null || amount === 0) continue;

    let description = rest.substring(0, rest.lastIndexOf(amountMatch[1])).trim();
    description = description.replace(/\s+/g, ' ').trim();
    if (!description) description = 'Transazione PDF';
    description = description.substring(0, 200);

    transactions.push({ date, amount, description });
  }

  return transactions;
}

/**
 * Strategia Tabular:
 * Formato con colonne dare/avere separate
 */
function strategyTabular(text) {
  const transactions = [];
  const lines = text.split('\n');

  let hasDareAvere = false;
  for (const line of lines) {
    if (/dare/i.test(line) && /avere/i.test(line)) {
      hasDareAvere = true;
      break;
    }
  }

  const linePattern = /^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\s+(.+?)\s+(\d{1,3}(?:[.\s]\d{3})*,\d{2})\s*(?:(\d{1,3}(?:[.\s]\d{3})*,\d{2}))?\s*$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;

    const match = trimmed.match(linePattern);
    if (!match) continue;

    const date = parseDate(match[1]);
    if (!date) continue;

    let description = match[2].replace(/\s+/g, ' ').trim();
    if (!description) description = 'Transazione PDF';
    description = description.substring(0, 200);

    const amount1Str = match[3].replace(/\s/g, '');
    const amount2Str = match[4] ? match[4].replace(/\s/g, '') : null;

    let amount;
    if (amount2Str) {
      const dare = parseAmount(amount1Str);
      const avere = parseAmount(amount2Str);
      if (dare && dare !== 0) amount = -Math.abs(dare);
      else if (avere && avere !== 0) amount = Math.abs(avere);
      else continue;
    } else {
      amount = parseAmount(amount1Str);
      if (amount === null || amount === 0) continue;
      if (hasDareAvere) {
        const isCredit = /bonifico\s+(in\s+)?entrata|accredito|stipendio|rimborso|versamento/i.test(description.toLowerCase());
        if (!isCredit) amount = -Math.abs(amount);
      }
    }

    transactions.push({ date, amount, description });
  }

  return transactions;
}

export default { parsePDF };
