// Categorie automatiche basate su parole chiave
const CATEGORIES = {
  necessita: [
    // Supermercati
    'esselunga', 'conad', 'coop', 'lidl', 'eurospin', 'carrefour', 'aldi',
    'penny', 'pam', 'despar', 'md discount', 'tigre', 'famila', 'iper',
    'supermercato', 'market', 'alimentari', 'spesa',
    // Bollette
    'enel', 'eni', 'edison', 'a2a', 'hera', 'iren', 'acea', 'sorgenia',
    'luce', 'gas', 'elettricita', 'bolletta', 'utenze',
    'tim', 'vodafone', 'wind', 'tre', 'iliad', 'fastweb', 'telefono',
    // Affitto/Casa
    'affitto', 'mutuo', 'condominio', 'amministratore',
    // Trasporti necessari
    'benzina', 'diesel', 'carburante', 'eni station', 'q8', 'ip',
    'atm', 'atac', 'trenitalia', 'italo', 'abbonamento trasporti',
    // Salute
    'farmacia', 'parafarmacia', 'medico', 'dottore', 'ospedale', 'asl',
    // Assicurazioni
    'assicurazione', 'unipol', 'generali', 'allianz', 'axa', 'zurich'
  ],
  svago: [
    // Ristoranti/Bar
    'ristorante', 'pizzeria', 'trattoria', 'osteria', 'bar', 'pub',
    'mcdonald', 'burger king', 'kfc', 'starbucks', 'domino',
    'deliveroo', 'glovo', 'just eat', 'uber eats',
    // Intrattenimento
    'netflix', 'spotify', 'disney', 'amazon prime', 'dazn', 'now tv',
    'playstation', 'xbox', 'nintendo', 'steam', 'epic games',
    'cinema', 'teatro', 'concerto', 'museo', 'mostra',
    // Shopping non essenziale
    'zara', 'h&m', 'primark', 'zalando', 'asos', 'shein',
    'mediaworld', 'unieuro', 'euronics', 'expert',
    'amazon', 'ebay', 'aliexpress',
    // Sport/Hobby
    'palestra', 'fitness', 'decathlon', 'sport',
    // Viaggi
    'hotel', 'booking', 'airbnb', 'ryanair', 'easyjet', 'alitalia'
  ],
  entrata: [
    'stipendio', 'salario', 'bonifico in entrata', 'accredito',
    'rimborso', 'cashback'
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

  // Se non trova nulla, default a svago (meglio essere conservativi)
  return 'non_categorizzato';
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
