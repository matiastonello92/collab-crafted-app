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

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    inventory: 'Inventari',
    kitchen: 'Cucina',
    bar: 'Bar',
    cleaning: 'Pulizie',
    history: 'Storico',
    templates: 'Gestione Template',
    productsSeparator: 'Prodotti',
    catalog: 'Catalogo Prodotti',
    shifts: 'Klyra Shifts',
    onboarding: 'Onboarding Rota',
    planner: 'Planner Turni',
    myShifts: 'I miei Turni',
    jobTags: 'Job Tags',
    compliance: 'Compliance',
    recipes: 'Klyra Recipes',
    recipesList: 'Lista Ricette',
    admin: 'Amministrazione',
    invitations: 'Inviti',
    locations: 'Locations',
    permissionTags: 'Permission Tags',
    emailLogs: 'Email Logs',
    qa: 'QA & Debug',
    settings: 'Impostazioni',
    locked: 'Bloccato',
    platform: 'Platform',
    systemActive: 'Sistema Attivo',
    home: 'Home',
    other: 'Altro',
  },

  // Header
  header: {
    noLocation: 'Nessuna sede',
    selectLocation: 'Seleziona sede attiva',
    errorMemberships: 'Impossibile leggere le assegnazioni.',
    errorLocations: 'Impossibile leggere le sedi.',
    errorFatal: 'Errore inatteso.',
  },

  // User dropdown
  user: {
    login: 'Accedi',
    myProfile: 'Il Mio Profilo',
    settings: 'Impostazioni',
    logout: 'Logout',
  },

  // Admin
  admin: {
    userManagement: 'Gestione Utenti',
    userManagementDesc: 'Invita e gestisci gli utenti della tua organizzazione',
    inviteUser: 'Invita Utente',
    backToList: 'Torna alla lista',
    inviteUserTitle: 'Invita Utente',
    inviteUserDesc: 'Invia un invito per aggiungere un nuovo utente al sistema',
    inviteDetails: 'Dettagli Invito',
    inviteDetailsDesc: 'Compila i campi per inviare l\'invito via email',
    accessDenied: 'Accesso Negato',
    accessDeniedDesc: 'Non hai i permessi necessari per accedere a questa sezione amministrativa.',
    adminRequired: 'È richiesto il ruolo di amministratore per visualizzare questa pagina.',
  },

  // Metadata (page titles/descriptions)
  metadata: {
    plannerTitle: 'Planner Turni',
    plannerDesc: 'Pianifica e gestisci i turni del tuo team',
    myShiftsTitle: 'I Miei Turni',
    myShiftsDesc: 'Visualizza i tuoi turni assegnati',
  },

  // Aria labels
  aria: {
    mainNav: 'Navigazione principale',
    expandNav: 'Espandi menu di navigazione',
    collapseNav: 'Comprimi menu di navigazione',
    openMenu: 'Apri menu',
    toggleLanguage: 'Cambia lingua',
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

  // Toast Messages
  toast: {
    // Generic success
    success: {
      saved: 'Salvato con successo',
      created: 'Creato con successo',
      updated: 'Aggiornato con successo',
      deleted: 'Eliminato con successo',
      copied: 'Copiato negli appunti',
      uploaded: 'Caricato con successo',
      sent: 'Inviato con successo',
      activated: 'Attivato',
      deactivated: 'Disattivato',
      approved: 'Approvato',
      rejected: 'Rifiutato',
      cancelled: 'Annullato',
      revoked: 'Revocato',
      generated: 'Generato con successo',
      exported: 'Esportato con successo',
      imported: 'Importato con successo',
    },

    // Generic errors
    error: {
      generic: 'Si è verificato un errore',
      loading: 'Errore nel caricamento',
      saving: 'Errore durante il salvataggio',
      creating: 'Errore durante la creazione',
      updating: 'Errore durante l\'aggiornamento',
      deleting: 'Errore durante l\'eliminazione',
      copying: 'Errore nella copia',
      uploading: 'Errore durante il caricamento',
      sending: 'Errore durante l\'invio',
      processing: 'Errore durante l\'elaborazione',
      exporting: 'Errore durante l\'esportazione',
      importing: 'Errore durante l\'importazione',
      notFound: 'Risorsa non trovata',
      unauthorized: 'Non autorizzato',
      forbidden: 'Accesso negato',
      validation: 'Dati non validi',
      network: 'Errore di connessione',
      timeout: 'Timeout della richiesta',
    },

    // Invitations
    invitation: {
      created: 'Invito creato con successo',
      revoked: 'Invito revocato',
      linkCopied: 'Link copiato negli appunti',
      errorCreating: 'Errore durante la creazione dell\'invito',
      errorRevoking: 'Errore nella revoca dell\'invito',
      errorCopying: 'Errore nella copia del link',
      errorLoading: 'Errore nel caricamento degli inviti',
      selectRoleLocation: 'Seleziona almeno un ruolo e una location',
    },

    // Locations
    location: {
      created: 'Location creata con successo',
      updated: 'Location aggiornata con successo',
      deleted: 'Location eliminata con successo',
      photoUploaded: 'Foto caricata con successo',
      scheduleUpdated: 'Orari di apertura salvati con successo',
      managerAdded: 'Manager assegnato con successo',
      managerRemoved: 'Manager rimosso con successo',
      errorCreating: 'Impossibile creare la location',
      errorUpdating: 'Impossibile salvare le modifiche',
      errorDeleting: 'Impossibile eliminare la location',
      errorUploadingPhoto: 'Impossibile caricare la foto',
      errorUpdatingSchedule: 'Impossibile salvare gli orari',
      errorAddingManager: 'Impossibile aggiungere il manager',
      errorRemovingManager: 'Impossibile rimuovere il manager',
      nameRequired: 'Il nome della location è obbligatorio',
    },

    // Users
    user: {
      created: 'Utente creato con successo',
      updated: 'Utente aggiornato con successo',
      deleted: 'Utente eliminato con successo',
      roleAssigned: 'Ruolo assegnato con successo',
      roleRemoved: 'Ruolo rimosso con successo',
      permissionUpdated: 'Permesso aggiornato con successo',
      errorCreating: 'Errore durante la creazione dell\'utente',
      errorUpdating: 'Errore durante l\'aggiornamento dell\'utente',
      errorDeleting: 'Errore durante l\'eliminazione dell\'utente',
      errorLoadingDetails: 'Errore nel caricamento dei dettagli',
    },

    // Recipes
    recipe: {
      created: 'Ricetta creata con successo',
      updated: 'Ricetta aggiornata con successo',
      deleted: 'Ricetta eliminata con successo',
      cloned: 'Ricetta clonata',
      published: 'Ricetta pubblicata',
      archived: 'Ricetta archiviata',
      errorCreating: 'Errore durante la creazione della ricetta',
      errorUpdating: 'Errore durante l\'aggiornamento della ricetta',
      errorDeleting: 'Errore durante l\'eliminazione della ricetta',
      errorCloning: 'Impossibile clonare la ricetta',
      errorLoading: 'Errore nel caricamento della ricetta',
    },

    // Templates
    template: {
      created: 'Template creato con successo',
      updated: 'Template aggiornato con successo',
      deleted: 'Template eliminato',
      activated: 'Template attivato',
      deactivated: 'Template disattivato',
      errorCreating: 'Errore durante la creazione del template',
      errorUpdating: 'Errore nell\'aggiornamento del template',
      errorDeleting: 'Errore nell\'eliminazione del template',
      errorLoading: 'Errore nel caricamento dei template',
    },

    // Leave requests
    leave: {
      created: 'Richiesta ferie creata',
      updated: 'Richiesta ferie aggiornata',
      cancelled: 'Richiesta ferie annullata',
      approved: 'Richiesta ferie approvata',
      rejected: 'Richiesta ferie rifiutata',
      errorCreating: 'Errore durante la creazione della richiesta',
      errorUpdating: 'Errore durante l\'aggiornamento',
      errorCancelling: 'Errore durante l\'annullamento',
      errorProcessing: 'Errore durante l\'elaborazione',
      errorLoading: 'Errore nel caricamento delle richieste',
    },

    // Timesheets
    timesheet: {
      generated: 'Timesheet generati',
      exported: 'File CSV scaricato',
      correctionApproved: 'Correzione approvata',
      correctionRejected: 'Correzione rifiutata',
      errorGenerating: 'Errore nella generazione dei timesheets',
      errorExporting: 'Errore nell\'export',
      errorLoading: 'Errore nel caricamento dei timesheets',
      errorProcessing: 'Errore durante la decisione',
      noEvents: 'Non ci sono eventi time clock nel mese corrente',
    },

    // Compliance
    compliance: {
      ruleUpdated: 'Regola aggiornata',
      violationSilenced: 'Violazione silenziata',
      errorLoading: 'Errore caricamento regole',
      errorUpdating: 'Errore aggiornamento',
      errorSilencing: 'Errore nel silenziamento',
    },

    // Shifts & Planner
    shift: {
      created: 'Turno creato',
      updated: 'Turno aggiornato',
      deleted: 'Turno eliminato',
      assigned: 'Turno assegnato',
      unassigned: 'Assegnazione rimossa',
      published: 'Turni pubblicati',
      errorCreating: 'Errore nella creazione del turno',
      errorUpdating: 'Errore nell\'aggiornamento del turno',
      errorDeleting: 'Errore nell\'eliminazione del turno',
      errorAssigning: 'Errore nell\'assegnazione',
      errorPublishing: 'Errore nella pubblicazione',
      errorLoading: 'Errore nel caricamento dei turni',
    },

    // Job Tags
    jobTag: {
      created: 'Tag creato',
      updated: 'Tag aggiornato',
      deleted: 'Tag eliminato',
      assigned: 'Tag assegnato',
      unassigned: 'Tag rimosso',
      errorCreating: 'Errore nella creazione del tag',
      errorUpdating: 'Errore nell\'aggiornamento del tag',
      errorDeleting: 'Errore nell\'eliminazione del tag',
      errorAssigning: 'Errore nell\'assegnazione',
    },

    // Email logs
    email: {
      sent: 'Email inviata',
      resent: 'Email reinviata',
      errorSending: 'Errore nell\'invio',
      errorLoading: 'Errore nel caricamento dei log',
    },

    // Products
    product: {
      created: 'Prodotto creato',
      updated: 'Prodotto aggiornato',
      deleted: 'Prodotto eliminato',
      errorCreating: 'Errore nella creazione del prodotto',
      errorUpdating: 'Errore nell\'aggiornamento del prodotto',
      errorDeleting: 'Errore nell\'eliminazione del prodotto',
      errorLoading: 'Errore nel caricamento dei prodotti',
    },
  },
} as const;