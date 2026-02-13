// Categorie automatiche basate sul budget personale
const CATEGORIES = {
  necessita: [
    // Supermercati / Spesa
    'esselunga', 'conad', 'coop', 'lidl', 'eurospin', 'carrefour', 'aldi',
    'penny', 'pam', 'despar', 'md discount', 'tigre', 'famila', 'iper',
    'supermercato', 'market', 'alimentari', 'spesa', 'alimentare',
    'todis', 'simply', 'bennet', 'eataly', 'natura si',
    // Bollette / Utenze
    'enel', 'eni', 'edison', 'a2a', 'hera', 'iren', 'acea', 'sorgenia',
    'luce', 'gas', 'elettricita', 'bolletta', 'utenze', 'energia',
    // Telefonia
    'tim', 'vodafone', 'wind', 'tre', 'iliad', 'fastweb', 'telefono',
    'ho mobile', 'kena', 'very mobile', 'poste mobile', 'lycamobile',
    'ricarica', 'top up',
    // Mutuo / Affitto / Casa
    'affitto', 'mutuo', 'condominio', 'amministratore', 'canone',
    // Trasporti
    'benzina', 'diesel', 'carburante', 'eni station', 'q8', 'ip',
    'atm', 'atac', 'trenitalia', 'italo', 'abbonamento trasporti',
    'autobus', 'metro', 'treno', 'autostrada', 'telepass', 'parcheggio',
    'taxi', 'uber', 'bolt', 'freenow',
    // Salute / Spese mediche
    'farmacia', 'parafarmacia', 'medico', 'dottore', 'ospedale', 'asl',
    'dentista', 'oculista', 'visita medica', 'analisi', 'ricetta',
    // Assicurazioni
    'assicurazione', 'unipol', 'generali', 'allianz', 'axa', 'zurich',
    // Interessi / Investimenti
    'investiment', 'interessi', 'fondo pensione'
  ],
  svago: [
    // Ristoranti / Bar / Uscite
    'ristorante', 'pizzeria', 'trattoria', 'osteria', 'bar ', 'pub',
    'mcdonald', 'burger king', 'kfc', 'starbucks', 'domino',
    'deliveroo', 'glovo', 'just eat', 'uber eats',
    'pranzo', 'cena', 'aperitivo', 'cocktail',
    // Intrattenimento / Abbonamenti online
    'netflix', 'spotify', 'disney', 'amazon prime', 'dazn', 'now tv',
    'playstation', 'xbox', 'nintendo', 'steam', 'epic games',
    'apple music', 'youtube', 'twitch', 'crunchyroll',
    'cinema', 'teatro', 'concerto', 'museo', 'mostra', 'evento',
    // Shopping / Abbigliamento
    'zara', 'h&m', 'primark', 'zalando', 'asos', 'shein',
    'nike', 'adidas', 'puma', 'uniqlo', 'pull&bear', 'bershka',
    'ovs', 'terranova', 'intimissimi', 'calzedonia',
    // Amazon / E-commerce
    'amazon', 'ebay', 'aliexpress', 'temu', 'wish',
    // Elettronica
    'mediaworld', 'unieuro', 'euronics', 'expert', 'apple store',
    // Sport / Palestra
    'palestra', 'fitness', 'decathlon', 'sport', 'crossfit', 'piscina',
    // Viaggi
    'hotel', 'booking', 'airbnb', 'ryanair', 'easyjet', 'alitalia',
    'wizz air', 'vueling', 'flixbus', 'hostel',
    // Libri / Cultura
    'libreria', 'feltrinelli', 'mondadori', 'ibs', 'kindle', 'libro',
    // Beauty / Cura personale
    'beauty', 'sephora', 'kiko', 'douglas', 'parrucchiere', 'barbiere',
    'estetica', 'nail', 'profumeria',
    // Scommesse / Gioco
    'betflag', 'bet365', 'sisal', 'lottomatica', 'snai', 'goldbet',
    'scommess', 'pokerstars', 'betfair', 'eurobet',
    // Distributori automatici
    'distrib.automati', 'argenta', 'distributore',
    // Tabacchi
    'tabacchi', 'tabacch', 'fortunato'
  ],
  entrata: [
    'stipendio', 'salario', 'bonifico a vostro favore', 'accredito',
    'rimborso', 'cashback', 'bonifico in entrata'
  ]
};

// Categorizza una transazione
export function categorize(description, amount) {
  const desc = description.toLowerCase();

  // Se è un'entrata (importo positivo)
  if (amount > 0) {
    return 'entrata';
  }

  // Cerca nelle categorie
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Se non trova nulla, default a svago
  return 'svago';
}

// Suggerisci categoria in base allo storico
export function suggestCategory(description, db) {
  const desc = description.toLowerCase();

  // Cerca transazioni simili passate
  const similar = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM transactions
    WHERE LOWER(description) LIKE ?
    AND category != 'non_categorizzato'
    GROUP BY category
    ORDER BY count DESC
    LIMIT 1
  `).get(`%${desc.substring(0, 10)}%`);

  if (similar) {
    return similar.category;
  }

  return categorize(description, -1);
}

export default { categorize, suggestCategory };
