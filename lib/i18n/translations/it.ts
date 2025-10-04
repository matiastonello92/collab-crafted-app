export const it = {
  // Common
  common: {
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    edit: 'Modifica',
    create: 'Crea',
    back: 'Indietro',
    next: 'Avanti',
    search: 'Cerca',
    loading: 'Caricamento...',
    saving: 'Salvataggio...',
    required: 'Obbligatorio',
    optional: 'Facoltativo',
    yes: 'Sì',
    no: 'No',
  },

  // Recipe Categories
  categories: {
    appetizer: 'Antipasto',
    main_course: 'Primo',
    second_course: 'Secondo',
    side_dish: 'Contorno',
    dessert: 'Dessert',
    beverage: 'Bevanda',
  },

  // Allergens
  allergens: {
    gluten: 'Glutine',
    crustaceans: 'Crostacei',
    eggs: 'Uova',
    fish: 'Pesce',
    peanuts: 'Arachidi',
    soy: 'Soia',
    milk: 'Latte',
    tree_nuts: 'Frutta a Guscio',
    celery: 'Sedano',
    mustard: 'Senape',
    sesame: 'Sesamo',
    lupin: 'Lupini',
    molluscs: 'Molluschi',
    sulfur_dioxide: 'Anidride Solforosa',
  },

  // Months
  months: {
    jan: 'Gennaio',
    feb: 'Febbraio',
    mar: 'Marzo',
    apr: 'Aprile',
    may: 'Maggio',
    jun: 'Giugno',
    jul: 'Luglio',
    aug: 'Agosto',
    sep: 'Settembre',
    oct: 'Ottobre',
    nov: 'Novembre',
    dec: 'Dicembre',
  },

  // Recipe Status
  recipeStatus: {
    draft: 'Bozza',
    submitted: 'In Approvazione',
    published: 'Pubblicata',
    archived: 'Archiviata',
  },

  recipeStatusTooltip: {
    draft: 'Ricetta in fase di creazione, non ancora inviata per approvazione',
    submitted: 'Ricetta inviata e in attesa di approvazione dal manager',
    published: 'Ricetta approvata e visibile a tutti',
    archived: 'Ricetta archiviata, non più in uso',
  },

  // Recipe Editor
  recipe: {
    newRecipe: 'Nuova Ricetta',
    editRecipe: 'Modifica Ricetta',
    fillAllFields: 'Compila tutti i campi per creare una nuova ricetta',
    backToRecipes: 'Torna alle ricette',
    backToRecipe: 'Torna alla ricetta',
    
    // Tabs
    basicInfo: 'Informazioni Base',
    ingredients: 'Ingredienti',
    preparation: 'Preparazione',
    
    // Fields
    title: 'Titolo',
    titlePlaceholder: 'Es: Carbonara tradizionale',
    description: 'Descrizione',
    descriptionPlaceholder: 'Breve descrizione della ricetta...',
    category: 'Categoria',
    selectCategory: 'Seleziona...',
    servings: 'Porzioni',
    prepTime: 'Tempo Preparazione (min)',
    cookTime: 'Tempo Cottura (min)',
    photo: 'Foto Ricetta',
    allergensLabel: 'Allergeni',
    seasonality: 'Stagionalità (mesi consigliati)',
    
    // Validation messages
    enterTitle: 'Inserisci un titolo',
    selectCategoryError: 'Seleziona una categoria',
    servingsMin: 'Le porzioni devono essere almeno 1',
    addIngredient: 'Aggiungi almeno un ingrediente',
    incompleteIngredients: 'Alcuni ingredienti hanno quantità mancanti o non valide',
    missingContext: 'Contesto utente mancante',
    noPhotoWarning: 'La ricetta non ha una foto. Vuoi comunque salvare?',
    addStepsLater: 'Potrai aggiungere gli step di preparazione dopo il salvataggio',
    unsavedChanges: 'Hai modifiche non salvate. Vuoi davvero uscire?',
    
    // Success messages
    recipeCreated: 'Ricetta creata! Aggiungi ora gli step di preparazione',
    recipeUpdated: 'Ricetta aggiornata',
    photoUploaded: 'Foto caricata',
    
    // Error messages
    notFound: 'Ricetta non trovata',
    cannotEdit: 'Solo le bozze possono essere modificate',
    noPermission: 'Non hai i permessi per modificare questa ricetta',
    loadError: 'Errore caricamento ricetta',
    saveError: 'Errore salvataggio ricetta',
    uploadError: 'Errore caricamento foto',
    selectValidImage: 'Seleziona un file immagine valido',
  },

  // Settings
  settings: {
    title: 'Impostazioni',
    manageProfile: 'Gestisci il tuo profilo e le tue preferenze',
    saveChanges: 'Salva modifiche',
    backToDashboard: 'Torna alla Dashboard',
    
    // Organization setup
    setupOrg: 'Configura la tua organizzazione',
    setupOrgDescription: 'Per accedere alle impostazioni del profilo, devi prima unirti o creare un\'organizzazione.',
    goToAdmin: 'Vai al pannello amministratore',
    completeSetup: 'Completa la configurazione del tuo account',
    
    // Tabs
    profile: 'Profilo',
    preferences: 'Preferenze',
    notifications: 'Notifiche',
    
    // Profile
    profileInfo: 'Informazioni Profilo',
    updatePersonalInfo: 'Aggiorna le tue informazioni personali',
    fullName: 'Nome completo',
    fullNamePlaceholder: 'Mario Rossi',
    phone: 'Telefono',
    phonePlaceholder: '+39 123 456 7890',
    email: 'Email',
    emailCannotChange: 'L\'email non può essere modificata da qui',
    
    // Preferences
    customizeExperience: 'Personalizza la tua esperienza nell\'app',
    language: 'Lingua',
    timezone: 'Fuso orario',
    marketing: 'Marketing',
    marketingDescription: 'Ricevi email promozionali e aggiornamenti',
    
    // Email test
    testEmailConfig: 'Test configurazione email',
    testEmailDescription: 'Invia una email di test per verificare che tutto funzioni',
    sendTestEmail: 'Invia email di test',
    sending: 'Invio...',
    lastTest: 'Ultimo test',
    testEmailSent: 'Email di test inviata con successo!',
    testEmailError: 'Errore nell\'invio',
    
    // Notifications
    notificationPreferences: 'Preferenze Notifiche',
    controlNotifications: 'Controlla quando e come ricevere le notifiche',
    emailNotifications: 'Email notifiche',
    receiveEmailNotif: 'Ricevi notifiche via email',
    systemNotifications: 'Notifiche sistema',
    systemNotifDescription: 'Aggiornamenti importanti del sistema',
    activityNotifications: 'Notifiche attività',
    activityNotifDescription: 'Modifiche e aggiornamenti sui tuoi dati',
    
    // Detailed email preferences
    detailedEmailPreferences: 'Preferenze Email Dettagliate',
    chooseEmailTypes: 'Scegli quali email ricevere per ogni tipo di evento',
    rotaPublished: 'Planning pubblicato',
    rotaPublishedDescription: 'Email quando un nuovo planning settimanale viene pubblicato',
    shiftChanges: 'Modifiche turni',
    shiftChangesDescription: 'Email quando ti viene assegnato o modificato un turno',
    leaveDecisions: 'Decisioni assenze',
    leaveDecisionsDescription: 'Email quando le tue richieste di assenza vengono approvate o rifiutate',
    advancedConfig: 'Configurazione avanzata (JSON)',
    
    // Success/error
    profileUpdated: 'Profilo aggiornato con successo!',
    saveError: 'Errore nel salvataggio',
  },

  // Languages
  languages: {
    it: 'Italiano',
    en: 'English',
    fr: 'Français',
    es: 'Español',
  },

  // Timezones
  timezones: {
    'Europe/Rome': 'Europa/Roma',
    'Europe/Paris': 'Europa/Parigi',
    'Europe/London': 'Europa/Londra',
    'America/New_York': 'America/New York',
    'America/Los_Angeles': 'America/Los Angeles',
    'Asia/Tokyo': 'Asia/Tokyo',
  },
} as const;
