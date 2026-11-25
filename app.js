const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDm6TE_t2qJGQCCNsVCluBw552_797Av8I6NNuMdZSGnsoGf_GGm49kcLzTwJ_ck2t/exec";
const OFF_DATES_STORAGE_KEY = "LTO_TOGGLED_OFF_DATES_2026";
const SETTINGS_STORAGE_KEY = "LTO_CPAO_SETTINGS_2026";
const CUSTOM_ACCOMPLISHMENTS_KEY = "LTO_CPAO_ACCOMPLISHMENTS_2026";
const LAST_WORKING_ADD_ACTION_KEY = "LTO_WORKING_ADD_ACTION_V1";
const LAST_WORKING_UPDATE_ACTION_KEY = "LTO_WORKING_UPDATE_ACTION_V1";
const LAST_WORKING_SAVE_SETTINGS_ACTION_KEY = "LTO_WORKING_SAVE_SETTINGS_ACTION_V1";
const PENDING_SYNC_QUEUE_KEY = "LTO_PENDING_SYNC_QUEUE_V1";
const PENDING_SETTINGS_SYNC_KEY = "LTO_PENDING_SETTINGS_SYNC_KEY";

const TIMER_24H_DURATION_MS = 24 * 60 * 60 * 1000;
const TIMER_24H_CHECK_INTERVAL_MS = 60 * 1000;

const OFFICIAL_ROLE_RANKS = [
    "Regional Director",
    "Assistant Secretary",
    "Executive Director",
    "Division Chief",
    "Chief"
];

const REPORT_SIGNATORIES = [
    { name: "JANZEN HUWEE N. BALTORES", designation: "Public Relations Officer I" },
    { name: "JHOVAN JAPHET C. TALLEDO", designation: "Public Relations Officer I" },
    { name: "MICHELLE B. LLANERA", designation: "Public Relations Officer II" }
];

const CATEGORY_GROUPS = [
    "Licenses and Permits",
    "Vehicle Registration",
    "Law Enforcement",
    "Intelligence and Investigation Division (IID)",
    "Land Transportation Management System",
    "Client Feedbacks",
    "Other concerns"
];

const DEFAULT_REPORT_COLUMNS = {
    hdrTop10: "TOP 10 CONCERNS / ISSUES",
    colTopRank: "RANK",
    colTopConcern: "CONCERN / ISSUE",
    colTopCount: "COUNT (%)",

    hdrCategoryPortal: "SUMMARY OF ISSUES / CONCERNS AND OTHER VARIABLES PER PORTAL",
    colCatGroup: "CATEGORY GROUP",
    colCatName: "CONCERN CATEGORY",
    colCatPortals: "PORTALS",
    colCatTotal: "TOTAL",

    hdrPortalStatus: "SUMMARY OF ISSUES / CONCERNS AND OTHER VARIABLES PER PORTAL (STATUS & RESPONSE RATE)",
    colPortalName: "PORTAL",
    colAck: "ACKNOWLEDGED",
    colRes: "RESOLVED",
    colPend: "PENDING",
    colRate: "RESPONSE RATE (%)",

    hdrRegionalEndorsed: "TOTAL CONCERNS ENDORSED TO REGIONAL OFFICES",
    colRegOffice: "REGIONAL OFFICE",
    colRegTotal: "TOTAL ENDORSED",
    colRegResolved: "RESOLVED",
    colRegPending: "PENDING"
};

const STANDARD_ENDORSEMENT_TEMPLATE_FIELDS = {
    letterDate: "{todayDate}",
    salutation: "Dear Director {chiefLastName},",
    opening: "This is to respectfully endorse to your Office, the <strong>{ticketSubjectTerm}</strong> {briefDescription}, filed by <strong>{complainantName}</strong>, initially lodged through <strong>{platform}</strong>{forwardedClause} on <strong>{dateReceivedFormatted}</strong>. Please see the attached file for your reference.",
    showCause: "Without prejudice to the exercise of your Office's authority, should the complaint be found to have sufficient merit, the issuance of the appropriate Show Cause Order may be considered in accordance with existing laws, rules, regulations, and applicable LTO issuances.",
    deadline: "Pursuant to the operational guidelines, and the provisions stated in Section 8 (Accountability of Heads of Offices and Agencies) of Republic Act No. 11032 or the Ease of Doing Business and Efficient Government Service Delivery (EODB EGSD) Act of 2018, we would like to respectfully request your office <strong>to respond on {dueDate} or within (20) twenty working days from the date this letter was received</strong> citing the Ticket Reference No. <strong>{ticketRefNo}</strong>.",
    furnishedReq: "In addition, we kindly request that a copy of your response or action taken be furnished to the client and to the Offices listed below for monitoring and record-keeping purposes.\n\nFor your information and action deemed necessary.",
    closing: "Very Respectfully Yours,",
    sigName: "MARY MAY M. JACOB",
    sigTitle: "Head, LTO Strategic Communications",
    sigOffice: "Central – Public Assistance Office",
    copyFurnished: [
        "CENTRAL PUBLIC ASSISTANCE OFFICE | This Office | lto.feedback@gmail.com",
        "RDMPAO | {officeName} | {rdmpaoEmail}",
        "{complainantName} | Complainant | {complainantEmail}"
    ].join("\n")
};

let currentUser = {
    username: "admin36",
    role: "Super Admin",
    name: "Admin 36",
    adminNo: "ADMIN 36",
    logColor: "#9a4e2a",
    canReports: true,
    canDeleteLogs: true,
    canManageUsers: true,
    canAccessSettings: true
};

let pendingTicketSubmission = null;
let editingTicketOriginalState = null;
let lastTicketModalDraft = null;
let lastEndorseModalDraft = null;
let selectedDirectoryIndex = 0;
let activeOfficialsRegionIndex = 0;
let activeTemplateInputField = null;
let isEndorseLetterEditing = false;
let isReportPreviewEditing = false;
let isAccomplishmentPreviewEditing = false;
let isSavingTicket = false;
let isFlushingSyncQueue = false;
let hasShownScriptActionNotice = false;
let customAccomplishments = [];

// Enhanced Settings UI state
let activeSettingsSection = "all";
let settingsHasUnsavedChanges = false;
let settingsSnapshotBeforeEdit = null;
let lastSettingsSavedAt = null;

document.addEventListener("focusin", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("tpl-form-field")) {
        activeTemplateInputField = e.target;
    }
});

let AppState = {
    tickets: [],
    users: [
        { username: "admin36", name: "Admin 36", role: "Super Admin", defaultPortal: "FACEBOOK", pass: "admin123", logColor: "#9a4e2a", canReports: true, canDeleteLogs: true, canManageUsers: true, canAccessSettings: true },
        { username: "janzen", name: "Janzen Huwee N. Baltores", role: "Admin", defaultPortal: "FACEBOOK", pass: "password", logColor: "Default", canReports: false, canDeleteLogs: false, canManageUsers: false, canAccessSettings: false }
    ],
    directory: [
        { code: "RO1", office: "Regional Office 1", chief: "ATTY. NESTOR V. FERNANDEZ II", position: "Regional Director", address: "San Fernando, La Union", number: "(072) 888-1234", email: "roi@lto.gov.ph", officials: [] },
        { code: "RO2", office: "Regional Office 2", chief: "ENGR. SWANSON R. TIONG", position: "Regional Director", address: "Tuguegarao City, Cagayan", number: "(078) 844-5678", email: "ro2@lto.gov.ph", officials: [] },
        { code: "RO3", office: "Regional Office 3", chief: "ATTY. CLEMENTE G. SAPLALA", position: "Regional Director", address: "City of San Fernando, Pampanga", number: "(045) 961-1111", email: "ro3@lto.gov.ph", officials: [] },
        { code: "RO4A", office: "Regional Office 4-A", chief: "ELMER J. DECENA", position: "Regional Director", address: "Lipa City, Batangas", number: "(043) 756-2222", email: "dmsacltocalabarzon@gmail.com", officials: [] },
        { code: "RO4B", office: "Regional Office 4-B", chief: "MARIETTA R. OLAN", position: "Regional Director", address: "Quezon City", number: "(02) 921-3333", email: "ro4b@lto.gov.ph", officials: [] },
        { code: "RO5", office: "Regional Office 5", chief: "NOEL L. TRAJANO", position: "Regional Director", address: "Rawis, Legazpi City", number: "(052) 480-4444", email: "ro5@lto.gov.ph", officials: [] },
        { code: "RO6", office: "Regional Office 6", chief: "ROLANDO P. RAMOS", position: "Regional Director", address: "Iloilo City", number: "(033) 337-5555", email: "ro6@lto.gov.ph", officials: [] },
        { code: "RO7", office: "Regional Office 7", chief: "MENCHU J. ESTRADA", position: "Regional Director", address: "Cebu City", number: "(032) 254-6666", email: "ro7@lto.gov.ph", officials: [] },
        { code: "RO8", office: "Regional Office 8", chief: "RODOLFO C. DEL ROSARIO", position: "Regional Director", address: "Tacloban City", number: "(053) 321-7777", email: "ro8@lto.gov.ph", officials: [] },
        { code: "RO9", office: "Regional Office 9", chief: "AMINA D. BACARAT", position: "Regional Director", address: "Zamboanga City", number: "(062) 991-8888", email: "ro9@lto.gov.ph", officials: [] },
        { code: "RO10", office: "Regional Office 10", chief: "JOANNA R. DIMAANO", position: "Regional Director", address: "Cagayan de Oro City", number: "(088) 857-9999", email: "ro10@lto.gov.ph", officials: [] },
        { code: "RO11", office: "Regional Office 11", chief: "ELMA R. GOMEZ", position: "Regional Director", address: "Davao City", number: "(082) 224-0000", email: "ro11@lto.gov.ph", officials: [] },
        { code: "RO12", office: "Regional Office 12", chief: "MACARIO B. GONZALES", position: "Regional Director", address: "Koronadal City", number: "(083) 228-1111", email: "ro12@lto.gov.ph", officials: [] },
        { code: "CARAGA", office: "CARAGA Region", chief: "LIZA B. BUENAVENTURA", position: "Regional Director", address: "Butuan City", number: "(085) 341-2222", email: "caraga@lto.gov.ph", officials: [] },
        { code: "NCR", office: "National Capital Region (NCR)", chief: "JUAN DELA CRUZ", position: "Regional Director", address: "East Ave., Quezon City", number: "(02) 921-4321", email: "ncr@lto.gov.ph", officials: [] },
        { code: "NIR", office: "Negros Island Region (NIR)", chief: "ANTONIO V. GOMEZ", position: "Regional Director", address: "Bacolod City", number: "(034) 433-5544", email: "nir@lto.gov.ph", officials: [] }
    ],
    settings: {
        enableResponderClipboard: true,
        categoryGroups: {
            "Licenses and Permits": [],
            "Vehicle Registration": [],
            "Law Enforcement": [],
            "Intelligence and Investigation Division (IID)": [],
            "Land Transportation Management System": [],
            "Client Feedbacks": [],
            "Other concerns": []
        },
        categories: [],
        ticketTypes: [
            "Simple (Request for Information, Feedback, etc.)",
            "Complex (Needs verification)",
            "Highly Technical (Endorsement)"
        ],
        actionsTaken: [
            "Answered",
            "Answered/Endorsed to Region 4A",
            "Waiting for further information /documents needed from the client"
        ],
        statuses: [
            "Closed",
            "Pending"
        ],
        platforms: [
            { name: "FACEBOOK", autoGen: true, prefix: "CPAO" },
            { name: "IMKC", autoGen: true, prefix: "IMKC" },
            { name: "CDMPAO", autoGen: true, prefix: "CPAO" },
            { name: "LTO MAILBOX", autoGen: true, prefix: "CPAO" },
            { name: "ARTA", autoGen: false, prefix: "ARTA" },
            { name: "8888", autoGen: false, prefix: "8888" },
            { name: "PACe", autoGen: false, prefix: "PACE" },
            { name: "CCB", autoGen: false, prefix: "CCB" }
        ],
        customFields: [],
        endorsementForm: { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS },
        reportColumns: { ...DEFAULT_REPORT_COLUMNS },
        reportConfig: {
            republic: "Republic of the Philippines",
            department: "Department of Transportation",
            agency: "LAND TRANSPORTATION OFFICE",
            office: "Central Public Assistance Office (CPAO)",
            title: "EXECUTIVE RESOLUTION & PORTAL PERFORMANCE REPORT",
            logo1Url: "",
            logo2Url: "",
            logo3Url: "",
            logoAlignment: "left",
            headerTextAlign: "center",
            headerSpacing: "standard",
            showRepublic: true,
            showDepartment: true,
            notedName: "MARY MAY M. JACOB",
            notedDesig: "Head, LTO COMMS/CPAO"
        },
        preferences: {
            colorMode: "dark",
            accentTheme: "sky",
            denseTableMode: false,
            autoRefreshSeconds: 4,
            defaultViewScope: "my",
            enable24hAlerts: true,
            strictTicketOwnership: true
        },
        notifications: {
            toastAlerts: true,
            overdue24hBanner: true,
            syncErrorAlerts: true,
            soundChime: false
        },
        security: {
            idleTimeoutMinutes: 20,
            clearSessionOnUnload: true,
            requireReauthForBulkDelete: true
        },
        integrations: {
            appsScriptUrl: APPS_SCRIPT_URL,
            usersWorksheetName: "Users",
            logsWorksheetName: "Logs",
            autoQueueOfflineWrites: true
        }
    },
    templates: [
        { title: "STANDARD GREETING", text: "Good day! Thank you for reaching out to the LTO Central Public Assistance Office." }
    ],
    toggledOffDates: []
};

let calcCurrentYear = 2026;
let calcCurrentMonth = 4;
let pickerViewYear = 2026;
let pickerViewMonth = 10;

/* ============================================================================
   LIGHT / DARK THEME MODE HELPERS
   ============================================================================ */

function getCurrentColorMode() {
    const mode = String(AppState.settings?.preferences?.colorMode || "dark").toLowerCase().trim();
    return mode === "light" ? "light" : "dark";
}

function applyThemeMode(mode) {
    const normalized = String(mode || "dark").toLowerCase().trim() === "light" ? "light" : "dark";
    if (!AppState.settings.preferences) AppState.settings.preferences = {};
    AppState.settings.preferences.colorMode = normalized;

    document.documentElement.setAttribute("data-theme", normalized);
    document.body.classList.toggle("light-mode", normalized === "light");

    const iconEl = document.getElementById("themeModeIcon");
    const labelEl = document.getElementById("themeModeLabel");
    if (normalized === "light") {
        if (iconEl) iconEl.textContent = "🌙";
        if (labelEl) labelEl.textContent = "Dark";
    } else {
        if (iconEl) iconEl.textContent = "☀️";
        if (labelEl) labelEl.textContent = "Light";
    }

    const modeSel = document.getElementById("cfgPrefColorMode");
    if (modeSel && modeSel.value !== normalized) {
        modeSel.value = normalized;
    }

    persistLocalSettingsCache();
}

function toggleThemeMode() {
    const nextMode = getCurrentColorMode() === "light" ? "dark" : "light";
    applyThemeMode(nextMode);
    saveAllSettingsToCloud(true);
    showToast(`Switched to ${nextMode === "light" ? "Light" : "Dark"} Mode.`);
}

function onThemeModeSelectChange(selectedMode) {
    applyThemeMode(selectedMode);
    onSettingsControlChange();
}

/* ============================================================================
   TICKET OWNERSHIP & PERMISSION HELPERS
   ============================================================================ */

function isTicketOwnedByCurrentUser(ticket) {
    if (!ticket || !currentUser) return false;
    const tAdminRaw = String(ticket.adminNo || "").trim().toLowerCase();
    const uAdminRaw = String(currentUser.adminNo || deriveOperatorAdminNo(currentUser) || "").trim().toLowerCase();
    const uUsername = String(currentUser.username || "").trim().toLowerCase();
    const uName = String(currentUser.name || "").trim().toLowerCase();

    const tDigits = tAdminRaw.replace(/\D/g, "");
    const uDigits = (uAdminRaw || uUsername).replace(/\D/g, "");

    if (uDigits && tDigits && uDigits === tDigits) {
        return true;
    }
    if (uAdminRaw && tAdminRaw === uAdminRaw) {
        return true;
    }
    if (uUsername && (tAdminRaw === uUsername || tAdminRaw.includes(uUsername))) {
        return true;
    }
    if (uName && tAdminRaw === uName) {
        return true;
    }
    return false;
}

function canMutateTicket(ticket) {
    if (!ticket) return false;
    return isTicketOwnedByCurrentUser(ticket);
}

function canEndorseTicket(ticket) {
    if (!ticket) return false;
    return isTicketOwnedByCurrentUser(ticket);
}

/* ============================================================================
   ENHANCED SETTINGS TAB: NAVIGATION, CONTROLS, VALIDATION & PERSISTENCE
   ============================================================================ */

function getDefaultSettingsObject() {
    return {
        enableResponderClipboard: true,
        categoryGroups: {
            "Licenses and Permits": [],
            "Vehicle Registration": [],
            "Law Enforcement": [],
            "Intelligence and Investigation Division (IID)": [],
            "Land Transportation Management System": [],
            "Client Feedbacks": [],
            "Other concerns": []
        },
        categories: [],
        ticketTypes: [
            "Simple (Request for Information, Feedback, etc.)",
            "Complex (Needs verification)",
            "Highly Technical (Endorsement)"
        ],
        actionsTaken: [
            "Answered",
            "Answered/Endorsed to Region 4A",
            "Waiting for further information /documents needed from the client"
        ],
        statuses: ["Closed", "Pending"],
        platforms: [
            { name: "FACEBOOK", autoGen: true, prefix: "CPAO" },
            { name: "IMKC", autoGen: true, prefix: "IMKC" },
            { name: "CDMPAO", autoGen: true, prefix: "CPAO" },
            { name: "LTO MAILBOX", autoGen: true, prefix: "CPAO" },
            { name: "ARTA", autoGen: false, prefix: "ARTA" },
            { name: "8888", autoGen: false, prefix: "8888" },
            { name: "PACe", autoGen: false, prefix: "PACE" },
            { name: "CCB", autoGen: false, prefix: "CCB" }
        ],
        customFields: [],
        endorsementForm: { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS },
        reportColumns: { ...DEFAULT_REPORT_COLUMNS },
        reportConfig: {
            republic: "Republic of the Philippines",
            department: "Department of Transportation",
            agency: "LAND TRANSPORTATION OFFICE",
            office: "Central Public Assistance Office (CPAO)",
            title: "EXECUTIVE RESOLUTION & PORTAL PERFORMANCE REPORT",
            logo1Url: "",
            logo2Url: "",
            logo3Url: "",
            logoAlignment: "left",
            headerTextAlign: "center",
            headerSpacing: "standard",
            showRepublic: true,
            showDepartment: true,
            notedName: "MARY MAY M. JACOB",
            notedDesig: "Head, LTO COMMS/CPAO"
        },
        preferences: {
            colorMode: "dark",
            accentTheme: "sky",
            denseTableMode: false,
            autoRefreshSeconds: 4,
            defaultViewScope: "my",
            enable24hAlerts: true,
            strictTicketOwnership: true
        },
        notifications: {
            toastAlerts: true,
            overdue24hBanner: true,
            syncErrorAlerts: true,
            soundChime: false
        },
        security: {
            idleTimeoutMinutes: 20,
            clearSessionOnUnload: true,
            requireReauthForBulkDelete: true
        },
        integrations: {
            appsScriptUrl: APPS_SCRIPT_URL,
            usersWorksheetName: "Users",
            logsWorksheetName: "Logs",
            autoQueueOfflineWrites: true
        }
    };
}

function getReportColumnsConfig() {
    return {
        ...DEFAULT_REPORT_COLUMNS,
        ...(AppState.settings?.reportColumns || {})
    };
}

function readReportColumnsFromInputs() {
    const cur = getReportColumnsConfig();
    const valOrFallback = (id, fallback) => {
        const el = document.getElementById(id);
        if (!el) return fallback;
        const v = String(el.value || "").trim();
        return v || fallback;
    };
    return {
        hdrTop10: valOrFallback("cfgRepHdrTop10", cur.hdrTop10),
        colTopRank: valOrFallback("cfgRepColTopRank", cur.colTopRank),
        colTopConcern: valOrFallback("cfgRepColTopConcern", cur.colTopConcern),
        colTopCount: valOrFallback("cfgRepColTopCount", cur.colTopCount),

        hdrCategoryPortal: valOrFallback("cfgRepHdrCategoryPortal", cur.hdrCategoryPortal),
        colCatGroup: valOrFallback("cfgRepColCatGroup", cur.colCatGroup),
        colCatName: valOrFallback("cfgRepColCatName", cur.colCatName),
        colCatPortals: valOrFallback("cfgRepColCatPortals", cur.colCatPortals),
        colCatTotal: valOrFallback("cfgRepColCatTotal", cur.colCatTotal),

        hdrPortalStatus: valOrFallback("cfgRepHdrPortalStatus", cur.hdrPortalStatus),
        colPortalName: valOrFallback("cfgRepColPortalName", cur.colPortalName),
        colAck: valOrFallback("cfgRepColAck", cur.colAck),
        colRes: valOrFallback("cfgRepColRes", cur.colRes),
        colPend: valOrFallback("cfgRepColPend", cur.colPend),
        colRate: valOrFallback("cfgRepColRate", cur.colRate),

        hdrRegionalEndorsed: valOrFallback("cfgRepHdrRegionalEndorsed", cur.hdrRegionalEndorsed),
        colRegOffice: valOrFallback("cfgRepColRegOffice", cur.colRegOffice),
        colRegTotal: valOrFallback("cfgRepColRegTotal", cur.colRegTotal),
        colRegResolved: valOrFallback("cfgRepColRegResolved", cur.colRegResolved),
        colRegPending: valOrFallback("cfgRepColRegPending", cur.colRegPending)
    };
}

function populateReportColumnsInputs() {
    const rc = getReportColumnsConfig();
    const map = {
        cfgRepHdrTop10: rc.hdrTop10,
        cfgRepColTopRank: rc.colTopRank,
        cfgRepColTopConcern: rc.colTopConcern,
        cfgRepColTopCount: rc.colTopCount,

        cfgRepHdrCategoryPortal: rc.hdrCategoryPortal,
        cfgRepColCatGroup: rc.colCatGroup,
        cfgRepColCatName: rc.colCatName,
        cfgRepColCatPortals: rc.colCatPortals,
        cfgRepColCatTotal: rc.colCatTotal,

        cfgRepHdrPortalStatus: rc.hdrPortalStatus,
        cfgRepColPortalName: rc.colPortalName,
        cfgRepColAck: rc.colAck,
        cfgRepColRes: rc.colRes,
        cfgRepColPend: rc.colPend,
        cfgRepColRate: rc.colRate,

        cfgRepHdrRegionalEndorsed: rc.hdrRegionalEndorsed,
        cfgRepColRegOffice: rc.colRegOffice,
        cfgRepColRegTotal: rc.colRegTotal,
        cfgRepColRegResolved: rc.colRegResolved,
        cfgRepColRegPending: rc.colRegPending
    };
    Object.keys(map).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = map[id] || "";
    });
}

function resetReportColumnsToDefault() {
    AppState.settings.reportColumns = { ...DEFAULT_REPORT_COLUMNS };
    populateReportColumnsInputs();
    persistLocalSettingsCache();
    markSettingsDirty(true);
    if (document.getElementById("viewReports")?.style.display !== "none") {
        generateReport();
    }
    showToast("Report column names and headers reset to default.");
}

function setSettingsFeedbackBanner(message, state = "idle") {
    const el = document.getElementById("settingsFeedbackBanner");
    if (!el) return;
    if (!message) {
        el.className = "hidden px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2";
        el.innerHTML = "";
        return;
    }
    const map = {
        saving: "bg-sky-950/70 border-sky-700/70 text-sky-200",
        success: "bg-emerald-950/70 border-emerald-700/70 text-emerald-200",
        error: "bg-rose-950/70 border-rose-700/70 text-rose-200",
        dirty: "bg-amber-950/70 border-amber-600/70 text-amber-200",
        idle: "bg-slate-900 border-slate-800 text-slate-300"
    };
    el.className = `px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2 ${map[state] || map.idle}`;
    const savedStamp = lastSettingsSavedAt ? `<span class="text-[10px] font-mono opacity-80 shrink-0">Last saved: ${escapeHtml(lastSettingsSavedAt)}</span>` : "";
    el.innerHTML = `<span>${escapeHtml(message)}</span>${savedStamp}`;
}

function markSettingsDirty(isDirty = true) {
    settingsHasUnsavedChanges = !!isDirty;
    const badge = document.getElementById("settingsUnsavedBadge");
    if (badge) {
        badge.classList.toggle("hidden", !settingsHasUnsavedChanges);
    }
    if (settingsHasUnsavedChanges) {
        setSettingsFeedbackBanner("You have unsaved changes in Settings. Click Save Settings to persist.", "dirty");
    }
}

function selectSettingsSection(sectionKey) {
    activeSettingsSection = sectionKey || "all";
    const sections = ["profile", "preferences", "notifications", "security", "integrations", "reportcols", "signatories", "dropdowns"];
    sections.forEach(sec => {
        const panel = document.getElementById(`settingsSec_${sec}`);
        const tab = document.getElementById(`settingsSubTab_${sec}`);
        const show = activeSettingsSection === "all" || activeSettingsSection === sec;
        if (panel) panel.classList.toggle("hidden", !show);
        if (tab) {
            const active = activeSettingsSection === sec;
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.className = active
                ? "px-3 py-1.5 rounded-lg text-xs font-extrabold bg-sky-600 text-white shadow transition whitespace-nowrap cursor-pointer"
                : "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition whitespace-nowrap cursor-pointer";
        }
    });
    const allTab = document.getElementById("settingsSubTab_all");
    if (allTab) {
        const active = activeSettingsSection === "all";
        allTab.setAttribute("aria-selected", active ? "true" : "false");
        allTab.className = active
            ? "px-3 py-1.5 rounded-lg text-xs font-extrabold bg-sky-600 text-white shadow transition whitespace-nowrap cursor-pointer"
            : "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition whitespace-nowrap cursor-pointer";
    }
}

function filterSettingsPanelsBySearch() {
    const q = (document.getElementById("settingsGlobalSearch")?.value || "").toLowerCase().trim();
    const cards = document.querySelectorAll("#viewSettings .settings-searchable-card");
    let visibleCount = 0;
    cards.forEach(card => {
        const keywords = (card.getAttribute("data-keywords") || card.textContent || "").toLowerCase();
        const match = !q || keywords.includes(q);
        card.classList.toggle("hidden", !match);
        if (match) visibleCount++;
    });
    const emptyNotice = document.getElementById("settingsSearchEmptyNotice");
    if (emptyNotice) {
        emptyNotice.classList.toggle("hidden", visibleCount > 0);
    }
}

function validateSettingsFormValues() {
    const errors = [];
    const pollSec = parseInt(document.getElementById("cfgPrefPollInterval")?.value || "4", 10);
    const idleMin = parseInt(document.getElementById("cfgSecIdleTimeout")?.value || "20", 10);
    const scriptUrl = (document.getElementById("cfgIntAppsScriptUrl")?.value || "").trim();
    const usersSheet = (document.getElementById("cfgIntUsersSheet")?.value || "").trim();
    const logsSheet = (document.getElementById("cfgIntLogsSheet")?.value || "").trim();

    if (isNaN(pollSec) || pollSec < 2 || pollSec > 120) {
        errors.push("Auto-sync interval must be between 2 and 120 seconds.");
    }
    if (isNaN(idleMin) || idleMin < 5 || idleMin > 240) {
        errors.push("Session idle timeout must be between 5 and 240 minutes.");
    }
    if (!scriptUrl || !/^https?:\/\//i.test(scriptUrl)) {
        errors.push("Google Apps Script Web App URL must start with http:// or https://.");
    }
    if (!usersSheet) {
        errors.push("Users worksheet name cannot be empty.");
    }
    if (!logsSheet) {
        errors.push("Logs worksheet name cannot be empty.");
    }

    const errBox = document.getElementById("settingsValidationErrors");
    if (errBox) {
        if (errors.length > 0) {
            errBox.classList.remove("hidden");
            errBox.innerHTML = errors.map(err => `<li>• ${escapeHtml(err)}</li>`).join("");
        } else {
            errBox.classList.add("hidden");
            errBox.innerHTML = "";
        }
    }
    return errors;
}

function populateEnhancedSettingsUI() {
    const defaults = getDefaultSettingsObject();
    const s = AppState.settings || {};
    const pref = { ...defaults.preferences, ...(s.preferences || {}) };
    const notif = { ...defaults.notifications, ...(s.notifications || {}) };
    const sec = { ...defaults.security, ...(s.security || {}) };
    const integ = { ...defaults.integrations, ...(s.integrations || {}) };
    const repCols = getReportColumnsConfig();

    settingsSnapshotBeforeEdit = JSON.stringify({
        enableResponderClipboard: s.enableResponderClipboard !== false,
        preferences: pref,
        notifications: notif,
        security: sec,
        integrations: integ,
        reportColumns: repCols,
        profileName: currentUser.name || "",
        profileColor: currentUser.logColor || "Default"
    });

    // Profile section
    const profUser = document.getElementById("cfgProfUsername");
    const profRole = document.getElementById("cfgProfRole");
    const profAdminNo = document.getElementById("cfgProfAdminNo");
    const profName = document.getElementById("cfgProfDisplayName");
    const profColorEnable = document.getElementById("cfgProfEnableColor");
    const profColorPicker = document.getElementById("cfgProfLogColor");
    if (profUser) profUser.value = currentUser.username || "";
    if (profRole) profRole.value = currentUser.role || "Admin";
    if (profAdminNo) profAdminNo.value = currentUser.adminNo || deriveOperatorAdminNo(currentUser) || "";
    if (profName) profName.value = currentUser.name || currentUser.username || "";
    const hasCustomColor = !!(currentUser.logColor && currentUser.logColor !== "Default");
    if (profColorEnable) profColorEnable.checked = hasCustomColor;
    if (profColorPicker) {
        profColorPicker.disabled = !hasCustomColor;
        profColorPicker.value = hasCustomColor ? currentUser.logColor : "#9a4e2a";
    }

    // Preferences section
    const modeSel = document.getElementById("cfgPrefColorMode");
    const themeSel = document.getElementById("cfgPrefAccentTheme");
    const denseChk = document.getElementById("cfgPrefDenseMode");
    const pollSlider = document.getElementById("cfgPrefPollInterval");
    const pollLabel = document.getElementById("cfgPrefPollIntervalLabel");
    const scopeSel = document.getElementById("cfgPrefDefaultScope");
    if (modeSel) modeSel.value = pref.colorMode === "light" ? "light" : "dark";
    if (themeSel) themeSel.value = pref.accentTheme || "sky";
    if (denseChk) denseChk.checked = !!pref.denseTableMode;
    if (pollSlider) pollSlider.value = String(pref.autoRefreshSeconds || 4);
    if (pollLabel) pollLabel.textContent = `${pref.autoRefreshSeconds || 4}s`;
    if (scopeSel) scopeSel.value = pref.defaultViewScope || "my";

    // Notifications section
    const nToast = document.getElementById("cfgNotifToast");
    const n24h = document.getElementById("cfgNotif24h");
    const nSyncErr = document.getElementById("cfgNotifSyncErr");
    if (nToast) nToast.checked = notif.toastAlerts !== false;
    if (n24h) n24h.checked = notif.overdue24hBanner !== false;
    if (nSyncErr) nSyncErr.checked = notif.syncErrorAlerts !== false;

    // Security section
    const sIdle = document.getElementById("cfgSecIdleTimeout");
    const sIdleLabel = document.getElementById("cfgSecIdleTimeoutLabel");
    const sUnload = document.getElementById("cfgSecClearOnUnload");
    const sBulk = document.getElementById("cfgSecRequireBulkPass");
    if (sIdle) sIdle.value = String(sec.idleTimeoutMinutes || 20);
    if (sIdleLabel) sIdleLabel.textContent = `${sec.idleTimeoutMinutes || 20} mins`;
    if (sUnload) sUnload.checked = sec.clearSessionOnUnload !== false;
    if (sBulk) sBulk.checked = sec.requireReauthForBulkDelete !== false;

    // Integrations section
    const iUrl = document.getElementById("cfgIntAppsScriptUrl");
    const iUsers = document.getElementById("cfgIntUsersSheet");
    const iLogs = document.getElementById("cfgIntLogsSheet");
    const iQueue = document.getElementById("cfgIntAutoQueue");
    if (iUrl) iUrl.value = integ.appsScriptUrl || APPS_SCRIPT_URL;
    if (iUsers) iUsers.value = integ.usersWorksheetName || "Users";
    if (iLogs) iLogs.value = integ.logsWorksheetName || "Logs";
    if (iQueue) iQueue.checked = integ.autoQueueOfflineWrites !== false;

    populateReportColumnsInputs();

    markSettingsDirty(false);
    validateSettingsFormValues();
    renderSettingsTables();
}

function onSettingsControlChange() {
    const pollSlider = document.getElementById("cfgPrefPollInterval");
    const pollLabel = document.getElementById("cfgPrefPollIntervalLabel");
    if (pollSlider && pollLabel) pollLabel.textContent = `${pollSlider.value}s`;

    const sIdle = document.getElementById("cfgSecIdleTimeout");
    const sIdleLabel = document.getElementById("cfgSecIdleTimeoutLabel");
    if (sIdle && sIdleLabel) sIdleLabel.textContent = `${sIdle.value} mins`;

    const profColorEnable = document.getElementById("cfgProfEnableColor");
    const profColorPicker = document.getElementById("cfgProfLogColor");
    if (profColorEnable && profColorPicker) {
        profColorPicker.disabled = !profColorEnable.checked;
    }

    AppState.settings.reportColumns = readReportColumnsFromInputs();

    validateSettingsFormValues();
    markSettingsDirty(true);
}

