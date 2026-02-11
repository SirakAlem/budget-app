// Parser CSV/Excel per le banche italiane
import * as XLSX from 'xlsx';

// Mappa delle possibili intestazioni delle colonne
const COLUMN_MAPS = {
  date: ['data', 'date', 'data operazione', 'data contabile', 'data valuta', 'booking date', 'value date', 'data mov', 'data movimento'],
  amount: ['importo', 'amount', 'ammontare', 'dare/avere', 'entrate', 'uscite', 'movimento', 'euro', 'importo eur', 'importo euro'],
  description: ['operazione', 'descrizione', 'description', 'causale', 'dettagli', 'movimento', 'beneficiario', 'ordinante', 'descrizione operazione', 'causale / descrizione']
};

// Trova l'indice della colonna in base ai possibili nomi
function findColumnIndex(headers, possibleNames) {
  if (!headers || !Array.isArray(headers)) return -1;

  const lowerHeaders = headers.map(h => {
    if (h === null || h === undefined) return '';
    return String(h).toLowerCase().trim();
  });

  for (const name of possibleNames) {
    const index = lowerHeaders.findIndex(h => h && h.includes(name));
    if (index !== -1) return index;
  }
  return -1;
}

// Converte una stringa/numero data in formato ISO
function parseDate(dateValue) {
  if (!dateValue) return null;

  // Se è un numero (Excel date serial)
  if (typeof dateValue === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(dateValue);
      if (date && date.y && date.m && date.d) {
        const year = date.y;
        const month = String(date.m).padStart(2, '0');
        const day = String(date.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Prova conversione manuale per date Excel
      // Excel date serial: giorni dal 1/1/1900
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      if (!isNaN(jsDate.getTime())) {
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  const dateStr = String(dateValue).trim().replace(/['"]/g, '');

  // Prova vari formati
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD/MM/YY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
  ];

  for (let i = 0; i < formats.length; i++) {
    const match = dateStr.match(formats[i]);
    if (match) {
      let year, month, day;

      if (i === 3) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else if (i === 4) {
        // DD/MM/YY
        [, day, month, year] = match;
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      } else {
        // DD/MM/YYYY o simili
        [, day, month, year] = match;
      }

      day = String(day).padStart(2, '0');
      month = String(month).padStart(2, '0');

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return null;
}

// Converte una stringa importo in numero
function parseAmount(amountValue) {
  if (amountValue === null || amountValue === undefined) return null;

  // Se è già un numero
  if (typeof amountValue === 'number') {
    return amountValue;
  }

  let amountStr = String(amountValue).trim().replace(/['"€$\s]/g, '');

  // Gestisci formato italiano (1.234,56) vs inglese (1,234.56)
  if (amountStr.includes(',') && amountStr.includes('.')) {
    // Se la virgola viene dopo il punto, è formato italiano
    if (amountStr.lastIndexOf(',') > amountStr.lastIndexOf('.')) {
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    } else {
      amountStr = amountStr.replace(/,/g, '');
    }
  } else if (amountStr.includes(',')) {
    // Solo virgola - assume formato italiano
    amountStr = amountStr.replace(',', '.');
  }

  const amount = parseFloat(amountStr);
  return isNaN(amount) ? null : amount;
}

// Parse di una riga CSV
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Parse dati da array di righe (CSV o Excel)
function parseRows(rows) {
  // Filtra righe completamente vuote
  const nonEmptyRows = rows.filter(row => {
    if (!row || !Array.isArray(row)) return false;
    return row.some(cell => cell !== null && cell !== undefined && cell !== '');
  });

  if (nonEmptyRows.length < 2) {
    throw new Error('Il file deve contenere almeno un\'intestazione e una riga di dati');
  }

  // Trova la riga dell'header cercando parole chiave
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(30, nonEmptyRows.length); i++) {
    const row = nonEmptyRows[i];
    if (!row || !Array.isArray(row)) continue;

    const lowerRow = row.map(c => {
      if (c === null || c === undefined) return '';
      return String(c).toLowerCase().trim();
    });

    // Cerca riga che contiene "data" E ("importo" O "operazione")
    const hasData = lowerRow.some(c => c === 'data' || c.includes('data '));
    const hasAmount = lowerRow.some(c => c.includes('importo'));
    const hasOperation = lowerRow.some(c => c.includes('operazione') || c.includes('descrizione') || c.includes('causale'));

    if (hasData && (hasAmount || hasOperation)) {
      headerRowIndex = i;
      headers = row;
      console.log('Header trovato alla riga', i, ':', row);
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Impossibile trovare l\'intestazione del file. Assicurati che contenga colonne come "Data", "Importo", "Descrizione".');
  }

  // Trova gli indici delle colonne
  let dateIdx = findColumnIndex(headers, COLUMN_MAPS.date);
  let amountIdx = findColumnIndex(headers, COLUMN_MAPS.amount);
  let descIdx = findColumnIndex(headers, COLUMN_MAPS.description);

  console.log('Indici colonne - Data:', dateIdx, ', Importo:', amountIdx, ', Descrizione:', descIdx);

  if (dateIdx === -1) {
    throw new Error('Impossibile trovare la colonna della data');
  }
  if (amountIdx === -1) {
    throw new Error('Impossibile trovare la colonna dell\'importo');
  }

  // Parse delle righe di dati (dopo l'header)
  const transactions = [];

  for (let i = headerRowIndex + 1; i < nonEmptyRows.length; i++) {
    const row = nonEmptyRows[i];

    if (!row || row.length <= Math.max(dateIdx, amountIdx)) {
      continue;
    }

    const dateVal = row[dateIdx];
    const amountVal = row[amountIdx];

    const date = parseDate(dateVal);
    const amount = parseAmount(amountVal);

    // Costruisci descrizione (prova più colonne se disponibili)
    let description = '';
    if (descIdx !== -1 && row[descIdx]) {
      description = String(row[descIdx]).trim();
    }
    // Aggiungi dettagli se c'è una colonna "Dettagli" (indice 2 per Intesa)
    if (descIdx !== -1 && row[descIdx + 1] && typeof row[descIdx + 1] === 'string') {
      const details = String(row[descIdx + 1]).trim();
      if (details && details !== description) {
        description = description ? `${description} - ${details}` : details;
      }
    }

    if (!description) description = 'Transazione importata';

    // Pulisci la descrizione
    description = description.replace(/\s+/g, ' ').trim().substring(0, 200);

    if (date && amount !== null && amount !== 0) {
      transactions.push({
        date,
        amount,
        description
      });
    }
  }

  if (transactions.length === 0) {
    throw new Error('Nessuna transazione valida trovata nel file. Verifica che il file contenga date e importi validi.');
  }

  console.log('Transazioni trovate:', transactions.length);
  return transactions;
}

// Parse file CSV
export function parseCSV(csvContent) {
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  const rows = lines.map(line => parseCSVLine(line));
  return parseRows(rows);
}

// Parse file Excel (base64)
export function parseExcel(base64Content) {
  const workbook = XLSX.read(base64Content, { type: 'base64' });

  // Prendi il primo foglio
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  console.log('Lettura foglio:', sheetName);

  // Converti in array di array
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Righe totali nel file:', rows.length);

  return parseRows(rows);
}

// Parse automatico (rileva il formato)
export function parseFile(content, isBase64 = false) {
  if (isBase64) {
    return parseExcel(content);
  }
  return parseCSV(content);
}

export default { parseCSV, parseExcel, parseFile };
