export const en = {
  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    loading: 'Loading...',
    saving: 'Saving...',
    required: 'Required',
    optional: 'Optional',
    yes: 'Yes',
    no: 'No',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    kitchen: 'Kitchen',
    bar: 'Bar',
    cleaning: 'Cleaning',
    history: 'History',
    templates: 'Template Management',
    productsSeparator: 'Products',
    catalog: 'Product Catalog',
    shifts: 'Klyra Shifts',
    onboarding: 'Rota Onboarding',
    planner: 'Shift Planner',
    myShifts: 'My Shifts',
    jobTags: 'Job Tags',
    compliance: 'Compliance',
    recipes: 'Klyra Recipes',
    recipesList: 'Recipe List',
    admin: 'Administration',
    invitations: 'Invitations',
    locations: 'Locations',
    permissionTags: 'Permission Tags',
    emailLogs: 'Email Logs',
    qa: 'QA & Debug',
    settings: 'Settings',
    locked: 'Locked',
    platform: 'Platform',
    systemActive: 'System Active',
    home: 'Home',
    other: 'Other',
  },

  // Header
  header: {
    noLocation: 'No location',
    selectLocation: 'Select active location',
    errorMemberships: 'Unable to load assignments.',
    errorLocations: 'Unable to load locations.',
    errorFatal: 'Unexpected error.',
  },

  // User dropdown
  user: {
    login: 'Login',
    myProfile: 'My Profile',
    settings: 'Settings',
    logout: 'Logout',
  },

  // Admin
  admin: {
    userManagement: 'User Management',
    userManagementDesc: 'Invite and manage users in your organization',
    inviteUser: 'Invite User',
    backToList: 'Back to list',
    inviteUserTitle: 'Invite User',
    inviteUserDesc: 'Send an invitation to add a new user to the system',
    inviteDetails: 'Invitation Details',
    inviteDetailsDesc: 'Fill in the fields to send the invitation via email',
    accessDenied: 'Access Denied',
    accessDeniedDesc: 'You do not have the necessary permissions to access this admin section.',
    adminRequired: 'Administrator role is required to view this page.',
  },

  // Metadata (page titles/descriptions)
  metadata: {
    plannerTitle: 'Shift Planner',
    plannerDesc: 'Plan and manage your team\'s shifts',
    myShiftsTitle: 'My Shifts',
    myShiftsDesc: 'View your assigned shifts',
  },

  // Aria labels
  aria: {
    mainNav: 'Main navigation',
    expandNav: 'Expand navigation menu',
    collapseNav: 'Collapse navigation menu',
    openMenu: 'Open menu',
    toggleLanguage: 'Change language',
  },

  // Recipe Categories
  categories: {
    appetizer: 'Appetizer',
    main_course: 'Main Course',
    second_course: 'Second Course',
    side_dish: 'Side Dish',
    dessert: 'Dessert',
    beverage: 'Beverage',
  },

  // Allergens
  allergens: {
    gluten: 'Gluten',
    crustaceans: 'Crustaceans',
    eggs: 'Eggs',
    fish: 'Fish',
    peanuts: 'Peanuts',
    soy: 'Soy',
    milk: 'Milk',
    tree_nuts: 'Tree Nuts',
    celery: 'Celery',
    mustard: 'Mustard',
    sesame: 'Sesame',
    lupin: 'Lupin',
    molluscs: 'Molluscs',
    sulfur_dioxide: 'Sulfur Dioxide',
  },

  // Months
  months: {
    jan: 'January',
    feb: 'February',
    mar: 'March',
    apr: 'April',
    may: 'May',
    jun: 'June',
    jul: 'July',
    aug: 'August',
    sep: 'September',
    oct: 'October',
    nov: 'November',
    dec: 'December',
  },

  // Recipe Status
  recipeStatus: {
    draft: 'Draft',
    submitted: 'Pending Approval',
    published: 'Published',
    archived: 'Archived',
  },

  recipeStatusTooltip: {
    draft: 'Recipe in draft, not yet submitted for approval',
    submitted: 'Recipe submitted and awaiting manager approval',
    published: 'Recipe approved and visible to everyone',
    archived: 'Recipe archived, no longer in use',
  },

  // Recipe Editor
  recipe: {
    newRecipe: 'New Recipe',
    editRecipe: 'Edit Recipe',
    fillAllFields: 'Fill in all fields to create a new recipe',
    backToRecipes: 'Back to recipes',
    backToRecipe: 'Back to recipe',
    
    // Tabs
    basicInfo: 'Basic Information',
    ingredients: 'Ingredients',
    preparation: 'Preparation',
    
    // Fields
    title: 'Title',
    titlePlaceholder: 'E.g.: Traditional Carbonara',
    description: 'Description',
    descriptionPlaceholder: 'Brief recipe description...',
    category: 'Category',
    selectCategory: 'Select...',
    servings: 'Servings',
    prepTime: 'Prep Time (min)',
    cookTime: 'Cook Time (min)',
    photo: 'Recipe Photo',
    allergensLabel: 'Allergens',
    seasonality: 'Seasonality (recommended months)',
    
    // Validation messages
    enterTitle: 'Enter a title',
    selectCategoryError: 'Select a category',
    servingsMin: 'Servings must be at least 1',
    addIngredient: 'Add at least one ingredient',
    incompleteIngredients: 'Some ingredients have missing or invalid quantities',
    missingContext: 'User context missing',
    noPhotoWarning: 'The recipe has no photo. Save anyway?',
    addStepsLater: 'You can add preparation steps after saving',
    unsavedChanges: 'You have unsaved changes. Do you really want to exit?',
    
    // Success messages
    recipeCreated: 'Recipe created! Now add the preparation steps',
    recipeUpdated: 'Recipe updated',
    photoUploaded: 'Photo uploaded',
    
    // Error messages
    notFound: 'Recipe not found',
    cannotEdit: 'Only drafts can be edited',
    noPermission: 'You don\'t have permission to edit this recipe',
    loadError: 'Error loading recipe',
    saveError: 'Error saving recipe',
    uploadError: 'Error uploading photo',
    selectValidImage: 'Select a valid image file',
  },

  // Settings
  settings: {
    title: 'Settings',
    manageProfile: 'Manage your profile and preferences',
    saveChanges: 'Save changes',
    backToDashboard: 'Back to Dashboard',
    
    // Organization setup
    setupOrg: 'Setup your organization',
    setupOrgDescription: 'To access profile settings, you must first join or create an organization.',
    goToAdmin: 'Go to admin panel',
    completeSetup: 'Complete your account setup',
    
    // Tabs
    profile: 'Profile',
    preferences: 'Preferences',
    notifications: 'Notifications',
    
    // Profile
    profileInfo: 'Profile Information',
    updatePersonalInfo: 'Update your personal information',
    fullName: 'Full name',
    fullNamePlaceholder: 'John Doe',
    phone: 'Phone',
    phonePlaceholder: '+1 234 567 890',
    email: 'Email',
    emailCannotChange: 'Email cannot be changed here',
    
    // Preferences
    customizeExperience: 'Customize your app experience',
    language: 'Language',
    timezone: 'Timezone',
    marketing: 'Marketing',
    marketingDescription: 'Receive promotional emails and updates',
    
    // Email test
    testEmailConfig: 'Test email configuration',
    testEmailDescription: 'Send a test email to verify everything works',
    sendTestEmail: 'Send test email',
    sending: 'Sending...',
    lastTest: 'Last test',
    testEmailSent: 'Test email sent successfully!',
    testEmailError: 'Error sending',
    
    // Notifications
    notificationPreferences: 'Notification Preferences',
    controlNotifications: 'Control when and how to receive notifications',
    emailNotifications: 'Email notifications',
    receiveEmailNotif: 'Receive email notifications',
    systemNotifications: 'System notifications',
    systemNotifDescription: 'Important system updates',
    activityNotifications: 'Activity notifications',
    activityNotifDescription: 'Changes and updates to your data',
    
    // Detailed email preferences
    detailedEmailPreferences: 'Detailed Email Preferences',
    chooseEmailTypes: 'Choose which emails to receive for each event type',
    rotaPublished: 'Rota published',
    rotaPublishedDescription: 'Email when a new weekly rota is published',
    shiftChanges: 'Shift changes',
    shiftChangesDescription: 'Email when you are assigned or modified a shift',
    leaveDecisions: 'Leave decisions',
    leaveDecisionsDescription: 'Email when your leave requests are approved or rejected',
    advancedConfig: 'Advanced configuration (JSON)',
    
    // Success/error
    profileUpdated: 'Profile updated successfully!',
    saveError: 'Error saving',
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
    'Europe/Rome': 'Europe/Rome',
    'Europe/Paris': 'Europe/Paris',
    'Europe/London': 'Europe/London',
    'America/New_York': 'America/New York',
    'America/Los_Angeles': 'America/Los Angeles',
    'Asia/Tokyo': 'Asia/Tokyo',
  },
} as const;