async function saveEnhancedSettingsForm() {
    const errors = validateSettingsFormValues();
    if (errors.length > 0) {
        setSettingsFeedbackBanner(`Please fix ${errors.length} validation issue(s) before saving.`, "error");
        showSystemAlert("Validation Error", errors.join("\n"), "⚠️");
        return;
    }

    setSettingsFeedbackBanner("Saving settings and syncing to cloud...", "saving");

    // Apply profile updates
    const newDisplayName = (document.getElementById("cfgProfDisplayName")?.value || currentUser.name || "").trim();
    const useColor = !!document.getElementById("cfgProfEnableColor")?.checked;
    const pickedColor = document.getElementById("cfgProfLogColor")?.value || "#9a4e2a";
    if (newDisplayName) currentUser.name = newDisplayName;
    currentUser.logColor = useColor ? pickedColor : "Default";
    if (currentUser.username) {
        localStorage.setItem("LTO_COLOR_" + currentUser.username, currentUser.logColor);
        const uIdx = AppState.users.findIndex(u => String(u.username || "").toLowerCase() === String(currentUser.username).toLowerCase());
        if (uIdx !== -1) {
            AppState.users[uIdx] = { ...AppState.users[uIdx], name: currentUser.name, logColor: currentUser.logColor };
            localStorage.setItem("LTO_CPAO_USERS_2026", JSON.stringify(AppState.users));
        }
    }
    sessionStorage.setItem("LTO_ACTIVE_USER", JSON.stringify(currentUser));
    const opNameEl = document.getElementById("activeOperatorName");
    if (opNameEl) opNameEl.textContent = currentUser.name || currentUser.username;

    const selectedColorMode = document.getElementById("cfgPrefColorMode")?.value === "light" ? "light" : "dark";
    AppState.settings.enableResponderClipboard = !!document.getElementById("cfgEnableResponderClipboard")?.checked;
    AppState.settings.reportColumns = readReportColumnsFromInputs();
    AppState.settings.preferences = {
        colorMode: selectedColorMode,
        accentTheme: document.getElementById("cfgPrefAccentTheme")?.value || "sky",
        denseTableMode: !!document.getElementById("cfgPrefDenseMode")?.checked,
        autoRefreshSeconds: parseInt(document.getElementById("cfgPrefPollInterval")?.value || "4", 10),
        defaultViewScope: document.getElementById("cfgPrefDefaultScope")?.value || "my",
        enable24hAlerts: true,
        strictTicketOwnership: true
    };
    AppState.settings.notifications = {
        toastAlerts: !!document.getElementById("cfgNotifToast")?.checked,
        overdue24hBanner: !!document.getElementById("cfgNotif24h")?.checked,
        syncErrorAlerts: !!document.getElementById("cfgNotifSyncErr")?.checked,
        soundChime: false
    };
    AppState.settings.security = {
        idleTimeoutMinutes: parseInt(document.getElementById("cfgSecIdleTimeout")?.value || "20", 10),
        clearSessionOnUnload: !!document.getElementById("cfgSecClearOnUnload")?.checked,
        requireReauthForBulkDelete: !!document.getElementById("cfgSecRequireBulkPass")?.checked
    };
    AppState.settings.integrations = {
        appsScriptUrl: (document.getElementById("cfgIntAppsScriptUrl")?.value || APPS_SCRIPT_URL).trim(),
        usersWorksheetName: (document.getElementById("cfgIntUsersSheet")?.value || "Users").trim(),
        logsWorksheetName: (document.getElementById("cfgIntLogsSheet")?.value || "Logs").trim(),
        autoQueueOfflineWrites: !!document.getElementById("cfgIntAutoQueue")?.checked
    };

    applyThemeMode(selectedColorMode);

    const banner24h = document.getElementById("reminder24hBanner");
    if (banner24h && !AppState.settings.notifications.overdue24hBanner) {
        banner24h.classList.add("hidden");
    } else {
        render24HourReminderBanner();
    }

    lastSettingsSavedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    await saveAllSettingsToCloud(false);
    updateUIPrivileges();
    renderTable();
    if (document.getElementById("viewReports")?.style.display !== "none") {
        generateReport();
    }

    settingsSnapshotBeforeEdit = JSON.stringify({
        enableResponderClipboard: AppState.settings.enableResponderClipboard,
        preferences: AppState.settings.preferences,
        notifications: AppState.settings.notifications,
        security: AppState.settings.security,
        integrations: AppState.settings.integrations,
        reportColumns: AppState.settings.reportColumns,
        profileName: currentUser.name || "",
        profileColor: currentUser.logColor || "Default"
    });
    markSettingsDirty(false);
    setSettingsFeedbackBanner("All settings saved and synchronized successfully.", "success");
}

function resetEnhancedSettingsToDefault() {
    showSystemConfirm(
        "Reset Settings to Default",
        "Reset preferences, notifications, security, report column headers, and integration settings back to default values?",
        async () => {
            const defs = getDefaultSettingsObject();
            AppState.settings.enableResponderClipboard = defs.enableResponderClipboard;
            AppState.settings.preferences = { ...defs.preferences };
            AppState.settings.notifications = { ...defs.notifications };
            AppState.settings.security = { ...defs.security };
            AppState.settings.integrations = { ...defs.integrations };
            AppState.settings.reportColumns = { ...defs.reportColumns };
            applyThemeMode(defs.preferences.colorMode || "dark");
            populateEnhancedSettingsUI();
            await saveAllSettingsToCloud(false);
            updateUIPrivileges();
            if (document.getElementById("viewReports")?.style.display !== "none") {
                generateReport();
            }
            lastSettingsSavedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            setSettingsFeedbackBanner("Settings reset to default values.", "success");
            showToast("Settings reset to defaults.");
        },
        "♻️"
    );
}

function cancelEnhancedSettingsChanges() {
    if (!settingsHasUnsavedChanges) {
        switchMainTab("logs");
        return;
    }
    showSystemConfirm(
        "Discard Unsaved Changes",
        "Discard your unsaved changes in Settings and return to PAT/SMT Logs Sheet?",
        () => {
            populateEnhancedSettingsUI();
            applyThemeMode(getCurrentColorMode());
            markSettingsDirty(false);
            switchMainTab("logs");
        },
        "⚠️"
    );
}

function updateSyncStatusBadge(state = "synced", customLabel = "") {
    const badge = document.getElementById("syncStatusBadge");
    if (!badge) return;
    const queueLen = loadPendingSyncQueue().length;

    if (state === "syncing") {
        badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-sky-700/60 text-[11px] font-semibold text-sky-300";
        badge.textContent = customLabel || "🔄 Cloud: Syncing...";
        return;
    }

    if (queueLen > 0 || state === "queued") {
        badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-amber-600/60 text-[11px] font-semibold text-amber-300";
        badge.textContent = customLabel || `⏳ Cloud: Queued (${queueLen})`;
        return;
    }

    if (state === "error") {
        badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-rose-700/60 text-[11px] font-semibold text-rose-300";
        badge.textContent = customLabel || "⚠️ Cloud: Check Sync";
        return;
    }

    badge.className = "px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-emerald-400";
    badge.textContent = customLabel || "✅ Cloud: Synchronized";
}

function deriveOperatorAdminNo(userObj) {
    if (!userObj) return "";
    const match = String(userObj.username || "").match(/\d+/) || String(userObj.name || "").match(/\d+/);
    if (match && match[0]) {
        return `ADMIN ${match[0]}`;
    }
    const cleanUsername = String(userObj.username || userObj.name || "").trim().toUpperCase();
    return cleanUsername ? `OPERATOR ${cleanUsername}` : "";
}

function resolveTicketSubjectTerm(ticket) {
    const rawType = String(ticket?.ticketType || "").toLowerCase().trim();
    if (rawType.includes("simple")) {
        return "request for information";
    }
    if (rawType.includes("complex")) {
        return "request for assistance";
    }
    if (rawType.includes("highly technical") || rawType.includes("technical")) {
        return "complaint";
    }
    return "complaint";
}

function setEndorsementEditState(editing) {
    isEndorseLetterEditing = !!editing;
    const area = document.getElementById("endorseLetterPrintArea");
    const btn = document.getElementById("btnToggleEditEndorseLetter");
    const badge = document.getElementById("endorseEditModeBadge");

    if (area) {
        area.contentEditable = isEndorseLetterEditing ? "true" : "false";
        if (isEndorseLetterEditing) {
            area.classList.add("ring-2", "ring-amber-400", "bg-amber-50/20");
            area.focus();
        } else {
            area.classList.remove("ring-2", "ring-amber-400", "bg-amber-50/20");
        }
    }

    if (btn) {
        if (isEndorseLetterEditing) {
            btn.textContent = "✅ Done Editing";
            btn.className = "px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow text-xs transition";
        } else {
            btn.textContent = "✏️ Edit Letter";
            btn.className = "px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow text-xs transition";
        }
    }

    if (badge) {
        badge.classList.toggle("hidden", !isEndorseLetterEditing);
    }
}

function toggleEditEndorsementLetter() {
    setEndorsementEditState(!isEndorseLetterEditing);
    showToast(isEndorseLetterEditing ? "Editing enabled — click directly on text to edit." : "Letter edits applied.");
}

function setReportPreviewEditState(editing) {
    isReportPreviewEditing = !!editing;
    const docEl = document.getElementById("printableReportDocument");
    const btn = document.getElementById("btnToggleEditReportPreview");
    const badge = document.getElementById("reportEditModeBadge");

    if (docEl) {
        docEl.contentEditable = isReportPreviewEditing ? "true" : "false";
        if (isReportPreviewEditing) {
            docEl.classList.add("ring-2", "ring-amber-400");
            docEl.focus();
        } else {
            docEl.classList.remove("ring-2", "ring-amber-400");
        }
    }

    if (btn) {
        if (isReportPreviewEditing) {
            btn.textContent = "✅ Done Editing";
            btn.className = "px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition";
        } else {
            btn.textContent = "✏️ Edit Report";
            btn.className = "px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition";
        }
    }

    if (badge) {
        badge.classList.toggle("hidden", !isReportPreviewEditing);
    }
}

function toggleEditReportPreview() {
    if (!document.getElementById("printableReportDocument")) {
        generateReport();
    }
    setReportPreviewEditState(!isReportPreviewEditing);
    showToast(isReportPreviewEditing ? "Report editing enabled — click directly on text to edit." : "Report edits applied.");
}

function printReportDocument() {
    if (!canUserGenerateReports()) return;
    const docEl = document.getElementById("printableReportDocument");
    if (!docEl || !docEl.innerHTML.trim()) {
        generateReport();
    }
    if (isReportPreviewEditing) setReportPreviewEditState(false);
    const previewHtml = document.getElementById("printableReportDocument")?.innerHTML || "";
    const target = document.getElementById("endorseLetterPrintArea");
    if (target && previewHtml) {
        target.dataset.prevHtml = target.innerHTML;
        target.dataset.prevClass = target.className;
        target.className = "w-full max-w-[1120px]";
        target.innerHTML = `<div class="report-a4-page">${previewHtml}</div>`;
    }
    document.body.classList.add("printing-report");
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove("printing-report");
            if (target && target.dataset.prevHtml !== undefined) {
                target.innerHTML = target.dataset.prevHtml;
                target.className = target.dataset.prevClass || "";
                delete target.dataset.prevHtml;
                delete target.dataset.prevClass;
            }
        }, 400);
    }, 150);
}

function ensureDirectoryOfficialsInitialized() {
    if (!Array.isArray(AppState.directory)) AppState.directory = [];
    AppState.directory.forEach((entry) => {
        if (!Array.isArray(entry.officials)) entry.officials = [];
        const hasMainChief = entry.chief && entry.officials.some(
            off => String(off.name || "").trim().toLowerCase() === String(entry.chief || "").trim().toLowerCase()
        );
        if (entry.chief && !hasMainChief) {
            entry.officials.unshift({
                roleRank: "Regional Director",
                name: entry.chief,
                position: entry.position || "Regional Director",
                division: entry.office || "Regional Office",
                email: entry.email || "",
                number: entry.number || ""
            });
        }
    });
}

function populateOfficialRoleRankDropdown(selectedRank = "Chief") {
    const sel = document.getElementById("offRoleRank");
    if (!sel) return;

    const existingValues = Array.from(sel.options).map(o => o.value);
    const mergedRanks = Array.from(new Set([...OFFICIAL_ROLE_RANKS, ...existingValues, selectedRank].filter(Boolean)));

    sel.innerHTML = mergedRanks.map(r =>
        `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`
    ).join("");

    sel.value = mergedRanks.includes(selectedRank) ? selectedRank : "Chief";
}

function getRegionOfficialsList(regionIndex) {
    ensureDirectoryOfficialsInitialized();
    const entry = AppState.directory[regionIndex];
    if (!entry) return [];
    return Array.isArray(entry.officials) ? entry.officials : [];
}

function getEndorsementFormConfig() {
    if (!AppState.settings.endorsementForm || typeof AppState.settings.endorsementForm !== "object") {
        AppState.settings.endorsementForm = { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS };
    } else {
        const merged = {
            ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS,
            ...AppState.settings.endorsementForm
        };
        if (merged.copyFurnished && merged.copyFurnished.includes("RUMPAD")) {
            merged.copyFurnished = merged.copyFurnished.replace(/RUMPAD/g, "RDMPAO");
        }
        AppState.settings.endorsementForm = merged;
    }
    return AppState.settings.endorsementForm;
}

function isTrafficViolationConcern(ticket) {
    if (!ticket) return false;
    const cat = String(ticket.category || "").toLowerCase().trim();
    const grp = String(getGroupForCategory(ticket.category) || "").toLowerCase().trim();
    const details = String(ticket.ticketDetails || "").toLowerCase().trim();

    if (
        cat.includes("traffic violation") ||
        cat.includes("traffic violations") ||
        cat.includes("show cause") ||
        cat.includes("apprehension") ||
        cat.includes("reckless")
    ) {
        return true;
    }

    if (grp.includes("law enforcement") || grp.includes("intelligence and investigation")) {
        return true;
    }

    if (details.includes("traffic violation") || details.includes("show cause")) {
        return true;
    }

    return false;
}

function formatDayMonthYear(dateInput) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let d = null;
    if (!dateInput) {
        d = new Date();
    } else if (dateInput instanceof Date) {
        d = dateInput;
    } else {
        const iso = mmddyyyyToISO(String(dateInput).trim());
        d = new Date(iso + "T12:00:00");
    }
    if (!d || isNaN(d.getTime())) d = new Date();
    return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function replaceEndorsementTokens(text, dataMap) {
    let out = String(text || "");
    Object.keys(dataMap).forEach((key) => {
        const regex = new RegExp(`\{${key}\}`, "g");
        out = out.replace(regex, dataMap[key]);
    });
    return out;
}

function buildStandardLetterHeaderHtml() {
    const cfg = AppState.settings.reportConfig || {};
    const logos = [cfg.logo1Url, cfg.logo2Url, cfg.logo3Url].filter(u => u && u.trim() !== "");
    const logosHtml = logos.length > 0
        ? `<div class="flex items-center gap-2.5 shrink-0">${logos.map(u => `<img src="${u}" class="h-12 w-auto object-contain" />`).join("")}</div>`
        : `<div class="flex items-center gap-2 shrink-0">
               <div class="w-11 h-11 rounded-full border-2 border-blue-900 bg-blue-50 flex items-center justify-center text-[9px] font-extrabold text-blue-900">LTO</div>
               <div class="w-11 h-11 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center text-[8px] font-extrabold text-amber-800 text-center leading-tight">BAGONG<br>PILIPINAS</div>
           </div>`;

    return `
        <div class="flex items-center justify-start gap-4 pb-2">
            ${logosHtml}
            <div class="text-left leading-tight">
                <p class="text-[11px] font-semibold text-slate-700">${escapeHtml(cfg.republic || "Republic of the Philippines")}</p>
                <p class="text-[11px] font-semibold text-slate-700">${escapeHtml(cfg.department || "Department of Transportation")}</p>
                <p class="text-sm font-extrabold text-slate-900 tracking-tight uppercase">${escapeHtml(cfg.agency || "LAND TRANSPORTATION OFFICE")}</p>
            </div>
        </div>
    `;
}

function renderStandardEndorsementLetterHtml(dataMap, formOverride = null) {
    const formCfg = { ...getEndorsementFormConfig(), ...(formOverride || {}) };
    const headerHtml = buildStandardLetterHeaderHtml();

    const furnishedLines = String(formCfg.copyFurnished || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const furnishedHtml = furnishedLines.map((line) => {
        const parts = line.split("|").map(p => replaceEndorsementTokens(p.trim(), dataMap));
        const title = (parts[0] || "").replace(/RUMPAD/gi, "RDMPAO");
        const sub = parts[1] || "";
        const email = parts[2] || "";
        if (!title && !sub && !email) return "";
        return `
            <li class="mb-2">
                ${title ? `<div class="font-extrabold text-slate-900 uppercase text-[11px]">${title}</div>` : ""}
                ${sub ? `<div class="text-[11px] text-slate-700">${sub}</div>` : ""}
                ${email ? `<div class="text-[11px] text-blue-700 underline">${email}</div>` : ""}
            </li>
        `;
    }).join("");

    const furnishedReqParagraphs = String(formCfg.furnishedReq || "")
        .split(/\n\s*\n/)
        .filter(p => p.trim() !== "")
        .map(p => `<p class="text-justify leading-relaxed">${replaceEndorsementTokens(p.trim(), dataMap)}</p>`)
        .join("");

    const sigBlock = dataMap.signatureBlock || `
        <div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div>
        <p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(formCfg.sigName || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigName)}</p>
        <p class="text-slate-800 text-xs">${replaceEndorsementTokens(formCfg.sigTitle || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigTitle, dataMap)}</p>
        <p class="text-slate-700 text-xs">${replaceEndorsementTokens(formCfg.sigOffice || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigOffice, dataMap)}</p>
    `;

    const showCauseHtml = (dataMap.includeShowCause !== false && String(formCfg.showCause || "").trim() !== "")
        ? `<p class="text-justify leading-relaxed text-xs text-slate-900">${replaceEndorsementTokens(formCfg.showCause, dataMap)}</p>`
        : "";

    return `
        <div class="page-break-inside-avoid space-y-4">
            ${headerHtml}
            <p class="text-xs text-slate-800 pt-1">${replaceEndorsementTokens(formCfg.letterDate, dataMap)}</p>
            <div class="space-y-0.5 text-xs text-slate-900">
                <p class="font-extrabold uppercase">${dataMap.chiefName}</p>
                <p>${dataMap.chiefPosition}</p>
                <p>${dataMap.agencyName}</p>
                <p>${dataMap.officeAddress}</p>
            </div>
            <p class="text-xs text-slate-900">${replaceEndorsementTokens(formCfg.salutation, dataMap)}</p>
            <p class="text-justify leading-relaxed text-xs text-slate-900">${replaceEndorsementTokens(formCfg.opening, dataMap)}</p>
            ${showCauseHtml}
            <p class="text-justify leading-relaxed text-xs text-slate-900">${replaceEndorsementTokens(formCfg.deadline, dataMap)}</p>
            <div class="space-y-3 text-xs text-slate-900">${furnishedReqParagraphs}</div>
            <div class="pt-3 text-xs text-slate-900">
                <p>${replaceEndorsementTokens(formCfg.closing, dataMap)}</p>
                <div class="pt-5">${sigBlock}</div>
            </div>
            <div class="pt-4">
                <p class="text-[11px] font-bold text-slate-800 mb-1.5">Copy furnished:</p>
                <ul class="list-disc pl-5 space-y-1">${furnishedHtml}</ul>
            </div>
        </div>
        ${dataMap.attachmentHtml || ""}
    `;
}

function populateEndorsementFormInputs() {
    const f = getEndorsementFormConfig();
    const map = {
        tplFormDate: f.letterDate,
        tplFormSalutation: f.salutation,
        tplFormOpening: f.opening,
        tplFormShowCause: f.showCause,
        tplFormDeadline: f.deadline,
        tplFormFurnishedReq: f.furnishedReq,
        tplFormClosing: f.closing,
        tplFormSigTitle: f.sigTitle,
        tplFormSigOffice: f.sigOffice,
        tplFormCopyFurnished: f.copyFurnished
    };
    Object.keys(map).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = map[id] || "";
    });
}

function syncFormTemplateFields() {
    AppState.settings.endorsementForm = {
        letterDate: document.getElementById("tplFormDate")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.letterDate,
        salutation: document.getElementById("tplFormSalutation")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.salutation,
        opening: document.getElementById("tplFormOpening")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.opening,
        showCause: document.getElementById("tplFormShowCause")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.showCause,
        deadline: document.getElementById("tplFormDeadline")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.deadline,
        furnishedReq: document.getElementById("tplFormFurnishedReq")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.furnishedReq,
        closing: document.getElementById("tplFormClosing")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.closing,
        sigName: STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigName,
        sigTitle: document.getElementById("tplFormSigTitle")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigTitle,
        sigOffice: document.getElementById("tplFormSigOffice")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigOffice,
        copyFurnished: document.getElementById("tplFormCopyFurnished")?.value ?? STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.copyFurnished
    };
    persistLocalSettingsCache();
    updateTemplateLivePreview();
}

function insertTemplateToken(token) {
    const target = activeTemplateInputField || document.getElementById("tplFormOpening");
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = target.value.slice(0, start) + token + target.value.slice(end);
    target.focus();
    const nextPos = start + token.length;
    target.setSelectionRange(nextPos, nextPos);
    syncFormTemplateFields();
}

function loadOffDatesStorage() {
    let loaded = [];
    try {
        const raw = localStorage.getItem(OFF_DATES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) loaded = parsed;
        }
    } catch (e) {}
    AppState.toggledOffDates = Array.from(new Set(loaded.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort();
}

async function saveOffDatesStorage(syncCloud = true) {
    AppState.toggledOffDates = Array.from(new Set(AppState.toggledOffDates || [])).sort();
    try {
        localStorage.setItem(OFF_DATES_STORAGE_KEY, JSON.stringify(AppState.toggledOffDates));
    } catch (e) {}
    renderSavedOffDatesSummary();
    if (syncCloud) {
        try {
            await fetchWithRetry(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "saveOffDates", offDates: AppState.toggledOffDates })
            }, 2);
        } catch (e) {}
    }
}

async function fetchOffDatesFromCloud() {
    try {
        const resp = await fetch(APPS_SCRIPT_URL + "?action=getOffDates&t=" + Date.now(), { mode: 'cors' });
        if (!resp.ok) return;
        const result = await resp.json();
        if (Array.isArray(result)) {
            const merged = Array.from(new Set([...AppState.toggledOffDates, ...result.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))])).sort();
            AppState.toggledOffDates = merged;
            localStorage.setItem(OFF_DATES_STORAGE_KEY, JSON.stringify(AppState.toggledOffDates));
            renderCalcCalendar();
            renderSavedOffDatesSummary();
        }
    } catch (e) {}
}

function setCalcDateValue(isoStr) {
    const cleanIso = /^\d{4}-\d{2}-\d{2}$/.test(isoStr) ? isoStr : getTodayISO();
    const hiddenEl = document.getElementById('calcStartDate');
    const displayEl = document.getElementById('calcStartDateDisplay');
    if (hiddenEl) hiddenEl.value = cleanIso;
    if (displayEl) displayEl.value = isoToMMDDYYYY(cleanIso);
}

function toggleCalcSystemDatePicker() {
    const popup = document.getElementById('calcSystemDatePickerPopup');
    if (!popup) return;
    if (!popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
        return;
    }
    const currentIso = document.getElementById('calcStartDate')?.value || getTodayISO();
    const parts = currentIso.split('-');
    if (parts.length === 3) {
        pickerViewYear = parseInt(parts[0], 10);
        pickerViewMonth = parseInt(parts[1], 10) - 1;
    }
    renderSystemDatePickerGrid();
    popup.classList.remove('hidden');
}

function closeCalcSystemDatePicker() {
    const popup = document.getElementById('calcSystemDatePickerPopup');
    if (popup) popup.classList.add('hidden');
}

function changePickerMonth(dir) {
    pickerViewMonth += dir;
    if (pickerViewMonth > 11) { pickerViewMonth = 0; pickerViewYear++; }
    if (pickerViewMonth < 0) { pickerViewMonth = 11; pickerViewYear--; }
    renderSystemDatePickerGrid();
}

function selectCalcPickerToday() {
    const todayIso = getTodayISO();
    setCalcDateValue(todayIso);
    closeCalcSystemDatePicker();
    runWorkdayCalculator();
}

function pickSystemDate(isoStr) {
    setCalcDateValue(isoStr);
    closeCalcSystemDatePicker();
    runWorkdayCalculator();
}

function renderSystemDatePickerGrid() {
    const grid = document.getElementById('pickerCalendarDays');
    const label = document.getElementById('pickerMonthYearLabel');
    if (!grid || !label) return;

    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthsNames[pickerViewMonth]} ${pickerViewYear}`;

    const selectedIso = document.getElementById('calcStartDate')?.value || '';
    const todayIso = getTodayISO();

    let html = ["S", "M", "T", "W", "T", "F", "S"].map(d =>
        `<div class="text-[10px] font-extrabold text-slate-500 py-1">${d}</div>`
    ).join('');

    const firstDay = new Date(pickerViewYear, pickerViewMonth, 1).getDay();
    const totalDays = new Date(pickerViewYear, pickerViewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const iso = `${pickerViewYear}-${String(pickerViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = iso === selectedIso;
        const isToday = iso === todayIso;

        let btnClass = "bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500";
        if (isSelected) {
            btnClass = "bg-blue-600 text-white border border-blue-400 shadow";
        } else if (isToday) {
            btnClass += " ring-1 ring-amber-400";
        }

        html += `<button type="button" onclick="pickSystemDate('${iso}')" class="p-1.5 rounded-lg text-[11px] font-mono font-bold transition ${btnClass}">${day}</button>`;
    }

    grid.innerHTML = html;
}

document.addEventListener('click', (e) => {
    const popup = document.getElementById('calcSystemDatePickerPopup');
    const displayEl = document.getElementById('calcStartDateDisplay');
    if (popup && !popup.classList.contains('hidden')) {
        const clickedInsidePopup = popup.contains(e.target);
        const clickedDisplay = displayEl && displayEl.contains(e.target);
        const clickedPickerTrigger = e.target.closest && e.target.closest('[onclick*="toggleCalcSystemDatePicker"]');
        if (!clickedInsidePopup && !clickedDisplay && !clickedPickerTrigger) {
            popup.classList.add('hidden');
        }
    }
});

function openNativeDatePicker(inputEl) {
    if (!inputEl) return;
    try {
        if (typeof inputEl.showPicker === 'function') {
            inputEl.showPicker();
        }
    } catch (e) {}
}

let globalPickerTargetId = null;
let globalPickerViewYear = 2026;
let globalPickerViewMonth = 10;

function setSystemDateInputValue(inputId, isoStr) {
    const cleanIso = (isoStr && /^\d{4}-\d{2}-\d{2}$/.test(isoStr)) ? isoStr : '';
    const hiddenEl = document.getElementById(inputId);
    const displayEl = document.getElementById(inputId + 'Display');
    if (hiddenEl) hiddenEl.value = cleanIso;
    if (displayEl) displayEl.value = cleanIso ? isoToMMDDYYYY(cleanIso) : '';
}

function openSystemDatePicker(targetInputId, anchorEl) {
    const popup = document.getElementById('globalSystemDatePickerPopup');
    if (!popup) return;

    if (!popup.classList.contains('hidden') && globalPickerTargetId === targetInputId) {
        popup.classList.add('hidden');
        globalPickerTargetId = null;
        return;
    }

    globalPickerTargetId = targetInputId;
    const currentIso = document.getElementById(targetInputId)?.value || getTodayISO();
    const parts = currentIso.split('-');
    if (parts.length === 3) {
        globalPickerViewYear = parseInt(parts[0], 10);
        globalPickerViewMonth = parseInt(parts[1], 10) - 1;
    }

    const clearBtn = document.getElementById('btnGlobalPickerClear');
    if (clearBtn) {
        clearBtn.style.display = (targetInputId === 'filterDate') ? 'inline-block' : 'none';
    }

    renderGlobalSystemDatePickerGrid();
    popup.classList.remove('hidden');

    const refEl = anchorEl || document.getElementById(targetInputId + 'Display');
    if (refEl && refEl.getBoundingClientRect) {
        const rect = refEl.getBoundingClientRect();
        const popupW = 288;
        const popupH = 290;
        let left = rect.left;
        let top = rect.bottom + 6;
        if (left + popupW > window.innerWidth - 12) left = Math.max(12, window.innerWidth - popupW - 12);
        if (top + popupH > window.innerHeight - 12) top = Math.max(12, rect.top - popupH - 6);
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }
}

function closeGlobalSystemDatePicker() {
    const popup = document.getElementById('globalSystemDatePickerPopup');
    if (popup) popup.classList.add('hidden');
    globalPickerTargetId = null;
}

function changeGlobalPickerMonth(dir) {
    globalPickerViewMonth += dir;
    if (globalPickerViewMonth > 11) { globalPickerViewMonth = 0; globalPickerViewYear++; }
    if (globalPickerViewMonth < 0) { globalPickerViewMonth = 11; globalPickerViewYear--; }
    renderGlobalSystemDatePickerGrid();
}

function pickGlobalSystemDate(isoStr) {
    if (!globalPickerTargetId) return;
    const targetEl = document.getElementById(globalPickerTargetId);
    setSystemDateInputValue(globalPickerTargetId, isoStr);
    closeGlobalSystemDatePicker();
    if (targetEl && typeof targetEl.onchange === 'function') {
        targetEl.onchange();
    } else if (targetEl) {
        targetEl.dispatchEvent(new Event('change'));
    }
}

function selectGlobalPickerToday() {
    pickGlobalSystemDate(getTodayISO());
}

function clearGlobalPickerDate() {
    if (!globalPickerTargetId) return;
    const targetEl = document.getElementById(globalPickerTargetId);
    setSystemDateInputValue(globalPickerTargetId, '');
    closeGlobalSystemDatePicker();
    if (targetEl && typeof targetEl.onchange === 'function') {
        targetEl.onchange();
    } else if (targetEl) {
        targetEl.dispatchEvent(new Event('change'));
    }
}

function renderGlobalSystemDatePickerGrid() {
    const grid = document.getElementById('globalPickerCalendarDays');
    const label = document.getElementById('globalPickerMonthYearLabel');
    if (!grid || !label) return;

    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthsNames[globalPickerViewMonth]} ${globalPickerViewYear}`;

    const selectedIso = globalPickerTargetId ? (document.getElementById(globalPickerTargetId)?.value || '') : '';
    const todayIso = getTodayISO();

    let html = ["S", "M", "T", "W", "T", "F", "S"].map(d =>
        `<div class="text-[10px] font-extrabold text-slate-500 py-1">${d}</div>`
    ).join('');

    const firstDay = new Date(globalPickerViewYear, globalPickerViewMonth, 1).getDay();
    const totalDays = new Date(globalPickerViewYear, globalPickerViewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const iso = `${globalPickerViewYear}-${String(globalPickerViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = iso === selectedIso;
        const isToday = iso === todayIso;

        let btnClass = "bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500";
        if (isSelected) {
            btnClass = "bg-blue-600 text-white border border-blue-400 shadow";
        } else if (isToday) {
            btnClass += " ring-1 ring-amber-400";
        }

        html += `<button type="button" onclick="pickGlobalSystemDate('${iso}')" class="p-1.5 rounded-lg text-[11px] font-mono font-bold transition ${btnClass}">${day}</button>`;
    }

    grid.innerHTML = html;
}

document.addEventListener('click', (e) => {
    const gPopup = document.getElementById('globalSystemDatePickerPopup');
    if (gPopup && !gPopup.classList.contains('hidden')) {
        const inside = gPopup.contains(e.target);
        const onTrigger = e.target.closest && e.target.closest('[onclick*="openSystemDatePicker"]');
        if (!inside && !onTrigger) {
            closeGlobalSystemDatePicker();
        }
    }
});

function mergeSettingsSafely(localOrDefaultSettings, incomingSettings, preferIncomingCategories = false) {
    const base = localOrDefaultSettings || {};
    const inc = (incomingSettings && typeof incomingSettings === "object") ? incomingSettings : {};
    const defs = getDefaultSettingsObject();

    const mergedGroups = {};
    const hasIncomingGroups = inc.categoryGroups && typeof inc.categoryGroups === "object" && Object.keys(inc.categoryGroups).length > 0;

    CATEGORY_GROUPS.forEach(grp => {
        const localArr = Array.isArray(base.categoryGroups?.[grp]) ? base.categoryGroups[grp] : [];
        const incArr = Array.isArray(inc.categoryGroups?.[grp]) ? inc.categoryGroups[grp] : [];
        const chosen = (preferIncomingCategories && hasIncomingGroups)
            ? incArr
            : (hasIncomingGroups ? Array.from(new Set([...localArr, ...incArr])) : localArr);
        mergedGroups[grp] = Array.from(new Set(chosen.map(x => String(x || '').trim()).filter(Boolean)));
    });

    const rawMergedPlatforms = Array.isArray(inc.platforms) && inc.platforms.length > 0
        ? inc.platforms
        : (base.platforms || AppState.settings.platforms);
    const mergedPlatforms = rawMergedPlatforms.map(p => {
        if (typeof p === "string") {
            return { name: p, autoGen: false, prefix: "CPAO" };
        }
        const autoFlag = (p.autoGen === true || String(p.autoGen).trim().toLowerCase() === "true" || p.autoGen === 1 || String(p.autoGen).trim().toUpperCase() === "YES");
        return {
            name: String(p.name || "").trim(),
            autoGen: autoFlag,
            prefix: String(p.prefix || "CPAO").trim()
        };
    }).filter(p => p.name);

    const mergedTicketTypes = Array.isArray(inc.ticketTypes) && inc.ticketTypes.length > 0
        ? inc.ticketTypes
        : (base.ticketTypes || AppState.settings.ticketTypes);

    const requiredDefaultAction = "Waiting for further information /documents needed from the client";
    const rawActionsTaken = Array.isArray(inc.actionsTaken) && inc.actionsTaken.length > 0
        ? inc.actionsTaken
        : (base.actionsTaken || AppState.settings.actionsTaken || []);
    const mergedActionsTaken = Array.from(new Set([...rawActionsTaken, requiredDefaultAction]));

    const mergedStatuses = Array.isArray(inc.statuses) && inc.statuses.length > 0
        ? inc.statuses
        : (base.statuses || AppState.settings.statuses);

    const mergedReportCfg = {
        ...(base.reportConfig || {}),
        ...(inc.reportConfig || {})
    };
    if (!mergedReportCfg.logo1Url && base.reportConfig?.logo1Url) mergedReportCfg.logo1Url = base.reportConfig.logo1Url;
    if (!mergedReportCfg.logo2Url && base.reportConfig?.logo2Url) mergedReportCfg.logo2Url = base.reportConfig.logo2Url;
    if (!mergedReportCfg.logo3Url && base.reportConfig?.logo3Url) mergedReportCfg.logo3Url = base.reportConfig.logo3Url;

    const mergedReportCols = {
        ...DEFAULT_REPORT_COLUMNS,
        ...(base.reportColumns || {}),
        ...(inc.reportColumns || {})
    };

    const enableClipboard = inc.enableResponderClipboard !== undefined
        ? !!inc.enableResponderClipboard
        : (base.enableResponderClipboard !== undefined ? !!base.enableResponderClipboard : true);

    const out = {
        ...base,
        ...inc,
        enableResponderClipboard: enableClipboard,
        categoryGroups: mergedGroups,
        platforms: mergedPlatforms,
        ticketTypes: mergedTicketTypes,
        actionsTaken: mergedActionsTaken,
        statuses: mergedStatuses,
        endorsementForm: {
            ...(base.endorsementForm || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS),
            ...(inc.endorsementForm || {})
        },
        reportColumns: mergedReportCols,
        reportConfig: mergedReportCfg,
        preferences: { ...defs.preferences, ...(base.preferences || {}), ...(inc.preferences || {}) },
        notifications: { ...defs.notifications, ...(base.notifications || {}), ...(inc.notifications || {}) },
        security: { ...defs.security, ...(base.security || {}), ...(inc.security || {}) },
        integrations: { ...defs.integrations, ...(base.integrations || {}), ...(inc.integrations || {}) }
    };

    const flatCats = [];
    CATEGORY_GROUPS.forEach(grp => {
        (out.categoryGroups[grp] || []).forEach(c => {
            if (c && !flatCats.some(x => x.toLowerCase() === c.toLowerCase())) {
                flatCats.push(c);
            }
        });
    });
    out.categories = flatCats;
    return out;
}

