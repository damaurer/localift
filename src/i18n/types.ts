export type Language = 'de' | 'en';

export interface Translations {
  // ── Navigation ──
  nav: {
    home: string;
    plans: string;
    calories: string;
    settings: string;
  };

  // ── Common ──
  common: {
    save: string;
    cancel: string;
    delete: string;
    close: string;
    back: string;
    yes: string;
    no: string;
    all: string;
    allEquipment: string;
    exercises: string;
    sets: string;
    reps: string;
    weight: string;
    duration: string;
    volume: string;
    total: string;
    active: string;
    next: string;
    ready: string;
    streak: string;
    today: string;
    goal: string;
    eaten: string;
    remaining: string;
    search: string;
    info: string;
    configure: string;
    start: string;
    import: string;
    export: string;
    installed: string;
    notInstalled: string;
    error: string;
    loading: string;
    downloading: string;
    skip: string;
    confirm: string;
    noDescription: string;
  };

  // ── Dashboard ──
  dashboard: {
    readyLabel: string;
    trainingCount: string;
    totalVolume: string;
    startTraining: string;
    startWorkout: string;
    createFirstPlan: string;
    exercisesWithWeights: string;
    startOtherPlan: string;
    activeTraining: string;
    myPlans: string;
    showAll: string;
    recentSessions: string;
    history: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    createPlan: string;
  };

  // ── Active Workout ──
  workout: {
    noActiveWorkout: string;
    choosePlan: string;
    exercisesLabel: string;
    pause: string;
    skipRest: string;
    activeSet: string;
    completeSet: string;
    allSetsCompleted: string;
    finishWorkout: string;
    finishTitle: string;
    setsOfTotal: string;
    saveTraining: string;
    continueTraining: string;
    cancelTraining: string;
    cancelTitle: string;
    cancelWarning: string;
    yesCancel: string;
    time: string;
    repShort: string;
    exerciseDescription: string;
    targetLabel: string;
    set: string;
  };

  // ── History ──
  history: {
    noSessions: string;
    sessionNotFound: string;
    exercisesTitle: string;
    bestSet: string;
  };

