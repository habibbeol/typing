// Italian course. Same structure as en.js: only the texts change.
// NOTE: for now the typing texts avoid accented letters (à è é ì ò ù), because
// the on-screen keyboard is a plain QWERTY layout. Adding them is a good
// next exercise for you (hint: Italian keyboards have dedicated keys for them).
window.CONTENT = window.CONTENT || {};

window.CONTENT.it = {
  name: 'Italian',
  nativeName: 'Italiano',

  ui: {
    chooseLanguage: 'Scegli la tua lingua',
    chooseHint: 'Ne abbiamo scelta una in base al tuo browser. Puoi cambiarla quando vuoi.',
    suggested: 'Consigliata',
    levels: 'Livelli',
    best: 'Migliore',
    wpm: 'PPM',
    accuracy: 'Precisione',
    progress: 'Progresso',
    back: '← Indietro',
    retry: 'Riprova',
    next: 'Livello successivo →',
    passed: 'Livello completato!',
    failed: 'Quasi!',
    needAccuracy: 'Serve almeno il {n}% di precisione per passare.',
    startTyping: 'Inizia a scrivere per cominciare. Esc riavvia il livello.',
    resetProgress: 'Azzera i progressi',
    resetConfirm: 'Cancellare tutti i progressi salvati per questa lingua?',
    locked: 'Bloccato',
    heatmapTitle: 'Mappa degli errori',
    heatmapReset: 'Azzera la mappa',
    weakKeys: 'Tasti da allenare:',
    heatmapEmpty: 'Completa dei livelli per vedere quali tasti sbagli di più. Rosso = sbagliato spesso, verde = nessun errore.'
  },

  levels: [
    { id: 1,  title: 'Riga centrale',   focus: 'a s d f g h j k l', text: 'ada alla sala; la dalla sala; ala dalla falda; sala; ada sa alla' },
    { id: 2,  title: 'Riga alta',       focus: 'q w e r t y u i o p', text: 'per te, tuo pure; tre porte, tutto qui; ruota e poi torna' },
    { id: 3,  title: 'Riga bassa',      focus: 'z x c v b n m', text: 'Un bimbo canta; zio vuole una banana e un zaino.' },
    { id: 4,  title: 'Maiuscole',       focus: 'Shift', text: 'Il Gatto dorme sul Tavolo. Marco e Anna vivono a Milano.' },
    { id: 5,  title: 'Punteggiatura',   focus: ', . ? ! : ;', text: 'Allora, andiamo; quando arriviamo? Presto! Ecco: siamo qui.' },
    { id: 6,  title: 'Numeri',          focus: '1 2 3 4 5 6 7 8 9 0', text: 'Nel 2026 ci sono 12 mesi e 365 giorni; 7 giorni fanno 1 settimana.' },
    { id: 7,  title: 'Frase breve',     focus: 'Tutte le lettere', text: 'Quel vecchio gatto salta sopra il piccolo cane.' },
    { id: 8,  title: 'Parole comuni',   focus: 'Velocita', text: 'il la di che non un per con sono una anche come ma se lui lei tutto' },
    { id: 9,  title: 'Paragrafo',       focus: 'Ritmo', text: 'Scrivere bene richiede pratica. Esercitati un poco ogni giorno, guarda lo schermo e lascia che le dita imparino la strada.' },
    { id: 10, title: 'Prova di velocita', focus: 'Tutto', text: 'Un buon dattilografo non ha fretta. La precisione viene prima, poi arriva la velocita; dopo qualche settimana scriverai piu veloce di quanto immaginavi!' }
  ]
};