function persistLocalSettingsCache() {
    ensureCategoryGroupsInitialized();
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(AppState.settings));
    } catch (e) {}
}

function loadLocalSettingsCache() {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                AppState.settings = mergeSettingsSafely(AppState.settings, parsed, true);
            }
        }
    } catch (e) {}
    ensureCategoryGroupsInitialized();
}

function ensureCategoryGroupsInitialized() {
    if (!AppState.settings.categoryGroups || typeof AppState.settings.categoryGroups !== "object") {
        AppState.settings.categoryGroups = {};
    }
    CATEGORY_GROUPS.forEach(grp => {
        if (!Array.isArray(AppState.settings.categoryGroups[grp])) {
            AppState.settings.categoryGroups[grp] = [];
        }
        AppState.settings.categoryGroups[grp] = Array.from(
            new Set(AppState.settings.categoryGroups[grp].map(c => String(c || '').trim()).filter(Boolean))
        );
    });

    syncFlatCategoriesFromGroups();
}

function syncFlatCategoriesFromGroups() {
    const flat = [];
    CATEGORY_GROUPS.forEach(grp => {
        (AppState.settings.categoryGroups[grp] || []).forEach(c => {
            const clean = String(c || '').trim();
            if (clean && !flat.some(existing => existing.toLowerCase() === clean.toLowerCase())) {
                flat.push(clean);
            }
        });
    });
    AppState.settings.categories = flat;
}

function getGroupForCategory(categoryName) {
    ensureCategoryGroupsInitialized();
    const target = String(categoryName || '').trim().toLowerCase();
    if (!target) return "Other concerns";
    for (const grp of CATEGORY_GROUPS) {
        const list = AppState.settings.categoryGroups[grp] || [];
        if (list.some(item => String(item).trim().toLowerCase() === target)) {
            return grp;
        }
    }
    return "Other concerns";
}

function showSystemAlert(title, message, icon = "⚠️") {
    const modal = document.getElementById('systemModal');
    if (!modal) return;
    document.getElementById('systemModalTitleText').textContent = title;
    document.getElementById('systemModalIcon').textContent = icon;
    document.getElementById('systemModalMessage').textContent = message;
    document.getElementById('systemModalButtons').innerHTML = `
        <button type="button" onclick="closeSystemModal()" class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow">OK</button>
    `;
    modal.style.display = 'flex';
}

function showSystemConfirm(title, message, onConfirm, icon = "❓") {
    const modal = document.getElementById('systemModal');
    if (!modal) return;
    document.getElementById('systemModalTitleText').textContent = title;
    document.getElementById('systemModalIcon').textContent = icon;
    document.getElementById('systemModalMessage').textContent = message;
    document.getElementById('systemModalButtons').innerHTML = `
        <button type="button" onclick="closeSystemModal()" class="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded font-semibold">Cancel</button>
        <button type="button" id="systemConfirmYesBtn" class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded shadow">Confirm</button>
    `;
    document.getElementById('systemConfirmYesBtn').onclick = () => {
        closeSystemModal();
        if (onConfirm) onConfirm();
    };
    modal.style.display = 'flex';
}

function closeSystemModal() {
    const modal = document.getElementById('systemModal');
    if (modal) modal.style.display = 'none';
}

function showToast(msg) {
    if (AppState.settings?.notifications && AppState.settings.notifications.toastAlerts === false) {
        return;
    }
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'bg-slate-800 text-slate-100 border border-slate-700 text-xs px-3.5 py-2 rounded-lg shadow-xl flex items-center gap-2';
    toast.innerHTML = `<span>✨</span> <span>${escapeHtml(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function executeSystemLogout() {
    persistLocalSettingsCache();
    saveOffDatesStorage(false);
    sessionStorage.clear();
    localStorage.removeItem('LTO_ACTIVE_USER');
    window.location.href = 'login.html';
}

function getTodayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTodayMMDDYYYY() {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
}

function isoToMMDDYYYY(isoStr) {
    if (!isoStr) return '';
    if (isoStr.includes('/')) return isoStr;
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
    return isoStr;
}

function mmddyyyyToISO(mdyStr) {
    if (!mdyStr) return getTodayISO();
    if (mdyStr.includes('-') && mdyStr.length === 10) return mdyStr;
    const parts = mdyStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    return getTodayISO();
}

function formatCleanDate(val) {
    if (!val) return '';
    const str = String(val).replace(/^'/, '').trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const p = str.split('/');
        return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`;
    }
    if (str.includes('GMT') || str.includes('Standard') || (str.includes('T') && !isNaN(Date.parse(str)))) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return isoToMMDDYYYY(str);
    return str;
}

function setFilterDateToday() {
    setSystemDateInputValue('filterDate', getTodayISO()); renderTable();
}

function clearDateFilter() {
    setSystemDateInputValue('filterDate', ''); renderTable();
}

function setFormDateToday() {
    setSystemDateInputValue('formDateReceived', getTodayISO());
    autoGenTicketNo(false);
}

function isSuperAdmin() { return currentUser && (currentUser.role || "").toLowerCase() === "super admin"; }
function isAdminTL() { return currentUser && ((currentUser.role || "").toLowerCase() === "admintl" || isSuperAdmin()); }
function canUserGenerateReports() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canReports === true); }
function canUserDeleteLogs() { return isSuperAdmin() || isAdminTL() || (currentUser && currentUser.canDeleteLogs === true); }
function canUserManageUsers() { return isSuperAdmin() || (currentUser && currentUser.canManageUsers === true); }
function canUserAccessSettings() { return isSuperAdmin() || (currentUser && currentUser.canAccessSettings === true); }
function canUserEditWorkdayOffDates() { return isSuperAdmin() || isAdminTL(); }
function isResponderClipboardEnabled() { return AppState.settings?.enableResponderClipboard !== false; }

function updateUIPrivileges() {
    const btnReports = document.getElementById('tabBtnReports');
    const btnDirectory = document.getElementById('tabBtnDirectory');
    const btnTemplate = document.getElementById('tabBtnTemplate');
    const btnUsers = document.getElementById('tabBtnUsers');
    const btnSettings = document.getElementById('tabBtnSettings');
    const btnClipboard = document.getElementById('tabBtnClipboard');
    const btnAccomplishment = document.getElementById('tabBtnAccomplishment');
    const btnBackendSheet = document.getElementById('btnOpenBackendSheet');
    if (btnBackendSheet) btnBackendSheet.style.display = isSuperAdmin() ? 'inline-flex' : 'none';

    const hasReportAccess = canUserGenerateReports();
    const hasDirectoryAccess = isAdminTL() || isSuperAdmin();
    const hasTemplateAccess = isAdminTL() || isSuperAdmin();
    const hasUserAccess = canUserManageUsers();
    const hasSettingsAccess = canUserAccessSettings();
    const clipboardEnabled = isResponderClipboardEnabled();

    const canEditOffDates = canUserEditWorkdayOffDates();
    if (!canEditOffDates) {
        document.body.classList.add('role-normal-admin');
    } else {
        document.body.classList.remove('role-normal-admin');
    }

    const btnResetOffDates = document.getElementById('btnResetOffDates');
    if (btnResetOffDates) btnResetOffDates.style.display = canEditOffDates ? 'inline-flex' : 'none';
    const offDatesHint = document.getElementById('offDatesToggleHint');
    if (offDatesHint) {
        offDatesHint.textContent = canEditOffDates
            ? 'Click calendar days to toggle On/Off'
            : 'View-only schedule (AdminTL / Super Admin only)';
    }

    if (btnAccomplishment) btnAccomplishment.style.display = 'flex';
    if (btnClipboard) {
        btnClipboard.style.display = clipboardEnabled ? 'flex' : 'none';
        if (!clipboardEnabled) {
            const clipView = document.getElementById('viewClipboard');
            if (clipView && clipView.style.display !== 'none') {
                switchMainTab('logs');
            }
        }
    }

    const clipToggleEl = document.getElementById('cfgEnableResponderClipboard');
    const clipStatusEl = document.getElementById('cfgResponderClipboardStatusLabel');
    if (clipToggleEl) clipToggleEl.checked = clipboardEnabled;
    if (clipStatusEl) {
        clipStatusEl.textContent = clipboardEnabled ? 'ENABLED' : 'DISABLED (OFF)';
        clipStatusEl.className = clipboardEnabled
            ? 'ml-2.5 text-xs font-extrabold text-emerald-400 uppercase'
            : 'ml-2.5 text-xs font-extrabold text-rose-400 uppercase';
    }

    if (btnReports) btnReports.style.display = hasReportAccess ? 'flex' : 'none';
    if (btnDirectory) btnDirectory.style.display = hasDirectoryAccess ? 'flex' : 'none';
    if (btnTemplate) btnTemplate.style.display = hasTemplateAccess ? 'flex' : 'none';
    if (btnUsers) btnUsers.style.display = hasUserAccess ? 'flex' : 'none';
    if (btnSettings) btnSettings.style.display = hasSettingsAccess ? 'flex' : 'none';
}

function toggleGlobalResponderClipboard(enabled) {
    AppState.settings.enableResponderClipboard = !!enabled;
    persistLocalSettingsCache();
    updateUIPrivileges();
    markSettingsDirty(true);
    saveAllSettingsToCloud(true);
    showToast(enabled ? "Responder Clipboard enabled for all users." : "Responder Clipboard turned OFF for all users.");
}

function loadPendingSyncQueue() {
    try {
        const raw = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
}

function savePendingSyncQueue(queue) {
    try {
        localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(queue || []));
    } catch (e) {}
    updateSyncStatusBadge();
}

function enqueuePendingTicketSync(ticketObj, isEditing, targetRowIdx) {
    const queue = loadPendingSyncQueue();
    const clientKey = `${String(ticketObj.referralNo || '').trim().toLowerCase()}|${String(ticketObj.dateReceived || '').trim()}|${String(ticketObj.complainantName || '').trim().toLowerCase()}`;
    const existingIdx = queue.findIndex(item => item.clientKey === clientKey);
    const entry = {
        clientKey,
        ticketObj: { ...ticketObj },
        isEditing: !!isEditing,
        targetRowIdx: targetRowIdx || null,
        updatedAt: Date.now()
    };
    if (existingIdx >= 0) {
        queue[existingIdx] = entry;
    } else {
        queue.push(entry);
    }
    savePendingSyncQueue(queue);
}

function removePendingTicketSync(clientKey) {
    const queue = loadPendingSyncQueue().filter(item => item.clientKey !== clientKey);
    savePendingSyncQueue(queue);
}

function mergeQueuedTicketsIntoList(ticketList) {
    const queue = loadPendingSyncQueue();
    if (!queue.length) return ticketList;

    const merged = [...ticketList];
    queue.forEach(qItem => {
        const t = qItem.ticketObj;
        if (!t) return;
        const idx = merged.findIndex(item =>
            String(item.referralNo || '').trim().toLowerCase() === String(t.referralNo || '').trim().toLowerCase() &&
            String(item.dateReceived || '').trim() === String(t.dateReceived || '').trim()
        );
        if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...t };
        } else {
            merged.push({ ...t });
        }
    });
    return merged;
}

async function flushPendingSyncQueue(silent = true) {
    if (isFlushingSyncQueue || isSavingTicket) return;
    if (hasPendingSettingsSync()) {
        await saveAllSettingsToCloud(true);
    }
    const queue = loadPendingSyncQueue();
    if (!queue.length) {
        updateSyncStatusBadge(hasPendingSettingsSync() ? "queued" : "synced");
        return;
    }

    isFlushingSyncQueue = true;
    updateSyncStatusBadge("syncing");
    try {
        for (const qItem of queue) {
            const storageKey = qItem.isEditing ? LAST_WORKING_UPDATE_ACTION_KEY : LAST_WORKING_ADD_ACTION_KEY;
            const cachedAction = localStorage.getItem(storageKey);
            const actionCandidates = Array.from(new Set(
                (qItem.isEditing
                    ? [cachedAction, "updateLog", "updateTicket", "update", "editLog", "edit", "saveLog", "save"]
                    : [cachedAction, "addLog", "addTicket", "createLog", "createTicket", "create", "add", "insert", "append", "saveLog", "save"]
                ).filter(Boolean)
            ));

            for (const act of actionCandidates) {
                try {
                    const { resData, errMsg } = await sendTicketPayloadToAppsScript(act, qItem.targetRowIdx, qItem.ticketObj);
                    if (!errMsg) {
                        localStorage.setItem(storageKey, act);
                        removePendingTicketSync(qItem.clientKey);
                        const savedIdx = AppState.tickets.findIndex(item =>
                            String(item.referralNo || '').trim().toLowerCase() === String(qItem.ticketObj.referralNo || '').trim().toLowerCase()
                        );
                        if (savedIdx >= 0 && resData && resData.rowIndex) {
                            AppState.tickets[savedIdx].rowIndex = resData.rowIndex;
                            saveStorage();
                        }
                        if (!silent) {
                            showToast(`Queued entry ${qItem.ticketObj.referralNo} synchronized with Google Sheets.`);
                        }
                        break;
                    }
                    if (!isUnknownActionErrorMessage(errMsg)) {
                        break;
                    }
                } catch (e) {}
            }
        }
    } finally {
        isFlushingSyncQueue = false;
        updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
    }
}

async function pollRealtimeUpdates() {
    if (isSavingTicket || isFlushingSyncQueue) return;
    if (loadPendingSyncQueue().length > 0) return;

    const ticketModalOpen = document.getElementById('ticketModal')?.style.display === 'flex';
    const userModalOpen = document.getElementById('userModal')?.style.display === 'flex';
    const endorseModalOpen = document.getElementById('endorseModal')?.style.display === 'flex';
    const dupModalOpen = document.getElementById('duplicateWarningModal')?.style.display === 'flex';
    if (ticketModalOpen || userModalOpen || endorseModalOpen || dupModalOpen) return;

    try {
        const logsResp = await fetch(APPS_SCRIPT_URL + "?t=" + Date.now(), { mode: 'cors' });
        if (!logsResp.ok) return;
        const logsResult = await logsResp.json();
        if (isSavingTicket || loadPendingSyncQueue().length > 0) return;

        if (Array.isArray(logsResult)) {
            const validRows = logsResult.filter(item => !String(item.rowIndex || item['#'] || '').toUpperCase().startsWith('DATE:'));
            const normalizedCloud = mergeQueuedTicketsIntoList(
                validRows.map((item, idx) => normalizeTicketObject(item, idx))
            );

            const currentJson = JSON.stringify(AppState.tickets.map(t => ({
                ref: t.referralNo,
                status: t.status,
                cat: t.category,
                details: t.ticketDetails,
                resp: t.responseDetails,
                remarks: t.remarks,
                action: t.actionTaken
            })));
            const cloudJson = JSON.stringify(normalizedCloud.map(t => ({
                ref: t.referralNo,
                status: t.status,
                cat: t.category,
                details: t.ticketDetails,
                resp: t.responseDetails,
                remarks: t.remarks,
                action: t.actionTaken
            })));

            if (currentJson !== cloudJson) {
                AppState.tickets = normalizedCloud;
                saveStorage();
                renderTable();
                updateKPIs();
                if (document.getElementById('viewReports')?.style.display !== 'none' && document.getElementById('repStartDate')?.value && document.getElementById('repEndDate')?.value) {
                    generateReport();
                }
                if (document.getElementById('viewAccomplishment')?.style.display !== 'none') {
                    generateAccomplishmentReport();
                }
            }
            updateSyncStatusBadge("synced");
        }
    } catch (e) {
        console.warn("Realtime poll skipped:", e);
    }
}

function applyDefaultViewScopeForUser() {
    const scopeSel = document.getElementById('superadminViewScope');
    if (!scopeSel) return;
    const prefScope = AppState.settings?.preferences?.defaultViewScope;
    if (!isSuperAdmin() && !isAdminTL()) {
        scopeSel.value = 'my';
    } else if (prefScope === 'all' || prefScope === 'my') {
        scopeSel.value = prefScope;
    }
}

function getIdleTimeoutMs() {
    const mins = parseInt(AppState.settings?.security?.idleTimeoutMinutes || 20, 10);
    const validMins = isNaN(mins) ? 20 : Math.max(5, Math.min(240, mins));
    return validMins * 60 * 1000;
}

let idleLogoutTimer = null;

function enforceActiveSessionOrRedirect() {
    try {
        const raw = sessionStorage.getItem('LTO_ACTIVE_USER');
        if (!raw) {
            window.location.replace('login.html');
            return false;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.username) {
            sessionStorage.removeItem('LTO_ACTIVE_USER');
            window.location.replace('login.html');
            return false;
        }
        currentUser = parsed;
        return true;
    } catch (e) {
        window.location.replace('login.html');
        return false;
    }
}

function resetIdleLogoutTimer() {
    if (idleLogoutTimer) clearTimeout(idleLogoutTimer);
    idleLogoutTimer = setTimeout(() => {
        persistLocalSettingsCache();
        saveOffDatesStorage(false);
        sessionStorage.clear();
        localStorage.removeItem('LTO_ACTIVE_USER');
        window.location.replace('login.html?reason=idle');
    }, getIdleTimeoutMs());
}

function setupSessionAndIdleGuards() {
    try { localStorage.removeItem('LTO_ACTIVE_USER'); } catch (e) {}

    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evtName => {
        window.addEventListener(evtName, resetIdleLogoutTimer, { passive: true });
    });
    resetIdleLogoutTimer();

    window.addEventListener('beforeunload', (e) => {
        persistLocalSettingsCache();
        saveOffDatesStorage(false);
        if (settingsHasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

async function initSystem() {
    if (!enforceActiveSessionOrRedirect()) return;
    setupSessionAndIdleGuards();
    if (!currentUser.adminNo) {
        currentUser.adminNo = deriveOperatorAdminNo(currentUser);
    }

    loadLocalSettingsCache();
    applyThemeMode(getCurrentColorMode());
    ensureCategoryGroupsInitialized();
    loadCustomAccomplishmentsStorage();
    loadOffDatesStorage();
    loadDirectoryStorage();
    ensureDirectoryOfficialsInitialized();
    populateOfficialRoleRankDropdown("Chief");
    getEndorsementFormConfig();
    loadUsersStorage();
    checkScheduledPortalAssignment();
    updateUIPrivileges();
    applyDefaultViewScopeForUser();

    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) roleBadge.textContent = (currentUser.role || "ADMIN").toUpperCase();
    const opName = document.getElementById('activeOperatorName');
    if (opName) opName.textContent = currentUser.name || currentUser.username;

    setSystemDateInputValue('filterDate', getTodayISO());
    setSystemDateInputValue('customAccDateInput', getTodayISO());

    loadStorage();
    AppState.tickets = mergeQueuedTicketsIntoList(AppState.tickets);
    populateDropdowns();
    renderTable();
    loadReportConfigToUI();
    populateEnhancedSettingsUI();

    const todayIso = getTodayISO();
    setCalcDateValue(todayIso);
    const nowDate = new Date();
    calcCurrentYear = nowDate.getFullYear();
    calcCurrentMonth = nowDate.getMonth();
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");

    await flushPendingSyncQueue(true);
    await fetchSettingsFromCloud();
    applyThemeMode(getCurrentColorMode());
    await fetchUsersFromCloud();
    await fetchFromGoogleSheets();
    await fetchOffDatesFromCloud();
    checkScheduledPortalAssignment();
    applyDefaultViewScopeForUser();
    populateEnhancedSettingsUI();

    populateDropdowns();
    renderTable();
    renderDirectoryTable();
    renderTemplateEditorUI();
    renderUsersTable();
    renderSettingsTables();
    updateKPIs();
    renderSnippets();
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    render24HourReminderBanner();
    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");

    const pollMs = Math.max(2000, (parseInt(AppState.settings?.preferences?.autoRefreshSeconds || 4, 10) || 4) * 1000);
    setInterval(pollRealtimeUpdates, pollMs);
    setInterval(render24HourReminderBanner, TIMER_24H_CHECK_INTERVAL_MS);
}

async function fetchAllCloudData() {
    updateSyncStatusBadge("syncing");
    await flushPendingSyncQueue(false);
    await saveAllSettingsToCloud(true);
    await fetchSettingsFromCloud();
    applyThemeMode(getCurrentColorMode());
    await fetchUsersFromCloud();
    await fetchFromGoogleSheets();
    await fetchOffDatesFromCloud();
    checkScheduledPortalAssignment();
    loadReportConfigToUI();
    populateEnhancedSettingsUI();
    populateDropdowns();
    renderTable();
    renderDirectoryTable();
    renderTemplateEditorUI();
    renderUsersTable();
    renderSettingsTables();
    renderCalcCalendar();
    renderSavedOffDatesSummary();
    updateUIPrivileges();
    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
    showToast("All cloud settings, schedules, and logs synchronized successfully.");
}

function checkScheduledPortalAssignment() {
    if (AppState.users && AppState.users.length > 0) {
        const found = AppState.users.find(u => u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (found) {
            currentUser = {
                ...currentUser,
                pass: found.pass || currentUser.pass,
                defaultPortal: found.defaultPortal,
                portalStartTime: found.portalStartTime,
                portalEndTime: found.portalEndTime,
                name: found.name || currentUser.name,
                role: found.role || currentUser.role,
                logColor: found.logColor || currentUser.logColor,
                canReports: found.canReports !== undefined ? !!found.canReports : (found.role && found.role.toLowerCase() !== 'admin'),
                canDeleteLogs: found.canDeleteLogs !== undefined ? !!found.canDeleteLogs : (found.role && found.role.toLowerCase() !== 'admin'),
                canManageUsers: found.canManageUsers !== undefined ? !!found.canManageUsers : ((found.role || "").toLowerCase() === 'super admin'),
                canAccessSettings: found.canAccessSettings !== undefined ? !!found.canAccessSettings : ((found.role || "").toLowerCase() === 'super admin')
            };
        }
    }
    currentUser.adminNo = deriveOperatorAdminNo(currentUser);
    const savedLocalColor = localStorage.getItem('LTO_COLOR_' + currentUser.username);
    if (savedLocalColor) currentUser.logColor = savedLocalColor;
    if (!currentUser.logColor) currentUser.logColor = '#9a4e2a';
    sessionStorage.setItem('LTO_ACTIVE_USER', JSON.stringify(currentUser));
    updateUIPrivileges();
}

function openReportConfigModal() { if (!canUserGenerateReports()) return; loadReportConfigToUI(); document.getElementById('reportConfigModal').style.display = 'flex'; }
function closeReportConfigModal() { document.getElementById('reportConfigModal').style.display = 'none'; }
function openLogoutModal() { document.getElementById('logoutModal').style.display = 'flex'; }
function closeLogoutModal() { document.getElementById('logoutModal').style.display = 'none'; }

function toggleMyColorPicker(enable) {
    const cp = document.getElementById('myAccountLogColor');
    if (cp) { cp.disabled = !enable; cp.style.opacity = enable ? '1' : '0.5'; }
}

function togglePasswordChangeSection(enable) {
    const sec = document.getElementById('passwordChangeSection');
    if (sec) sec.style.display = enable ? 'block' : 'none';
}

function openMyAccountModal() {
    document.getElementById('myAccountUsername').value = currentUser.username || '';
    document.getElementById('myAccountName').value = currentUser.name || currentUser.username || '';
    const passToggle = document.getElementById('myAccountTogglePass');
    if(passToggle) passToggle.checked = false;
    togglePasswordChangeSection(false);
    const useCustom = !!(currentUser.logColor && currentUser.logColor !== 'Default');
    document.getElementById('myAccountEnableColor').checked = useCustom;
    toggleMyColorPicker(useCustom);
    document.getElementById('myAccountLogColor').value = useCustom ? currentUser.logColor : '#9a4e2a';
    document.getElementById('myAccountModal').style.display = 'flex';
}
function closeMyAccountModal() { document.getElementById('myAccountModal').style.display = 'none'; }

async function saveMyAccountForm(e) {
    e.preventDefault();
    currentUser.name = document.getElementById('myAccountName').value.trim();
    const useCustom = document.getElementById('myAccountEnableColor').checked;
    currentUser.logColor = useCustom ? document.getElementById('myAccountLogColor').value : 'Default';
    localStorage.setItem('LTO_COLOR_' + currentUser.username, currentUser.logColor);

    if (document.getElementById('myAccountTogglePass').checked) {
        const oldPass = document.getElementById('myAccountOldPass').value.trim();
        const newPass = document.getElementById('myAccountNewPass').value.trim();
        const confirmPass = document.getElementById('myAccountConfirmPass').value.trim();
        if (oldPass !== currentUser.pass) { showSystemAlert("Password Error", "Your existing password is incorrect.", "❌"); return; }
        if (!newPass || newPass !== confirmPass) { showSystemAlert("Password Error", "New Password and Confirm Password do not match.", "❌"); return; }
        currentUser.pass = newPass;
    }
    currentUser.adminNo = deriveOperatorAdminNo(currentUser);

    const userIdx = AppState.users.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
    if (userIdx !== -1) AppState.users[userIdx] = { ...AppState.users[userIdx], ...currentUser };
    else AppState.users.push(currentUser);

    sessionStorage.setItem('LTO_ACTIVE_USER', JSON.stringify(currentUser));
    await saveUsersStorage();
    document.getElementById('activeOperatorName').textContent = currentUser.name || currentUser.username;
    renderTable();
    closeMyAccountModal();
    showToast("Account settings updated successfully.");
}

function getActiveSettingsAppsScriptUrl() {
    const customUrl = String(AppState.settings?.integrations?.appsScriptUrl || "").trim();
    return (customUrl && /^https?:\/\//i.test(customUrl)) ? customUrl : APPS_SCRIPT_URL;
}

function hasPendingSettingsSync() {
    return localStorage.getItem(PENDING_SETTINGS_SYNC_KEY) === "1";
}

function setPendingSettingsSync(isPending) {
    try {
        if (isPending) {
            localStorage.setItem(PENDING_SETTINGS_SYNC_KEY, "1");
        } else {
            localStorage.removeItem(PENDING_SETTINGS_SYNC_KEY);
        }
    } catch (e) {}
}

function parseCloudSettingsResponse(rawResult) {
    if (!rawResult) return null;
    let obj = rawResult;
    if (typeof obj === "string") {
        try { obj = JSON.parse(obj); } catch (e) { return null; }
    }
    if (obj && typeof obj === "object") {
        if (typeof obj.settings === "string") {
            try { obj = JSON.parse(obj.settings); } catch (e) { return null; }
        } else if (obj.settings && typeof obj.settings === "object") {
            obj = obj.settings;
        } else if (typeof obj.data === "string") {
            try { obj = JSON.parse(obj.data); } catch (e) { return null; }
        } else if (obj.data && typeof obj.data === "object" && (obj.data.platforms || obj.data.categories || obj.data.categoryGroups)) {
            obj = obj.data;
        }
    }
    if (obj && typeof obj === "object" && (obj.categories || obj.categoryGroups || obj.platforms || obj.endorsementForm || obj.reportConfig || obj.reportColumns || obj.preferences)) {
        return obj;
    }
    return null;
}

async function fetchSettingsFromCloud() {
    loadLocalSettingsCache();
    if (hasPendingSettingsSync()) {
        await saveAllSettingsToCloud(true);
    }

    const scriptUrl = getActiveSettingsAppsScriptUrl();
    const getActions = ["getSettings", "loadSettings", "readSettings", "fetchSettings"];
    let cloudSettings = null;

    for (const act of getActions) {
        try {
            const response = await fetch(`${scriptUrl}?action=${encodeURIComponent(act)}&sheet=Settings&t=${Date.now()}`, {
                method: "GET",
                mode: "cors",
                cache: "no-store"
            });
            if (!response.ok) continue;
            const rawText = await response.text();
            let parsedJson = null;
            try { parsedJson = rawText ? JSON.parse(rawText) : null; } catch (e) { parsedJson = rawText; }
            const extracted = parseCloudSettingsResponse(parsedJson);
            if (extracted) {
                cloudSettings = extracted;
                break;
            }
        } catch (e) {}
    }

    if (cloudSettings) {
        const localUpdatedAt = Number(AppState.settings?._settingsUpdatedAt || 0);
        const cloudUpdatedAt = Number(cloudSettings?._settingsUpdatedAt || 0);
        if (!hasPendingSettingsSync() && (cloudUpdatedAt >= localUpdatedAt || localUpdatedAt === 0)) {
            AppState.settings = mergeSettingsSafely(AppState.settings, cloudSettings, true);
            persistLocalSettingsCache();
        }
    }

    ensureCategoryGroupsInitialized();
    getEndorsementFormConfig();
    persistLocalSettingsCache();
    loadReportConfigToUI();
    renderTemplateEditorUI();
    updateUIPrivileges();
}

async function sendSettingsPayloadToAppsScript(scriptUrl, actionName, settingsPayload) {
    const serializedSettings = JSON.stringify(settingsPayload);
    const bodyObj = {
        action: actionName,
        sheet: "Settings",
        settings: settingsPayload,
        settingsJson: serializedSettings,
        platforms: settingsPayload.platforms,
        categoryGroups: settingsPayload.categoryGroups,
        categories: settingsPayload.categories,
        ticketTypes: settingsPayload.ticketTypes,
        actionsTaken: settingsPayload.actionsTaken,
        statuses: settingsPayload.statuses,
        enableResponderClipboard: !!settingsPayload.enableResponderClipboard,
        endorsementForm: settingsPayload.endorsementForm,
        reportColumns: settingsPayload.reportColumns,
        reportConfig: settingsPayload.reportConfig,
        preferences: settingsPayload.preferences,
        notifications: settingsPayload.notifications,
        security: settingsPayload.security,
        integrations: settingsPayload.integrations,
        updatedAt: settingsPayload._settingsUpdatedAt || Date.now()
    };

    const resp = await fetchWithRetry(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyObj)
    }, 2);

    const rawText = await resp.text();
    let resData = {};
    try { resData = rawText ? JSON.parse(rawText) : {}; } catch (e) { resData = {}; }
    const errMsg = (resData && (resData.error || (resData.success === false && (resData.message || "Save settings failed")))) || "";
    return { resData, errMsg };
}

async function saveAllSettingsToCloud(silent = false) {
    ensureCategoryGroupsInitialized();
    getEndorsementFormConfig();
    AppState.settings._settingsUpdatedAt = Date.now();
    persistLocalSettingsCache();
    setPendingSettingsSync(true);
    populateDropdowns();
    renderSettingsTables();

    const scriptUrl = getActiveSettingsAppsScriptUrl();
    const cachedAction = localStorage.getItem(LAST_WORKING_SAVE_SETTINGS_ACTION_KEY);
    const actionCandidates = Array.from(new Set(
        [cachedAction, "saveSettings", "updateSettings", "setSettings", "saveConfig", "writeSettings"].filter(Boolean)
    ));

    let synced = false;
    let lastErr = "";

    for (const act of actionCandidates) {
        try {
            const { errMsg } = await sendSettingsPayloadToAppsScript(scriptUrl, act, AppState.settings);
            if (!errMsg) {
                synced = true;
                localStorage.setItem(LAST_WORKING_SAVE_SETTINGS_ACTION_KEY, act);
                setPendingSettingsSync(false);
                break;
            }
            lastErr = errMsg;
            if (!isUnknownActionErrorMessage(errMsg)) {
                break;
            }
        } catch (e) {
            lastErr = e && e.message ? e.message : "Network error";
        }
    }

    if (synced) {
        updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
        if (!silent) showToast("Settings saved and synced to Google Sheets.");
    } else {
        updateSyncStatusBadge("queued");
        if (!silent) {
            showToast("Settings saved locally & queued for Google Sheets sync.");
        }
        console.warn("Settings cloud sync queued for retry:", lastErr);
    }
    return synced;
}

async function fetchFromGoogleSheets() {
    try {
        let response = await fetch(APPS_SCRIPT_URL + "?t=" + Date.now(), { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let result = await response.json();
        if (Array.isArray(result)) {
            const validRows = result.filter(item => !String(item.rowIndex || item['#'] || '').toUpperCase().startsWith('DATE:'));
            AppState.tickets = mergeQueuedTicketsIntoList(
                validRows.map((item, idx) => normalizeTicketObject(item, idx))
            );
            saveStorage();
            renderTable();
            updateKPIs();
            if (document.getElementById('viewReports')?.style.display !== 'none' && document.getElementById('repStartDate')?.value && document.getElementById('repEndDate')?.value) {
                generateReport();
            }
            if (document.getElementById('viewAccomplishment')?.style.display !== 'none') {
                generateAccomplishmentReport();
            }
            updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
        }
    } catch(e) {
        loadStorage();
        AppState.tickets = mergeQueuedTicketsIntoList(AppState.tickets);
        renderTable();
        updateKPIs();
        updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "error");
    }
}

async function fetchUsersFromCloud() {
    try {
        let response = await fetch(APPS_SCRIPT_URL + "?action=getUsers&sheet=Users&t=" + Date.now(), { mode: 'cors' });
        if (!response.ok) return;
        let result = await response.json();
        const rawList = Array.isArray(result) ? result : (result && Array.isArray(result.users) ? result.users : []);
        if (rawList.length > 0) {
            AppState.users = rawList;
            saveUsersStorage();
            renderUsersTable();
        }
    } catch(e) {}
}

function normalizeTicketObject(raw, idx) {
    let extraObj = {};
    try { extraObj = typeof raw.extraData === 'string' ? JSON.parse(raw.extraData || "{}") : (raw.extraData || {}); } catch(e){}
    let cleanDate = formatCleanDate(raw.dateReceived || raw['DATE RECEIVED'] || '');
    const refNo = String(raw.referralNo || raw['REFERRAL / TICKET NUMBER'] || raw['REFERRAL / TICKET NO.'] || '').trim();
    const normStatus = String(raw.status || raw['STATUS'] || 'Closed').trim();
    const isClosed = normStatus.toLowerCase() === 'closed';
    const active24h = !isClosed && !!(raw.is24Hours || extraObj.is24Hours);

    return {
        rowIndex: raw.rowIndex || raw['#'] || (idx + 2),
        adminNo: String(raw.adminNo || raw['ADMIN NO.'] || '').trim(),
        platform: String(raw.platform || raw['PLATFORM'] || 'FACEBOOK').trim(),
        referralNo: refNo,
        dateReceived: cleanDate,
        category: String(raw.category || raw['CATEGORY'] || '').trim(),
        ticketType: String(raw.ticketType || raw['TYPE OF TICKET'] || '').trim(),
        complainantName: String(raw.complainantName || raw['NAME OF COMPLAINANT'] || '').trim(),
        ticketDetails: String(raw.ticketDetails || raw['DETAILS OF TICKET'] || '').trim(),
        responseDetails: String(raw.responseDetails || raw['DETAILS OF RESPONSE'] || '').trim(),
        actionTaken: String(raw.actionTaken || raw['ACTION TAKEN'] || '').trim(),
        status: normStatus,
        remarks: String(raw.remarks || raw['REMARKS'] || '').trim(),
        is24Hours: active24h,
        extraData: {
            ...extraObj,
            is24Hours: active24h,
            timer24hStartedAt: extraObj.timer24hStartedAt || null,
            timer24hDueAt: extraObj.timer24hDueAt || null,
            timer24hRemindedAt: extraObj.timer24hRemindedAt || null
        }
    };
}

function loadStorage() {
    const saved = localStorage.getItem('LTO_CPAO_TICKETS_2026');
    if (saved) AppState.tickets = JSON.parse(saved);
}

function saveStorage() {
    localStorage.setItem('LTO_CPAO_TICKETS_2026', JSON.stringify(AppState.tickets));
    updateKPIs();
}

function loadDirectoryStorage() {
    const saved = localStorage.getItem('LTO_CPAO_DIRECTORY_2026');
    if (saved) {
        try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) AppState.directory = parsed; } catch(e){}
    }
    ensureDirectoryOfficialsInitialized();
    if (selectedDirectoryIndex >= AppState.directory.length) {
        selectedDirectoryIndex = 0;
    }
}

function saveDirectoryStorage() {
    ensureDirectoryOfficialsInitialized();
    localStorage.setItem('LTO_CPAO_DIRECTORY_2026', JSON.stringify(AppState.directory));
}

function loadUsersStorage() {
    const saved = localStorage.getItem('LTO_CPAO_USERS_2026');
    if (saved) {
        try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) AppState.users = parsed; } catch(e){}
    }
}

