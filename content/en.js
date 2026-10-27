// English course. Each level is plain data: add, remove or edit levels freely.
// The app never needs to change when you add levels.
window.CONTENT = window.CONTENT || {};

window.CONTENT.en = {
  name: 'English',
  nativeName: 'English',

  // Every text the interface shows. Translate these for a new language.
  ui: {
    chooseLanguage: 'Choose your language',
    chooseHint: 'We picked one based on your browser. You can change it any time.',
    suggested: 'Suggested',
    levels: 'Levels',
    best: 'Best',
    wpm: 'WPM',
    accuracy: 'Accuracy',
    progress: 'Progress',
    back: '← Back',
    retry: 'Try again',
    next: 'Next level →',
    passed: 'Level complete!',
    failed: 'Not quite',
    needAccuracy: 'You need at least {n}% accuracy to pass.',
    startTyping: 'Start typing to begin. Esc restarts the level.',
    resetProgress: 'Reset progress',
    resetConfirm: 'Delete all saved progress for this language?',
    locked: 'Locked',
    heatmapTitle: 'Mistake heatmap',
    heatmapReset: 'Reset heatmap',
    weakKeys: 'Keys to practice:',
    heatmapEmpty: 'Complete levels to see which keys you miss most. Red = missed often, green = no mistakes yet.'
  },

  levels: [
    { id: 1,  title: 'Home row',      focus: 'a s d f j k l ;', text: 'a sad lad had a flask; a dad asks a lad; all fall' },
    { id: 2,  title: 'Top row',       focus: 'q w e r t y u i o p', text: 'we write quiet words; you try to type it out' },
    { id: 3,  title: 'Bottom row',    focus: 'z x c v b n m', text: 'a brave man can mix a cabin box, and a van can move' },
    { id: 4,  title: 'Capital letters', focus: 'Shift', text: 'The Cat sat on The Mat. Tom and Anna met in Rome.' },
    { id: 5,  title: 'Punctuation',   focus: ', . ? ! : ;', text: 'Well, well, well; what is this? It is fine! Yes: it is.' },
    { id: 6,  title: 'Numbers',       focus: '1 2 3 4 5 6 7 8 9 0', text: 'In 2026 there are 12 months and 365 days; 7 days make 1 week.' },
    { id: 7,  title: 'Short sentence', focus: 'All letters', text: 'The quick brown fox jumps over the lazy dog.' },
    { id: 8,  title: 'Common words',  focus: 'Speed', text: 'the be to of and a in that have it for not on with he as you do at' },
    { id: 9,  title: 'Paragraph',     focus: 'Flow', text: 'Typing well is a habit. Practice a little every day, keep your eyes on the screen, and let your fingers learn the way.' },
    { id: 10, title: 'Speed test',    focus: 'Everything', text: 'A good typist does not rush. Accuracy comes first, and speed follows naturally; after a few weeks, you will type faster than you ever thought possible!' }
  ]
};