  // ── Plans ──
  plans: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    noPlansFound: string;
    noPlansCreated: string;
    deletePlan: string;
    confirmDelete: string;
    shareFailed: string;
    importedPlan: string;
    importPlan: string;
    invalidFile: string;
    exerciseDefinitions: string;
    sharePlanText: string;
    aiPlan: string;
  };

  // ── Plan Detail ──
  planDetail: {
    editPlan: string;
    newPlan: string;
    planName: string;
    enterPlanName: string;
    planNamePlaceholder: string;
    descriptionPlaceholder: string;
    tags: string;
    noExercisesYet: string;
    addExercise: string;
    chooseExercise: string;
    exercisesAdded: string;
    exerciseAdded: string;
    noExercisesFound: string;
    savePlan: string;
    saved: string;
    enterPlanNameFirst: string;
    stepPlanInfo: string;
    stepExercises: string;
    unlockExercisesHint: string;
    remove: string;
  };

  // ── Exercise Configurator ──
  exerciseConfig: {
    setsTitle: string;
    targetSets: string;
    addSet: string;
    weightLabel: string;
    extraWeightLabel: string;
    repsLabel: string;
    restLabel: string;
    lastTraining: string;
    bestSetLabel: string;
    exerciseNotFound: string;
    saveConfig: string;
    configSaved: string;
  };

  // ── Calories ──
  calories: {
    tracking: string;
    remaining: string;
    macros: string;
    protein: string;
    carbs: string;
    fats: string;
    hydration: string;
    dailyTimeline: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
    addEntry: string;
    entryName: string;
    entryPlaceholder: string;
    caloriesLabel: string;
    proteinG: string;
    carbsG: string;
    fatsG: string;
    meal: string;
    saveEntry: string;
    adjustGoals: string;
    caloriesMacroGoals: string;
    caloriesKcal: string;
    waterMl: string;
    saveGoals: string;
    dailyProgress: string;
    historyTitle: string;
    logEntry: string;
  };

  // ── Settings ──
  settings: {
    title: string;
    subtitle: string;
    sessions: string;
    plans: string;
    exercises: string;
    notificationsBlocked: string;
    enableNotifications: string;
    unblockInBrowser: string;
    grantPermission: string;
    localStorage: string;
    usedPercent: string;
    dataStoredLocally: string;
    reminders: string;
    dailyTrainingHints: string;
    time: string;
    aiTrainer: string;
    localModel: string;
    modelReady: string;
    downloadProgress: string;
    modelLoading: string;
    modelError: string;
    openChat: string;
    appAndData: string;
    weightUnit: string;
    weightUnitDesc: string;
    vibration: string;
    exportData: string;
    exported: string;
    downloadBackup: string;
    importData: string;
    imported: string;
    importFailed: string;
    selectBackup: string;
    feedbackAndProblems: string;
    reportBugsOrWishes: string;
    privacyNotice: string;
    dataStorageTransparency: string;
    deleteAllData: string;
    deleteAllConfirm: string;
    yesDeleteAll: string;
    appInfo: string;
    appTagline: string;
    language: string;
    languageDesc: string;
    theme: string;
    themeDesc: string;
    themeDark: string;
    themeLight: string;
  };

  // ── Feedback Dialog ──
  feedback: {
    title: string;
    subtitle: string;
    description: string;
    openGithub: string;
    skipCheckbox: string;
    yesOpen: string;
  };

  // ── Consent Modal ──
  consent: {
    welcomeTitle: string;
    privacyTitle: string;
    introText: string;
    infoText: string;
    dataLocal: string;
    noServer: string;
    aiLocal: string;
    remindersOptional: string;
    checkboxLabel: string;
    decline: string;
    confirmAndContinue: string;
    understood: string;
    closedMessage: string;
  };

  // ── Install Prompt ──
  install: {
    title: string;
    iosInstructions: string;
    androidDescription: string;
    installButton: string;
    notNow: string;
  };

  // ── AI Chat ──
  aiChat: {
    writing: string;
    ready: string;
    clearChat: string;
    noModelLoaded: string;
    modelErrorDesc: string;
    installModelDesc: string;
    installModel: string;
    openSettings: string;
    welcomeDesc: string;
    messagePlaceholder: string;
    you: string;
    planAnalyze: string;
    trainingTip: string;
    regeneration: string;
    newPlan: string;
    planAnalyzePrompt: string;
    trainingTipPrompt: string;
    regenerationPrompt: string;
    newPlanPrompt: string;
    aiCreatingPlan: string;
    modelCacheHint: string;
  };

  // ── AI Plan Generator ──
  aiPlanGen: {
    title: string;
    heroSubtitle: string;
    describeGoal: string;
    quickSelect: string;
    suggestion1: string;
    suggestion2: string;
    suggestion3: string;
    suggestion4: string;
    inputPlaceholder: string;
    generatePlan: string;
    howItWorks: string;
    infoLibrary: string;
    infoLocal: string;
    infoEdit: string;
    modelRequired: string;
    modelLoading: string;
    modelLoadingDesc: string;
    installModelDesc: string;
    analyzeStats: string;
    analyzeStatsDesc: string;
    structureBlocks: string;
    structureBlocksDesc: string;
    finalizeSchedule: string;
    finalizeScheduleDesc: string;
    planGenerating: string;
    planGeneratingDesc: string;
    optimization: string;
    status: string;
    completed: string;
    planCreated: string;
    analysisCompleted: string;
    planCreatedDesc: string;
    analysisCompletedDesc: string;
    toMyPlans: string;
    openPlans: string;
    createNewPlan: string;
    unknownError: string;
    chatBusy: string;
    initialization: string;
    download: string;
  };

  // ── Day labels ──
  days: {
    mo: string;
    tu: string;
    we: string;
    th: string;
    fr: string;
    sa: string;
    su: string;
  };

  // ── Plan tags ──
  planTags: {
    kraft: string;
    hypertrophie: string;
    ausdauer: string;
    mobilitaet: string;
    ganzkoerper: string;
    oberkoerper: string;
    unterkoerper: string;
    push: string;
    pull: string;
    beine: string;
  };
}