async function saveUsersStorage() {
    localStorage.setItem('LTO_CPAO_USERS_2026', JSON.stringify(AppState.users));
    try {
        await fetchWithRetry(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "saveUsers", users: AppState.users })
        }, 2);
    } catch(e) {}
}

function populateDropdowns() {
    ensureCategoryGroupsInitialized();
    populateOfficialRoleRankDropdown(document.getElementById("offRoleRank")?.value || "Chief");
    const platFilters = document.getElementById('filterPlatform');
    const formPlat = document.getElementById('formPlatform');
    const userPortal = document.getElementById('formUserDefaultPortal');

    let curPlat = platFilters ? platFilters.value : "";
    let curFormPlat = formPlat ? formPlat.value : "";
    let curUserPortal = userPortal ? userPortal.value : "";

    if(platFilters) platFilters.innerHTML = '<option value="">All Platforms</option>';
    if(formPlat) formPlat.innerHTML = '';
    if(userPortal) userPortal.innerHTML = '<option value="">None / Any</option>';

    AppState.settings.platforms.forEach(p => {
        const name = typeof p === 'string' ? p : p.name;
        if(platFilters) platFilters.innerHTML += `<option value="${name}">${name}</option>`;
        if(formPlat) formPlat.innerHTML += `<option value="${name}">${name}</option>`;
        if(userPortal) userPortal.innerHTML += `<option value="${name}">${name}</option>`;
    });

    if(platFilters) platFilters.value = curPlat;
    if(formPlat && curFormPlat) formPlat.value = curFormPlat;
    if(userPortal && curUserPortal) userPortal.value = curUserPortal;

    const typeSel = document.getElementById('formTicketType');
    if(typeSel) {
        let cur = typeSel.value;
        typeSel.innerHTML = '';
        (AppState.settings.ticketTypes || []).forEach(t => { typeSel.innerHTML += `<option value="${t}">${t}</option>`; });
        if(cur) typeSel.value = cur;
    }

    const actSel = document.getElementById('formActionTaken');
    if(actSel) {
        let cur = actSel.value;
        actSel.innerHTML = '';
        (AppState.settings.actionsTaken || []).forEach(a => { actSel.innerHTML += `<option value="${a}">${a}</option>`; });
        if(cur) actSel.value = cur;
    }

    const statSel = document.getElementById('formStatus');
    const filterStat = document.getElementById('filterStatus');
    if(statSel) {
        let cur = statSel.value;
        statSel.innerHTML = '';
        (AppState.settings.statuses || []).forEach(s => { statSel.innerHTML += `<option value="${s}">${s}</option>`; });
        if(cur) {
            statSel.value = cur;
        } else if (Array.from(statSel.options).some(o => o.value.toLowerCase() === 'closed')) {
            statSel.value = Array.from(statSel.options).find(o => o.value.toLowerCase() === 'closed').value;
        }
    }
    if(filterStat) {
        let cur = filterStat.value;
        filterStat.innerHTML = '<option value="">All Statuses</option>';
        (AppState.settings.statuses || []).forEach(s => { filterStat.innerHTML += `<option value="${s}">${s}</option>`; });
        if(cur) filterStat.value = cur;
    }

    renderSettingsTables();
    renderModalCustomFields();
    renderTableHeadersAndColumns();
}

function filterCategoryDropdown(query) {
    ensureCategoryGroupsInitialized();
    const listEl = document.getElementById('categoryDropdownList');
    if (!listEl) return;
    const q = (query || "").toLowerCase().trim();

    let html = "";
    CATEGORY_GROUPS.forEach(grp => {
        const items = (AppState.settings.categoryGroups[grp] || []).filter(c =>
            !q || c.toLowerCase().includes(q) || grp.toLowerCase().includes(q)
        );
        if (items.length > 0) {
            html += `<div class="px-2 py-1 text-[10px] font-extrabold uppercase bg-slate-950 text-amber-400 border-b border-slate-800 sticky top-0">${escapeHtml(grp)}</div>`;
            html += items.map(c => `
                <div data-cat-value="${escapeHtml(c)}" class="cat-dropdown-item px-3 py-1.5 text-xs text-white hover:bg-slate-800 cursor-pointer font-semibold border-b border-slate-800/40">
                    ${escapeHtml(c)}
                </div>
            `).join('');
        }
    });

    if (!html) {
        listEl.innerHTML = `<div class="p-2 text-xs text-slate-400 italic">No matching category configured in Superadmin Settings.</div>`;
    } else {
        listEl.innerHTML = html;
    }
    listEl.classList.remove('hidden');
}

function showCategoryDropdown() {
    filterCategoryDropdown(document.getElementById('formCategorySearch')?.value || '');
}

function selectCategoryOption(val) {
    const searchEl = document.getElementById('formCategorySearch');
    if (searchEl) searchEl.value = val;
    const listEl = document.getElementById('categoryDropdownList');
    if (listEl) listEl.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    const catOptionEl = e.target.closest && e.target.closest('.cat-dropdown-item');
    if (catOptionEl) {
        selectCategoryOption(catOptionEl.getAttribute('data-cat-value') || '');
        return;
    }
    const catInput = document.getElementById('formCategorySearch');
    const catList = document.getElementById('categoryDropdownList');
    if (catInput && catList && !catInput.contains(e.target) && !catList.contains(e.target)) {
        catList.classList.add('hidden');
    }
});

/* ============================================================================
   REPORT SIGNATORY BLOCK OPTIONS (SUPERADMIN SETTINGS)
   ============================================================================ */

function ensureReportSignatoriesConfigured() {
    if (!Array.isArray(AppState.settings.reportSignatories) || AppState.settings.reportSignatories.length === 0) {
        const cfg = AppState.settings.reportConfig || {};
        AppState.settings.reportSignatories = [
            {
                id: "SIG_1",
                blockLabel: "Prepared By",
                name: String(currentUser.name || REPORT_SIGNATORIES[0].name).toUpperCase(),
                designation: REPORT_SIGNATORIES[0].designation
            },
            {
                id: "SIG_2",
                blockLabel: "Reviewed By",
                name: REPORT_SIGNATORIES[2].name,
                designation: REPORT_SIGNATORIES[2].designation
            },
            {
                id: "SIG_3",
                blockLabel: "Approved By",
                name: cfg.notedName || "MARY MAY M. JACOB",
                designation: cfg.notedDesig || "Head, LTO COMMS/CPAO"
            }
        ];
    }
    return AppState.settings.reportSignatories;
}

function renderReportSignatoriesTable() {
    const tbody = document.getElementById("tableReportSignatoriesBody");
    if (!tbody) return;
    const list = ensureReportSignatoriesConfigured();

    tbody.innerHTML = list.map((sig, idx) => `
        <tr class="hover:bg-slate-800/40 transition">
            <td><span class="chip-pill">${escapeHtml(sig.blockLabel || "Signatory")}</span></td>
            <td class="font-bold text-white uppercase">${escapeHtml(sig.name || "")}</td>
            <td class="text-sky-300">${escapeHtml(sig.designation || "")}</td>
            <td class="text-center space-x-1 whitespace-nowrap">
                <button type="button" onclick="moveReportSignatory(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold cursor-pointer">▲</button>
                <button type="button" onclick="moveReportSignatory(${idx}, 1)" ${idx === list.length - 1 ? "disabled" : ""} class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold cursor-pointer">▼</button>
            </td>
            <td class="text-center space-x-1 whitespace-nowrap">
                <button type="button" onclick="openSignatoryModal(${idx})" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer">✏️ Edit</button>
                <button type="button" onclick="deleteReportSignatory(${idx})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold cursor-pointer">🗑️</button>
            </td>
        </tr>
    `).join("");
}

function openSignatoryModal(index = null) {
    const modal = document.getElementById("signatoryModal");
    if (!modal) return;
    const list = ensureReportSignatoriesConfigured();

    if (index !== null && index !== undefined && list[index]) {
        const s = list[index];
        document.getElementById("editSignatoryIndex").value = String(index);
        document.getElementById("signatoryModalTitle").textContent = "Edit Report Signatory";
        document.getElementById("sigBlockLabelInput").value = s.blockLabel || "Approved By";
        document.getElementById("sigFullNameInput").value = s.name || "";
        document.getElementById("sigDesignationInput").value = s.designation || "";
    } else {
        document.getElementById("editSignatoryIndex").value = "";
        document.getElementById("signatoryModalTitle").textContent = "Add Report Signatory";
        document.getElementById("sigBlockLabelInput").value = "Noted By";
        document.getElementById("sigFullNameInput").value = "";
        document.getElementById("sigDesignationInput").value = "";
    }
    modal.style.display = "flex";
}

function closeSignatoryModal() {
    const modal = document.getElementById("signatoryModal");
    if (modal) modal.style.display = "none";
}

async function saveSignatoryForm(e) {
    e.preventDefault();
    const list = ensureReportSignatoriesConfigured();
    const idxStr = document.getElementById("editSignatoryIndex")?.value ?? "";
    const blockLabel = (document.getElementById("sigBlockLabelInput")?.value || "Signatory").trim();
    const name = (document.getElementById("sigFullNameInput")?.value || "").trim().toUpperCase();
    const designation = (document.getElementById("sigDesignationInput")?.value || "").trim();
    if (!name || !designation) return;

    const item = {
        id: idxStr !== "" && list[parseInt(idxStr, 10)] ? list[parseInt(idxStr, 10)].id : ("SIG_" + Date.now()),
        blockLabel,
        name,
        designation
    };

    if (idxStr !== "" && list[parseInt(idxStr, 10)]) {
        list[parseInt(idxStr, 10)] = item;
    } else {
        list.push(item);
    }

    syncApprovedByFromSignatories(list);
    persistLocalSettingsCache();
    renderReportSignatoriesTable();
    closeSignatoryModal();
    await saveAllSettingsToCloud(true);
    if (document.getElementById("viewReports")?.style.display !== "none") {
        generateReport();
    }
    showToast("Report signatory saved.");
}

async function moveReportSignatory(index, delta) {
    const list = ensureReportSignatoriesConfigured();
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    syncApprovedByFromSignatories(list);
    persistLocalSettingsCache();
    renderReportSignatoriesTable();
    await saveAllSettingsToCloud(true);
    if (document.getElementById("viewReports")?.style.display !== "none") {
        generateReport();
    }
}

async function deleteReportSignatory(index) {
    const list = ensureReportSignatoriesConfigured();
    if (list.length <= 1) {
        showSystemAlert("At Least One Signatory Required", "Keep at least one signatory in the report signatory block.", "⚠️");
        return;
    }
    showSystemConfirm("Remove Signatory", "Remove this signatory from the report signatory block?", async () => {
        list.splice(index, 1);
        syncApprovedByFromSignatories(list);
        persistLocalSettingsCache();
        renderReportSignatoriesTable();
        await saveAllSettingsToCloud(true);
        if (document.getElementById("viewReports")?.style.display !== "none") {
            generateReport();
        }
        showToast("Signatory removed.");
    });
}

function syncApprovedByFromSignatories(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    const lastSig = list[list.length - 1];
    if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
    AppState.settings.reportConfig.notedName = lastSig.name;
    AppState.settings.reportConfig.notedDesig = lastSig.designation;
}

function renderSettingsTables() {
    ensureCategoryGroupsInitialized();
    renderReportSignatoriesTable();

    const qPlat = (document.getElementById('searchSettingsPlatforms')?.value || '').toLowerCase().trim();
    const qCat = (document.getElementById('searchSettingsCategories')?.value || '').toLowerCase().trim();
    const qType = (document.getElementById('searchSettingsTicketTypes')?.value || '').toLowerCase().trim();
    const qAct = (document.getElementById('searchSettingsActionsTaken')?.value || '').toLowerCase().trim();

    const platBody = document.getElementById('tablePlatformsBody');
    if (platBody) {
        platBody.innerHTML = '';
        let platMatches = 0;
        AppState.settings.platforms.forEach((p, idx) => {
            const name = typeof p === 'string' ? p : p.name;
            const autoGen = typeof p === 'string' ? false : !!p.autoGen;
            const prefix = typeof p === 'string' ? 'CPAO' : (p.prefix || 'CPAO');
            if (qPlat && !String(name).toLowerCase().includes(qPlat) && !String(prefix).toLowerCase().includes(qPlat)) return;
            platMatches++;
            platBody.innerHTML += `
                <tr>
                    <td class="font-bold text-white">${escapeHtml(name)}</td>
                    <td class="font-mono text-amber-400">${escapeHtml(prefix)}</td>
                    <td class="text-center"><button type="button" onclick="togglePlatformAutoGen(${idx})" title="Click to toggle Auto-Generate Ticket Number" class="px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${autoGen ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}">${autoGen ? 'YES' : 'NO'}</button></td>
                    <td class="text-center space-x-1">
                        <button type="button" onclick="openSettingModal('platforms', ${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                        <button type="button" onclick="deleteSettingItem('platforms', ${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
                    </td>
                </tr>
            `;
        });
        if (platMatches === 0) {
            platBody.innerHTML = `<tr><td colspan="4" class="text-center text-slate-500 italic py-4">No matching platforms found.</td></tr>`;
        }
    }

    const catBody = document.getElementById('tableCategoriesBody');
    if (catBody) {
        catBody.innerHTML = '';
        let catGroupMatches = 0;
        CATEGORY_GROUPS.forEach((grp, gIdx) => {
            const allItems = AppState.settings.categoryGroups[grp] || [];
            const groupMatchesQuery = qCat && grp.toLowerCase().includes(qCat);
            const filteredEntries = allItems
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => !qCat || groupMatchesQuery || String(item).toLowerCase().includes(qCat));

            if (qCat && filteredEntries.length === 0 && !groupMatchesQuery) return;
            catGroupMatches++;

            catBody.innerHTML += `
                <tr class="bg-slate-950/90">
                    <td colspan="2" class="font-extrabold text-[10px] uppercase text-sky-400 tracking-wider py-2 px-2.5">${escapeHtml(grp)}</td>
                </tr>
            `;
            if (filteredEntries.length === 0) {
                catBody.innerHTML += `
                    <tr>
                        <td class="text-slate-500 italic text-[11px] pl-4">No categories under this group yet.</td>
                        <td class="text-center">
                            <button type="button" data-action="add-cat" data-group-idx="${gIdx}" class="cat-setting-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[10px] font-bold cursor-pointer">+ Add</button>
                        </td>
                    </tr>
                `;
            } else {
                filteredEntries.forEach(({ item, idx }) => {
                    catBody.innerHTML += `
                        <tr>
                            <td class="font-semibold text-white pl-4">${escapeHtml(item)}</td>
                            <td class="text-center space-x-1 whitespace-nowrap">
                                <button type="button" data-action="edit-cat" data-group-idx="${gIdx}" data-item-idx="${idx}" class="cat-setting-btn px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer">✏️ Edit</button>
                                <button type="button" data-action="del-cat" data-group-idx="${gIdx}" data-item-idx="${idx}" class="cat-setting-btn px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold cursor-pointer">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }
        });
        if (catGroupMatches === 0) {
            catBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 italic py-4">No matching concern categories found.</td></tr>`;
        }
    }

    const actBody = document.getElementById('tableActionsTakenBody');
    if (actBody) {
        actBody.innerHTML = '';
        let actMatches = 0;
        (AppState.settings.actionsTaken || []).forEach((item, idx) => {
            if (qAct && !String(item).toLowerCase().includes(qAct)) return;
            actMatches++;
            actBody.innerHTML += `
                <tr>
                    <td class="font-bold text-white">${escapeHtml(item)}</td>
                    <td class="text-center space-x-1 whitespace-nowrap">
                        <button type="button" onclick="openSettingModal('actionsTaken', ${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                        <button type="button" onclick="deleteSettingItem('actionsTaken', ${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
                    </td>
                </tr>
            `;
        });
        if (actMatches === 0) {
            actBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 italic py-4">No matching actions taken found.</td></tr>`;
        }
    }

    const ttBody = document.getElementById('tableTicketTypesBody');
    if (ttBody) {
        ttBody.innerHTML = '';
        let typeMatches = 0;
        AppState.settings.ticketTypes.forEach((item, idx) => {
            if (qType && !String(item).toLowerCase().includes(qType)) return;
            typeMatches++;
            ttBody.innerHTML += `
                <tr>
                    <td class="font-bold text-white">${escapeHtml(item)}</td>
                    <td class="text-center space-x-1">
                        <button type="button" onclick="openSettingModal('ticketTypes', ${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                        <button type="button" onclick="deleteSettingItem('ticketTypes', ${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
                    </td>
                </tr>
            `;
        });
        if (typeMatches === 0) {
            ttBody.innerHTML = `<tr><td colspan="2" class="text-center text-slate-500 italic py-4">No matching classifications found.</td></tr>`;
        }
    }
}

function togglePlatformAutoGen(idx) {
    const p = AppState.settings.platforms[idx];
    if (!p || typeof p === 'string') return;
    p.autoGen = !p.autoGen;
    persistLocalSettingsCache();
    renderSettingsTables();
    markSettingsDirty(true);
    saveAllSettingsToCloud(true);
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.cat-setting-btn');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const gIdx = parseInt(btn.getAttribute('data-group-idx'), 10);
    const grp = CATEGORY_GROUPS[gIdx];
    if (!grp) return;

    if (action === 'add-cat') {
        openSettingModal('categories', null, grp);
    } else if (action === 'edit-cat') {
        const itemIdx = parseInt(btn.getAttribute('data-item-idx'), 10);
        openSettingModal('categories', itemIdx, grp);
    } else if (action === 'del-cat') {
        const itemIdx = parseInt(btn.getAttribute('data-item-idx'), 10);
        deleteSettingItem('categories', itemIdx, grp);
    }
});

function openSettingModal(type, index, groupName = null) {
    ensureCategoryGroupsInitialized();
    const modal = document.getElementById('settingItemModal');
    if (!modal) return;
    document.getElementById('settingModalType').value = type;
    document.getElementById('settingModalIndex').value = index !== null && index !== undefined ? index : '';

    const container = document.getElementById('settingModalFieldsContainer');
    document.getElementById('settingModalTitle').textContent = index !== null ? `Edit ${type}` : `Add New ${type}`;

    if (type === 'platforms') {
        let pName = "", pPrefix = "", pAuto = true;
        if (index !== null && index !== undefined) {
            let p = AppState.settings.platforms[index];
            pName = typeof p === 'string' ? p : p.name;
            pPrefix = typeof p === 'string' ? 'CPAO' : (p.prefix || 'CPAO');
            pAuto = typeof p === 'string' ? false : !!p.autoGen;
        }
        container.innerHTML = `
            <div><label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Platform Name</label><input type="text" id="modalPlatformName" value="${escapeHtml(pName)}" required class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"></div>
            <div><label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Ticket Prefix</label><input type="text" id="modalPlatformPrefix" value="${escapeHtml(pPrefix)}" required class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-amber-400 font-mono"></div>
            <div><label class="flex items-center gap-2 text-xs font-bold text-sky-400"><input type="checkbox" id="modalPlatformAutoGen" ${pAuto ? 'checked' : ''}> Auto-Generate Ticket Number</label></div>
        `;
    } else if (type === 'categories') {
        const selectedGroup = groupName || CATEGORY_GROUPS[0];
        let val = "";
        if (index !== null && index !== undefined && AppState.settings.categoryGroups[selectedGroup]) {
            val = AppState.settings.categoryGroups[selectedGroup][index] || "";
        }
        const groupOptionsHtml = CATEGORY_GROUPS.map(g =>
            `<option value="${escapeHtml(g)}" ${g === selectedGroup ? 'selected' : ''}>${escapeHtml(g)}</option>`
        ).join('');

        container.innerHTML = `
            <input type="hidden" id="modalOriginalCategoryGroup" value="${escapeHtml(selectedGroup)}">
            <input type="hidden" id="modalOriginalCategoryName" value="${escapeHtml(val)}">
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Concern Category Group</label>
                <select id="modalCategoryGroup" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-amber-400 font-bold">
                    ${groupOptionsHtml}
                </select>
            </div>
            <div>
                <label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Concern Category Name</label>
                <input type="text" id="modalSettingValue" value="${escapeHtml(val)}" required placeholder="Enter concern category..." class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white">
            </div>
        `;
    } else {
        let val = "";
        if (index !== null && index !== undefined) val = AppState.settings[type][index] || "";
        container.innerHTML = `
            <div><label class="block text-slate-400 text-[10px] font-bold uppercase mb-1">Item Value / Name</label><input type="text" id="modalSettingValue" value="${escapeHtml(val)}" required class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"></div>
        `;
    }
    modal.style.display = 'flex';
}

function closeSettingModal() { document.getElementById('settingItemModal').style.display = 'none'; }

async function propagateCategoryRenameAcrossSystem(oldCategoryName, newCategoryName) {
    const oldClean = String(oldCategoryName || '').trim();
    const newClean = String(newCategoryName || '').trim();
    if (!oldClean || !newClean || oldClean === newClean) return 0;

    let updatedCount = 0;
    const oldLower = oldClean.toLowerCase();
    const modifiedTickets = [];

    AppState.tickets.forEach((t, idx) => {
        if (String(t.category || '').trim().toLowerCase() === oldLower) {
            t.category = newClean;
            updatedCount++;
            modifiedTickets.push({ ticket: t, idx });
        }
    });

    if (updatedCount > 0) {
        saveStorage();
        renderTable();
        updateKPIs();
        for (const item of modifiedTickets) {
            const targetRow = item.ticket.rowIndex || (item.idx + 2);
            enqueuePendingTicketSync(item.ticket, true, targetRow);
        }
        flushPendingSyncQueue(true);
    }

    const repCatSel = document.getElementById('repFilterCategory');
    if (repCatSel) {
        populateReportFilterDropdowns();
        if (document.getElementById('viewReports')?.style.display !== 'none') {
            generateReport();
        }
    }

    return updatedCount;
}

async function saveSettingItemForm(e) {
    e.preventDefault();
    ensureCategoryGroupsInitialized();
    const type = document.getElementById('settingModalType').value;
    const indexStr = document.getElementById('settingModalIndex').value;
    const index = indexStr !== '' ? parseInt(indexStr, 10) : null;

    if (type === 'platforms') {
        const name = document.getElementById('modalPlatformName').value.trim();
        const prefix = document.getElementById('modalPlatformPrefix').value.trim();
        const autoGen = document.getElementById('modalPlatformAutoGen').checked;
        const obj = { name, prefix, autoGen };
        if (index !== null) AppState.settings.platforms[index] = obj;
        else AppState.settings.platforms.push(obj);
    } else if (type === 'categories') {
        const chosenGroup = document.getElementById('modalCategoryGroup').value;
        const originalGroup = document.getElementById('modalOriginalCategoryGroup')?.value || chosenGroup;
        const originalName = document.getElementById('modalOriginalCategoryName')?.value || "";
        const val = document.getElementById('modalSettingValue').value.trim();
        if (!val) return;
        if (!AppState.settings.categoryGroups[chosenGroup]) AppState.settings.categoryGroups[chosenGroup] = [];

        if (index !== null && AppState.settings.categoryGroups[originalGroup]?.[index] !== undefined) {
            if (originalGroup === chosenGroup) {
                AppState.settings.categoryGroups[chosenGroup][index] = val;
            } else {
                AppState.settings.categoryGroups[originalGroup].splice(index, 1);
                const existsInNew = AppState.settings.categoryGroups[chosenGroup].some(c => c.toLowerCase() === val.toLowerCase());
                if (!existsInNew) AppState.settings.categoryGroups[chosenGroup].push(val);
            }
            syncFlatCategoriesFromGroups();
            if (originalName && originalName !== val) {
                const updatedLogsCount = await propagateCategoryRenameAcrossSystem(originalName, val);
                if (updatedLogsCount > 0) {
                    showToast(`Category renamed & updated across ${updatedLogsCount} existing log(s).`);
                }
            }
        } else {
            const exists = AppState.settings.categoryGroups[chosenGroup].some(c => c.toLowerCase() === val.toLowerCase());
            if (!exists) AppState.settings.categoryGroups[chosenGroup].push(val);
            syncFlatCategoriesFromGroups();
        }
    } else {
        const val = document.getElementById('modalSettingValue').value.trim();
        if (index !== null) AppState.settings[type][index] = val;
        else AppState.settings[type].push(val);
    }

    persistLocalSettingsCache();
    renderSettingsTables();
    populateDropdowns();
    populateReportFilterDropdowns();
    if (document.getElementById('viewReports')?.style.display !== 'none') {
        generateReport();
    }
    closeSettingModal();
    setSettingsFeedbackBanner("Syncing updated setting to Google Sheets...", "saving");
    const synced = await saveAllSettingsToCloud(true);
    if (synced) {
        lastSettingsSavedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setSettingsFeedbackBanner("Setting saved and synced to Google Sheets.", "success");
        showToast("Setting saved & synced to Google Sheets.");
    } else {
        setSettingsFeedbackBanner("Setting saved locally — queued for Google Sheets sync.", "dirty");
        showToast("Setting saved locally (queued for sync).");
    }
}

function deleteSettingItem(type, index, groupName = null) {
    ensureCategoryGroupsInitialized();
    showSystemConfirm("Delete Item", "Are you sure you want to delete this item?", () => {
        if (type === 'categories' && groupName && AppState.settings.categoryGroups[groupName]) {
            AppState.settings.categoryGroups[groupName].splice(index, 1);
            syncFlatCategoriesFromGroups();
        } else {
            AppState.settings[type].splice(index, 1);
        }
        persistLocalSettingsCache();
        renderSettingsTables();
        populateDropdowns();
        populateReportFilterDropdowns();
        if (document.getElementById('viewReports')?.style.display !== 'none') {
            generateReport();
        }
        showToast("Item deleted successfully.");
        saveAllSettingsToCloud(true);
    });
}

function renderModalCustomFields() {
    const container = document.getElementById('modalCustomFieldsContainer');
    if(!container) return;
    container.innerHTML = '';
    if(!AppState.settings.customFields || AppState.settings.customFields.length === 0) return;
    AppState.settings.customFields.forEach(cf => {
        container.innerHTML += `<div><label class="block text-slate-400 font-bold mb-1 uppercase text-[10px]">${escapeHtml(cf.label)}</label><input type="text" id="customField_${cf.id}" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"></div>`;
    });
}

function renderTableHeadersAndColumns() {
    const headerRow = document.getElementById('tableHeaderRow');
    if(!headerRow) return;
    headerRow.innerHTML = `
        <th class="text-center">#</th><th class="text-center">ACTIONS</th><th>ADMIN NO.</th><th>PLATFORM</th>
        <th>REFERRAL / TICKET NO.</th><th>DATE RECEIVED</th><th>CATEGORY</th><th>TYPE OF TICKET</th>
        <th>NAME OF COMPLAINANT</th><th>DETAILS OF TICKET</th><th>DETAILS OF RESPONSE</th><th>ACTION TAKEN</th>
        <th class="text-center">STATUS</th><th>REMARKS</th>
    `;
}

function selectDirectoryRegionForDetails(idx) {
    if (idx < 0 || idx >= AppState.directory.length) {
        selectedDirectoryIndex = 0;
    } else {
        selectedDirectoryIndex = idx;
    }
    renderDirectoryTable();
}

function renderDirectoryTable() {
    ensureDirectoryOfficialsInitialized();
    const tbody = document.getElementById('directoryTableBody');
    const detailBody = document.getElementById('directoryDetailTableBody');
    const detailTitle = document.getElementById('selectedRegionDetailsTitle');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!AppState.directory || AppState.directory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-slate-400 text-xs">No LTO directory entries found. Click <strong>+ Add Region / Office</strong> above.</td></tr>`;
        if (detailBody) {
            detailBody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-500 text-xs">No region record selected.</td></tr>`;
        }
        return;
    }

    if (selectedDirectoryIndex < 0 || selectedDirectoryIndex >= AppState.directory.length) {
        selectedDirectoryIndex = 0;
    }

    AppState.directory.forEach((d, idx) => {
        const isSelected = idx === selectedDirectoryIndex;
        const offCount = (d.officials || []).length;
        const tr = document.createElement('tr');
        tr.className = isSelected ? 'bg-sky-950/35 transition' : 'hover:bg-slate-800/40 transition';
        tr.innerHTML = `
            <td class="font-bold text-white cursor-pointer" onclick="selectDirectoryRegionForDetails(${idx})">
                <div class="flex items-center gap-2">
                    <span>${escapeHtml(d.office)}</span>
                    ${isSelected ? '<span class="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-extrabold uppercase">Viewing</span>' : ''}
                </div>
            </td>
            <td class="font-mono font-bold text-amber-400 cursor-pointer" onclick="selectDirectoryRegionForDetails(${idx})">${escapeHtml(d.code || 'RO')}</td>
            <td class="text-slate-200 cursor-pointer" onclick="selectDirectoryRegionForDetails(${idx})">
                <span>${escapeHtml(d.chief)}</span>
                <span class="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 text-[9px] font-bold">${offCount} Official${offCount === 1 ? '' : 's'}</span>
            </td>
            <td class="text-center space-x-1 whitespace-nowrap">
                <button type="button" onclick="editDirectoryRegionRow(${idx})" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold shadow transition">✏️ Edit</button>
                <button type="button" onclick="deleteDirectoryItem(${idx})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold transition">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (detailBody) {
        const activeRegion = AppState.directory[selectedDirectoryIndex];
        if (detailTitle && activeRegion) {
            detailTitle.textContent = `Selected Region Directory Details — ${activeRegion.office} (${activeRegion.code})`;
        }
        detailBody.innerHTML = activeRegion ? `
            <tr class="bg-slate-950/50">
                <td class="font-mono font-bold text-amber-400 whitespace-nowrap">${escapeHtml(activeRegion.code || 'RO')}</td>
                <td class="font-bold text-white">${escapeHtml(activeRegion.office)}</td>
                <td class="text-slate-100">${escapeHtml(activeRegion.chief)}</td>
                <td><span class="text-sky-400 font-semibold">${escapeHtml(activeRegion.position)}</span></td>
                <td class="text-slate-300">${escapeHtml(activeRegion.address)}</td>
                <td class="font-mono text-slate-300 whitespace-nowrap">${escapeHtml(activeRegion.number || '—')}</td>
                <td class="font-mono text-amber-400 whitespace-nowrap">${escapeHtml(activeRegion.email || '—')}</td>
                <td class="text-center space-x-1 whitespace-nowrap">
                    <button type="button" onclick="editDirectoryRegionRow(${selectedDirectoryIndex})" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold">✏️ Edit Officials</button>
                    <button type="button" onclick="deleteDirectoryItem(${selectedDirectoryIndex})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold">🗑️ Delete</button>
                </td>
            </tr>
        ` : '';
    }
}

function editDirectoryRegionRow(index) {
    selectedDirectoryIndex = index;
    activeOfficialsRegionIndex = index;
    renderDirectoryTable();
    openRegionOfficialsPage(index);
}

function openRegionOfficialsPage(regionIdx) {
    ensureDirectoryOfficialsInitialized();
    if (regionIdx < 0 || regionIdx >= AppState.directory.length) return;
    activeOfficialsRegionIndex = regionIdx;
    selectedDirectoryIndex = regionIdx;

    const viewsToHide = ['viewLogs', 'viewAccomplishment', 'viewReports', 'viewWorkflow', 'viewClipboard', 'viewWorkday', 'viewDirectory', 'viewTemplate', 'viewUsers', 'viewSettings'];
    viewsToHide.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const offView = document.getElementById('viewDirectoryOfficials');
    if (offView) offView.style.display = 'flex';

    renderRegionOfficialsTable();
}

function backToDirectoryFromOfficials() {
    const offView = document.getElementById('viewDirectoryOfficials');
    if (offView) offView.style.display = 'none';
    switchMainTab('directory');
}

function renderRegionOfficialsTable() {
    ensureDirectoryOfficialsInitialized();
    const region = AppState.directory[activeOfficialsRegionIndex];
    const titleEl = document.getElementById('regionOfficialsPageTitle');
    const subEl = document.getElementById('regionOfficialsPageSubtitle');
    const tbody = document.getElementById('regionOfficialsTableBody');
    if (!region || !tbody) return;

    if (titleEl) {
        titleEl.textContent = `👔 ${region.office} (${region.code}) — Regional Director, Asst. RD & Chiefs`;
    }
    if (subEl) {
        subEl.textContent = `${region.address || ''} • ${region.email || ''}`;
    }

    const list = region.officials || [];
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No officials listed for this region yet. Click <strong>+ Add Official</strong> above.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((off, idx) => `
        <tr class="hover:bg-slate-800/40 transition">
            <td><span class="chip-pill">${escapeHtml(off.roleRank || 'Chief')}</span></td>
            <td class="font-bold text-white">${escapeHtml(off.name || '')}</td>
            <td class="text-sky-400 font-semibold">${escapeHtml(off.position || '')}</td>
            <td class="text-slate-300">${escapeHtml(off.division || region.office || '')}</td>
            <td class="font-mono text-amber-400">${escapeHtml(off.email || region.email || '—')}</td>
            <td class="font-mono text-slate-300">${escapeHtml(off.number || region.number || '—')}</td>
            <td class="text-center space-x-1 whitespace-nowrap">
                <button type="button" onclick="openOfficialModal(${idx})" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold">✏️ Edit</button>
                <button type="button" onclick="deleteOfficialItem(${idx})" class="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold">🗑️ Delete</button>
            </td>
        </tr>
    `).join('');
}

function openOfficialModal(offIdx = null) {
    ensureDirectoryOfficialsInitialized();
    const modal = document.getElementById('officialModal');
    if (!modal) return;
    const region = AppState.directory[activeOfficialsRegionIndex];
    const list = region?.officials || [];

    if (offIdx !== null && offIdx !== undefined && list[offIdx]) {
        const off = list[offIdx];
        document.getElementById('editOfficialIndex').value = offIdx;
        document.getElementById('officialModalTitle').textContent = `Edit Official (${region.code})`;
        populateOfficialRoleRankDropdown(off.roleRank || 'Chief');
        document.getElementById('offChiefName').value = off.name || '';
        document.getElementById('offPosition').value = off.position || '';
        document.getElementById('offDivision').value = off.division || region.office || '';
        document.getElementById('offNumber').value = off.number || region.number || '';
        document.getElementById('offEmail').value = off.email || region.email || '';
    } else {
        document.getElementById('editOfficialIndex').value = '';
        document.getElementById('officialModalTitle').textContent = `Add Official (${region?.code || 'RO'})`;
        populateOfficialRoleRankDropdown('Chief');
        document.getElementById('offChiefName').value = '';
        document.getElementById('offPosition').value = 'Division Chief';
        document.getElementById('offDivision').value = region?.office || '';
        document.getElementById('offNumber').value = region?.number || '';
        document.getElementById('offEmail').value = region?.email || '';
    }
    modal.style.display = 'flex';
}

function closeOfficialModal() {
    const modal = document.getElementById('officialModal');
    if (modal) modal.style.display = 'none';
}

function saveOfficialForm(e) {
    e.preventDefault();
    ensureDirectoryOfficialsInitialized();
    const region = AppState.directory[activeOfficialsRegionIndex];
    if (!region) return;

    const item = {
        roleRank: document.getElementById('offRoleRank').value,
        name: document.getElementById('offChiefName').value.trim(),
        position: document.getElementById('offPosition').value.trim(),
        division: document.getElementById('offDivision').value.trim(),
        number: document.getElementById('offNumber').value.trim(),
        email: document.getElementById('offEmail').value.trim()
    };

    const editIdx = document.getElementById('editOfficialIndex').value;
    if (editIdx !== '') {
        region.officials[parseInt(editIdx, 10)] = item;
    } else {
        region.officials.push(item);
    }

    if (item.roleRank === 'Regional Director' || !region.chief) {
        region.chief = item.name;
        region.position = item.position || 'Regional Director';
        if (item.email) region.email = item.email;
    }

    saveDirectoryStorage();
    renderRegionOfficialsTable();
    renderDirectoryTable();
    closeOfficialModal();
    showToast("Regional official saved successfully.");
}

function deleteOfficialItem(offIdx) {
    ensureDirectoryOfficialsInitialized();
    const region = AppState.directory[activeOfficialsRegionIndex];
    if (!region) return;
    showSystemConfirm("Delete Official", "Remove this official from the region directory?", () => {
        region.officials.splice(offIdx, 1);
        saveDirectoryStorage();
        renderRegionOfficialsTable();
        renderDirectoryTable();
        showToast("Official removed.");
    });
}

function openDirectoryModal(index = null) {
    if (!isAdminTL() && !isSuperAdmin()) return;
    const modal = document.getElementById('directoryModal');
    if (!modal) return;

    if (index !== null && index !== undefined && AppState.directory[index]) {
        const d = AppState.directory[index];
        document.getElementById('editDirectoryIndex').value = index;
        document.getElementById('directoryModalTitle').textContent = `Edit Directory (${d.office})`;
        document.getElementById('dirAgencyCode').value = d.code || '';
        document.getElementById('dirOfficeName').value = d.office || '';
        document.getElementById('dirChiefName').value = d.chief || '';
        document.getElementById('dirPosition').value = d.position || 'Regional Director';
        document.getElementById('dirAddress').value = d.address || '';
        document.getElementById('dirNumber').value = d.number || '';
        document.getElementById('dirEmail').value = d.email || '';
    } else {
        document.getElementById('editDirectoryIndex').value = '';
        document.getElementById('directoryModalTitle').textContent = `Add LTO Directory Office`;
        document.getElementById('dirAgencyCode').value = 'RO';
        document.getElementById('dirOfficeName').value = '';
        document.getElementById('dirChiefName').value = '';
        document.getElementById('dirPosition').value = 'Regional Director';
        document.getElementById('dirAddress').value = '';
        document.getElementById('dirNumber').value = '';
        document.getElementById('dirEmail').value = '';
    }
    modal.style.display = 'flex';
}

function closeDirectoryModal() { document.getElementById('directoryModal').style.display = 'none'; }

function saveDirectoryForm(e) {
    e.preventDefault();
    const code = document.getElementById('dirAgencyCode').value.trim();
    const office = document.getElementById('dirOfficeName').value.trim();
    const chief = document.getElementById('dirChiefName').value.trim();
    const position = document.getElementById('dirPosition').value.trim();
    const address = document.getElementById('dirAddress').value.trim();
    const number = document.getElementById('dirNumber').value.trim();
    const email = document.getElementById('dirEmail').value.trim();

    const editIdx = document.getElementById('editDirectoryIndex').value;
    const existingOfficials = editIdx !== '' && AppState.directory[parseInt(editIdx, 10)]
        ? (AppState.directory[parseInt(editIdx, 10)].officials || [])
        : [];
    const dirData = { code, office, chief, position, address, number, email, officials: existingOfficials };

    if (editIdx !== '') {
        const parsedIdx = parseInt(editIdx, 10);
        AppState.directory[parsedIdx] = dirData;
        selectedDirectoryIndex = parsedIdx;
        activeOfficialsRegionIndex = parsedIdx;
    } else {
        AppState.directory.push(dirData);
        selectedDirectoryIndex = AppState.directory.length - 1;
        activeOfficialsRegionIndex = selectedDirectoryIndex;
    }

    saveDirectoryStorage();
    renderDirectoryTable();
    renderRegionOfficialsTable();
    closeDirectoryModal();
    showToast("LTO Directory saved successfully.");
}

function deleteDirectoryItem(idx) {
    showSystemConfirm("Delete Directory", "Are you sure you want to delete this entry?", () => {
        AppState.directory.splice(idx, 1);
        if (selectedDirectoryIndex >= AppState.directory.length) {
            selectedDirectoryIndex = Math.max(0, AppState.directory.length - 1);
        }
        saveDirectoryStorage();
        renderDirectoryTable();
        showToast("Directory entry deleted successfully.");
    });
}

function renderTemplateEditorUI() {
    getEndorsementFormConfig();
    populateEndorsementFormInputs();
    updateTemplateLivePreview();
}

function updateTemplateLivePreview() {
    const preview = document.getElementById('templateLivePreview');
    if (!preview) return;

    const sampleData = {
        todayDate: formatDayMonthYear(new Date()),
        dateReceivedFormatted: formatDayMonthYear(new Date()),
        chiefName: 'ELMER J. DECENA',
        chiefLastName: 'Decena',
        chiefPosition: 'Regional Director',
        agencyName: 'Land Transportation Office – IV-A',
        officeName: 'Regional Office 4-A',
        officeAddress: 'Lipa City, Batangas',
        emailAddress: 'dmsacltocalabarzon@gmail.com',
        rdmpaoEmail: 'dmsacltocalabarzon@gmail.com',
        complainantName: 'Mr. Arn Molenilla Mangalindan',
        complainantEmail: 'arnmangalindan@gmail.com',
        platform: 'Facebook Messenger',
        ticketSubjectTerm: 'complaint',
        forwardedClause: ' and subsequently forwarded to “Isumbong mo kay Chief” (ltoco.feedback@gmail.com)',
        briefDescription: 'against a motor vehicle with license plate number <strong>CDA4810</strong> and body number <strong>MB507</strong>, recklessly driven along E. Rodriguez Ave., Antipolo, Rizal',
        dueDate: addWorkingDays(getTodayMMDDYYYY(), 20),
        ticketRefNo: 'CPAO-11122026-36-44',
        includeShowCause: true,
        signatureBlock: '<div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div><p class="font-extrabold uppercase text-xs text-slate-900">MARY MAY M. JACOB</p><p class="text-slate-800 text-xs">Head, LTO Strategic Communications</p><p class="text-slate-700 text-xs">Central – Public Assistance Office</p>',
        attachmentHtml: ''
    };

    preview.innerHTML = renderStandardEndorsementLetterHtml(sampleData);
}

function saveEndorsementTemplate() {
    syncFormTemplateFields();
    saveAllSettingsToCloud();
    showToast("Formal endorsement template saved successfully.");
}

function resetDefaultEndorsementTemplate() {
    showSystemConfirm("Reset Template", "Are you sure you want to reset the endorsement template to default?", () => {
        AppState.settings.endorsementForm = { ...STANDARD_ENDORSEMENT_TEMPLATE_FIELDS };
        populateEndorsementFormInputs();
        updateTemplateLivePreview();
        saveAllSettingsToCloud();
        showToast("Template reset to default successfully.");
    });
}

function renderUsersTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!AppState.users || AppState.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">No user accounts found. Click <strong>+ Add New User</strong> above.</td></tr>`;
        return;
    }

    AppState.users.forEach((u, idx) => {
        const tr = document.createElement('tr');
        const roleColor = u.role === 'Super Admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        const colorBadge = u.logColor && u.logColor !== 'Default' ? `<span class="inline-block w-4 h-4 rounded-full border border-slate-600 align-middle" style="background:${u.logColor}"></span> ${u.logColor}` : 'Default';

        let privs = [];
        if(u.canReports) privs.push('Reports');
        if(u.canDeleteLogs) privs.push('Delete');
        if(u.canManageUsers) privs.push('Users');
        if(u.canAccessSettings) privs.push('Settings');
        const privsStr = privs.length > 0 ? privs.join(', ') : 'Standard Admin';

        tr.innerHTML = `
            <td class="font-bold text-white">${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.name || u.username)}</td>
            <td><span class="px-2 py-0.5 rounded text-[10px] font-extrabold border ${roleColor}">${escapeHtml(u.role || 'Admin')}</span></td>
            <td><span class="font-mono text-sky-400">${escapeHtml(u.defaultPortal || 'Any')}</span></td>
            <td class="text-[11px] text-slate-300">${escapeHtml(privsStr)}</td>
            <td>${colorBadge}</td>
            <td class="font-mono text-slate-400">••••••••</td>
            <td class="text-center space-x-1">
                <button type="button" onclick="openUserModal(${idx})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">✏️ Edit</button>
                <button type="button" onclick="deleteUserAccount(${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openUserModal(index = null) {
    if (!canUserManageUsers()) return;
    const modal = document.getElementById('userModal');
    if (!modal) return;

    const userPortal = document.getElementById('formUserDefaultPortal');
    if (userPortal && userPortal.options.length <= 1) populateDropdowns();

    if (index !== null && index !== undefined && AppState.users[index]) {
        const u = AppState.users[index];
        document.getElementById('editUserIndex').value = index;
        document.getElementById('userModalTitle').textContent = `Edit User Account (${u.username})`;
        document.getElementById('formUsername').value = u.username || '';
        document.getElementById('formUsername').readOnly = true;
        document.getElementById('formFullName').value = u.name || '';
        document.getElementById('formUserRole').value = u.role || 'Admin';
        document.getElementById('formUserPass').value = u.pass || '';
        document.getElementById('formUserDefaultPortal').value = u.defaultPortal || '';
        document.getElementById('formUserPortalStart').value = u.portalStartTime || '';
        document.getElementById('formUserPortalEnd').value = u.portalEndTime || '';
        document.getElementById('formCanReports').checked = !!u.canReports;
        document.getElementById('formCanDeleteLogs').checked = !!u.canDeleteLogs;
        document.getElementById('formCanManageUsers').checked = !!u.canManageUsers;
        document.getElementById('formCanAccessSettings').checked = !!u.canAccessSettings;

        const hasColor = u.logColor && u.logColor !== 'Default';
        document.getElementById('formEnableCustomColor').checked = hasColor;
        toggleColorPicker(hasColor);
        document.getElementById('formUserLogColor').value = hasColor ? u.logColor : '#9a4e2a';
    } else {
        document.getElementById('editUserIndex').value = '';
        document.getElementById('userModalTitle').textContent = `Create New User Account`;
        document.getElementById('formUsername').value = '';
        document.getElementById('formUsername').readOnly = false;
        document.getElementById('formFullName').value = '';
        document.getElementById('formUserRole').value = 'Admin';
        document.getElementById('formUserPass').value = 'password123';
        document.getElementById('formUserDefaultPortal').value = '';
        document.getElementById('formUserPortalStart').value = '';
        document.getElementById('formUserPortalEnd').value = '';
        document.getElementById('formCanReports').checked = false;
        document.getElementById('formCanDeleteLogs').checked = false;
        document.getElementById('formCanManageUsers').checked = false;
        document.getElementById('formCanAccessSettings').checked = false;
        document.getElementById('formEnableCustomColor').checked = false;
        toggleColorPicker(false);
        document.getElementById('formUserLogColor').value = '#9a4e2a';
    }
    modal.style.display = 'flex';
}

function closeUserModal() { document.getElementById('userModal').style.display = 'none'; }

function toggleColorPicker(enable) {
    const cp = document.getElementById('formUserLogColor');
    if (cp) { cp.disabled = !enable; cp.style.opacity = enable ? '1' : '0.5'; }
}

async function saveUserForm(e) {
    e.preventDefault();
    const username = document.getElementById('formUsername').value.trim();
    const name = document.getElementById('formFullName').value.trim();
    const role = document.getElementById('formUserRole').value;
    const pass = document.getElementById('formUserPass').value.trim();
    const defaultPortal = document.getElementById('formUserDefaultPortal').value;
    const portalStartTime = document.getElementById('formUserPortalStart').value;
    const portalEndTime = document.getElementById('formUserPortalEnd').value;
    const canReports = document.getElementById('formCanReports').checked;
    const canDeleteLogs = document.getElementById('formCanDeleteLogs').checked;
    const canManageUsers = document.getElementById('formCanManageUsers').checked;
    const canAccessSettings = document.getElementById('formCanAccessSettings').checked;
    const useCustomColor = document.getElementById('formEnableCustomColor').checked;
    const logColor = useCustomColor ? document.getElementById('formUserLogColor').value : 'Default';

    if (!username) {
        showSystemAlert("Validation Error", "Username is required.", "⚠️");
        return;
    }

    const editIdxStr = document.getElementById('editUserIndex').value;
    const editIdx = editIdxStr !== '' ? parseInt(editIdxStr, 10) : -1;
    const userData = { username, name, role, pass, defaultPortal, portalStartTime, portalEndTime, canReports, canDeleteLogs, canManageUsers, canAccessSettings, logColor };

    if (editIdx >= 0 && AppState.users[editIdx]) {
        AppState.users[editIdx] = userData;
    } else {
        const duplicateIdx = AppState.users.findIndex(
            u => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
        );
        if (duplicateIdx !== -1) {
            showSystemAlert("Error", `Username "${username}" already exists.`, "❌");
            return;
        }
        AppState.users.push(userData);
    }

    await saveUsersStorage();
    renderUsersTable();
    closeUserModal();
    showToast("User account saved successfully.");
}

async function deleteUserAccount(idx) {
    const target = AppState.users[idx];
    if (target.username.toLowerCase() === currentUser.username.toLowerCase()) {
        showSystemAlert("Action Restricted", "You cannot delete your own active account while logged in.", "⚠️");
        return;
    }
    showSystemConfirm("Delete User", `Are you sure you want to delete user @${target.username}?`, async () => {
        AppState.users.splice(idx, 1);
        await saveUsersStorage();
        renderUsersTable();
        showToast("User account deleted successfully.");
    });
}

function switchMainTab(tabName) {
    if (tabName === 'reports' && !canUserGenerateReports()) { showSystemAlert("Access Denied", "You do not have permission to access the Reports Generator.", "🔒"); return; }
    if (tabName === 'clipboard' && !isResponderClipboardEnabled()) { showSystemAlert("Disabled Feature", "Responder Clipboard is currently turned OFF by the Superadmin.", "🔒"); return; }
    if (tabName === 'directory' && !isAdminTL() && !isSuperAdmin()) { showSystemAlert("Access Denied", "You do not have permission to access the LTO Directory.", "🔒"); return; }
    if (tabName === 'template' && !isAdminTL() && !isSuperAdmin()) { showSystemAlert("Access Denied", "You do not have permission to access the Endorsement Template Builder.", "🔒"); return; }
    if (tabName === 'users' && !canUserManageUsers()) { showSystemAlert("Access Denied", "You do not have permission to manage User Accounts.", "🔒"); return; }
    if (tabName === 'settings' && !canUserAccessSettings()) { showSystemAlert("Access Denied", "You do not have permission to access Superadmin Settings.", "🔒"); return; }

    const offPage = document.getElementById('viewDirectoryOfficials');
    if (offPage) offPage.style.display = 'none';

    ['logs', 'accomplishment', 'reports', 'workflow', 'clipboard', 'workday', 'directory', 'template', 'users', 'settings'].forEach(t => {
        const view = document.getElementById('view' + t.charAt(0).toUpperCase() + t.slice(1));
        const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
        if (t === tabName) {
            if(view) view.style.display = 'flex';
            if(btn) { btn.classList.add('text-sky-400', 'border-sky-400'); btn.classList.remove('text-slate-400', 'border-transparent'); }
            if(t === 'directory') renderDirectoryTable();
            if(t === 'template') renderTemplateEditorUI();
            if(t === 'users') renderUsersTable();
            if(t === 'settings') { populateEnhancedSettingsUI(); selectSettingsSection(activeSettingsSection); }
            if(t === 'reports') { loadReportConfigToUI(); populateReportFilterDropdowns(); if (!document.getElementById('repStartDate').value || !document.getElementById('repEndDate').value) setReportPreset('weekly'); else generateReport(); }
            if(t === 'accomplishment') { initAccomplishmentTab(); }
            if(t === 'workday') { renderCalcCalendar(); renderSavedOffDatesSummary(); }
        } else {
            if(view) view.style.display = 'none';
            if(btn) { btn.classList.remove('text-sky-400', 'border-sky-400'); btn.classList.add('text-slate-400', 'border-transparent'); }
        }
    });
}

function renderReportLogoPreviews() {
    const c = AppState.settings.reportConfig || {};
    [1, 2, 3].forEach(num => {
        const prevEl = document.getElementById(`logo${num}Preview`);
        if (!prevEl) return;
        const url = c[`logo${num}Url`] || "";
        if (url) {
            prevEl.innerHTML = `
                <img src="${url}" class="h-10 w-auto object-contain bg-white p-1 rounded border border-slate-700" />
                <button type="button" onclick="removeReportLogo(${num})" class="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">✕ Remove</button>
            `;
        } else {
            prevEl.innerHTML = `<span class="text-[10px] text-slate-500 italic">No logo uploaded</span>`;
        }
    });
}

function handleLogoUpload(event, logoNum) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxH = 140;
            const scale = img.height > maxH ? (maxH / img.height) : 1;
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png', 0.9);
            if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
            AppState.settings.reportConfig[`logo${logoNum}Url`] = dataUrl;
            persistLocalSettingsCache();
            renderReportLogoPreviews();
            showToast(`Logo ${logoNum} loaded.`);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeReportLogo(logoNum) {
    if (!AppState.settings.reportConfig) AppState.settings.reportConfig = {};
    AppState.settings.reportConfig[`logo${logoNum}Url`] = "";
    const fileInput = document.getElementById(`cfgLogo${logoNum}File`);
    if (fileInput) fileInput.value = "";
    persistLocalSettingsCache();
    renderReportLogoPreviews();
    showToast(`Logo ${logoNum} removed.`);
}

function loadReportConfigToUI() {
    const c = AppState.settings.reportConfig || {};
    if(document.getElementById('cfgRepRepublic')) document.getElementById('cfgRepRepublic').value = c.republic || 'Republic of the Philippines';
    if(document.getElementById('cfgRepDept')) document.getElementById('cfgRepDept').value = c.department || 'Department of Transportation';
    if(document.getElementById('cfgRepAgency')) document.getElementById('cfgRepAgency').value = c.agency || 'LAND TRANSPORTATION OFFICE';
    if(document.getElementById('cfgRepOffice')) document.getElementById('cfgRepOffice').value = c.office || 'Central Public Assistance Office (CPAO)';
    if(document.getElementById('cfgLogoAlignment')) document.getElementById('cfgLogoAlignment').value = c.logoAlignment || 'left';
    if(document.getElementById('cfgHeaderTextAlign')) document.getElementById('cfgHeaderTextAlign').value = c.headerTextAlign || 'center';
    if(document.getElementById('cfgHeaderSpacing')) document.getElementById('cfgHeaderSpacing').value = c.headerSpacing || 'standard';
    if(document.getElementById('cfgNotedName')) document.getElementById('cfgNotedName').value = c.notedName || 'MARY MAY M. JACOB';
    if(document.getElementById('cfgNotedDesig')) document.getElementById('cfgNotedDesig').value = c.notedDesig || 'Head, LTO COMMS/CPAO';
    renderReportLogoPreviews();
}

function saveReportConfig() {
    const prevCfg = AppState.settings.reportConfig || {};
    AppState.settings.reportConfig = {
        ...prevCfg,
        republic: document.getElementById('cfgRepRepublic').value.trim(),
        department: document.getElementById('cfgRepDept').value.trim(),
        agency: document.getElementById('cfgRepAgency').value.trim(),
        office: document.getElementById('cfgRepOffice').value.trim(),
        logo1Url: prevCfg.logo1Url || "",
        logo2Url: prevCfg.logo2Url || "",
        logo3Url: prevCfg.logo3Url || "",
        logoAlignment: document.getElementById('cfgLogoAlignment').value,
        headerTextAlign: document.getElementById('cfgHeaderTextAlign').value,
        headerSpacing: document.getElementById('cfgHeaderSpacing').value,
        notedName: document.getElementById('cfgNotedName').value.trim(),
        notedDesig: document.getElementById('cfgNotedDesig').value.trim()
    };
    persistLocalSettingsCache();
    saveAllSettingsToCloud(true);
    closeReportConfigModal();
    generateReport();
    if (document.getElementById('viewAccomplishment')?.style.display !== 'none') {
        generateAccomplishmentReport();
    }
    showToast("Header configuration and logos saved!");
}

function setReportPreset(preset) {
    const now = new Date();
    let start = new Date();
    let end = new Date(now);

    if (preset === 'weekly') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(now); start.setDate(now.getDate() + diffToMonday);
        end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (preset === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'semiannual') {
        const m = now.getMonth();
        if (m < 6) { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 5, 30); }
        else { start = new Date(now.getFullYear(), 6, 1); end = new Date(now.getFullYear(), 11, 31); }
    } else if (preset === 'annual') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSystemDateInputValue('repStartDate', fmt(start));
    setSystemDateInputValue('repEndDate', fmt(end));
    generateReport();
}

function resolveBarFillHex(barColorClass) {
    if (String(barColorClass).includes("teal")) return "#0d9488";
    if (String(barColorClass).includes("emerald")) return "#059669";
    if (String(barColorClass).includes("amber")) return "#d97706";
    return "#2563eb";
}

function buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, pageSubtitle = "") {
    const logo1 = cfg.logo1Url && cfg.logo1Url.trim() !== '' ? cfg.logo1Url : '';
    const logo2 = cfg.logo2Url && cfg.logo2Url.trim() !== '' ? cfg.logo2Url : '';
    const logo3 = cfg.logo3Url && cfg.logo3Url.trim() !== '' ? cfg.logo3Url : '';
    const orderedLogos = [logo1, logo2, logo3].filter(Boolean);

    const logoAlignment = cfg.logoAlignment || 'left';
    const textAlign = cfg.headerTextAlign || 'center';
    const spacing = cfg.headerSpacing || 'standard';

    const textAlignClass = textAlign === 'left' ? 'text-left' : (textAlign === 'right' ? 'text-right' : 'text-center');
    const padClass = spacing === 'compact' ? 'pb-2' : (spacing === 'spacious' ? 'pb-5' : 'pb-3');

    const textBlockHtml = `
        <div class="${textAlignClass} space-y-0.5 flex-1">
            <p class="text-[10px] font-bold tracking-widest text-slate-600 uppercase">${escapeHtml(cfg.republic || 'Republic of the Philippines')}</p>
            <p class="text-[10.5px] font-bold tracking-wider text-slate-700 uppercase">${escapeHtml(cfg.department || 'Department of Transportation')}</p>
            <h3 class="font-extrabold text-sm text-slate-900 tracking-tight uppercase">${escapeHtml(cfg.agency || 'LAND TRANSPORTATION OFFICE')}</h3>
            <h4 class="font-bold text-xs text-blue-900 uppercase">${escapeHtml(cfg.office || 'Central Public Assistance Office (CPAO)')}</h4>
        </div>
    `;

    let headerContentBlock = textBlockHtml;

    if (orderedLogos.length > 0) {
        if (logoAlignment === 'sides') {
            const leftLogoHtml = logo1 ? `<img src="${logo1}" class="h-12 w-auto object-contain shrink-0" />` : `<div class="w-12 shrink-0"></div>`;
            const rightLogos = [logo2, logo3].filter(Boolean);
            const rightLogosHtml = rightLogos.length > 0
                ? `<div class="flex items-center gap-2 shrink-0">${rightLogos.map(u => `<img src="${u}" class="h-12 w-auto object-contain" />`).join('')}</div>`
                : `<div class="w-12 shrink-0"></div>`;
            headerContentBlock = `
                <div class="flex items-center justify-between gap-4 mb-1">
                    ${leftLogoHtml}
                    ${textBlockHtml}
                    ${rightLogosHtml}
                </div>
            `;
        } else if (logoAlignment === 'right') {
            headerContentBlock = `
                <div class="flex items-center justify-between gap-4 mb-1">
                    ${textBlockHtml}
                    <div class="flex items-center gap-2 shrink-0">${orderedLogos.map(url => `<img src="${url}" class="h-12 w-auto object-contain" />`).join('')}</div>
                </div>
            `;
        } else {
            headerContentBlock = `
                <div class="flex items-center justify-start gap-4 mb-1">
                    <div class="flex items-center gap-2 shrink-0">${orderedLogos.map(url => `<img src="${url}" class="h-12 w-auto object-contain" />`).join('')}</div>
                    ${textBlockHtml}
                </div>
            `;
        }
    }

    const metaRowHtml = (startISO && endISO) ? `
        <div class="flex justify-between items-center text-[11px] text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-300">
            <div>
                <span class="font-bold uppercase text-slate-500 text-[9.5px] block">Period Covered:</span>
                <span class="font-mono font-bold text-slate-900">${isoToMMDDYYYY(startISO)} — ${isoToMMDDYYYY(endISO)}</span>
            </div>
            ${pageSubtitle ? `<div class="text-center font-extrabold uppercase text-[10.5px] text-slate-800 tracking-wide">${escapeHtml(pageSubtitle)}</div>` : ''}
            <div class="text-right">
                <span class="font-bold uppercase text-slate-500 text-[9.5px] block">Resolution Rate:</span>
                <span class="font-mono font-extrabold text-blue-900">${overallEfficiency}% (${resolvedCount}/${totalReceived})</span>
            </div>
        </div>
    ` : '';

    return `
        <div class="space-y-3">
            <div class="border-b-2 border-slate-800 ${padClass}">${headerContentBlock}</div>
            ${metaRowHtml}
        </div>
    `;
}

function populateReportFilterDropdowns() {
    ensureCategoryGroupsInitialized();
    const catSel = document.getElementById('repFilterCategory');
    const platSel = document.getElementById('repFilterPlatform');
    if (catSel) {
        const curCat = catSel.value;
        catSel.innerHTML = '<option value="">All Categories</option>';
        CATEGORY_GROUPS.forEach(grp => {
            const items = AppState.settings.categoryGroups[grp] || [];
            if (items.length > 0) {
                const og = document.createElement('optgroup');
                og.label = grp;
                items.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c;
                    og.appendChild(opt);
                });
                catSel.appendChild(og);
            }
        });
        if (curCat) catSel.value = curCat;
    }
    if (platSel) {
        const curPlat = platSel.value;
        platSel.innerHTML = '<option value="">All Platforms</option>';
        (AppState.settings.platforms || []).forEach(p => {
            const name = typeof p === 'string' ? p : p.name;
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            platSel.appendChild(opt);
        });
        if (curPlat) platSel.value = curPlat;
    }
}

function buildPortalCategoryPieChartHtml(topConcernsList, totalCount) {
    const palette = ["#1d4ed8", "#0d9488", "#d97706", "#059669", "#4f46e5", "#0284c7", "#b45309", "#0f766e", "#2563eb", "#475569"];
    const items = Array.isArray(topConcernsList) ? topConcernsList.slice(0, 10) : [];
    const sumTop10 = items.reduce((acc, item) => acc + item.count, 0);

    if (!items.length || sumTop10 <= 0) {
        return `<p class="text-xs text-slate-500 italic py-4">No concern/issue data available for the selected filters.</p>`;
    }

    let currentDeg = 0;
    const segments = items.map((item, idx) => {
        const pct = (item.count / sumTop10) * 100;
        const nextDeg = idx === items.length - 1 ? 360 : currentDeg + (pct / 100) * 360;
        const color = palette[idx % palette.length];
        const segStr = `${color} ${currentDeg.toFixed(2)}deg ${nextDeg.toFixed(2)}deg`;
        currentDeg = nextDeg;
        return {
            concern: item.concern,
            count: item.count,
            shareOfTop10: pct.toFixed(1),
            shareOfPeriod: totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0",
            color,
            segStr
        };
    });

    const gradientCss = `conic-gradient(${segments.map(s => s.segStr).join(", ")})`;
    const legendHtml = segments.map((s, idx) => `
        <div class="flex items-center justify-between gap-2 py-1 border-b border-slate-100 text-[11px]">
            <div class="flex items-center gap-2 min-w-0">
                <span class="w-3 h-3 rounded-sm shrink-0" style="background:${s.color};"></span>
                <span class="font-semibold text-slate-900 truncate" title="${escapeHtml(s.concern)}">${idx + 1}. ${escapeHtml(s.concern)}</span>
            </div>
            <span class="font-mono font-bold text-slate-800 shrink-0">${s.count} (${s.shareOfTop10}%)</span>
        </div>
    `).join("");

    return `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div class="md:col-span-5 flex flex-col items-center justify-center py-2">
                <div style="width:170px;height:170px;border-radius:9999px;background:${gradientCss};border:2px solid #cbd5e1;box-shadow:0 4px 12px rgba(15,23,42,0.08);"></div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">Top ${items.length} Concerns (${sumTop10} items)</span>
            </div>
            <div class="md:col-span-7 space-y-0.5">
                ${legendHtml}
            </div>
        </div>
    `;
}

function resolveEndorsedRegionLabel(ticket) {
    const actionStr = String(ticket?.actionTaken || "");
    const remarksStr = String(ticket?.remarks || "");
    const combined = `${actionStr} ${remarksStr}`.toLowerCase();

    for (const d of (AppState.directory || [])) {
        const code = String(d.code || "").trim().toLowerCase();
        const office = String(d.office || "").trim().toLowerCase();
        if (code && new RegExp(`\b${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`, 'i').test(combined)) {
            return `${d.office} (${d.code})`;
        }
        if (office && combined.includes(office)) {
            return `${d.office} (${d.code})`;
        }
    }

    const regMatch = combined.match(/region\s*(4-?a|4-?b|iv-?a|iv-?b|xiii|caraga|ncr|nir|[0-9]{1,2})/i);
    if (regMatch) {
        return `Regional Office ${regMatch[1].toUpperCase()}`;
    }

    if (combined.includes("endorse")) {
        return "Other Endorsed Office";
    }
    return "";
}

function generateReport() {
    if (!canUserGenerateReports()) return;
    setReportPreviewEditState(false);
    ensureCategoryGroupsInitialized();
    populateReportFilterDropdowns();

    const rc = getReportColumnsConfig();
    const startISO = document.getElementById('repStartDate')?.value || '';
    const endISO = document.getElementById('repEndDate')?.value || '';
    const filterCat = document.getElementById('repFilterCategory')?.value || '';
    const filterPlat = document.getElementById('repFilterPlatform')?.value || '';

    const filtered = (AppState.tickets || []).filter(t => {
        if (!t.dateReceived) return false;
        const iso = mmddyyyyToISO(t.dateReceived);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
        if (startISO && iso < startISO) return false;
        if (endISO && iso > endISO) return false;
        if (filterCat && String(t.category || '').trim() !== filterCat) return false;
        if (filterPlat && String(t.platform || '').trim().toUpperCase() !== filterPlat.toUpperCase()) return false;
        return true;
    });

    const totalReceived = filtered.length;
    const resolvedCount = filtered.filter(t => String(t.status || '').trim().toLowerCase() === 'closed').length;
    const pendingCount = totalReceived - resolvedCount;
    const overallEfficiency = totalReceived > 0 ? ((resolvedCount / totalReceived) * 100).toFixed(1) : "0.0";

    // Portals list (configured + any extra found in filtered tickets)
    const portalSet = [];
    (AppState.settings.platforms || []).forEach(p => {
        const name = String(typeof p === 'string' ? p : p.name).trim().toUpperCase();
        if (name && !portalSet.includes(name)) portalSet.push(name);
    });
    filtered.forEach(t => {
        const p = String(t.platform || 'OTHER').trim().toUpperCase();
        if (p && !portalSet.includes(p)) portalSet.push(p);
    });

    // 1. Top 10 concerns / issues
    const concernCounts = {};
    filtered.forEach(t => {
        const concernLabel = String(t.category || '').trim() || "Unspecified Concern";
        concernCounts[concernLabel] = (concernCounts[concernLabel] || 0) + 1;
    });
    const top10Concerns = Object.entries(concernCounts)
        .map(([concern, count]) => ({ concern, count }))
        .sort((a, b) => b.count - a.count || a.concern.localeCompare(b.concern))
        .slice(0, 10);

    const top10RowsHtml = top10Concerns.length > 0
        ? top10Concerns.map((item, idx) => {
            const pct = totalReceived > 0 ? ((item.count / totalReceived) * 100).toFixed(1) : "0.0";
            return `
                <tr>
                    <td class="font-mono font-bold text-center">${idx + 1}</td>
                    <td class="font-semibold">${escapeHtml(item.concern)}</td>
                    <td class="font-mono font-bold text-right">${item.count} (${pct}%)</td>
                </tr>
            `;
        }).join('')
        : `<tr><td colspan="3" class="text-center text-slate-500 italic">No concern/issue records for the selected period.</td></tr>`;

    // 2. SUMMARY OF ISSUES / CONCERNS AND OTHER VARIABLES PER PORTAL (by CATEGORY_GROUPS & categories)
    const catPortalMatrix = {};
    CATEGORY_GROUPS.forEach(grp => {
        const configuredCats = AppState.settings.categoryGroups[grp] || [];
        const extraCatsInGroup = [];
        filtered.forEach(t => {
            const tCat = String(t.category || '').trim();
            if (!tCat) return;
            if (getGroupForCategory(tCat) === grp) {
                const exists = configuredCats.some(c => c.toLowerCase() === tCat.toLowerCase()) ||
                               extraCatsInGroup.some(c => c.toLowerCase() === tCat.toLowerCase());
                if (!exists) extraCatsInGroup.push(tCat);
            }
        });
        const allCatsForGroup = Array.from(new Set([...configuredCats, ...extraCatsInGroup]));
        catPortalMatrix[grp] = allCatsForGroup.map(catName => {
            const perPortal = {};
            let rowTotal = 0;
            portalSet.forEach(pName => {
                const cnt = filtered.filter(t =>
                    String(t.category || '').trim().toLowerCase() === catName.toLowerCase() &&
                    String(t.platform || 'OTHER').trim().toUpperCase() === pName
                ).length;
                perPortal[pName] = cnt;
                rowTotal += cnt;
            });
            return { category: catName, perPortal, total: rowTotal };
        });
    });

    const portalHeaderCellsHtml = portalSet.map(p => `<th class="text-center">${escapeHtml(p)}</th>`).join('');
    let catPortalBodyHtml = '';
    const groupTotalsPerPortal = {};
    portalSet.forEach(p => { groupTotalsPerPortal[p] = 0; });
    let grandCatTotal = 0;

    CATEGORY_GROUPS.forEach(grp => {
        const rows = catPortalMatrix[grp] || [];
        catPortalBodyHtml += `
            <tr class="report-group-row">
                <td colspan="${portalSet.length + 3}">${escapeHtml(grp)}</td>
            </tr>
        `;
        if (rows.length === 0) {
            catPortalBodyHtml += `
                <tr>
                    <td class="text-slate-600">${escapeHtml(grp)}</td>
                    <td class="italic text-slate-500">No categories configured under this group</td>
                    ${portalSet.map(() => `<td class="text-center font-mono text-slate-400">0</td>`).join('')}
                    <td class="text-center font-mono font-bold">0</td>
                </tr>
            `;
        } else {
            rows.forEach(r => {
                grandCatTotal += r.total;
                const cellsHtml = portalSet.map(p => {
                    const v = r.perPortal[p] || 0;
                    groupTotalsPerPortal[p] += v;
                    return `<td class="text-center font-mono ${v > 0 ? 'font-bold text-slate-900' : 'text-slate-400'}">${v}</td>`;
                }).join('');
                catPortalBodyHtml += `
                    <tr>
                        <td class="text-slate-600 font-medium">${escapeHtml(grp)}</td>
                        <td class="font-semibold text-slate-900">${escapeHtml(r.category)}</td>
                        ${cellsHtml}
                        <td class="text-center font-mono font-extrabold text-blue-900">${r.total}</td>
                    </tr>
                `;
            });
        }
    });

    catPortalBodyHtml += `
        <tr class="report-total-row">
            <td colspan="2">TOTAL ACROSS ALL CONCERN GROUPS</td>
            ${portalSet.map(p => `<td class="text-center font-mono">${groupTotalsPerPortal[p] || 0}</td>`).join('')}
            <td class="text-center font-mono">${grandCatTotal}</td>
        </tr>
    `;

    // 3. SUMMARY OF ISSUES / CONCERNS AND OTHER VARIABLES PER PORTAL: ACKNOWLEDGED, RESOLVED, PENDING, RESPONSE RATE (%)
    let totalAck = 0;
    let totalRes = 0;
    let totalPend = 0;

    const portalStatusRowsHtml = portalSet.map(pName => {
        const pTickets = filtered.filter(t => String(t.platform || 'OTHER').trim().toUpperCase() === pName);
        const ack = pTickets.length;
        const res = pTickets.filter(t => String(t.status || '').trim().toLowerCase() === 'closed').length;
        const pend = ack - res;
        const rate = ack > 0 ? ((res / ack) * 100).toFixed(1) : "0.0";
        totalAck += ack;
        totalRes += res;
        totalPend += pend;
        return `
            <tr>
                <td class="font-bold text-slate-900">${escapeHtml(pName)}</td>
                <td class="text-center font-mono font-bold">${ack}</td>
                <td class="text-center font-mono font-bold text-emerald-800">${res}</td>
                <td class="text-center font-mono font-bold text-rose-700">${pend}</td>
                <td class="text-center font-mono font-extrabold text-blue-900">${rate}%</td>
            </tr>
        `;
    }).join('');

    const totalPortalRate = totalAck > 0 ? ((totalRes / totalAck) * 100).toFixed(1) : "0.0";
    portalStatusRowsHtml += `
        <tr class="report-total-row">
            <td>TOTAL</td>
            <td class="text-center font-mono">${totalAck}</td>
            <td class="text-center font-mono">${totalRes}</td>
            <td class="text-center font-mono">${totalPend}</td>
            <td class="text-center font-mono">${totalPortalRate}%</td>
        </tr>
    `;

    // 4. TOTAL CONCERNS ENDORSED TO REGIONAL OFFICES
    const regMap = {};
    filtered.forEach(t => {
        const regionLabel = resolveEndorsedRegionLabel(t);
        if (!regionLabel) return;
        if (!regMap[regionLabel]) {
            regMap[regionLabel] = { office: regionLabel, total: 0, resolved: 0, pending: 0 };
        }
        regMap[regionLabel].total++;
        const isClosed = String(t.status || '').trim().toLowerCase() === 'closed';
        if (isClosed) regMap[regionLabel].resolved++;
        else regMap[regionLabel].pending++;
    });

    const endorsedRows = Object.values(regMap).sort((a, b) => b.total - a.total || a.office.localeCompare(b.office));
    let regGrandTotal = 0;
    let regGrandRes = 0;
    let regGrandPend = 0;

    const regionalRowsHtml = endorsedRows.length > 0
        ? endorsedRows.map(r => {
            regGrandTotal += r.total;
            regGrandRes += r.resolved;
            regGrandPend += r.pending;
            return `
                <tr>
                    <td class="font-bold text-slate-900">${escapeHtml(r.office)}</td>
                    <td class="text-center font-mono font-extrabold text-blue-900">${r.total}</td>
                    <td class="text-center font-mono font-bold text-emerald-800">${r.resolved}</td>
                    <td class="text-center font-mono font-bold text-rose-700">${r.pending}</td>
                </tr>
            `;
        }).join('') + `
            <tr class="report-total-row">
                <td>TOTAL ENDORSED TO REGIONAL OFFICES</td>
                <td class="text-center font-mono">${regGrandTotal}</td>
                <td class="text-center font-mono">${regGrandRes}</td>
                <td class="text-center font-mono">${regGrandPend}</td>
            </tr>
        `
        : `<tr><td colspan="4" class="text-center text-slate-500 italic">No regional office endorsements recorded in this period.</td></tr>`;

    // Platform volume breakdown chart
    const platCounts = {};
    filtered.forEach(t => {
        const p = String(t.platform || 'OTHER').trim().toUpperCase();
        platCounts[p] = (platCounts[p] || 0) + 1;
    });
    const maxPlatCount = Math.max(1, ...Object.values(platCounts));
    const platBarsHtml = Object.entries(platCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([plat, cnt]) => {
            const pct = ((cnt / maxPlatCount) * 100).toFixed(1);
            const fillHex = resolveBarFillHex("bg-blue-600");
            return `
                <div class="report-bar-row">
                    <div class="report-bar-label">${escapeHtml(plat)}</div>
                    <div class="report-bar-track"><div class="report-bar-fill" style="width:${pct}%;background:${fillHex};"></div></div>
                    <div class="report-bar-value">${cnt} (${totalReceived > 0 ? ((cnt / totalReceived) * 100).toFixed(1) : "0.0"}%)</div>
                </div>
            `;
        }).join('') || `<p class="text-xs text-slate-500 italic">No platform volume data in this period.</p>`;

    // Signatory block rendered from configured reportSignatories
    const sigList = ensureReportSignatoriesConfigured();
    const sigColsClass = sigList.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3";
    const signatoriesBlockHtml = sigList.map(sig => `
        <div class="text-center border border-slate-200 rounded-lg p-3 bg-slate-50/60">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-8 text-left">${escapeHtml(sig.blockLabel || "Signatory")}:</p>
            <p class="font-extrabold text-xs uppercase text-slate-900 border-t border-slate-400 pt-1.5">${escapeHtml(sig.name || "")}</p>
            <p class="text-[11px] text-slate-700 mt-0.5">${escapeHtml(sig.designation || "")}</p>
        </div>
    `).join("");

    const cfg = AppState.settings.reportConfig || {};
    const headerHtml = buildReportPageHeaderHtml(cfg, startISO, endISO, overallEfficiency, resolvedCount, totalReceived, cfg.title || "EXECUTIVE RESOLUTION & PORTAL PERFORMANCE REPORT");
    const pieHtml = buildPortalCategoryPieChartHtml(top10Concerns, totalReceived);

    const docEl = document.getElementById('printableReportDocument');
    if (!docEl) return;

    docEl.innerHTML = `
        ${headerHtml}

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="border border-slate-300 rounded-lg p-3 bg-slate-50">
                <p class="text-[10px] font-bold uppercase text-slate-500">Total Tickets</p>
                <p class="text-xl font-extrabold text-slate-900 font-mono mt-0.5">${totalReceived}</p>
            </div>
            <div class="border border-emerald-300 rounded-lg p-3 bg-emerald-50/60">
                <p class="text-[10px] font-bold uppercase text-emerald-700">Resolved / Closed</p>
                <p class="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">${resolvedCount}</p>
            </div>
            <div class="border border-rose-300 rounded-lg p-3 bg-rose-50/60">
                <p class="text-[10px] font-bold uppercase text-rose-700">Pending</p>
                <p class="text-xl font-extrabold text-rose-800 font-mono mt-0.5">${pendingCount}</p>
            </div>
            <div class="border border-blue-300 rounded-lg p-3 bg-blue-50/60">
                <p class="text-[10px] font-bold uppercase text-blue-700">Resolution Rate</p>
                <p class="text-xl font-extrabold text-blue-900 font-mono mt-0.5">${overallEfficiency}%</p>
            </div>
        </div>

        <!-- 1. TOP 10 CONCERNS / ISSUES -->
        <div class="report-chart-card space-y-3">
            <h4 class="report-chart-title">${escapeHtml(rc.hdrTop10)}</h4>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div class="lg:col-span-6 overflow-x-auto">
                    <table class="report-summary-table">
                        <thead>
                            <tr>
                                <th class="w-14 text-center">${escapeHtml(rc.colTopRank)}</th>
                                <th>${escapeHtml(rc.colTopConcern)}</th>
                                <th class="w-28 text-right">${escapeHtml(rc.colTopCount)}</th>
                            </tr>
                        </thead>
                        <tbody>${top10RowsHtml}</tbody>
                    </table>
                </div>
                <div class="lg:col-span-6">${pieHtml}</div>
            </div>
        </div>

        <!-- 2. SUMMARY OF ISSUES / CONCERNS AND OTHER VARIABLES PER PORTAL (CATEGORIES BY GROUP) -->
        <div class="report-chart-card space-y-2">
            <h4 class="report-chart-title">${escapeHtml(rc.hdrCategoryPortal)}</h4>
            <div class="overflow-x-auto">
                <table class="report-summary-table">
                    <thead>
                        <tr>
                            <th>${escapeHtml(rc.colCatGroup)}</th>
                            <th>${escapeHtml(rc.colCatName)}</th>
                            ${portalHeaderCellsHtml}
                            <th class="text-center">${escapeHtml(rc.colCatTotal)}</th>
                        </tr>
                    </thead>
                    <tbody>${catPortalBodyHtml}</tbody>
                </table>
            </div>
        </div>

        <!-- 3. SUMMARY PER PORTAL: ACKNOWLEDGED, RESOLVED, PENDING, RESPONSE RATE (%) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div class="lg:col-span-7 report-chart-card space-y-2">
                <h4 class="report-chart-title">${escapeHtml(rc.hdrPortalStatus)}</h4>
                <div class="overflow-x-auto">
                    <table class="report-summary-table">
                        <thead>
                            <tr>
                                <th>${escapeHtml(rc.colPortalName)}</th>
                                <th class="text-center">${escapeHtml(rc.colAck)}</th>
                                <th class="text-center">${escapeHtml(rc.colRes)}</th>
                                <th class="text-center">${escapeHtml(rc.colPend)}</th>
                                <th class="text-center">${escapeHtml(rc.colRate)}</th>
                            </tr>
                        </thead>
                        <tbody>${portalStatusRowsHtml}</tbody>
                    </table>
                </div>
            </div>
            <div class="lg:col-span-5 report-chart-card">
                <h4 class="report-chart-title">Portal Volume Distribution</h4>
                ${platBarsHtml}
            </div>
        </div>

        <!-- 4. TOTAL CONCERNS ENDORSED TO REGIONAL OFFICES -->
        <div class="report-chart-card space-y-2">
            <h4 class="report-chart-title">${escapeHtml(rc.hdrRegionalEndorsed)}</h4>
            <div class="overflow-x-auto">
                <table class="report-summary-table">
                    <thead>
                        <tr>
                            <th>${escapeHtml(rc.colRegOffice)}</th>
                            <th class="text-center">${escapeHtml(rc.colRegTotal)}</th>
                            <th class="text-center">${escapeHtml(rc.colRegResolved)}</th>
                            <th class="text-center">${escapeHtml(rc.colRegPending)}</th>
                        </tr>
                    </thead>
                    <tbody>${regionalRowsHtml}</tbody>
                </table>
            </div>
        </div>

        <div class="pt-4 mt-auto">
            <div class="grid ${sigColsClass} gap-4">
                ${signatoriesBlockHtml}
            </div>
        </div>
    `;
}

function exportReportCSV() {
    if (!canUserGenerateReports()) return;
    const startISO = document.getElementById('repStartDate').value;
    const endISO = document.getElementById('repEndDate').value;
    if (!startISO || !endISO) return;
    const filtered = AppState.tickets.filter(t => {
        const iso = mmddyyyyToISO(t.dateReceived);
        return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= startISO && iso <= endISO;
    });
    let csv = 'Admin No,Platform,Ticket No,Date Received,Category Group,Category,Type,Complainant,Details,Response,Action Taken,Status,Remarks\n' +
        filtered.map(t => `"${t.adminNo}","${t.platform}","${t.referralNo}","${t.dateReceived}","${getGroupForCategory(t.category)}","${t.category}","${t.ticketType}","${t.complainantName}","${(t.ticketDetails || '').replace(/"/g, '""')}","${(t.responseDetails || '').replace(/"/g, '""')}","${t.actionTaken}","${t.status}","${t.remarks}"`).join('\n');
    let blob = new Blob([csv], { type: 'text/csv' });
    let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Report_${startISO}_to_${endISO}.csv`; a.click();
}

function loadCustomAccomplishmentsStorage() {
    try {
        const raw = localStorage.getItem(CUSTOM_ACCOMPLISHMENTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                customAccomplishments = parsed;
                return;
            }
        }
    } catch (e) {}
    customAccomplishments = [];
}

function saveCustomAccomplishmentsStorage() {
    try {
        localStorage.setItem(CUSTOM_ACCOMPLISHMENTS_KEY, JSON.stringify(customAccomplishments));
    } catch (e) {}
}

function initAccomplishmentTab() {
    const startEl = document.getElementById('accStartDate');
    const endEl = document.getElementById('accEndDate');
    const customDateEl = document.getElementById('customAccDateInput');
    if (customDateEl && !customDateEl.value) setSystemDateInputValue('customAccDateInput', getTodayISO());

    const scopeSel = document.getElementById('accAdminScope');
    if (scopeSel && !isSuperAdmin() && !isAdminTL()) {
        scopeSel.value = 'my';
        scopeSel.disabled = true;
    } else if (scopeSel) {
        scopeSel.disabled = false;
    }

    if (startEl && endEl && (!startEl.value || !endEl.value)) {
        setAccomplishmentPreset('today');
    } else {
        renderCustomAccomplishmentsManageList();
        generateAccomplishmentReport();
    }
}

function setAccomplishmentPreset(preset) {
    const now = new Date();
    const curStartVal = document.getElementById('accStartDate')?.value || '';
    let refYear = now.getFullYear();
    let refMonth = now.getMonth();
    if (curStartVal && /^\d{4}-\d{2}-\d{2}$/.test(curStartVal)) {
        const p = curStartVal.split('-');
        refYear = parseInt(p[0], 10);
        refMonth = parseInt(p[1], 10) - 1;
    }

    let start = new Date(now);
    let end = new Date(now);

    if (preset === '1st_cutoff') {
        start = new Date(refYear, refMonth, 1);
        end = new Date(refYear, refMonth, 15);
    } else if (preset === '2nd_cutoff') {
        start = new Date(refYear, refMonth, 16);
        end = new Date(refYear, refMonth + 1, 0);
    } else if (preset === 'weekly') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(now); start.setDate(now.getDate() + diffToMonday);
        end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (preset === 'monthly') {
        start = new Date(refYear, refMonth, 1);
        end = new Date(refYear, refMonth + 1, 0);
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSystemDateInputValue('accStartDate', fmt(start));
    setSystemDateInputValue('accEndDate', fmt(end));
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
}

function saveCustomAccomplishment(e) {
    e.preventDefault();
    const textInput = document.getElementById('customAccTitleInput');
    const dateInput = document.getElementById('customAccDateInput');
    const editIdxInput = document.getElementById('editCustomAccIndex');

    const text = (textInput?.value || '').trim();
    if (!text) return;
    const dateIso = dateInput?.value || getTodayISO();
    const editIdxStr = editIdxInput?.value ?? '';

    if (editIdxStr !== '' && customAccomplishments[parseInt(editIdxStr, 10)]) {
        const idx = parseInt(editIdxStr, 10);
        customAccomplishments[idx] = {
            ...customAccomplishments[idx],
            text,
            dateIso
        };
        showToast("Accomplishment item updated.");
    } else {
        customAccomplishments.push({
            id: 'ACC_' + Date.now(),
            text,
            dateIso,
            ownerUsername: currentUser.username || '',
            ownerAdminNo: currentUser.adminNo || deriveOperatorAdminNo(currentUser)
        });
        showToast("Accomplishment added after portal ticket list.");
    }

    saveCustomAccomplishmentsStorage();
    cancelEditCustomAccomplishment();
    renderCustomAccomplishmentsManageList();
    generateAccomplishmentReport();
}

function editCustomAccomplishment(idx) {
    const item = customAccomplishments[idx];
    if (!item) return;
    document.getElementById('editCustomAccIndex').value = String(idx);
    document.getElementById('customAccTitleInput').value = item.text || '';
    setSystemDateInputValue('customAccDateInput', item.dateIso || getTodayISO());
    document.getElementById('accFormHeaderLabel').textContent = "✏️ Edit Accomplishment Item";
    document.getElementById('btnSaveCustomAcc').textContent = "Update Item";
    document.getElementById('btnCancelEditAccItem').classList.remove('hidden');
    document.getElementById('customAccTitleInput').focus();
}

function cancelEditCustomAccomplishment() {
    const editIdxEl = document.getElementById('editCustomAccIndex');
    const titleEl = document.getElementById('customAccTitleInput');
    const dateEl = document.getElementById('customAccDateInput');
    const headerEl = document.getElementById('accFormHeaderLabel');
    const btnEl = document.getElementById('btnSaveCustomAcc');
    const cancelBtn = document.getElementById('btnCancelEditAccItem');
    if (editIdxEl) editIdxEl.value = '';
    if (titleEl) titleEl.value = '';
    setSystemDateInputValue('customAccDateInput', getTodayISO());
    if (headerEl) headerEl.textContent = "➕ Add Accomplishment (Auto-inserted after Portal Ticket List)";
    if (btnEl) btnEl.textContent = "+ Add Accomplishment";
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

function deleteCustomAccomplishment(idx) {
    showSystemConfirm("Remove Accomplishment", "Remove this accomplishment item from the report?", () => {
        customAccomplishments.splice(idx, 1);
        saveCustomAccomplishmentsStorage();
        cancelEditCustomAccomplishment();
        renderCustomAccomplishmentsManageList();
        generateAccomplishmentReport();
        showToast("Accomplishment removed.");
    });
}

function renderCustomAccomplishmentsManageList() {
    const listEl = document.getElementById('customAccomplishmentsManageList');
    if (!listEl) return;

    const scope = document.getElementById('accAdminScope')?.value || 'my';
    const visibleItems = customAccomplishments
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
            if (scope === 'all') return true;
            return String(item.ownerUsername || '').toLowerCase() === String(currentUser.username || '').toLowerCase() ||
                   String(item.ownerAdminNo || '').toLowerCase() === String(currentUser.adminNo || '').toLowerCase();
        });

    if (visibleItems.length === 0) {
        listEl.innerHTML = `<p class="text-[11px] text-slate-500 italic">No custom accomplishments added yet.</p>`;
        return;
    }

    listEl.innerHTML = visibleItems.map(({ item, idx }) => `
        <div class="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
            <div class="min-w-0">
                <span class="text-white font-semibold block truncate">${escapeHtml(item.text)}</span>
                <span class="text-[10px] font-mono text-slate-400">${escapeHtml(isoToMMDDYYYY(item.dateIso || ''))}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="editCustomAccomplishment(${idx})" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-bold">✏️</button>
                <button type="button" onclick="deleteCustomAccomplishment(${idx})" class="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold">🗑️</button>
            </div>
        </div>
    `).join('');
}

function setAccomplishmentPreviewEditState(editing) {
    isAccomplishmentPreviewEditing = !!editing;
    const docEl = document.getElementById("printableAccomplishmentDocument");
    const btn = document.getElementById("btnToggleEditAccPreview");
    const badge = document.getElementById("accEditModeBadge");

    if (docEl) {
        docEl.contentEditable = isAccomplishmentPreviewEditing ? "true" : "false";
        if (isAccomplishmentPreviewEditing) {
            docEl.classList.add("ring-2", "ring-amber-400");
            docEl.focus();
        } else {
            docEl.classList.remove("ring-2", "ring-amber-400");
        }
    }

    if (btn) {
        if (isAccomplishmentPreviewEditing) {
            btn.textContent = "✅ Done Editing";
            btn.className = "px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition";
        } else {
            btn.textContent = "✏️ Edit Report";
            btn.className = "px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition";
        }
    }

    if (badge) {
        badge.classList.toggle("hidden", !isAccomplishmentPreviewEditing);
    }
}

function toggleEditAccomplishmentPreview() {
    if (!document.getElementById("printableAccomplishmentDocument")) {
        generateAccomplishmentReport();
    }
    setAccomplishmentPreviewEditState(!isAccomplishmentPreviewEditing);
    showToast(isAccomplishmentPreviewEditing ? "Accomplishment report editing enabled." : "Edits applied.");
}

function formatAccomplishmentPeriodHeading(startISO, endISO) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const s = new Date(startISO + "T12:00:00");
    const e = new Date(endISO + "T12:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${startISO} to ${endISO}`;

    const sMonth = months[s.getMonth()];
    const eMonth = months[e.getMonth()];
    const sDay = String(s.getDate()).padStart(2, "0");
    const eDay = String(e.getDate()).padStart(2, "0");
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (startISO === endISO) {
        return `For ${sMonth} ${sDay}, ${sYear}`;
    }
    if (sYear === eYear && s.getMonth() === e.getMonth()) {
        return `For the Period of ${sMonth} ${sDay} to ${eDay}, ${sYear}`;
    }
    if (sYear === eYear) {
        return `For the Period of ${sMonth} ${sDay} to ${eMonth} ${eDay}, ${sYear}`;
    }
    return `For the Period of ${sMonth} ${sDay}, ${sYear} to ${eMonth} ${eDay}, ${eYear}`;
}

function generateAccomplishmentReport() {
    setAccomplishmentPreviewEditState(false);
    const startISO = document.getElementById('accStartDate')?.value || getTodayISO();
    const endISO = document.getElementById('accEndDate')?.value || getTodayISO();
    const scope = document.getElementById('accAdminScope')?.value || 'my';

    const startDate = new Date(startISO + "T00:00:00");
    const endDate = new Date(endISO + "T23:59:59");

    const filteredTickets = (AppState.tickets || []).filter(t => {
        if (!t.dateReceived) return false;
        const iso = mmddyyyyToISO(t.dateReceived);
        const tDate = new Date(iso + "T12:00:00");
        if (tDate < startDate || tDate > endDate) return false;
        if (scope === 'my' && !isTicketOwnedByCurrentUser(t)) return false;
        return true;
    });

    const portalOrder = [];
    const portalBreakdown = {};

    filteredTickets.forEach(t => {
        const portalName = String(t.platform || 'OTHER PORTAL').trim().toUpperCase();
        if (!portalBreakdown[portalName]) {
            portalBreakdown[portalName] = { received: 0, resolved: 0, pending: 0 };
            portalOrder.push(portalName);
        }
        portalBreakdown[portalName].received++;
        const isClosed = String(t.status || '').trim().toLowerCase() === 'closed';
        if (isClosed) portalBreakdown[portalName].resolved++;
        else portalBreakdown[portalName].pending++;
    });

    const formatPortalDisplayTitle = (portalCode) => {
        if (portalCode === 'FACEBOOK') return 'LTO Facebook Messenger and Comment Section';
        return `${portalCode} Portal`;
    };

    const portalBulletsHtml = portalOrder.length === 0
        ? `<li>Responded to queries received from assigned portals: <strong>0 tickets, 0 resolved, 0 pending</strong>;</li>`
        : portalOrder.map(portal => {
            const st = portalBreakdown[portal];
            const label = formatPortalDisplayTitle(portal);
            return `<li>Responded to queries received from the <strong>${escapeHtml(label)}: ${st.received} tickets, ${st.resolved} resolved, ${st.pending} pending</strong>;</li>`;
        }).join('');

    const matchingCustomAccs = customAccomplishments.filter(item => {
        if (scope === 'my') {
            const sameOwner = String(item.ownerUsername || '').toLowerCase() === String(currentUser.username || '').toLowerCase() ||
                              String(item.ownerAdminNo || '').toLowerCase() === String(currentUser.adminNo || '').toLowerCase();
            if (!sameOwner) return false;
        }
        if (!item.dateIso) return true;
        const d = new Date(item.dateIso + "T12:00:00");
        return d >= startDate && d <= endDate;
    });

    const customBulletsHtml = matchingCustomAccs.map(item => {
        const cleanTxt = String(item.text || '').trim();
        const withSemicolon = /[;.]$/.test(cleanTxt) ? cleanTxt : `${cleanTxt};`;
        return `<li>${escapeHtml(withSemicolon)}</li>`;
    }).join('');

    const cfg = AppState.settings.reportConfig || {};
    const periodHeading = formatAccomplishmentPeriodHeading(startISO, endISO);

    const operatorDisplayName = scope === 'all'
        ? 'ALL CPAO / PAT-SMT OPERATORS'
        : String(currentUser.name || currentUser.username || 'ADMIN').toUpperCase();

    const matchedSignatory = REPORT_SIGNATORIES.find(
        s => s.name.toLowerCase() === operatorDisplayName.toLowerCase()
    );
    const operatorDesignation = scope === 'all'
        ? 'Central Public Assistance Office'
        : (matchedSignatory ? matchedSignatory.designation : 'Public Relation Officer I');

    const approvedByName = cfg.notedName || 'MARY MAY M. JACOB';
    const approvedByDesig = cfg.notedDesig || 'Head, LTO-COMMS/CPAO';

    const container = document.getElementById('accomplishmentReportContainer');
    if (!container) return;

    container.innerHTML = `
        <div id="printableAccomplishmentDocument" class="space-y-6">
            <section class="report-a4-page" style="justify-content: flex-start; padding: 22mm 20mm;">
                <div class="text-center mb-10">
                    <h2 class="font-bold text-base sm:text-lg text-black tracking-normal">Accomplishment Report</h2>
                    <p class="font-bold text-base sm:text-lg text-black mt-0.5">${escapeHtml(periodHeading)}</p>
                </div>

                <div class="pl-4 sm:pl-8 pr-2">
                    <ul class="list-disc pl-6 space-y-3 text-sm sm:text-[15px] text-black leading-relaxed">
                        ${portalBulletsHtml}
                        ${customBulletsHtml}
                    </ul>
                </div>

                <div class="mt-24 pt-6 grid grid-cols-2 gap-8 text-sm sm:text-[15px] text-black">
                    <div class="text-center">
                        <p class="text-left pl-6 sm:pl-12 mb-12">Submitted by:</p>
                        <p class="font-bold uppercase text-black">${escapeHtml(operatorDisplayName)}</p>
                        <p class="text-black mt-0.5">${escapeHtml(operatorDesignation)}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-left pl-6 sm:pl-12 mb-12">Approved by:</p>
                        <p class="font-bold uppercase text-black">${escapeHtml(approvedByName)}</p>
                        <p class="text-black mt-0.5">${escapeHtml(approvedByDesig)}</p>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function printAccomplishmentReport() {
    const docEl = document.getElementById('printableAccomplishmentDocument');
    if (!docEl || !docEl.innerHTML.trim()) generateAccomplishmentReport();
    if (isAccomplishmentPreviewEditing) setAccomplishmentPreviewEditState(false);
    const previewHtml = document.getElementById('accomplishmentReportContainer')?.innerHTML || '';
    const target = document.getElementById('endorseLetterPrintArea');
    if (target && previewHtml) {
        target.dataset.prevHtml = target.innerHTML;
        target.dataset.prevClass = target.className;
        target.className = 'w-full max-w-[1120px]';
        target.innerHTML = previewHtml;
    }
    document.body.classList.add('printing-accomplishment');
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-accomplishment');
            if (target && target.dataset.prevHtml !== undefined) {
                target.innerHTML = target.dataset.prevHtml;
                target.className = target.dataset.prevClass || '';
                delete target.dataset.prevHtml;
                delete target.dataset.prevClass;
            }
        }, 400);
    }, 150);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
}

function isUnknownActionErrorMessage(msg) {
    const m = String(msg || "").toLowerCase();
    return m.includes("unknown action") || m.includes("invalid action") || m.includes("unsupported action") || (m.includes("action") && m.includes("not found"));
}

async function fetchWithRetry(url, options, maxRetries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const resp = await fetch(url, { ...options, mode: 'cors', cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp;
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 600 * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError;
}

function buildTicketPayload(actionName, targetRowIdx, t) {
    const cleanRow = Number(targetRowIdx) || Number(t.rowIndex) || 0;
    const isClosed = String(t.status || '').trim().toLowerCase() === 'closed';
    const active24h = !isClosed && !!(t.is24Hours || (t.extraData && t.extraData.is24Hours));
    const extraObj = {
        ...(t.extraData || {}),
        is24Hours: active24h
    };
    const extraStr = JSON.stringify(extraObj);
    const formattedDate = "'" + formatCleanDate(t.dateReceived);
    const refNoClean = String(t.referralNo || '').trim();
    const adminNoClean = String(t.adminNo || '').trim();
    const platformClean = String(t.platform || '').trim();
    const categoryClean = String(t.category || '').trim();
    const ticketTypeClean = String(t.ticketType || '').trim();
    const complainantClean = String(t.complainantName || '').trim();
    const ticketDetailsClean = String(t.ticketDetails || '').trim();
    const responseDetailsClean = String(t.responseDetails || '').trim();
    const actionTakenClean = String(t.actionTaken || '').trim();
    const statusClean = String(t.status || '').trim();
    const remarksClean = String(t.remarks || '').trim();

    return {
        action: actionName,
        sheet: "Logs",
        rowIndex: cleanRow,
        row: cleanRow,
        id: cleanRow,
        adminNo: adminNoClean,
        platform: platformClean,
        referralNo: refNoClean,
        ticketNo: refNoClean,
        dateReceived: formattedDate,
        category: categoryClean,
        ticketType: ticketTypeClean,
        complainantName: complainantClean,
        complainant: complainantClean,
        ticketDetails: ticketDetailsClean,
        details: ticketDetailsClean,
        responseDetails: responseDetailsClean,
        response: responseDetailsClean,
        actionTaken: actionTakenClean,
        status: statusClean,
        remarks: remarksClean,
        is24Hours: active24h,
        extraData: extraStr,
        data: {
            adminNo: adminNoClean,
            platform: platformClean,
            referralNo: refNoClean,
            dateReceived: formattedDate,
            category: categoryClean,
            ticketType: ticketTypeClean,
            complainantName: complainantClean,
            ticketDetails: ticketDetailsClean,
            responseDetails: responseDetailsClean,
            actionTaken: actionTakenClean,
            status: statusClean,
            remarks: remarksClean,
            is24Hours: active24h,
            extraData: extraStr
        },
        "ADMIN NO.": adminNoClean,
        "PLATFORM": platformClean,
        "REFERRAL / TICKET NUMBER": refNoClean,
        "REFERRAL / TICKET NO.": refNoClean,
        "DATE RECEIVED": formattedDate,
        "CATEGORY": categoryClean,
        "TYPE OF TICKET": ticketTypeClean,
        "NAME OF COMPLAINANT": complainantClean,
        "DETAILS OF TICKET": ticketDetailsClean,
        "DETAILS OF RESPONSE": responseDetailsClean,
        "ACTION TAKEN": actionTakenClean,
        "STATUS": statusClean,
        "REMARKS": remarksClean
    };
}

async function sendTicketPayloadToAppsScript(actionName, targetRowIdx, t) {
    const payload = buildTicketPayload(actionName, targetRowIdx, t);
    const resp = await fetchWithRetry(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }, 2);
    const rawText = await resp.text();
    let resData = {};
    try { resData = rawText ? JSON.parse(rawText) : {}; } catch (e) { resData = {}; }
    const errMsg = (resData && (resData.error || (resData.success === false && (resData.message || "Save failed")))) || "";
    return { resData, errMsg };
}

function openAddModal() {
    populateDropdowns();
    document.getElementById('editTicketIndex').value = '';
    editingTicketOriginalState = null;
    document.getElementById('ticketModalTitle').textContent = 'Add New Ticket Log';

    const draft = lastTicketModalDraft;
    lastTicketModalDraft = null;

    const assignedAdminNo = currentUser.adminNo || deriveOperatorAdminNo(currentUser) || "ADMIN 36";
    document.getElementById('formAdminNo').value = draft ? draft.adminNo : assignedAdminNo;
    document.getElementById('formAdminNo').readOnly = true;
    document.getElementById('formAdminNo').classList.add('opacity-75', 'cursor-not-allowed');

    if (draft) {
        document.getElementById('formPlatform').value = draft.platform;
        document.getElementById('formReferralNo').value = draft.referralNo;
        setSystemDateInputValue('formDateReceived', draft.dateReceived);
        document.getElementById('formCategorySearch').value = draft.category;
        document.getElementById('formTicketType').value = draft.ticketType;
        document.getElementById('formComplainantName').value = draft.complainantName;
        document.getElementById('formTicketDetails').value = draft.ticketDetails;
        document.getElementById('formResponseDetails').value = draft.responseDetails;
        document.getElementById('formActionTaken').value = draft.actionTaken;
        document.getElementById('formStatus').value = draft.status;
        document.getElementById('formRemarks').value = draft.remarks;
        document.getElementById('formIs24Hours').checked = !!draft.is24Hours;
    } else {
        let defaultPlatform = currentUser.defaultPortal;
        if (currentUser.portalStartTime && currentUser.portalEndTime) {
            const now = new Date();
            const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            if (curTime >= currentUser.portalStartTime && curTime <= currentUser.portalEndTime) {
                defaultPlatform = currentUser.defaultPortal || defaultPlatform;
            }
        }
        if (defaultPlatform && Array.from(document.getElementById('formPlatform').options).some(o => o.value === defaultPlatform)) {
            document.getElementById('formPlatform').value = defaultPlatform;
        }
        setSystemDateInputValue('formDateReceived', getTodayISO());
        document.getElementById('formCategorySearch').value = '';
        document.getElementById('formComplainantName').value = '';
        document.getElementById('formTicketDetails').value = '';
        document.getElementById('formResponseDetails').value = '';
        document.getElementById('formRemarks').value = '';
        document.getElementById('formIs24Hours').checked = false;
        const statusSel = document.getElementById('formStatus');
        if (statusSel && Array.from(statusSel.options).some(o => o.value.toLowerCase() === 'closed')) {
            statusSel.value = Array.from(statusSel.options).find(o => o.value.toLowerCase() === 'closed').value;
        }
        autoGenTicketNo(false);
    }

    if (AppState.settings.customFields) {
        AppState.settings.customFields.forEach(cf => {
            const el = document.getElementById(`customField_${cf.id}`);
            if (el) el.value = (draft && draft.extraData && draft.extraData[cf.id]) || '';
        });
    }

    document.getElementById('ticketModal').style.display = 'flex';
}

function openEditModal(idx) {
    const t = AppState.tickets[idx];
    if (!t) return;
    if (!canMutateTicket(t)) {
        showSystemAlert("Access Restricted", "You can only edit or delete ticket logs assigned to your own Admin account.", "🔒");
        return;
    }

    populateDropdowns();
    document.getElementById('editTicketIndex').value = idx;
    editingTicketOriginalState = {
        ...t,
        extraData: { ...(t.extraData || {}) }
    };
    document.getElementById('ticketModalTitle').textContent = `Edit Ticket Log (#${t.referralNo})`;

    document.getElementById('formAdminNo').value = t.adminNo;
    document.getElementById('formAdminNo').readOnly = true;
    document.getElementById('formAdminNo').classList.add('opacity-75', 'cursor-not-allowed');

    const platSel = document.getElementById('formPlatform');
    if (platSel && t.platform && !Array.from(platSel.options).some(o => o.value.toLowerCase() === t.platform.toLowerCase())) {
        const opt = document.createElement('option');
        opt.value = t.platform;
        opt.textContent = t.platform;
        platSel.appendChild(opt);
    }
    if (platSel) platSel.value = t.platform;

    document.getElementById('formReferralNo').value = t.referralNo;
    setSystemDateInputValue('formDateReceived', mmddyyyyToISO(t.dateReceived));
    document.getElementById('formCategorySearch').value = t.category || '';

    const typeSel = document.getElementById('formTicketType');
    if (typeSel && t.ticketType && !Array.from(typeSel.options).some(o => o.value.toLowerCase() === t.ticketType.toLowerCase())) {
        const opt = document.createElement('option');
        opt.value = t.ticketType;
        opt.textContent = t.ticketType;
        typeSel.appendChild(opt);
    }
    if (typeSel) typeSel.value = t.ticketType;

    document.getElementById('formComplainantName').value = t.complainantName;
    document.getElementById('formTicketDetails').value = t.ticketDetails;
    document.getElementById('formResponseDetails').value = t.responseDetails;

    const actSel = document.getElementById('formActionTaken');
    if (actSel && t.actionTaken && !Array.from(actSel.options).some(o => o.value.toLowerCase() === t.actionTaken.toLowerCase())) {
        const opt = document.createElement('option');
        opt.value = t.actionTaken;
        opt.textContent = t.actionTaken;
        actSel.appendChild(opt);
    }
    if (actSel) actSel.value = t.actionTaken;

    const statSel = document.getElementById('formStatus');
    if (statSel && t.status && !Array.from(statSel.options).some(o => o.value.toLowerCase() === t.status.toLowerCase())) {
        const opt = document.createElement('option');
        opt.value = t.status;
        opt.textContent = t.status;
        statSel.appendChild(opt);
    }
    if (statSel) statSel.value = t.status;

    document.getElementById('formRemarks').value = t.remarks;

    const isClosed = String(t.status || '').trim().toLowerCase() === 'closed';
    const is24hEnabled = !isClosed && !!(t.is24Hours || (t.extraData && t.extraData.is24Hours));
    document.getElementById('formIs24Hours').checked = is24hEnabled;

    if (AppState.settings.customFields) {
        AppState.settings.customFields.forEach(cf => {
            const el = document.getElementById(`customField_${cf.id}`);
            if (el) el.value = (t.extraData && t.extraData[cf.id]) || '';
        });
    }

    document.getElementById('ticketModal').style.display = 'flex';
}

function closeTicketModal() {
    const editIdxStr = document.getElementById('editTicketIndex')?.value;
    if (editIdxStr === '') {
        lastTicketModalDraft = {
            adminNo: document.getElementById('formAdminNo')?.value || '',
            platform: document.getElementById('formPlatform')?.value || '',
            referralNo: document.getElementById('formReferralNo')?.value || '',
            dateReceived: document.getElementById('formDateReceived')?.value || getTodayISO(),
            category: document.getElementById('formCategorySearch')?.value || '',
            ticketType: document.getElementById('formTicketType')?.value || '',
            complainantName: document.getElementById('formComplainantName')?.value || '',
            ticketDetails: document.getElementById('formTicketDetails')?.value || '',
            responseDetails: document.getElementById('formResponseDetails')?.value || '',
            actionTaken: document.getElementById('formActionTaken')?.value || '',
            status: document.getElementById('formStatus')?.value || 'Closed',
            remarks: document.getElementById('formRemarks')?.value || '',
            is24Hours: !!document.getElementById('formIs24Hours')?.checked,
            extraData: {}
        };
        if (AppState.settings.customFields) {
            AppState.settings.customFields.forEach(cf => {
                const el = document.getElementById(`customField_${cf.id}`);
                if (el) lastTicketModalDraft.extraData[cf.id] = el.value;
            });
        }
    }
    const catList = document.getElementById('categoryDropdownList');
    if (catList) catList.classList.add('hidden');
    closeGlobalSystemDatePicker();
    editingTicketOriginalState = null;
    document.getElementById('ticketModal').style.display = 'none';
}

function getSelectedPlatformAutoGenConfig() {
    const platformName = (document.getElementById('formPlatform')?.value || "").trim();
    const found = (AppState.settings.platforms || []).find(p => {
        const pName = typeof p === 'string' ? p : p.name;
        return String(pName).trim().toLowerCase() === platformName.toLowerCase();
    });
    if (!found) return { autoGen: false, prefix: "CPAO" };
    if (typeof found === 'string') return { autoGen: false, prefix: "CPAO" };
    return {
        autoGen: !!found.autoGen,
        prefix: String(found.prefix || "CPAO").trim() || "CPAO"
    };
}

function autoGenTicketNo(force = false) {
    const editIdx = document.getElementById('editTicketIndex')?.value;
    if (editIdx !== '' && !force) return;

    const cfg = getSelectedPlatformAutoGenConfig();
    const refInput = document.getElementById('formReferralNo');
    if (!refInput) return;

    if (!cfg.autoGen && !force) {
        return;
    }

    const rawAdmin = (document.getElementById('formAdminNo')?.value || currentUser.adminNo || currentUser.username || "").trim();
    const adminDigitsMatch = rawAdmin.match(/\d+/);
    const adminNum = adminDigitsMatch ? adminDigitsMatch[0] : (rawAdmin.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || "36");

    const dateVal = document.getElementById('formDateReceived')?.value || getTodayISO();
    const mdy = isoToMMDDYYYY(dateVal);
    const cleanDateNoSlash = mdy.replace(/\//g, "");

    let maxSeq = 0;
    const prefixEsc = cfg.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${prefixEsc}-${cleanDateNoSlash}-${adminNum}-(\d+)$`, 'i');

    (AppState.tickets || []).forEach(t => {
        const ref = String(t.referralNo || "").trim();
        const m = ref.match(regex);
        if (m && m[1]) {
            const seqVal = parseInt(m[1], 10);
            if (!isNaN(seqVal) && seqVal > maxSeq) maxSeq = seqVal;
        }
    });

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    refInput.value = `${cfg.prefix}-${cleanDateNoSlash}-${adminNum}-${nextSeq}`;
}

function saveTicketForm(e) {
    e.preventDefault();
    if (isSavingTicket) return;

    const editIdxStr = document.getElementById('editTicketIndex').value;
    const isEditing = editIdxStr !== '';
    const idx = isEditing ? parseInt(editIdxStr, 10) : -1;

    if (isEditing && AppState.tickets[idx] && !canMutateTicket(AppState.tickets[idx])) {
        showSystemAlert("Access Restricted", "You can only modify ticket logs assigned to your own Admin account.", "🔒");
        return;
    }

    const enforcedAdminNo = isEditing && AppState.tickets[idx]
        ? String(AppState.tickets[idx].adminNo || '').trim()
        : (currentUser.adminNo || deriveOperatorAdminNo(currentUser) || document.getElementById('formAdminNo').value.trim());

    const extraData = isEditing && AppState.tickets[idx] && AppState.tickets[idx].extraData
        ? { ...AppState.tickets[idx].extraData }
        : {};
    if (AppState.settings.customFields) {
        AppState.settings.customFields.forEach(cf => {
            const el = document.getElementById(`customField_${cf.id}`);
            if (el) extraData[cf.id] = el.value.trim();
        });
    }

    const statusVal = document.getElementById('formStatus').value.trim();
    const isClosed = statusVal.toLowerCase() === 'closed';
    const is24hChecked = !isClosed && !!document.getElementById('formIs24Hours').checked;

    const prev24hEnabled = !!(isEditing && AppState.tickets[idx] && (AppState.tickets[idx].is24Hours || (AppState.tickets[idx].extraData && AppState.tickets[idx].extraData.is24Hours)));
    const prevStartedAt = (isEditing && AppState.tickets[idx]?.extraData?.timer24hStartedAt) || null;
    const prevDueAt = (isEditing && AppState.tickets[idx]?.extraData?.timer24hDueAt) || null;
    const prevRemindedAt = (isEditing && AppState.tickets[idx]?.extraData?.timer24hRemindedAt) || null;

    if (is24hChecked) {
        if (!prev24hEnabled || !prevDueAt || !prevStartedAt) {
            const startedNow = Date.now();
            extraData.timer24hStartedAt = startedNow;
            extraData.timer24hDueAt = startedNow + TIMER_24H_DURATION_MS;
            extraData.timer24hRemindedAt = null;
        } else {
            extraData.timer24hStartedAt = prevStartedAt;
            extraData.timer24hDueAt = prevDueAt;
            extraData.timer24hRemindedAt = prevRemindedAt;
        }
        extraData.is24Hours = true;
    } else {
        extraData.is24Hours = false;
        if (isClosed) {
            extraData.timer24hStartedAt = null;
            extraData.timer24hDueAt = null;
            extraData.timer24hRemindedAt = null;
        }
    }

    const refNoTrimmed = document.getElementById('formReferralNo').value.trim();
    const newTicket = {
        rowIndex: isEditing && AppState.tickets[idx] ? AppState.tickets[idx].rowIndex : null,
        adminNo: enforcedAdminNo,
        platform: document.getElementById('formPlatform').value.trim(),
        referralNo: refNoTrimmed,
        dateReceived: isoToMMDDYYYY(document.getElementById('formDateReceived').value),
        category: (document.getElementById('formCategorySearch')?.value || '').trim(),
        ticketType: document.getElementById('formTicketType').value.trim(),
        complainantName: document.getElementById('formComplainantName').value.trim(),
        ticketDetails: document.getElementById('formTicketDetails').value.trim(),
        responseDetails: document.getElementById('formResponseDetails').value.trim(),
        actionTaken: document.getElementById('formActionTaken').value.trim(),
        status: statusVal,
        remarks: document.getElementById('formRemarks').value.trim(),
        is24Hours: is24hChecked,
        extraData
    };

    if (!isEditing && refNoTrimmed) {
        const dupIdx = AppState.tickets.findIndex(item => String(item.referralNo || '').trim().toLowerCase() === refNoTrimmed.toLowerCase());
        if (dupIdx !== -1) {
            const existing = AppState.tickets[dupIdx];
            pendingTicketSubmission = { newTicket, isEditing, idx };
            document.getElementById('dupExistingInfo').innerHTML = `
                <strong>Existing Ticket #:</strong> <span class="font-mono text-amber-300">${escapeHtml(existing.referralNo)}</span><br>
                <strong>Complainant:</strong> ${escapeHtml(existing.complainantName || '—')}<br>
                <strong>Date Received:</strong> <span class="font-mono">${escapeHtml(existing.dateReceived || '—')}</span><br>
                <strong>Status:</strong> ${escapeHtml(existing.status || '—')}
            `;
            document.getElementById('duplicateWarningModal').style.display = 'flex';
            return;
        }
    }

    commitTicketSubmission(newTicket, isEditing, idx);
}

function cancelDuplicateTicket() {
    pendingTicketSubmission = null;
    document.getElementById('duplicateWarningModal').style.display = 'none';
}

function proceedWithDuplicateTicket() {
    const sub = pendingTicketSubmission;
    pendingTicketSubmission = null;
    document.getElementById('duplicateWarningModal').style.display = 'none';
    if (!sub) return;
    commitTicketSubmission(sub.newTicket, sub.isEditing, sub.idx);
}

async function commitTicketSubmission(newTicket, isEditing, idx) {
    if (isSavingTicket) return;
    isSavingTicket = true;
    const submitBtn = document.querySelector('#ticketModal button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "Save Ticket Log";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
    }

    const previousTicketsSnapshot = AppState.tickets.map(item => ({
        ...item,
        extraData: { ...(item.extraData || {}) }
    }));

    try {
        let targetRowIdx = null;
        if (isEditing && idx >= 0 && AppState.tickets[idx]) {
            const prevTicket = AppState.tickets[idx];
            targetRowIdx = prevTicket.rowIndex || (idx + 2);
            newTicket.rowIndex = targetRowIdx;
            AppState.tickets[idx] = newTicket;
        } else {
            AppState.tickets.push(newTicket);
        }

        lastTicketModalDraft = null;
        saveStorage();
        renderTable();
        updateKPIs();
        render24HourReminderBanner();
        document.getElementById('ticketModal').style.display = 'none';
        updateSyncStatusBadge("syncing");

        const storageKey = isEditing ? LAST_WORKING_UPDATE_ACTION_KEY : LAST_WORKING_ADD_ACTION_KEY;
        const cachedAction = localStorage.getItem(storageKey);
        const actionCandidates = Array.from(new Set(
            (isEditing
                ? [cachedAction, "updateLog", "updateTicket", "update", "editLog", "edit", "saveLog", "save"]
                : [cachedAction, "addLog", "addTicket", "createLog", "createTicket", "create", "add", "insert", "append", "saveLog", "save"]
            ).filter(Boolean)
        ));

        let lastErrMsg = "";
        let savedInCloud = false;

        for (const actionName of actionCandidates) {
            try {
                const { resData, errMsg } = await sendTicketPayloadToAppsScript(actionName, targetRowIdx, newTicket);
                if (!errMsg) {
                    localStorage.setItem(storageKey, actionName);
                    savedInCloud = true;

                    const clientKey = `${String(newTicket.referralNo || '').trim().toLowerCase()}|${String(newTicket.dateReceived || '').trim()}|${String(newTicket.complainantName || '').trim().toLowerCase()}`;
                    removePendingTicketSync(clientKey);

                    const savedIdx = AppState.tickets.findIndex(item =>
                        String(item.referralNo || '').trim().toLowerCase() === String(newTicket.referralNo || '').trim().toLowerCase() &&
                        String(item.dateReceived || '').trim() === String(newTicket.dateReceived || '').trim()
                    );
                    if (savedIdx >= 0 && resData && resData.rowIndex) {
                        AppState.tickets[savedIdx].rowIndex = resData.rowIndex;
                        saveStorage();
                    }

                    updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
                    showToast(isEditing ? "Ticket updated & synced to Google Sheets." : "Ticket saved & synced to Google Sheets.");
                    break;
                }
                lastErrMsg = errMsg;
                if (!isUnknownActionErrorMessage(errMsg)) {
                    break;
                }
            } catch (networkErr) {
                lastErrMsg = networkErr && networkErr.message ? networkErr.message : "Network error";
            }
        }

        if (!savedInCloud) {
            enqueuePendingTicketSync(newTicket, isEditing, targetRowIdx);
            updateSyncStatusBadge("queued");
            showToast(isEditing ? "Ticket updated locally (queued for Google Sheets sync)." : "Ticket saved locally (queued for Google Sheets sync).");
            console.warn("Ticket saved locally and queued for background sync:", lastErrMsg || previousTicketsSnapshot.length);
        }
    } finally {
        isSavingTicket = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

async function deleteTicket(idx) {
    const t = AppState.tickets[idx];
    if (!t) return;
    if (!canMutateTicket(t)) {
        showSystemAlert("Access Restricted", "You can only delete ticket logs assigned to your own Admin account.", "🔒");
        return;
    }

    showSystemConfirm("Delete Ticket", `Are you sure you want to delete Ticket #${t.referralNo}?`, async () => {
        const targetRowIdx = t.rowIndex || (idx + 2);
        const clientKey = `${String(t.referralNo || '').trim().toLowerCase()}|${String(t.dateReceived || '').trim()}|${String(t.complainantName || '').trim().toLowerCase()}`;
        removePendingTicketSync(clientKey);

        AppState.tickets.splice(idx, 1);
        saveStorage();
        renderTable();
        updateKPIs();
        render24HourReminderBanner();

        try {
            const response = await fetchWithRetry(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "deleteLog",
                    sheet: "Logs",
                    rowIndex: targetRowIdx,
                    row: targetRowIdx,
                    referralNo: t.referralNo,
                    ticketNo: t.referralNo
                })
            }, 2);
            const rawText = await response.text();
            let resData = {};
            try { resData = rawText ? JSON.parse(rawText) : {}; } catch (e) { resData = {}; }
            const errMsg = (resData && (resData.error || (resData.success === false && (resData.message || "Delete failed")))) || "";
            if (errMsg) {
                throw new Error(errMsg);
            }
            updateSyncStatusBadge(loadPendingSyncQueue().length > 0 ? "queued" : "synced");
            showToast("Ticket deleted and synced to Google Sheets.");
        } catch(e) {
            console.warn("Delete cloud sync failed:", e);
            updateSyncStatusBadge("error");
            showToast("Ticket removed locally; cloud delete failed.");
        }
    });
}

function get24HourDueTimestamp(ticket) {
    if (!ticket) return null;
    const isClosed = String(ticket.status || '').trim().toLowerCase() === 'closed';
    const isEnabled = !isClosed && !!(ticket.is24Hours || (ticket.extraData && ticket.extraData.is24Hours));
    if (!isEnabled) return null;

    const extra = ticket.extraData || {};
    if (extra.timer24hDueAt) {
        const parsedDue = Number(extra.timer24hDueAt);
        if (!isNaN(parsedDue) && parsedDue > 0) return parsedDue;
    }

    const baseDateIso = mmddyyyyToISO(ticket.dateReceived);
    const baseMs = new Date(baseDateIso + "T08:00:00").getTime();
    if (!isNaN(baseMs) && baseMs > 0) {
        return baseMs + TIMER_24H_DURATION_MS;
    }
    return Date.now() + TIMER_24H_DURATION_MS;
}

function render24HourReminderBanner() {
    if (AppState.settings?.notifications && AppState.settings.notifications.overdue24hBanner === false) {
        const banner = document.getElementById('reminder24hBanner');
        if (banner) banner.classList.add('hidden');
        return;
    }
    const banner = document.getElementById('reminder24hBanner');
    const textEl = document.getElementById('reminder24hBannerText');
    if (!banner || !textEl) return;

    const now = Date.now();
    const activeItems = (AppState.tickets || []).filter(t => get24HourDueTimestamp(t) !== null);
    if (!activeItems.length) {
        banner.classList.add('hidden');
        return;
    }

    const dueNow = activeItems.filter(t => now >= get24HourDueTimestamp(t));
    if (dueNow.length > 0) {
        const sampleRefs = dueNow.slice(0, 3).map(t => `#${t.referralNo || 'N/A'}`).join(', ');
        textEl.textContent = `24-Hour Follow-Up Due: ${dueNow.length} pending ticket(s) reached 24 hours (${sampleRefs}${dueNow.length > 3 ? ', ...' : ''}). Please review and update action/status.`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

function renderTable() {
    const tbody = document.getElementById('ticketTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const dataTableEl = document.querySelector('#viewLogs .data-table');
    if (dataTableEl) {
        dataTableEl.classList.toggle('dense-rows', !!AppState.settings?.preferences?.denseTableMode);
    }

    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const platFilter = document.getElementById('filterPlatform')?.value || '';
    const statFilter = document.getElementById('filterStatus')?.value || '';
    const dateFilter = document.getElementById('filterDate')?.value || '';
    const scopeFilter = document.getElementById('superadminViewScope')?.value || 'all';

    let myAdminDigits = '';
    if (scopeFilter === 'my') {
        const rawAdmin = String(currentUser.adminNo || deriveOperatorAdminNo(currentUser) || currentUser.username || '').trim().toLowerCase();
        const digits = rawAdmin.replace(/\D/g, '');
        myAdminDigits = digits || rawAdmin;
    }

    let filtered = AppState.tickets.filter((t, idx) => {
        t._origIndex = idx;
        if (scopeFilter === 'my') {
            const tAdminRaw = String(t.adminNo || '').trim().toLowerCase();
            const tDigits = tAdminRaw.replace(/\D/g, '');
            const matchesAdmin = myAdminDigits
                ? (tDigits === myAdminDigits || tAdminRaw.includes(myAdminDigits))
                : isTicketOwnedByCurrentUser(t);
            if (!matchesAdmin) return false;
        }
        if (platFilter && t.platform !== platFilter) return false;
        if (statFilter && t.status !== statFilter) return false;
        if (dateFilter) {
            const filterMDY = isoToMMDDYYYY(dateFilter);
            const cleanTD = formatCleanDate(t.dateReceived);
            if (cleanTD !== filterMDY && mmddyyyyToISO(cleanTD) !== dateFilter) return false;
        }
        if (q) {
            let match = (t.referralNo && t.referralNo.toLowerCase().includes(q)) ||
                        (t.complainantName && t.complainantName.toLowerCase().includes(q)) ||
                        (t.category && t.category.toLowerCase().includes(q)) ||
                        (t.adminNo && t.adminNo.toLowerCase().includes(q));
            if(!match && t.extraData) {
                match = Object.values(t.extraData).some(val => String(val).toLowerCase().includes(q));
            }
            if (!match) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="text-center py-8 text-slate-400 text-xs">No ticket logs found matching your filters. Click <strong>+ New Log</strong> above to add one!</td></tr>`;
        return;
    }

    const userColorMap = {};
    AppState.users.forEach(u => {
        if (u.username && u.logColor && u.logColor !== 'Default') {
            userColorMap[u.username.toLowerCase()] = u.logColor;
        }
    });
    if (currentUser.username && currentUser.logColor && currentUser.logColor !== 'Default') {
        userColorMap[currentUser.username.toLowerCase()] = currentUser.logColor;
    }

    filtered.forEach((t, idx) => {
        const tr = document.createElement('tr');
        const isClosed = t.status && t.status.toLowerCase() === 'closed';
        const badgeClass = isClosed ? 'badge-closed' : 'badge-pending';
        const statusText = t.status || 'Closed';

        const adminClean = (t.adminNo || '').trim().toLowerCase();
        const adminNumMatch = adminClean.match(/\d+/);
        let rowColor = null;
        if (userColorMap[adminClean]) rowColor = userColorMap[adminClean];
        else if (adminNumMatch && userColorMap['admin' + adminNumMatch[0]]) rowColor = userColorMap['admin' + adminNumMatch[0]];
        else if (currentUser.logColor && currentUser.logColor !== 'Default') {
            if (isTicketOwnedByCurrentUser(t)) rowColor = currentUser.logColor;
        }

        if (rowColor && rowColor !== 'Default') {
            tr.style.backgroundColor = rowColor + '42';
            tr.style.borderLeft = `4px solid ${rowColor}`;
        }

        const is24hActive = !isClosed && !!(t.is24Hours || (t.extraData && t.extraData.is24Hours));
        const dueMs = get24HourDueTimestamp(t);
        const is24hOverdue = is24hActive && dueMs && Date.now() >= dueMs;
        const timerBadgeHtml = is24hActive
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-[10px] font-bold ${is24hOverdue ? 'bg-rose-950 text-rose-300 border border-rose-600/70' : 'bg-amber-950/90 text-amber-300 border border-amber-600/60'}">${is24hOverdue ? '⏰ 24H DUE' : '⏱️ 24H TIMER'}</span>`
            : '';

        const canEditThisRow = canMutateTicket(t);
        const canEndorseThisRow = canEndorseTicket(t);

        const editBtnHtml = canEditThisRow
            ? `<button type="button" onclick="openEditModal(${t._origIndex})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold" title="Edit">✏️</button>`
            : `<button type="button" disabled class="px-2 py-1 bg-slate-900/50 text-slate-600 border border-slate-800/60 rounded text-[10px] font-bold cursor-not-allowed opacity-45" title="Own log only">✏️</button>`;

        const deleteBtnHtml = canEditThisRow
            ? `<button type="button" onclick="deleteTicket(${t._origIndex})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-bold" title="Delete">🗑️</button>`
            : `<button type="button" disabled class="px-2 py-1 bg-slate-900/50 text-slate-600 border border-slate-800/60 rounded text-[10px] font-bold cursor-not-allowed opacity-45" title="Own log only">🗑️</button>`;

        const endorseBtnHtml = canEndorseThisRow
            ? `<button type="button" onclick="openEndorseModal(${t._origIndex})" class="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold" title="Endorse">📄</button>`
            : `<button type="button" disabled class="px-2 py-1 bg-slate-900/50 text-slate-600 border border-slate-800/60 rounded text-[10px] font-bold cursor-not-allowed opacity-45" title="Own log only">📄</button>`;

        const rowCellsHtml = `
            <td class="text-slate-400 font-mono text-[11px] text-center">${idx + 1}</td>
            <td class="text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                    ${editBtnHtml}
                    ${deleteBtnHtml}
                    ${endorseBtnHtml}
                </div>
            </td>
            <td class="font-bold text-slate-200 whitespace-nowrap">${escapeHtml(t.adminNo)}</td>
            <td><span class="chip-pill">${escapeHtml(t.platform)}</span></td>
            <td class="font-mono font-bold text-amber-400 whitespace-nowrap">${escapeHtml(t.referralNo)}</td>
            <td class="font-mono text-slate-300 whitespace-nowrap">${escapeHtml(formatCleanDate(t.dateReceived))}</td>
            <td class="font-semibold text-white">${escapeHtml(t.category)}</td>
            <td class="text-slate-300 text-[11px]">${escapeHtml(t.ticketType)}</td>
            <td class="font-semibold text-slate-100">${escapeHtml(t.complainantName)}</td>
            <td class="text-slate-300 text-[11px] max-w-xs">${escapeHtml(t.ticketDetails)}</td>
            <td class="text-slate-300 text-[11px] max-w-xs">${escapeHtml(t.responseDetails)}</td>
            <td class="text-[11px] text-sky-400 font-semibold">${escapeHtml(t.actionTaken)}</td>
            <td class="text-center whitespace-nowrap">
                <div class="flex flex-col items-center">
                    <span class="${badgeClass}">${escapeHtml(statusText)}</span>
                    ${timerBadgeHtml}
                </div>
            </td>
            <td class="text-[11px] text-slate-400 italic">${escapeHtml(t.remarks)}</td>
        `;

        tr.innerHTML = rowCellsHtml;
        tbody.appendChild(tr);
    });
}

function updateKPIs() {
    let total = AppState.tickets.length;
    let closed = AppState.tickets.filter(t => t.status && t.status.toLowerCase() === 'closed').length;
    let pending = total - closed;
    let rate = total > 0 ? ((closed / total) * 100).toFixed(1) : 0;

    if(document.getElementById('kpiTotal')) document.getElementById('kpiTotal').textContent = total;
    if(document.getElementById('kpiClosed')) document.getElementById('kpiClosed').textContent = closed;
    if(document.getElementById('kpiPending')) document.getElementById('kpiPending').textContent = pending;
    if(document.getElementById('kpiRate')) document.getElementById('kpiRate').textContent = rate + '%';
}

function renderSnippets() {
    const container = document.getElementById('snippetCardsContainer');
    if(!container) return;
    container.innerHTML = '';
    if(!AppState.templates || AppState.templates.length === 0) return;

    AppState.templates.forEach((s, idx) => {
        const card = document.createElement('div');
        card.className = 'glass-panel p-4 rounded-xl flex flex-col justify-between gap-3 border border-slate-700/80 hover:border-sky-500/50 transition';
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <h4 class="font-bold text-xs text-sky-400 uppercase tracking-wider">${escapeHtml(s.title)}</h4>
                    <button type="button" onclick="deleteSnippet(${idx})" class="text-slate-500 hover:text-rose-400 text-xs">✕</button>
                </div>
                <p class="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800/80">${escapeHtml(s.text)}</p>
            </div>
            <button type="button" onclick="copySnippetText(${idx})" class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded shadow transition flex items-center justify-center gap-1.5 border border-slate-700">
                <span>📋</span> <span>Copy Response</span>
            </button>
        `;
        container.appendChild(card);
    });
}

function copySnippetText(idx) {
    const s = AppState.templates[idx];
    if(!s) return;
    navigator.clipboard.writeText(s.text).then(() => showToast("Response copied to clipboard!"));
}

function openSnippetModal() { document.getElementById('snippetModal').style.display = 'flex'; }
function closeSnippetModal() { document.getElementById('snippetModal').style.display = 'none'; }

function saveSnippet() {
    const title = document.getElementById('newSnippetTitle').value.trim();
    const text = document.getElementById('newSnippetText').value.trim();
    if(!title || !text) { showSystemAlert("Missing Fields", "Please provide both a title and response text.", "⚠️"); return; }
    AppState.templates.push({ title, text });
    localStorage.setItem('LTO_CPAO_SNIPPETS_2026', JSON.stringify(AppState.templates));
    document.getElementById('newSnippetTitle').value = '';
    document.getElementById('newSnippetText').value = '';
    closeSnippetModal();
    renderSnippets();
    showToast("Response snippet saved!");
}

function deleteSnippet(idx) {
    showSystemConfirm("Delete Snippet", "Are you sure you want to delete this snippet?", () => {
        AppState.templates.splice(idx, 1);
        localStorage.setItem('LTO_CPAO_SNIPPETS_2026', JSON.stringify(AppState.templates));
        renderSnippets();
    });
}

function isWeekendDay(year, monthIndex, day) {
    const dow = new Date(year, monthIndex, day).getDay();
    return dow === 0 || dow === 6;
}

function isDateNonWorking(isoStr) {
    if (!isoStr) return false;
    const parts = isoStr.split('-');
    if (parts.length !== 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const weekend = isWeekendDay(y, m, d);
    const manuallyToggled = (AppState.toggledOffDates || []).includes(isoStr);
    return weekend ? !manuallyToggled : manuallyToggled;
}

function addWorkingDays(startDateStr, daysToAdd) {
    let iso = startDateStr.includes('/') ? mmddyyyyToISO(startDateStr) : startDateStr;
    let parts = iso.split('-');
    if (parts.length !== 3) return startDateStr;

    let current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    let added = 0;

    while (added < daysToAdd) {
        current.setDate(current.getDate() + 1);
        const y = current.getFullYear();
        const m = current.getMonth();
        const d = current.getDate();
        const checkIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!isDateNonWorking(checkIso)) added++;
    }

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
}

function runWorkdayCalculator() {
    const startIso = document.getElementById('calcStartDate')?.value;
    if (!startIso) return;
    setCalcDateValue(startIso);

    const dueDateStr = addWorkingDays(startIso, 20);
    const summaryEl = document.getElementById('calcResultSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div><strong>Start Date:</strong> <span class="font-mono text-white">${isoToMMDDYYYY(startIso)}</span></div>
            <div><strong>20th Working Day Due Date:</strong> <span class="font-extrabold text-emerald-400">${escapeHtml(dueDateStr)}</span></div>
            <div class="text-[11px] text-slate-400">Excludes weekends unless manually toggled ON, and excludes configured holidays/non-working dates.</div>
        `;
    }
    renderCalcCalendar();
}

function changeCalcMonth(delta) {
    calcCurrentMonth += delta;
    if (calcCurrentMonth > 11) { calcCurrentMonth = 0; calcCurrentYear++; }
    if (calcCurrentMonth < 0) { calcCurrentMonth = 11; calcCurrentYear--; }
    renderCalcCalendar();
}

async function toggleCalendarOffDate(isoStr) {
    if (!canUserEditWorkdayOffDates()) {
        showSystemAlert("Access Restricted", "Only AdminTL or Super Admin can modify non-working / holiday calendar dates.", "🔒");
        return;
    }
    const idx = AppState.toggledOffDates.indexOf(isoStr);
    if (idx >= 0) {
        AppState.toggledOffDates.splice(idx, 1);
    } else {
        AppState.toggledOffDates.push(isoStr);
    }
    AppState.toggledOffDates.sort();
    await saveOffDatesStorage(true);
    renderCalcCalendar();
    runWorkdayCalculator();
}

async function resetOffDates() {
    if (!canUserEditWorkdayOffDates()) {
        showSystemAlert("Access Restricted", "Only AdminTL or Super Admin can reset non-working / holiday calendar dates.", "🔒");
        return;
    }
    showSystemConfirm("Reset Off Dates", "Clear all manually toggled non-working / holiday dates?", async () => {
        AppState.toggledOffDates = [];
        await saveOffDatesStorage(true);
        renderCalcCalendar();
        runWorkdayCalculator();
        showToast("All manually toggled off dates cleared.");
    });
}

function renderSavedOffDatesSummary() {
    const container = document.getElementById('savedOffDatesSummary');
    if (!container) return;
    const list = AppState.toggledOffDates || [];
    const canEdit = canUserEditWorkdayOffDates();
    if (list.length === 0) {
        container.innerHTML = `<span class="text-[11px] text-slate-500 italic">No manually toggled dates saved.</span>`;
        return;
    }
    container.innerHTML = list.map(iso => `
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-amber-300">
            ${escapeHtml(isoToMMDDYYYY(iso))}
            ${canEdit ? `<button type="button" onclick="toggleCalendarOffDate('${iso}')" class="off-date-remove-btn text-rose-400 hover:text-rose-200 font-bold">✕</button>` : ''}
        </span>
    `).join('');
}

function renderCalcCalendar() {
    const grid = document.getElementById('calcCalendarGrid');
    const title = document.getElementById('calcMonthTitle');
    if (!grid || !title) return;

    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    title.textContent = `${monthsNames[calcCurrentMonth]} ${calcCurrentYear}`;

    const startIso = document.getElementById('calcStartDate')?.value || '';
    const canEdit = canUserEditWorkdayOffDates();

    let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d =>
        `<div class="text-[10px] font-extrabold uppercase text-slate-500 py-1">${d}</div>`
    ).join('');

    const firstDay = new Date(calcCurrentYear, calcCurrentMonth, 1).getDay();
    const daysInMonth = new Date(calcCurrentYear, calcCurrentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${calcCurrentYear}-${String(calcCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const off = isDateNonWorking(iso);
        const isStart = iso === startIso;

        let cls = off
            ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
            : "bg-slate-950 text-slate-200 border border-slate-800 hover:border-sky-500";
        if (isStart) cls += " ring-2 ring-sky-400";
        if (!canEdit) cls += " opacity-75 cursor-not-allowed";

        html += `
            <button type="button" onclick="toggleCalendarOffDate('${iso}')" class="calc-date-toggle-btn p-2 rounded-lg text-xs font-mono font-bold transition flex flex-col items-center justify-center ${cls}" title="${isoToMMDDYYYY(iso)}">
                <span>${day}</span>
                <span class="text-[9px] uppercase">${off ? 'OFF' : 'WORK'}</span>
            </button>
        `;
    }

    grid.innerHTML = html;
}

function getEndorseDraftStorageKey(ticketRefNo = "") {
    const cleanRef = String(ticketRefNo || "").trim().toLowerCase() || "general";
    return `LTO_ENDORSE_DRAFT_${String(currentUser.username || "user").toLowerCase()}_${cleanRef}`;
}

function saveEndorseModalDraft(ticketRefNo = "") {
    const draft = {
        ticketIndex: document.getElementById('endorseTicketIndex')?.value || '',
        referralNo: ticketRefNo || '',
        officeKey: document.getElementById('endOfficeSelect')?.value || '',
        chiefName: document.getElementById('endChiefName')?.value || '',
        position: document.getElementById('endPosition')?.value || '',
        agencyName: document.getElementById('endAgencyName')?.value || '',
        officeAddress: document.getElementById('endOfficeAddress')?.value || '',
        emailAddress: document.getElementById('endEmailAddress')?.value || '',
        rdmpaoEmail: document.getElementById('endRdmpaoEmail')?.value || '',
        complainantName: document.getElementById('endComplainantName')?.value || '',
        complainantEmail: document.getElementById('endComplainantEmail')?.value || '',
        briefDescription: document.getElementById('endBriefDescription')?.value || '',
        fontFamily: document.getElementById('endFontFamily')?.value || 'font-sans',
        sigType: document.querySelector('input[name="sigType"]:checked')?.value || 'esign',
        arrangeMode: document.getElementById('endAttachmentArrangeMode')?.value || 'custom',
        layoutMode: document.getElementById('endAttachmentLayoutMode')?.value || 'page_per_item',
        attachments: (endorseAttachments || []).map(att => ({
            id: att.id,
            name: att.name,
            type: att.type,
            dataUrl: att.dataUrl,
            pages: Array.isArray(att.pages) ? [...att.pages] : []
        }))
    };
    lastEndorseModalDraft = draft;
    try {
        sessionStorage.setItem(getEndorseDraftStorageKey(ticketRefNo), JSON.stringify(draft));
    } catch (e) {}
}

function loadEndorseModalDraft(ticketRefNo = "") {
    let draft = null;
    try {
        const raw = sessionStorage.getItem(getEndorseDraftStorageKey(ticketRefNo));
        if (raw) draft = JSON.parse(raw);
    } catch (e) {}
    if (!draft && lastEndorseModalDraft && (!ticketRefNo || lastEndorseModalDraft.referralNo === ticketRefNo)) {
        draft = lastEndorseModalDraft;
    }
    return draft;
}

function clearEndorseModalDraft(ticketRefNo = "") {
    lastEndorseModalDraft = null;
    try {
        sessionStorage.removeItem(getEndorseDraftStorageKey(ticketRefNo));
    } catch (e) {}
}

let endorseAttachments = [];
let activeEndorseTicket = null;
let lastGeneratedEndorseData = null;

if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function triggerEndorseFilePicker() {
    const input = document.getElementById('endAttachmentFiles');
    if (input) {
        input.value = '';
        input.click();
    }
}

function handleEndorseDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById('endAttachmentDropzone');
    if (dz) dz.classList.add('border-sky-400', 'bg-sky-950/20');
}

function handleEndorseDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById('endAttachmentDropzone');
    if (dz) dz.classList.remove('border-sky-400', 'bg-sky-950/20');
}

function handleEndorseFilesDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dz = document.getElementById('endAttachmentDropzone');
    if (dz) dz.classList.remove('border-sky-400', 'bg-sky-950/20');
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
        processEndorseFiles(files);
    }
}

function handleEndorseFilesSelected(e) {
    const files = Array.from(e.target?.files || []);
    if (files.length > 0) {
        processEndorseFiles(files);
    }
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImageDataUrl(dataUrl, maxDim = 1600, quality = 0.85) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w >= h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function renderPdfFileToPageImages(file) {
    if (!window.pdfjsLib) {
        throw new Error("PDF renderer is not available.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas.toDataURL('image/jpeg', 0.86));
    }
    return pages;
}

async function processEndorseFiles(files) {
    const validFiles = files.filter(f => {
        const isImg = f.type && f.type.startsWith('image/');
        const isPdf = (f.type === 'application/pdf') || f.name.toLowerCase().endsWith('.pdf');
        return isImg || isPdf;
    });

    if (validFiles.length === 0) {
        showSystemAlert("Unsupported File", "Please attach image files (JPG, PNG, WEBP) or PDF files.", "⚠️");
        return;
    }

    showToast(`Processing ${validFiles.length} attachment(s)...`);

    for (const file of validFiles) {
        try {
            const id = 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                const pageImages = await renderPdfFileToPageImages(file);
                endorseAttachments.push({
                    id,
                    name: file.name,
                    type: 'pdf',
                    dataUrl: pageImages[0] || '',
                    pages: pageImages
                });
            } else {
                const rawUrl = await readFileAsDataUrl(file);
                const compressedUrl = await compressImageDataUrl(rawUrl);
                endorseAttachments.push({
                    id,
                    name: file.name,
                    type: 'image',
                    dataUrl: compressedUrl,
                    pages: [compressedUrl]
                });
            }
        } catch (err) {
            console.warn("Attachment processing error:", err);
            showSystemAlert("Attachment Error", `Could not process "${file.name}".`, "⚠️");
        }
    }

    const arrangeSel = document.getElementById('endAttachmentArrangeMode');
    if (arrangeSel && arrangeSel.value !== 'custom') {
        sortEndorseAttachmentsByMode(arrangeSel.value);
    }
    renderEndorseAttachmentsList();
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function sortEndorseAttachmentsByMode(mode) {
    if (!Array.isArray(endorseAttachments) || endorseAttachments.length < 2) return;
    if (mode === 'name_asc') {
        endorseAttachments.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else if (mode === 'name_desc') {
        endorseAttachments.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
    } else if (mode === 'images_first') {
        endorseAttachments.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'image' ? -1 : 1;
        });
    } else if (mode === 'pdfs_first') {
        endorseAttachments.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'pdf' ? -1 : 1;
        });
    }
}

function applyEndorseAttachmentArrange(mode) {
    if (mode && mode !== 'custom') {
        sortEndorseAttachmentsByMode(mode);
        renderEndorseAttachmentsList();
    }
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function onEndorseLayoutModeChange(mode) {
    const modeLabel = mode === 'two_per_page'
        ? '2 Items per Page'
        : (mode === 'stacked_same_page' ? 'Stacked on Same Page' : '1 Item per Page');
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
    showToast(`Attachment layout set to ${modeLabel}.`);
}

function moveEndorseAttachment(idx, delta) {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= endorseAttachments.length) return;
    const temp = endorseAttachments[idx];
    endorseAttachments[idx] = endorseAttachments[targetIdx];
    endorseAttachments[targetIdx] = temp;

    const arrangeSel = document.getElementById('endAttachmentArrangeMode');
    if (arrangeSel) arrangeSel.value = 'custom';

    renderEndorseAttachmentsList();
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function removeEndorseAttachment(idx) {
    endorseAttachments.splice(idx, 1);
    renderEndorseAttachmentsList();
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function clearAllEndorseAttachments() {
    endorseAttachments = [];
    renderEndorseAttachmentsList();
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function renderEndorseAttachmentsList() {
    const container = document.getElementById('endAttachmentListContainer');
    const clearBtn = document.getElementById('btnClearEndorseAttachments');
    const arrangeBar = document.getElementById('endAttachmentArrangeBar');
    if (!container) return;

    if (clearBtn) {
        clearBtn.classList.toggle('hidden', endorseAttachments.length === 0);
    }
    if (arrangeBar) {
        arrangeBar.classList.toggle('hidden', endorseAttachments.length === 0);
    }

    if (endorseAttachments.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-slate-500">No files attached. Drag &amp; drop or click <strong>+ Attach Files</strong> to include images or PDFs.</p>`;
        return;
    }

    container.innerHTML = endorseAttachments.map((att, idx) => {
        const badge = att.type === 'pdf'
            ? `<span class="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 text-[9px] font-extrabold">PDF • ${att.pages.length}p</span>`
            : `<span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 text-[9px] font-extrabold">IMG</span>`;
        const thumbHtml = att.dataUrl
            ? `<img src="${att.dataUrl}" class="w-9 h-9 rounded object-cover border border-slate-700 shrink-0 bg-white" />`
            : `<div class="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">FILE</div>`;

        return `
            <div class="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-[11px] font-mono font-bold text-slate-400 w-5 text-center shrink-0">${idx + 1}.</span>
                    ${thumbHtml}
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            ${badge}
                            <span class="text-xs font-semibold text-white truncate">${escapeHtml(att.name)}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="moveEndorseAttachment(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold" title="Move Up">▲</button>
                    <button type="button" onclick="moveEndorseAttachment(${idx}, 1)" ${idx === endorseAttachments.length - 1 ? 'disabled' : ''} class="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 rounded text-[10px] font-bold" title="Move Down">▼</button>
                    <button type="button" onclick="removeEndorseAttachment(${idx})" class="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold" title="Remove">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function buildEndorsementAttachmentsHtml() {
    if (!Array.isArray(endorseAttachments) || endorseAttachments.length === 0) return '';

    const layoutMode = document.getElementById('endAttachmentLayoutMode')?.value || 'page_per_item';
    const flattenedItems = [];
    endorseAttachments.forEach((att, attIdx) => {
        const pages = Array.isArray(att.pages) && att.pages.length > 0 ? att.pages : (att.dataUrl ? [att.dataUrl] : []);
        pages.forEach((imgUrl, pIdx) => {
            const pageLabel = pages.length > 1 ? `${att.name} (Page ${pIdx + 1} of ${pages.length})` : att.name;
            flattenedItems.push({
                order: attIdx + 1,
                label: pageLabel,
                src: imgUrl
            });
        });
    });

    if (flattenedItems.length === 0) return '';

    if (layoutMode === 'stacked_same_page') {
        const stackedCards = flattenedItems.map((item, idx) => `
            <div class="border border-slate-300 rounded-lg p-2.5 bg-white space-y-1.5">
                <div class="flex items-center justify-between text-[10px] font-bold text-slate-600 border-b border-slate-200 pb-1">
                    <span>Attachment #${idx + 1}: ${escapeHtml(item.label)}</span>
                </div>
                <div class="flex justify-center">
                    <img src="${item.src}" class="max-w-full max-h-[260px] w-auto h-auto object-contain rounded" />
                </div>
            </div>
        `).join('');

        return `
            <div class="report-a4-page report-page-break" style="justify-content: flex-start; gap: 12px;">
                <div class="border-b border-slate-300 pb-1.5 flex items-center justify-between">
                    <span class="text-xs font-extrabold uppercase tracking-wider text-slate-800">Attached Supporting Documents (${flattenedItems.length})</span>
                    <span class="text-[10px] font-mono text-slate-500">Ref: ${escapeHtml(lastGeneratedEndorseData?.ticketRefNo || '')}</span>
                </div>
                <div class="space-y-3">${stackedCards}</div>
            </div>
        `;
    }

    if (layoutMode === 'two_per_page') {
        let pagesHtml = '';
        for (let i = 0; i < flattenedItems.length; i += 2) {
            const pair = flattenedItems.slice(i, i + 2);
            const pairCards = pair.map((item, idxInPair) => `
                <div class="border border-slate-300 rounded-lg p-3 bg-white flex-1 flex flex-col justify-between gap-2">
                    <div class="text-[10px] font-bold text-slate-700 border-b border-slate-200 pb-1">
                        Attachment #${i + idxInPair + 1}: ${escapeHtml(item.label)}
                    </div>
                    <div class="flex-1 flex items-center justify-center overflow-hidden">
                        <img src="${item.src}" class="max-w-full max-h-[340px] w-auto h-auto object-contain rounded" />
                    </div>
                </div>
            `).join('');

            pagesHtml += `
                <div class="report-a4-page report-page-break" style="gap: 14px;">
                    <div class="border-b border-slate-300 pb-1.5 flex items-center justify-between">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-slate-800">Attached Supporting Documents</span>
                        <span class="text-[10px] font-mono text-slate-500">Ref: ${escapeHtml(lastGeneratedEndorseData?.ticketRefNo || '')}</span>
                    </div>
                    <div class="flex-1 flex flex-col gap-3">${pairCards}</div>
                </div>
            `;
        }
        return pagesHtml;
    }

    return flattenedItems.map((item, idx) => `
        <div class="report-a4-page report-page-break" style="justify-content: flex-start; gap: 14px;">
            <div class="border-b border-slate-300 pb-1.5 flex items-center justify-between">
                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-800">Attachment #${idx + 1}: ${escapeHtml(item.label)}</span>
                <span class="text-[10px] font-mono text-slate-500">Ref: ${escapeHtml(lastGeneratedEndorseData?.ticketRefNo || '')}</span>
            </div>
            <div class="flex-1 flex items-center justify-center">
                <img src="${item.src}" class="max-w-full max-h-[820px] w-auto h-auto object-contain rounded border border-slate-200" />
            </div>
        </div>
    `).join('');
}

function populateEndorseChiefDropdown(regionIdx, preferredName = "") {
    const chiefSel = document.getElementById('endChiefNameSelect');
    if (!chiefSel) return;

    const region = AppState.directory[regionIdx];
    const officials = getRegionOfficialsList(regionIdx);

    const options = [];
    if (region && region.chief) {
        options.push({
            name: region.chief,
            position: region.position || 'Regional Director',
            email: region.email || ''
        });
    }
    officials.forEach(off => {
        if (off.name && !options.some(o => o.name.toLowerCase() === off.name.toLowerCase())) {
            options.push({
                name: off.name,
                position: off.position || off.roleRank || 'Official',
                email: off.email || (region ? region.email : '')
            });
        }
    });

    chiefSel.innerHTML = options.length > 0
        ? options.map((o, i) => `<option value="${i}">${escapeHtml(o.name)} (${escapeHtml(o.position)})</option>`).join('')
        : `<option value="">-- Manual Entry --</option>`;

    chiefSel.dataset.optionsJson = JSON.stringify(options);

    if (options.length > 0) {
        let matchIdx = 0;
        if (preferredName) {
            const foundIdx = options.findIndex(o => o.name.toLowerCase().includes(preferredName.toLowerCase()) || preferredName.toLowerCase().includes(o.name.toLowerCase()));
            if (foundIdx >= 0) matchIdx = foundIdx;
        }
        chiefSel.value = String(matchIdx);
        const chosen = options[matchIdx];
        document.getElementById('endChiefName').value = chosen.name;
        document.getElementById('endPosition').value = chosen.position;
        if (chosen.email) {
            document.getElementById('endEmailAddress').value = chosen.email;
            document.getElementById('endRdmpaoEmail').value = chosen.email;
        }
    }
}

function onEndorseChiefDropdownChange(selectedIdxStr) {
    const chiefSel = document.getElementById('endChiefNameSelect');
    if (!chiefSel || selectedIdxStr === "") return;
    try {
        const options = JSON.parse(chiefSel.dataset.optionsJson || '[]');
        const chosen = options[parseInt(selectedIdxStr, 10)];
        if (chosen) {
            document.getElementById('endChiefName').value = chosen.name || '';
            document.getElementById('endPosition').value = chosen.position || '';
            if (chosen.email) {
                document.getElementById('endEmailAddress').value = chosen.email;
                document.getElementById('endRdmpaoEmail').value = chosen.email;
            }
        }
    } catch (e) {}
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function openEndorseModal(idx) {
    ensureDirectoryOfficialsInitialized();
    const t = AppState.tickets[idx];
    if (!t) return;
    if (!canEndorseTicket(t)) {
        showSystemAlert("Access Restricted", "You can only generate endorsement letters for ticket logs assigned to your own Admin account.", "🔒");
        return;
    }

    activeEndorseTicket = t;
    document.getElementById('endorseTicketIndex').value = idx;

    const sel = document.getElementById('endOfficeSelect');
    sel.innerHTML = '';
    AppState.directory.forEach((d, i) => {
        sel.innerHTML += `<option value="${i}">${escapeHtml(d.office)} (${escapeHtml(d.code)})</option>`;
    });

    const savedDraft = loadEndorseModalDraft(t.referralNo || '');

    if (savedDraft) {
        if (savedDraft.officeKey !== "" && AppState.directory[parseInt(savedDraft.officeKey, 10)]) {
            sel.value = savedDraft.officeKey;
            populateEndorseChiefDropdown(parseInt(savedDraft.officeKey, 10), savedDraft.chiefName || '');
        } else {
            sel.value = "0";
            populateEndorseChiefDropdown(0);
        }
        document.getElementById('endChiefName').value = savedDraft.chiefName || '';
        document.getElementById('endPosition').value = savedDraft.position || '';
        document.getElementById('endAgencyName').value = savedDraft.agencyName || '';
        document.getElementById('endOfficeAddress').value = savedDraft.officeAddress || '';
        document.getElementById('endEmailAddress').value = savedDraft.emailAddress || '';
        document.getElementById('endRdmpaoEmail').value = savedDraft.rdmpaoEmail || '';
        document.getElementById('endComplainantName').value = savedDraft.complainantName || t.complainantName || '';
        document.getElementById('endComplainantEmail').value = savedDraft.complainantEmail || '';
        document.getElementById('endBriefDescription').value = savedDraft.briefDescription || '';
        if (document.getElementById('endFontFamily')) document.getElementById('endFontFamily').value = savedDraft.fontFamily || 'font-sans';
        const sigRadio = document.querySelector(`input[name="sigType"][value="${savedDraft.sigType || 'esign'}"]`);
        if (sigRadio) sigRadio.checked = true;
        if (document.getElementById('endAttachmentArrangeMode')) document.getElementById('endAttachmentArrangeMode').value = savedDraft.arrangeMode || 'custom';
        if (document.getElementById('endAttachmentLayoutMode')) document.getElementById('endAttachmentLayoutMode').value = savedDraft.layoutMode || 'page_per_item';
        endorseAttachments = Array.isArray(savedDraft.attachments) ? savedDraft.attachments : [];
    } else {
        let defaultIdx = 0;
        const combinedText = `${t.actionTaken || ''} ${t.remarks || ''} ${t.ticketDetails || ''}`.toLowerCase();
        const foundIdx = AppState.directory.findIndex(d => {
            const codeMatch = d.code && new RegExp(`\b${d.code.toLowerCase()}\b`).test(combinedText);
            const officeMatch = d.office && combinedText.includes(d.office.toLowerCase());
            const regionNumMatch = d.office && /region\s*4-?a/i.test(combinedText) && /4-?a|iv-?a/i.test(d.office);
            return codeMatch || officeMatch || regionNumMatch;
        });
        if (foundIdx >= 0) defaultIdx = foundIdx;
        sel.value = String(defaultIdx);

        onRegionDirectorySelect(String(defaultIdx));
        document.getElementById('endComplainantName').value = t.complainantName || '';
        document.getElementById('endComplainantEmail').value = '';
        document.getElementById('endBriefDescription').value = '';
        if (document.getElementById('endFontFamily')) document.getElementById('endFontFamily').value = 'font-sans';
        const defaultSigRadio = document.querySelector('input[name="sigType"][value="esign"]');
        if (defaultSigRadio) defaultSigRadio.checked = true;
        if (document.getElementById('endAttachmentArrangeMode')) document.getElementById('endAttachmentArrangeMode').value = 'custom';
        if (document.getElementById('endAttachmentLayoutMode')) document.getElementById('endAttachmentLayoutMode').value = 'page_per_item';
        endorseAttachments = [];
    }

    renderEndorseAttachmentsList();
    document.getElementById('endorseModal').style.display = 'flex';
}

function onRegionDirectorySelect(idxStr) {
    ensureDirectoryOfficialsInitialized();
    const idx = parseInt(idxStr, 10);
    const d = AppState.directory[idx];
    if (!d) return;
    document.getElementById('endAgencyName').value = `Land Transportation Office – ${d.code || d.office}`;
    document.getElementById('endOfficeAddress').value = d.address || '';
    document.getElementById('endEmailAddress').value = d.email || '';
    document.getElementById('endRdmpaoEmail').value = d.email || '';
    populateEndorseChiefDropdown(idx);
    saveEndorseModalDraft(activeEndorseTicket?.referralNo || '');
}

function closeEndorseModal(discardDraft = false) {
    if (discardDraft) {
        clearEndorseModalDraft(activeEndorseTicket?.referralNo || '');
        endorseAttachments = [];
        renderEndorseAttachmentsList();
    } else if (activeEndorseTicket) {
        saveEndorseModalDraft(activeEndorseTicket.referralNo || '');
    }
    document.getElementById('endorseModal').style.display = 'none';
}

function closeEndorsePreviewModal() {
    setEndorsementEditState(false);
    document.getElementById('endorsePreviewModal').style.display = 'none';
}

function printEndorsementLetter() {
    if (isEndorseLetterEditing) {
        setEndorsementEditState(false);
    }
    document.body.classList.add('printing-endorse');
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-endorse');
        }, 350);
    }, 150);
}

function generateEndorsementLetter(e) {
    e.preventDefault();
    const idx = parseInt(document.getElementById('endorseTicketIndex').value, 10);
    const t = AppState.tickets[idx] || activeEndorseTicket;
    if (!t) return;

    saveEndorseModalDraft(t.referralNo || '');

    const chiefNameRaw = document.getElementById('endChiefName').value.trim();
    const chiefName = escapeHtml(chiefNameRaw);
    const chiefPosition = escapeHtml(document.getElementById('endPosition').value.trim());
    const agencyName = escapeHtml(document.getElementById('endAgencyName').value.trim());
    const officeAddress = escapeHtml(document.getElementById('endOfficeAddress').value.trim());
    const emailAddress = escapeHtml(document.getElementById('endEmailAddress').value.trim() || 'rdmpao@lto.gov.ph');
    const rdmpaoEmail = escapeHtml(document.getElementById('endRdmpaoEmail').value.trim() || emailAddress);
    const complainantName = escapeHtml(document.getElementById('endComplainantName').value.trim());
    const complainantEmail = escapeHtml(document.getElementById('endComplainantEmail').value.trim() || '—');
    const briefDescInput = document.getElementById('endBriefDescription').value.trim();

    const nameParts = chiefNameRaw.replace(/^(ATTY\.|ENGR\.|DIR\.|MR\.|MS\.|MRS\.)\s+/i, '').trim().split(/\s+/);
    const chiefLastRaw = nameParts.length > 0 ? nameParts[nameParts.length - 1] : chiefNameRaw;
    const chiefLastName = escapeHtml(chiefLastRaw.charAt(0).toUpperCase() + chiefLastRaw.slice(1).toLowerCase());

    const fontFamily = document.getElementById('endFontFamily')?.value || 'font-sans';
    const sigType = document.querySelector('input[name="sigType"]:checked')?.value || 'esign';

    const ticketRefNo = escapeHtml(t.referralNo || 'N/A');
    const platformRaw = String(t.platform || 'FACEBOOK').trim().toUpperCase();
    const platform = escapeHtml(platformRaw === 'FACEBOOK' ? 'Facebook Messenger' : (t.platform || 'Facebook Messenger'));

    const dateReceivedFormatted = escapeHtml(formatDayMonthYear(t.dateReceived || getTodayMMDDYYYY()));
    const todayDate = escapeHtml(formatDayMonthYear(new Date()));

    const dueDateStr = addWorkingDays(t.dateReceived || getTodayMMDDYYYY(), 20);
    const dueDate = escapeHtml(formatDayMonthYear(dueDateStr));

    const ticketSubjectTerm = escapeHtml(resolveTicketSubjectTerm(t));
    const includeShowCause = isTrafficViolationConcern(t);

    const forwardedClause = (platformRaw === 'IMKC' || /isumbong/i.test(t.ticketDetails || ''))
        ? ' and subsequently forwarded to “Isumbong mo kay Chief” (ltoco.feedback@gmail.com)'
        : '';

    const briefDescription = briefDescInput
        ? escapeHtml(briefDescInput)
        : `regarding <strong>${escapeHtml(t.category || 'the concern raised')}</strong>${t.ticketDetails ? ` (${escapeHtml(t.ticketDetails)})` : ''}`;

    const formCfg = getEndorsementFormConfig();
    const signatureBlock = sigType === 'esign'
        ? `<div class="font-bold text-xs text-slate-800 pl-6 mb-1">[SIGNED]</div>
           <p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(formCfg.sigName || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigName)}</p>
           <p class="text-slate-800 text-xs">${escapeHtml(formCfg.sigTitle || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigTitle)}</p>
           <p class="text-slate-700 text-xs">${escapeHtml(formCfg.sigOffice || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigOffice)}</p>`
        : `<div class="h-12"></div>
           <p class="font-extrabold uppercase text-xs text-slate-900">${escapeHtml(formCfg.sigName || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigName)}</p>
           <p class="text-slate-800 text-xs">${escapeHtml(formCfg.sigTitle || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigTitle)}</p>
           <p class="text-slate-700 text-xs">${escapeHtml(formCfg.sigOffice || STANDARD_ENDORSEMENT_TEMPLATE_FIELDS.sigOffice)}</p>`;

    const selectedRegionObj = AppState.directory[parseInt(document.getElementById('endOfficeSelect')?.value || '0', 10)] || {};

    lastGeneratedEndorseData = {
        todayDate,
        dateReceivedFormatted,
        chiefName,
        chiefLastName,
        chiefPosition,
        agencyName,
        officeName: escapeHtml(selectedRegionObj.office || agencyName),
        officeAddress,
        emailAddress,
        rdmpaoEmail,
        complainantName,
        complainantEmail,
        platform,
        ticketSubjectTerm,
        forwardedClause,
        briefDescription,
        dueDate,
        ticketRefNo,
        includeShowCause,
        signatureBlock
    };

    const attachmentHtml = buildEndorsementAttachmentsHtml();
    const letterBodyHtml = renderStandardEndorsementLetterHtml({
        ...lastGeneratedEndorseData,
        attachmentHtml: ''
    });

    const fontClass = fontFamily === 'font-serif' ? 'font-serif' : 'font-sans';
    document.getElementById('endorseLetterPrintArea').innerHTML = `
        <div class="report-a4-page ${fontClass}" style="justify-content: flex-start; padding: 20mm 22mm;">
            ${letterBodyHtml}
        </div>
        ${attachmentHtml}
    `;

    setEndorsementEditState(false);
    document.getElementById('endorseModal').style.display = 'none';
    document.getElementById('endorsePreviewModal').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    initSystem();
});
