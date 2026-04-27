const AI_CONFIG = window.AI_ASSISTANT_CONFIG || {};

const state = {
  messages: [],
  activeLocationId: "main-gate",
  activeRoute: [],
  userProfile: null,
  timetable: [],
  courses: [],
  announcements: [],
  announcementsLoadedAt: 0,
  liveLocation: null,
  liveLocationError: "",
  weather: null,
  weatherFetchedAt: 0,
  aiReachable: Boolean(AI_CONFIG.enabled),
  mapReady: false
};

const CHAT_STORAGE_KEY = 'assistant_chat_messages_v1';
const INTENT_KEYWORDS = [
  "where", "what", "when", "time", "times", "class", "classes", "course", "courses",
  "next", "upcoming", "venue", "location", "room", "hall", "schedule", "lecture",
  "route", "direction", "directions", "navigate", "way", "from", "to", "start",
  "library", "science", "faculty", "medical", "centre", "center", "gate", "admin",
  "security", "cafeteria", "support", "office", "building"
];

const COMMON_TEXT_REPAIRS = {
  clas: "class",
  classs: "class",
  cls: "class",
  nxt: "next",
  wher: "where",
  wer: "where",
  wat: "what",
  wht: "what",
  tim: "time",
  tme: "time",
  tym: "time",
  venur: "venue",
  venu: "venue",
  loction: "location",
  locaton: "location",
  diretions: "directions",
  directionz: "directions",
  dirctions: "directions",
  rout: "route",
  routee: "route",
  navigte: "navigate",
  facuty: "faculty",
  facult: "faculty",
  scince: "science",
  scienc: "science",
  libary: "library",
  libray: "library",
  medcal: "medical",
  cntre: "centre",
  gat: "gate",
  bulding: "building",
  assitant: "assistant",
  aii: "ai",
  frday: "friday",
  wen: "when",
  whn: "when",
  forecst: "forecast",
  sumrise: "summarise",
  summarisee: "summarise",
  announcment: "announcement",
  announcemnt: "announcement",
  weathr: "weather",
  wether: "weather"
};
const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const CAMPUS_WEATHER_DEFAULT = {
  name: AI_CONFIG.campusName || "Campus",
  latitude: Number(AI_CONFIG.campusLatitude || 5.0177),
  longitude: Number(AI_CONFIG.campusLongitude || 7.9128)
};

const CAMPUS_LOCATIONS = [
  {
    id: "main-gate",
    name: "Main Gate",
    shortLabel: "Gate",
    type: "entry",
    description: "Primary arrival point into campus.",
    aliases: ["main gate", "gate", "front gate", "entrance"],
    x: 70,
    y: 310,
    neighbors: ["security-post", "student-affairs"]
  },
  {
    id: "security-post",
    name: "Security Post",
    shortLabel: "Security",
    type: "service",
    description: "Campus security checkpoint and help desk.",
    aliases: ["security", "security post", "help desk"],
    x: 150,
    y: 250,
    neighbors: ["main-gate", "admin-block", "library"]
  },
  {
    id: "student-affairs",
    name: "Student Affairs",
    shortLabel: "Affairs",
    type: "service",
    description: "Student support and administrative services.",
    aliases: ["student affairs", "affairs", "student office"],
    x: 170,
    y: 360,
    neighbors: ["main-gate", "cafeteria", "medical-centre"]
  },
  {
    id: "admin-block",
    name: "Administrative Block",
    shortLabel: "Admin",
    type: "academic",
    description: "Administrative offices and records support.",
    aliases: ["admin", "admin block", "administrative block", "registry"],
    x: 270,
    y: 200,
    neighbors: ["security-post", "library", "faculty-science"]
  },
  {
    id: "library",
    name: "Main Library",
    shortLabel: "Library",
    type: "academic",
    description: "Central study space, catalogues, and reading rooms.",
    aliases: ["library", "main library", "reading room"],
    x: 360,
    y: 280,
    neighbors: ["security-post", "admin-block", "ict-hub", "cafeteria", "faculty-law"]
  },
  {
    id: "cafeteria",
    name: "Student Cafeteria",
    shortLabel: "Cafe",
    type: "social",
    description: "Food court and student hangout area.",
    aliases: ["cafeteria", "cafe", "food court", "canteen", "restaurant"],
    x: 315,
    y: 390,
    neighbors: ["student-affairs", "library", "medical-centre", "sports-centre"]
  },
  {
    id: "ict-hub",
    name: "ICT Hub",
    shortLabel: "ICT",
    type: "academic",
    description: "Computer labs, Wi-Fi support, and digital services.",
    aliases: ["ict", "ict hub", "it center", "it centre", "computer lab", "cs lab"],
    x: 505,
    y: 235,
    neighbors: ["library", "faculty-science", "lecture-theatre-a"]
  },
  {
    id: "medical-centre",
    name: "Medical Centre",
    shortLabel: "Clinic",
    type: "service",
    description: "Campus clinic and emergency support.",
    aliases: ["medical", "medical center", "medical centre", "clinic", "hospital"],
    x: 470,
    y: 410,
    neighbors: ["student-affairs", "cafeteria", "sports-centre", "faculty-medicine"]
  },
  {
    id: "faculty-science",
    name: "Faculty of Science",
    shortLabel: "Science",
    type: "academic",
    description: "Science and computing lecture spaces and labs.",
    aliases: ["science", "faculty of science", "science block", "computer science"],
    x: 620,
    y: 170,
    neighbors: ["admin-block", "ict-hub", "lecture-theatre-a", "faculty-law"]
  },
  {
    id: "lecture-theatre-a",
    name: "Lecture Theatre A",
    shortLabel: "LT-A",
    type: "academic",
    description: "Large lecture hall used for shared and departmental classes.",
    aliases: ["lecture theatre", "lecture theater", "lt a", "lt-a", "hall a"],
    x: 690,
    y: 300,
    neighbors: ["ict-hub", "faculty-science", "faculty-law", "sports-centre"]
  },
  {
    id: "faculty-law",
    name: "Faculty of Law",
    shortLabel: "Law",
    type: "academic",
    description: "Law lecture rooms and faculty offices.",
    aliases: ["law", "law block", "faculty of law"],
    x: 785,
    y: 210,
    neighbors: ["library", "faculty-science", "lecture-theatre-a", "faculty-medicine"]
  },
  {
    id: "sports-centre",
    name: "Sports Centre",
    shortLabel: "Sports",
    type: "social",
    description: "Fitness, field events, and recreational spaces.",
    aliases: ["sports", "sports center", "sports centre", "gym", "stadium"],
    x: 690,
    y: 455,
    neighbors: ["cafeteria", "medical-centre", "lecture-theatre-a", "faculty-medicine"]
  },
  {
    id: "faculty-medicine",
    name: "Faculty of Medicine",
    shortLabel: "Med",
    type: "academic",
    description: "Medical and allied health teaching spaces.",
    aliases: ["medicine", "faculty of medicine", "medical faculty", "nursing", "mls"],
    x: 840,
    y: 360,
    neighbors: ["medical-centre", "faculty-law", "sports-centre"]
  }
];

const LOCATION_BY_ID = new Map(CAMPUS_LOCATIONS.map((location) => [location.id, location]));
const LOCATION_ALIAS_INDEX = CAMPUS_LOCATIONS.flatMap((location) => {
  const aliases = [location.name, ...(location.aliases || [])];
  return aliases.map((alias) => ({
    locationId: location.id,
    alias: String(alias).toLowerCase()
  }));
}).sort((left, right) => right.alias.length - left.alias.length);

const dom = {};
document.addEventListener("DOMContentLoaded", () => {
  bindDom();
  bindEvents();
  renderMap();
  hydrateAssistant().catch((error) => {
    console.error(error);
    addAssistantMessage("I ran into a startup issue while loading your campus context, but the map is still ready to use.");
  });
});

function saveMessagesToStorage() {
  try {
    const user = AUTH.getCurrentUser();
    const key = `${CHAT_STORAGE_KEY}::${user && user.userId ? user.userId : 'anon'}`;
    const toSave = Array.isArray(state.messages) ? state.messages.slice(-200) : [];
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save chat messages to storage', e);
  }
}

function loadMessagesFromStorage() {
  try {
    const user = AUTH.getCurrentUser();
    const key = `${CHAT_STORAGE_KEY}::${user && user.userId ? user.userId : 'anon'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({ role: m.role || 'assistant', content: m.content || '', ts: m.ts || Date.now() }));
  } catch (e) {
    console.warn('Failed to load chat messages from storage', e);
    return [];
  }
}


function bindDom() {
  dom.chatMessages = document.getElementById("chatMessages");
  dom.userInput = document.getElementById("userInput");
  dom.sendBtn = document.getElementById("sendBtn") || document.querySelector('.send-btn');
  dom.aiStatus = document.getElementById("aiStatus");
  // support multiple page markup variants: prefer a dedicated #campusMapSvg, otherwise a wrapper like #schoolMap
  dom.mapSvg = document.getElementById("campusMapSvg") || document.getElementById('schoolMap') || document.querySelector('.school-map');
  dom.mapHint = document.getElementById("mapHint");
  dom.selectedPlace = document.getElementById("selectedPlace");
  dom.selectedPlaceMeta = document.getElementById("selectedPlaceMeta");
  dom.selectedPlaceBody = document.getElementById("selectedPlaceBody");
  dom.routeSummary = document.getElementById("routeSummary");
  dom.routeSteps = document.getElementById("routeSteps");
  dom.suggestions = document.getElementById("suggestions");
}

function bindEvents() {
  if (dom.userInput) {
    dom.userInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  if (dom.sendBtn) {
    dom.sendBtn.addEventListener("click", sendMessage);
  }

  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => {
      askQuestion(button.getAttribute("data-question") || "");
    });
  });
}

async function hydrateAssistant() {
  state.userProfile = await safeLoad(() => AUTH.refreshCurrentUserFromDb(), null);
  state.timetable = await safeLoad(() => AUTH.getTimetablesDb(), []);
  state.courses = await safeLoad(() => AUTH.getCoursesForCurrentUserDb({ includeAllLevels: true }), []);
  state.announcements = await safeLoad(() => AUTH.getAnnouncementsDb(), []);
  state.announcementsLoadedAt = Date.now();
  state.mapReady = true;
  clearPlaceholderMessages();
  focusLocation(state.activeLocationId, { keepRoute: true });
  setAiStatus(state.aiReachable ? "AI route mode" : "Local guide mode");

  const welcomeBits = [];
  if (state.userProfile && state.userProfile.department) {
    welcomeBits.push(`I loaded your ${escapeHtml(state.userProfile.department)} profile context`);
  }
  if (state.timetable.length) {
    welcomeBits.push(`${state.timetable.length} timetable entries are available for quick course lookup`);
  }

  // If there are persisted messages, render them and do not inject a synthetic welcome
  const stored = loadMessagesFromStorage();
  if (stored && stored.length) {
    state.messages = stored.slice();
    state.messages.forEach((m) => appendMessage(m.content, m.role, false, true));
  } else {
    const welcome = welcomeBits.length
      ? `Hi ${escapeHtml(AUTH.getFirstName(state.userProfile?.name || ""))}. ${welcomeBits.join(", ")}. Ask for a place, a course venue, or directions between two points on the ${escapeHtml(AI_CONFIG.campusName || "campus")} map.`
      : `Hi. Ask for directions, course venues, or a campus building and I’ll point it out on the map.`;

    addAssistantMessage(welcome, {
      suggestions: [
        "Show me the library",
        "How do I get from Main Gate to Faculty of Science?",
        "Where is my next class?"
      ]
    });
  }
}

function clearPlaceholderMessages() {
  if (!dom.chatMessages) {
    return;
  }

  const persistedMessages = loadMessagesFromStorage();
  if (persistedMessages.length) {
    dom.chatMessages.innerHTML = "";
    return;
  }

  const assistantMessages = dom.chatMessages.querySelectorAll(".message.assistant");
  if (assistantMessages.length === 1) {
    const initialContent = assistantMessages[0].textContent || "";
    if (/loading your campus context/i.test(initialContent)) {
      dom.chatMessages.innerHTML = "";
    }
  }
}

async function sendMessage() {
  const message = String(dom.userInput?.value || "").trim();
  if (!message) {
    return;
  }

  dom.userInput.value = "";
  addUserMessage(message);
  await handleAssistantTurn(message);
}

async function handleAssistantTurn(message) {
  const typingBubble = addTypingMessage();
  const localContext = await buildLocalContext(message);
  applyLocalActions(localContext);

  let replyText = localContext.localReply;
  const aiContext = createAiContext(localContext);

  if (AI_CONFIG.enabled && AI_CONFIG.functionName) {
    try {
      const response = await AUTH.invokeFunction(AI_CONFIG.functionName, {
        messages: state.messages.slice(-8),
        localContext: aiContext,
        localReply: replyText
      });

      if (response && response.reply) {
        replyText = String(response.reply).trim() || replyText;
        state.aiReachable = true;
      }
    } catch (error) {
      console.warn("AI backend unavailable, using local response.", error);
      state.aiReachable = false;
    }
  }

  removeTypingMessage(typingBubble);
  setAiStatus(state.aiReachable ? "AI route mode" : "Local guide mode");
  addAssistantMessage(replyText, {
    suggestions: localContext.followUps
  });
}

async function buildLocalContext(message) {
  const normalized = normalizeText(message);
  const tokens = tokenizeText(normalized);
  const courseCode = extractCourseCode(message);
  const mentionedLocations = findMentionedLocations(normalized);
  const routeIntent = extractRouteIntent(normalized, mentionedLocations, tokens);
  const destinationOnly = !routeIntent && mentionedLocations.length ? mentionedLocations[0] : null;
  const activeLocation = LOCATION_BY_ID.get(state.activeLocationId) || null;

  if (isHowAreYouQuestion(tokens)) {
    return {
      type: "small-talk",
      localReply: buildHowAreYouReply(),
      followUps: [
        "What class is ongoing right now?",
        "What classes do I have on Friday?",
        "Summarise the active announcements for me"
      ]
    };
  }

  if (isAnnouncementQuestion(tokens)) {
    const announcements = await ensureAnnouncementsLoaded();
    if (isUrgentAnnouncementQuestion(tokens)) {
      return {
        type: "urgent-announcements",
        localReply: formatUrgentAnnouncementsReply(announcements),
        followUps: [
          "Summarise the active announcements for me",
          "What classes do I have tomorrow morning?",
          "Do I have any free period now?"
        ]
      };
    }
    return {
      type: "announcements",
      localReply: formatAnnouncementsReply(announcements),
      followUps: [
        "Any new announcement today?",
        "What classes do I have tomorrow?",
        "Where is my next class?"
      ]
    };
  }

  const requestedDay = getRequestedDay(tokens);
  if (requestedDay) {
    if (isMorningScheduleQuestion(tokens)) {
      const classes = getClassesForDayPart(requestedDay, "morning");
      return {
        type: "day-schedule-morning",
        localReply: formatDayPartScheduleReply(requestedDay, "morning", classes),
        followUps: [
          "What is my first class today?",
          "Do I have any free period now?",
          `What classes do I have on ${capitalizeDay(getNextDayName(requestedDay))}?`
        ]
      };
    }

    const classes = getClassesForDay(requestedDay);
    return {
      type: "day-schedule",
      localReply: formatDayScheduleReply(requestedDay, classes),
      followUps: [
        `What class is ongoing right now?`,
        `Where is my next class?`,
        `What classes do I have on ${capitalizeDay(getNextDayName(requestedDay))}?`
      ]
    };
  }

  if (isFirstClassQuestion(tokens)) {
    const requestedBaseDay = getRequestedDay(tokens) || DAY_NAMES[(new Date().getDay() + 6) % 7] || "";
    const firstClass = getFirstClassForDay(requestedBaseDay);
    return {
      type: "first-class",
      matchedVenueLocation: firstClass ? matchLocationFromText(firstClass.venue || "") : null,
      localReply: formatFirstClassReply(requestedBaseDay, firstClass),
      followUps: [
        "What class is ongoing right now?",
        `What classes do I have on ${capitalizeDay(requestedBaseDay)}?`,
        "Where is my next class?"
      ]
    };
  }

  if (isVenueFrequencyQuestion(tokens)) {
    const venueStat = getMostUsedVenue();
    return {
      type: "venue-frequency",
      matchedVenueLocation: venueStat ? matchLocationFromText(venueStat.venue || "") : null,
      localReply: formatVenueFrequencyReply(venueStat),
      followUps: [
        "Show me that venue",
        "Where is my next class?",
        "What classes do I have on Friday?"
      ]
    };
  }

  if (isFreePeriodQuestion(tokens)) {
    return {
      type: "free-period",
      localReply: formatFreePeriodReply(),
      followUps: [
        "What class is ongoing right now?",
        "What is my first class today?",
        "What classes do I have tomorrow morning?"
      ]
    };
  }

  if (isCurrentClassQuestion(tokens)) {
    const currentClass = getCurrentClass();
    return {
      type: "current-class",
      matchedVenueLocation: currentClass ? matchLocationFromText(currentClass.venue || "") : null,
      localReply: formatCurrentClassReply(currentClass),
      followUps: currentClass
        ? buildCourseFollowUps(currentClass, matchLocationFromText(currentClass.venue || ""))
        : ["Where is my next class?", "What classes do I have today?"]
    };
  }

  if (isLiveLocationQuestion(tokens)) {
    const locationStatus = await ensureCurrentLocation();
    return {
      type: "live-location",
      localReply: formatLiveLocationReply(locationStatus),
      followUps: [
        "What's the weather forecast?",
        "Where is my next class?",
        "Show me the library"
      ]
    };
  }

  if (isWeatherQuestion(tokens)) {
    const weather = await ensureWeather();
    return {
      type: "weather",
      localReply: formatWeatherReply(weather),
      followUps: [
        "Where am I right now?",
        "What class is ongoing right now?",
        "What classes do I have tomorrow?"
      ]
    };
  }

  if (courseCode) {
    const courseInfo = lookupCourseInfo(courseCode);
    if (courseInfo) {
      const matchedVenueLocation = matchLocationFromText(courseInfo.venue || courseInfo.location || "");
      const localReply = formatCourseReply(courseInfo, matchedVenueLocation);
      return {
        type: "course",
        courseCode,
        courseInfo,
        matchedVenueLocation,
        localReply,
        followUps: buildCourseFollowUps(courseInfo, matchedVenueLocation)
      };
    }
  }

  if (isNextClassQuestion(normalized, tokens)) {
    const nextClass = getNextClass();
    if (nextClass) {
      const matchedVenueLocation = matchLocationFromText(nextClass.venue || "");
      return {
        type: "next-class",
        nextClass,
        matchedVenueLocation,
        localReply: formatNextClassReply(nextClass, matchedVenueLocation),
        followUps: buildCourseFollowUps(nextClass, matchedVenueLocation)
      };
    }
  }

  if (routeIntent) {
    const route = findShortestPath(routeIntent.from.id, routeIntent.to.id);
    return {
      type: "route",
      route,
      from: routeIntent.from,
      to: routeIntent.to,
      localReply: formatRouteReply(routeIntent.from, routeIntent.to, route),
      followUps: [
        `Tell me about ${routeIntent.to.name}`,
        `Start from ${routeIntent.to.name}`,
        "Where is the nearest support office?"
      ]
    };
  }

  if (destinationOnly) {
    const localReply = formatLocationReply(destinationOnly, activeLocation);
    return {
      type: "location",
      destination: destinationOnly,
      localReply,
      followUps: [
        `How do I get to ${destinationOnly.name}?`,
        `What is near ${destinationOnly.name}?`,
        `Start from ${destinationOnly.name}`
      ]
    };
  }

  return {
    type: "general",
    localReply: buildGeneralReply(activeLocation),
    followUps: [
      "Show me the library",
      "How do I get from Main Gate to Medical Centre?",
      "Where is my next class?",
      "What classes do I have on Friday?"
    ]
  };
}

function createAiContext(localContext) {
  const user = state.userProfile || {};
  return {
    campusName: AI_CONFIG.campusName || "University campus",
    mapVersion: AI_CONFIG.mapVersion || "custom-campus-layout",
    currentLocation: state.activeLocationId,
    activeRoute: state.activeRoute,
    user: {
      name: user.name || "",
      role: user.role || "",
      faculty: user.faculty || "",
      department: user.department || "",
      level: user.level || ""
    },
    localContext,
    mapLocations: CAMPUS_LOCATIONS.map((location) => ({
      id: location.id,
      name: location.name,
      type: location.type,
      description: location.description,
      neighbors: location.neighbors
    })),
    timetable: state.timetable.slice(0, 12).map((item) => ({
      courseCode: item.courseCode,
      courseTitle: item.courseTitle,
      venue: item.venue,
      lecturerName: item.lecturerName,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime
    })),
    courses: state.courses.slice(0, 20).map((item) => ({
      courseCode: item.course_code || item.courseCode,
      courseTitle: item.course_title || item.courseTitle,
      level: item.level,
      semester: item.semester
    })),
    announcements: state.announcements.slice(0, 8).map((item) => ({
      courseCode: item.courseCode,
      text: item.text,
      type: item.type,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      createdBy: item.createdBy
    })),
    liveLocation: state.liveLocation,
    weather: state.weather
  };
}

function applyLocalActions(localContext) {
  if (localContext.type === "route" && localContext.route?.path?.length) {
    showRoute(localContext.route.path);
    focusLocation(localContext.to.id, { keepRoute: true });
    return;
  }

  const nextTarget = localContext.matchedVenueLocation || localContext.destination || null;
  if (nextTarget) {
    clearRoute();
    focusLocation(nextTarget.id);
  }
}

function renderMap() {
  if (!dom.mapSvg) {
    return;
  }

  const edgeMarkup = buildEdgeMarkup();
  const locationMarkup = CAMPUS_LOCATIONS.map((location) => {
    const isActive = state.activeLocationId === location.id;
    return `
      <g class="map-node ${isActive ? "is-active" : ""}" data-location-id="${location.id}" tabindex="0" role="button" aria-label="${escapeHtml(location.name)}">
        <circle class="map-node-core type-${escapeHtml(location.type)}" cx="${location.x}" cy="${location.y}" r="26"></circle>
        <circle class="map-node-ring" cx="${location.x}" cy="${location.y}" r="34"></circle>
        <text class="map-node-label" x="${location.x}" y="${location.y + 56}">${escapeHtml(location.shortLabel)}</text>
      </g>
    `;
  }).join("");

  const routeMarkup = buildRouteMarkup();

  dom.mapSvg.innerHTML = `
    <svg viewBox="0 0 920 560" xmlns="http://www.w3.org/2000/svg" aria-label="Campus map">
      <defs>
        <linearGradient id="campusGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(56, 189, 248, 0.8)"></stop>
          <stop offset="100%" stop-color="rgba(34, 197, 94, 0.8)"></stop>
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="880" height="520" rx="28" class="map-frame"></rect>
      <text x="60" y="70" class="map-title-text">${escapeHtml(AI_CONFIG.campusName || "Campus")} Explorer</text>
      <text x="60" y="100" class="map-subtitle-text">Tap any stop to ask the assistant or continue from there.</text>
      ${edgeMarkup}
      ${routeMarkup}
      ${locationMarkup}
    </svg>
  `;

  dom.mapSvg.querySelectorAll("[data-location-id]").forEach((element) => {
    const locationId = element.getAttribute("data-location-id");
    element.addEventListener("click", () => handleLocationClick(locationId));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleLocationClick(locationId);
      }
    });
  });
}

function buildEdgeMarkup() {
  const seen = new Set();
  const segments = [];
  CAMPUS_LOCATIONS.forEach((location) => {
    location.neighbors.forEach((neighborId) => {
      const pairKey = [location.id, neighborId].sort().join("::");
      if (seen.has(pairKey)) {
        return;
      }
      seen.add(pairKey);
      const neighbor = LOCATION_BY_ID.get(neighborId);
      if (!neighbor) {
        return;
      }
      segments.push(`
        <line class="map-edge" x1="${location.x}" y1="${location.y}" x2="${neighbor.x}" y2="${neighbor.y}"></line>
      `);
    });
  });
  return segments.join("");
}

function buildRouteMarkup() {
  if (!state.activeRoute.length) {
    return "";
  }

  const points = state.activeRoute
    .map((locationId) => LOCATION_BY_ID.get(locationId))
    .filter(Boolean)
    .map((location) => `${location.x},${location.y}`)
    .join(" ");

  return `
    <polyline class="map-route-line" points="${points}"></polyline>
    ${state.activeRoute.map((locationId) => {
      const location = LOCATION_BY_ID.get(locationId);
      if (!location) {
        return "";
      }
      return `<circle class="map-route-stop" cx="${location.x}" cy="${location.y}" r="10"></circle>`;
    }).join("")}
  `;
}

function handleLocationClick(locationId) {
  const location = LOCATION_BY_ID.get(locationId);
  if (!location) {
    return;
  }
  focusLocation(locationId, { keepRoute: state.activeRoute.includes(locationId) });
  addAssistantMessage(`You selected ${escapeHtml(location.name)}. Ask for directions from here or tap another place to continue scanning the map.`, {
    suggestions: [
      `Tell me about ${location.name}`,
      `How do I get from ${location.name} to the library?`,
      `Start from ${location.name}`
    ]
  });
}

function focusLocation(locationId, options = {}) {
  const location = LOCATION_BY_ID.get(locationId);
  if (!location) {
    return;
  }

  state.activeLocationId = locationId;
  if (!options.keepRoute) {
    state.activeRoute = [];
  }

  if (dom.selectedPlace) {
    dom.selectedPlace.textContent = location.name;
  }
  if (dom.selectedPlaceMeta) {
    dom.selectedPlaceMeta.textContent = `${toTitleCase(location.type)} hub`;
  }
  if (dom.selectedPlaceBody) {
    const nearby = location.neighbors
      .map((neighborId) => LOCATION_BY_ID.get(neighborId))
      .filter(Boolean)
      .map((neighbor) => neighbor.name)
      .join(", ");
    dom.selectedPlaceBody.textContent = `${location.description} Nearby stops: ${nearby}.`;
  }

  if (dom.mapHint) {
    dom.mapHint.textContent = options.keepRoute && state.activeRoute.length
      ? "Route locked in on the map. Tap a stop in the route to continue from there."
      : "Tap any stop to make it your current point on the map.";
  }

  renderRoutePanel();
  renderMap();
}

function showRoute(path) {
  state.activeRoute = Array.isArray(path) ? path.slice() : [];
  renderRoutePanel();
  renderMap();
}

function clearRoute() {
  state.activeRoute = [];
  renderRoutePanel();
  renderMap();
}

function renderRoutePanel() {
  if (!dom.routeSummary || !dom.routeSteps) {
    return;
  }

  if (!state.activeRoute.length) {
    dom.routeSummary.textContent = "No route pinned yet.";
    dom.routeSteps.innerHTML = "";
    return;
  }

  const names = state.activeRoute
    .map((locationId) => LOCATION_BY_ID.get(locationId))
    .filter(Boolean)
    .map((location) => location.name);

  dom.routeSummary.textContent = `${names[0]} to ${names[names.length - 1]} in ${Math.max(0, names.length - 1)} step(s).`;
  dom.routeSteps.innerHTML = state.activeRoute.map((locationId, index) => {
    const location = LOCATION_BY_ID.get(locationId);
    if (!location) {
      return "";
    }
    return `
      <button class="route-step-btn" type="button" data-route-location="${location.id}">
        ${index + 1}. ${escapeHtml(location.name)}
      </button>
    `;
  }).join("");

  dom.routeSteps.querySelectorAll("[data-route-location]").forEach((button) => {
    button.addEventListener("click", () => {
      const locationId = button.getAttribute("data-route-location");
      focusLocation(locationId, { keepRoute: true });
    });
  });
}

function addUserMessage(text) {
  appendMessage(text, "user");
}

function addAssistantMessage(text, options = {}) {
  appendMessage(text, "assistant");
  renderSuggestionChips(options.suggestions || []);
}

function addTypingMessage() {
  const bubble = appendMessage("Thinking…", "assistant", true);
  bubble.classList.add("is-typing");
  return bubble;
}

function removeTypingMessage(bubble) {
  if (bubble && bubble.parentNode) {
    bubble.parentNode.removeChild(bubble);
  }
}

function appendMessage(text, role, isTemporary = false, skipPersist = false) {
  if (!dom.chatMessages) {
    return document.createElement("div");
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;
  if (isTemporary) {
    wrapper.dataset.temporary = "true";
  }

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
  wrapper.appendChild(content);
  dom.chatMessages.appendChild(wrapper);

  // Persist message (unless it's temporary or we're explicitly skipping persistence)
  if (!isTemporary && !skipPersist) {
    try {
      state.messages.push({ role, content: text, ts: Date.now() });
      saveMessagesToStorage();
    } catch (e) {
      console.warn('Failed to persist chat message', e);
    }
  }

  // Defer scrolling to the next frame so layout and any animations complete.
  requestAnimationFrame(() => {
    try {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch (e) {
      dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }
  });

  return wrapper;
}

function renderSuggestionChips(suggestions) {
  if (!dom.suggestions) {
    return;
  }

  const uniqueSuggestions = [...new Set((suggestions || []).filter(Boolean))].slice(0, 4);
  dom.suggestions.innerHTML = uniqueSuggestions.map((suggestion) => (
    `<button class="suggestion-chip" type="button" data-suggestion="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</button>`
  )).join("");

  dom.suggestions.querySelectorAll("[data-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      askQuestion(button.getAttribute("data-suggestion") || "");
    });
  });
}

function askQuestion(question) {
  const nextQuestion = String(question || "").trim();
  if (!nextQuestion) {
    return;
  }

  if (dom.userInput) {
    dom.userInput.value = nextQuestion;
  }
  sendMessage();
}

function setAiStatus(label) {
  if (dom.aiStatus) {
    dom.aiStatus.textContent = label;
  }
}

function extractCourseCode(input) {
  const match = String(input || "").match(/\b([A-Z]{2,4}\s?\d{3})\b/i);
  return match ? match[1].toUpperCase().replace(/\s+/g, " ") : "";
}

function lookupCourseInfo(courseCode) {
  const normalizedCode = String(courseCode || "").trim().toUpperCase();
  const timetableMatch = state.timetable.find((entry) => String(entry.courseCode || "").toUpperCase() === normalizedCode);
  if (timetableMatch) {
    return {
      courseCode: timetableMatch.courseCode,
      courseTitle: timetableMatch.courseTitle,
      venue: timetableMatch.venue,
      lecturerName: timetableMatch.lecturerName,
      dayOfWeek: timetableMatch.dayOfWeek,
      startTime: timetableMatch.startTime,
      endTime: timetableMatch.endTime
    };
  }

  const courseMatch = state.courses.find((entry) => {
    const code = String(entry.course_code || entry.courseCode || "").toUpperCase();
    return code === normalizedCode;
  });

  if (!courseMatch) {
    return null;
  }

  return {
    courseCode: courseMatch.course_code || courseMatch.courseCode,
    courseTitle: courseMatch.course_title || courseMatch.courseTitle,
    venue: "",
    lecturerName: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    level: courseMatch.level,
    semester: courseMatch.semester
  };
}

function findMentionedLocations(normalizedInput) {
  const matches = [];
  const inputTokens = tokenizeText(normalizedInput);

  LOCATION_ALIAS_INDEX.forEach((entry) => {
    const index = normalizedInput.indexOf(entry.alias);
    const aliasTokens = tokenizeText(entry.alias);
    const fuzzyAliasMatch = aliasTokens.length && aliasTokens.every((aliasToken) => (
      inputTokens.some((inputToken) => tokensRoughlyMatch(inputToken, aliasToken))
    ));

    if (index === -1 && !fuzzyAliasMatch) {
      return;
    }
    if (matches.some((match) => match.location.id === entry.locationId)) {
      return;
    }
    matches.push({
      location: LOCATION_BY_ID.get(entry.locationId),
      index: index >= 0 ? index : normalizedInput.length
    });
  });

  return matches
    .filter((item) => item.location)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.location);
}

function extractRouteIntent(normalizedInput, mentionedLocations, tokens = tokenizeText(normalizedInput)) {
  if (!mentionedLocations.length) {
    return null;
  }

  const fromMatch = normalizedInput.match(/from\s+(.+?)\s+to\s+(.+)/i);
  if (fromMatch) {
    const fromLocation = matchLocationFromText(fromMatch[1]);
    const toLocation = matchLocationFromText(fromMatch[2]);
    if (fromLocation && toLocation && fromLocation.id !== toLocation.id) {
      return { from: fromLocation, to: toLocation };
    }
  }

  if (mentionedLocations.length >= 2) {
    return { from: mentionedLocations[0], to: mentionedLocations[1] };
  }

  if (isRouteQuestion(normalizedInput, tokens)) {
    const destination = mentionedLocations[0];
    const current = LOCATION_BY_ID.get(state.activeLocationId) || CAMPUS_LOCATIONS[0];
    if (destination && current.id !== destination.id) {
      return { from: current, to: destination };
    }
  }

  if (/^start from /i.test(normalizedInput)) {
    const nextLocation = matchLocationFromText(normalizedInput.replace(/^start from /i, ""));
    if (nextLocation) {
      focusLocation(nextLocation.id);
      return null;
    }
  }

  return null;
}

function matchLocationFromText(text) {
  const normalized = normalizeText(text);
  return findMentionedLocations(normalized)[0] || null;
}

function findShortestPath(startId, endId) {
  if (startId === endId) {
    return { path: [startId], distance: 0 };
  }

  const distances = new Map();
  const previous = new Map();
  const queue = new Set(CAMPUS_LOCATIONS.map((location) => location.id));

  queue.forEach((locationId) => distances.set(locationId, Number.POSITIVE_INFINITY));
  distances.set(startId, 0);

  while (queue.size) {
    let currentId = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    queue.forEach((locationId) => {
      const distance = distances.get(locationId) ?? Number.POSITIVE_INFINITY;
      if (distance < bestDistance) {
        bestDistance = distance;
        currentId = locationId;
      }
    });

    if (!currentId || currentId === endId) {
      break;
    }

    queue.delete(currentId);
    const currentLocation = LOCATION_BY_ID.get(currentId);
    if (!currentLocation) {
      continue;
    }

    currentLocation.neighbors.forEach((neighborId) => {
      if (!queue.has(neighborId)) {
        return;
      }
      const neighbor = LOCATION_BY_ID.get(neighborId);
      if (!neighbor) {
        return;
      }
      const stepDistance = getDistance(currentLocation, neighbor);
      const candidate = (distances.get(currentId) || 0) + stepDistance;
      if (candidate < (distances.get(neighborId) || Number.POSITIVE_INFINITY)) {
        distances.set(neighborId, candidate);
        previous.set(neighborId, currentId);
      }
    });
  }

  const path = [];
  let cursor = endId;
  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(cursor);
    if (cursor === startId) {
      path.unshift(cursor);
      break;
    }
  }

  if (!path.length || path[0] !== startId) {
    return { path: [startId], distance: 0 };
  }

  return {
    path,
    distance: Math.round(distances.get(endId) || 0)
  };
}

function getDistance(left, right) {
  const x = left.x - right.x;
  const y = left.y - right.y;
  return Math.sqrt((x * x) + (y * y));
}

function formatRouteReply(from, to, route) {
  const pathNames = (route?.path || [])
    .map((locationId) => LOCATION_BY_ID.get(locationId))
    .filter(Boolean)
    .map((location) => location.name);

  if (pathNames.length <= 1) {
    return `${to.name} is already your current point. Tap another place on the map if you want to continue from there.`;
  }

  const opener = pickVariant([
    `Here’s the route from ${from.name} to ${to.name}.`,
    `You can get from ${from.name} to ${to.name} with this path.`,
    `I mapped out a route from ${from.name} to ${to.name} for you.`
  ], `${from.id}:${to.id}:route`);

  const closer = pickVariant([
    "I’ve pinned it on the map, so you can tap any stop and continue exploring from there.",
    "The route is pinned on the map now, and you can tap any stop to continue from that point.",
    "It’s already highlighted on the map, so you can follow it or jump in from any stop."
  ], `${from.id}:${to.id}:route:close`);

  return [
    opener,
    `Follow this path: ${pathNames.join(" -> ")}.`,
    closer
  ].join("\n");
}

function formatLocationReply(location, activeLocation) {
  const neighbors = location.neighbors
    .map((neighborId) => LOCATION_BY_ID.get(neighborId))
    .filter(Boolean)
    .map((neighbor) => neighbor.name);

  const routingHint = activeLocation && activeLocation.id !== location.id
    ? `If you want, I can guide you from ${activeLocation.name} to ${location.name}.`
    : "Tap another point on the map if you want me to chart a route next.";

  return [
    pickVariant([
      `${location.name} is on the map now.`,
      `I’ve brought ${location.name} into focus on the map.`,
      `${location.name} is the place you’re looking at now.`
    ], `${location.id}:location`),
    `${location.description}`,
    `Nearby stops: ${neighbors.join(", ")}.`,
    routingHint
  ].join("\n");
}

function formatCourseReply(courseInfo, matchedVenueLocation) {
  const details = [
    pickVariant([
      `${courseInfo.courseCode} ${courseInfo.courseTitle ? `- ${courseInfo.courseTitle}` : ""}`.trim(),
      `Here’s what I found for ${courseInfo.courseCode}${courseInfo.courseTitle ? ` - ${courseInfo.courseTitle}` : ""}.`,
      `This is the course info for ${courseInfo.courseCode}${courseInfo.courseTitle ? ` - ${courseInfo.courseTitle}` : ""}.`
    ], `${courseInfo.courseCode}:course`)
  ];

  if (courseInfo.venue) {
    details.push(`Venue: ${courseInfo.venue}`);
  } else {
    details.push("Venue: no timetable venue is stored yet.");
  }

  if (courseInfo.dayOfWeek || courseInfo.startTime || courseInfo.endTime) {
    details.push(`Schedule: ${courseInfo.dayOfWeek || "Day not set"} ${courseInfo.startTime || ""}${courseInfo.endTime ? ` to ${courseInfo.endTime}` : ""}`.trim());
  }

  if (courseInfo.lecturerName) {
    details.push(`Lecturer: ${courseInfo.lecturerName}`);
  }

  if (matchedVenueLocation) {
    details.push(`I’ve highlighted ${matchedVenueLocation.name} on the map so you can navigate there.`);
  }

  return details.join("\n");
}

function formatNextClassReply(nextClass, matchedVenueLocation) {
  const intro = pickVariant([
    `Your next class looks like ${nextClass.courseCode} ${nextClass.courseTitle ? `- ${nextClass.courseTitle}` : ""}`.trim(),
    `The next class on your timetable is ${nextClass.courseCode} ${nextClass.courseTitle ? `- ${nextClass.courseTitle}` : ""}`.trim(),
    `I found your upcoming class: ${nextClass.courseCode} ${nextClass.courseTitle ? `- ${nextClass.courseTitle}` : ""}`.trim()
  ], `${nextClass.courseCode}:next-class`);

  return [
    intro,
    `Time: ${nextClass.dayOfWeek || "Scheduled"} ${nextClass.startTime || ""}${nextClass.endTime ? ` to ${nextClass.endTime}` : ""}`.trim(),
    `Venue: ${nextClass.venue || "No venue available yet."}`,
    matchedVenueLocation
      ? `I highlighted ${matchedVenueLocation.name} on the map so you can head there or ask for a route.`
      : "If you want, I can still help once a campus location is linked to the venue."
  ].join("\n");
}

function buildGeneralReply(activeLocation) {
  const currentLocation = activeLocation || LOCATION_BY_ID.get(state.activeLocationId) || CAMPUS_LOCATIONS[0];
  return [
    pickVariant([
      `I’m ready to help with campus directions, course venues, and quick place lookups on the ${AI_CONFIG.campusName || "campus"} map.`,
      `You can ask me about routes, course venues, and campus places on the ${AI_CONFIG.campusName || "campus"} map.`,
      `I can help with campus navigation, timetable questions, and place lookups on the ${AI_CONFIG.campusName || "campus"} map.`
    ], `${currentLocation.id}:general`),
    `Your current map focus is ${currentLocation.name}.`,
    `Try asking for a route like "How do I get from Main Gate to Faculty of Science?" or a venue like "Where is CSC 314?"`
  ].join("\n");
}

function buildCourseFollowUps(courseInfo, matchedVenueLocation) {
  const followUps = [];
  if (matchedVenueLocation) {
    followUps.push(`How do I get to ${matchedVenueLocation.name}?`);
    followUps.push(`Tell me about ${matchedVenueLocation.name}`);
  }
  followUps.push(`What time is ${courseInfo.courseCode}?`);
  followUps.push("Where is my next class?");
  return followUps;
}

async function ensureAnnouncementsLoaded() {
  const stale = !state.announcementsLoadedAt || (Date.now() - state.announcementsLoadedAt) > (2 * 60 * 1000);
  if (!state.announcements.length || stale) {
    state.announcements = await safeLoad(() => AUTH.getAnnouncementsDb(), state.announcements);
    state.announcementsLoadedAt = Date.now();
  }
  return state.announcements.slice();
}

function getNextClass() {
  if (!state.timetable.length) {
    return null;
  }

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const now = new Date();
  const currentDayName = dayOrder[(now.getDay() + 6) % 7] || "";
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const sortedEntries = state.timetable
    .map((entry) => ({
      ...entry,
      dayIndex: dayOrder.indexOf(entry.dayOfWeek),
      startMinutes: timeToMinutes(entry.startTime)
    }))
    .filter((entry) => entry.dayIndex >= 0 && Number.isFinite(entry.startMinutes))
    .sort((left, right) => {
      if (left.dayIndex !== right.dayIndex) {
        return left.dayIndex - right.dayIndex;
      }
      return left.startMinutes - right.startMinutes;
    });

  const currentDayIndex = dayOrder.indexOf(currentDayName);
  const nextToday = sortedEntries.find((entry) => entry.dayIndex === currentDayIndex && entry.startMinutes >= currentMinutes);
  return nextToday || sortedEntries[0] || null;
}

function getCurrentClass() {
  if (!state.timetable.length) {
    return null;
  }

  const now = new Date();
  const currentDay = DAY_NAMES[(now.getDay() + 6) % 7] || "";
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return state.timetable.find((entry) => {
    if (normalizeText(entry.dayOfWeek) !== currentDay) {
      return false;
    }
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    return Number.isFinite(start) && Number.isFinite(end) && currentMinutes >= start && currentMinutes <= end;
  }) || null;
}

function getClassesForDay(dayName) {
  const normalizedDay = normalizeText(dayName);
  return state.timetable
    .filter((entry) => normalizeText(entry.dayOfWeek) === normalizedDay)
    .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));
}

function getClassesForDayPart(dayName, dayPart) {
  const classes = getClassesForDay(dayName);
  if (dayPart === "morning") {
    return classes.filter((entry) => timeToMinutes(entry.startTime) < 12 * 60);
  }
  if (dayPart === "afternoon") {
    return classes.filter((entry) => {
      const start = timeToMinutes(entry.startTime);
      return start >= 12 * 60 && start < 17 * 60;
    });
  }
  if (dayPart === "evening") {
    return classes.filter((entry) => timeToMinutes(entry.startTime) >= 17 * 60);
  }
  return classes;
}

function getFirstClassForDay(dayName) {
  return getClassesForDay(dayName)[0] || null;
}

function getMostUsedVenue() {
  const counts = new Map();
  state.timetable.forEach((entry) => {
    const venue = String(entry.venue || "").trim();
    if (!venue) {
      return;
    }
    const current = counts.get(venue) || { venue, count: 0, classes: [] };
    current.count += 1;
    current.classes.push(entry);
    counts.set(venue, current);
  });

  return [...counts.values()].sort((left, right) => right.count - left.count)[0] || null;
}

function isNextClassQuestion(normalizedInput, tokens = tokenizeText(normalizedInput)) {
  const hasNext = hasAnyToken(tokens, ["next", "upcoming"]);
  const hasClass = hasAnyToken(tokens, ["class", "lecture", "course"]);
  const asksForTiming = hasAnyToken(tokens, ["when", "time", "times", "schedule"]);
  const asksForPlace = hasAnyToken(tokens, ["where", "venue", "location", "room", "hall"]);

  return (
    includesPhrase(tokens, ["my", "next", "class"]) ||
    includesPhrase(tokens, ["next", "class"]) ||
    includesPhrase(tokens, ["upcoming", "class"]) ||
    (hasNext && hasClass) ||
    ((asksForTiming || asksForPlace) && hasNext && hasClass)
  );
}

function isCurrentClassQuestion(tokens) {
  const asksCurrent = hasAnyToken(tokens, ["current", "ongoing", "now", "present"]);
  const asksClass = hasAnyToken(tokens, ["class", "lecture", "course"]);
  return (
    includesPhrase(tokens, ["what", "class", "is", "ongoing"]) ||
    includesPhrase(tokens, ["what", "class", "is", "ongoing", "right", "now"]) ||
    includesPhrase(tokens, ["what", "class", "is", "current"]) ||
    (asksCurrent && asksClass)
  );
}

function isAnnouncementQuestion(tokens) {
  return (
    hasAnyToken(tokens, ["announcement", "announcements", "update", "updates"]) &&
    hasAnyToken(tokens, ["summarise", "summarize", "active", "latest", "recent", "show", "list", "tell"])
  ) || includesPhrase(tokens, ["active", "announcements"]);
}

function isUrgentAnnouncementQuestion(tokens) {
  return (
    hasAnyToken(tokens, ["urgent", "important", "deadline"]) &&
    hasAnyToken(tokens, ["announcement", "announcements", "update", "updates"])
  );
}

function isLiveLocationQuestion(tokens) {
  return (
    includesPhrase(tokens, ["where", "am", "i"]) ||
    includesPhrase(tokens, ["where", "am", "i", "right", "now"]) ||
    includesPhrase(tokens, ["my", "current", "location"]) ||
    includesPhrase(tokens, ["location", "access"]) ||
    (hasAnyToken(tokens, ["location"]) && hasAnyToken(tokens, ["where", "current", "now"]))
  );
}

function isWeatherQuestion(tokens) {
  return (
    hasAnyToken(tokens, ["weather", "forecast", "temperature", "rain", "sunny", "cloudy"]) ||
    includesPhrase(tokens, ["weather", "condition"]) ||
    includesPhrase(tokens, ["weather", "forecast"])
  );
}

function isHowAreYouQuestion(tokens) {
  return (
    includesPhrase(tokens, ["how", "are", "you"]) ||
    includesPhrase(tokens, ["how", "you", "dey"]) ||
    includesPhrase(tokens, ["how", "far"])
  );
}

function isMorningScheduleQuestion(tokens) {
  return hasAnyToken(tokens, ["morning"]) && hasAnyToken(tokens, ["class", "classes", "course", "courses"]);
}

function isFirstClassQuestion(tokens) {
  return (
    includesPhrase(tokens, ["first", "class"]) ||
    includesPhrase(tokens, ["my", "first", "class"]) ||
    (hasAnyToken(tokens, ["first"]) && hasAnyToken(tokens, ["class", "lecture", "course"]))
  );
}

function isVenueFrequencyQuestion(tokens) {
  return (
    includesPhrase(tokens, ["which", "venue", "do", "i", "have", "most"]) ||
    includesPhrase(tokens, ["which", "venue", "do", "i", "use", "most"]) ||
    includesPhrase(tokens, ["most", "used", "venue"]) ||
    (hasAnyToken(tokens, ["venue"]) && hasAnyToken(tokens, ["most", "often", "frequent"]))
  );
}

function isFreePeriodQuestion(tokens) {
  return (
    includesPhrase(tokens, ["free", "period"]) ||
    includesPhrase(tokens, ["am", "i", "free", "now"]) ||
    includesPhrase(tokens, ["do", "i", "have", "any", "free", "period", "now"]) ||
    (hasAnyToken(tokens, ["free"]) && hasAnyToken(tokens, ["period", "now", "break"]))
  );
}

function getRequestedDay(tokens) {
  const day = DAY_NAMES.find((dayName) => tokens.some((token) => tokensRoughlyMatch(token, dayName)));
  if (day) {
    return day;
  }
  if (includesPhrase(tokens, ["today"])) {
    return DAY_NAMES[(new Date().getDay() + 6) % 7] || "";
  }
  if (includesPhrase(tokens, ["tomorrow"])) {
    return DAY_NAMES[(new Date().getDay() + 7) % 7] || "";
  }
  return "";
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN;
  }
  return (hours * 60) + minutes;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => repairToken(token))
    .join(" ");
}

async function ensureCurrentLocation() {
  if (!navigator.geolocation) {
    state.liveLocationError = "Geolocation is not supported in this browser.";
    return { ok: false, error: state.liveLocationError };
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });

    state.liveLocation = {
      latitude: Number(position.coords.latitude.toFixed(5)),
      longitude: Number(position.coords.longitude.toFixed(5)),
      accuracyMeters: Math.round(position.coords.accuracy || 0),
      label: "Live device location"
    };
    state.liveLocationError = "";
    return { ok: true, ...state.liveLocation };
  } catch (error) {
    state.liveLocationError = error && error.message ? error.message : "Location permission was denied or unavailable.";
    return { ok: false, error: state.liveLocationError };
  }
}

async function ensureWeather() {
  const weatherStale = !state.weatherFetchedAt || (Date.now() - state.weatherFetchedAt) > (10 * 60 * 1000);
  if (state.weather && !weatherStale) {
    return state.weather;
  }

  const liveLocation = await ensureCurrentLocation();
  const latitude = liveLocation.ok ? liveLocation.latitude : CAMPUS_WEATHER_DEFAULT.latitude;
  const longitude = liveLocation.ok ? liveLocation.longitude : CAMPUS_WEATHER_DEFAULT.longitude;
  const locationLabel = liveLocation.ok ? "your current location" : CAMPUS_WEATHER_DEFAULT.name;

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`);
    const data = await response.json();
    state.weather = {
      source: "open-meteo",
      locationLabel,
      current: data.current || null,
      daily: data.daily || null
    };
    state.weatherFetchedAt = Date.now();
    return state.weather;
  } catch (_) {
    return {
      source: "unavailable",
      locationLabel,
      current: null,
      daily: null
    };
  }
}

function tokenizeText(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

function repairToken(token) {
  const raw = String(token || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  if (COMMON_TEXT_REPAIRS[raw]) {
    return COMMON_TEXT_REPAIRS[raw];
  }

  let bestMatch = raw;
  let bestDistance = Number.POSITIVE_INFINITY;

  INTENT_KEYWORDS.forEach((keyword) => {
    const distance = levenshteinDistance(raw, keyword);
    const maxDistance = keyword.length >= 7 ? 2 : 1;
    if (distance <= maxDistance && distance < bestDistance) {
      bestMatch = keyword;
      bestDistance = distance;
    }
  });

  return bestMatch;
}

function hasAnyToken(tokens, candidates) {
  return candidates.some((candidate) => (
    tokens.some((token) => tokensRoughlyMatch(token, candidate))
  ));
}

function includesPhrase(tokens, phraseTokens) {
  if (!phraseTokens.length || !tokens.length) {
    return false;
  }

  for (let start = 0; start <= tokens.length - phraseTokens.length; start += 1) {
    const slice = tokens.slice(start, start + phraseTokens.length);
    if (slice.every((token, index) => tokensRoughlyMatch(token, phraseTokens[index]))) {
      return true;
    }
  }

  return false;
}

function isRouteQuestion(normalizedInput, tokens = tokenizeText(normalizedInput)) {
  return (
    includesPhrase(tokens, ["how", "do", "i", "get"]) ||
    includesPhrase(tokens, ["get", "to"]) ||
    hasAnyToken(tokens, ["route", "direction", "directions", "navigate", "way"]) ||
    (hasAnyToken(tokens, ["from"]) && hasAnyToken(tokens, ["to"]))
  );
}

function tokensRoughlyMatch(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }

  const distance = levenshteinDistance(a, b);
  const allowedDistance = Math.min(2, Math.max(1, Math.floor(Math.max(a.length, b.length) / 4)));
  return distance <= allowedDistance;
}

function levenshteinDistance(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function pickVariant(options, seedSource = "") {
  const variants = Array.isArray(options) ? options.filter(Boolean) : [];
  if (!variants.length) {
    return "";
  }

  const seed = hashText(`${seedSource}:${state.messages.length}:${state.activeLocationId}`);
  return variants[Math.abs(seed) % variants.length];
}

function formatDayScheduleReply(dayName, classes) {
  const label = capitalizeDay(dayName);
  if (!classes.length) {
    return `You do not have any classes scheduled for ${label}.`;
  }

  return [
    `You have ${classes.length} class${classes.length === 1 ? "" : "es"} on ${label}.`,
    ...classes.map((entry, index) => (
      `${index + 1}. ${entry.courseCode}${entry.courseTitle ? ` - ${entry.courseTitle}` : ""} from ${entry.startTime} to ${entry.endTime}${entry.venue ? ` at ${entry.venue}` : ""}`
    ))
  ].join("\n");
}

function formatAnnouncementsReply(announcements) {
  const activeAnnouncements = (announcements || []).filter((item) => !isAnnouncementExpired(item));
  if (!activeAnnouncements.length) {
    return "There are no active announcements for your class right now.";
  }

  const topAnnouncements = activeAnnouncements.slice(0, 3);
  return [
    `There ${topAnnouncements.length === 1 ? "is" : "are"} ${activeAnnouncements.length} active announcement${activeAnnouncements.length === 1 ? "" : "s"} right now.`,
    ...topAnnouncements.map((item, index) => (
      `${index + 1}. ${item.courseCode || "General"}: ${item.text}${item.createdBy ? ` By ${item.createdBy}.` : ""}`
    )),
    activeAnnouncements.length > topAnnouncements.length
      ? `There are ${activeAnnouncements.length - topAnnouncements.length} more active announcement(s) beyond these.`
      : "That is the full active announcement list at the moment."
  ].join("\n");
}

function formatUrgentAnnouncementsReply(announcements) {
  const activeAnnouncements = (announcements || []).filter((item) => !isAnnouncementExpired(item));
  const urgent = activeAnnouncements.filter((item) => {
    const text = normalizeText(`${item.type || ""} ${item.text || ""}`);
    return ["urgent", "important", "deadline", "exam", "test", "submission", "quiz"].some((word) => text.includes(word));
  });

  if (!urgent.length) {
    return activeAnnouncements.length
      ? "There are active announcements, but none of them looks especially urgent from the wording."
      : "There are no active announcements right now.";
  }

  return [
    `I found ${urgent.length} announcement${urgent.length === 1 ? "" : "s"} that look urgent.`,
    ...urgent.slice(0, 3).map((item, index) => `${index + 1}. ${item.courseCode || "General"}: ${item.text}`)
  ].join("\n");
}

function formatLiveLocationReply(locationStatus) {
  if (!locationStatus.ok) {
    return [
      "I could not access your live location right now.",
      `Reason: ${locationStatus.error || "Permission was denied or location is unavailable."}`,
      `Your current campus map focus is ${LOCATION_BY_ID.get(state.activeLocationId)?.name || "Main Gate"}.`
    ].join("\n");
  }

  return [
    "I can see your live device location.",
    `Latitude: ${locationStatus.latitude}, Longitude: ${locationStatus.longitude}.`,
    `Accuracy: about ${locationStatus.accuracyMeters}m.`,
    `Your current campus map focus is still ${LOCATION_BY_ID.get(state.activeLocationId)?.name || "Main Gate"}.`
  ].join("\n");
}

function formatWeatherReply(weather) {
  if (!weather || weather.source === "unavailable" || !weather.current) {
    return `I could not fetch the weather forecast right now for ${weather?.locationLabel || "your area"}.`;
  }

  const todayCode = weather.current.weather_code;
  const daily = weather.daily || {};
  const max = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null;
  const min = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null;

  return [
    `The current weather around ${weather.locationLabel} is ${describeWeatherCode(todayCode)}.`,
    `Temperature: ${weather.current.temperature_2m}°C.`,
    Number.isFinite(weather.current.wind_speed_10m) ? `Wind speed: ${weather.current.wind_speed_10m} km/h.` : "",
    max != null && min != null ? `Today's forecast range is about ${min}°C to ${max}°C.` : ""
  ].filter(Boolean).join("\n");
}

function formatCurrentClassReply(currentClass) {
  if (!currentClass) {
    const nextClass = getNextClass();
    return nextClass
      ? [
        "You do not have a class going on right now.",
        `Your next class is ${nextClass.courseCode}${nextClass.courseTitle ? ` - ${nextClass.courseTitle}` : ""} on ${nextClass.dayOfWeek} from ${nextClass.startTime} to ${nextClass.endTime}${nextClass.venue ? ` at ${nextClass.venue}` : ""}.`
      ].join("\n")
      : "You do not have a class going on right now, and I could not find a next class in your timetable.";
  }

  return [
    `Your current class is ${currentClass.courseCode}${currentClass.courseTitle ? ` - ${currentClass.courseTitle}` : ""}.`,
    `Time: ${currentClass.startTime} to ${currentClass.endTime} on ${currentClass.dayOfWeek}.`,
    `Venue: ${currentClass.venue || "No venue listed yet."}`
  ].join("\n");
}

function formatDayPartScheduleReply(dayName, dayPart, classes) {
  const label = capitalizeDay(dayName);
  if (!classes.length) {
    return `You do not have any ${dayPart} classes scheduled for ${label}.`;
  }

  return [
    `You have ${classes.length} ${dayPart} class${classes.length === 1 ? "" : "es"} on ${label}.`,
    ...classes.map((entry, index) => `${index + 1}. ${entry.courseCode}${entry.courseTitle ? ` - ${entry.courseTitle}` : ""} from ${entry.startTime} to ${entry.endTime}${entry.venue ? ` at ${entry.venue}` : ""}`)
  ].join("\n");
}

function formatFirstClassReply(dayName, firstClass) {
  const label = capitalizeDay(dayName);
  if (!firstClass) {
    return `You do not have any classes scheduled for ${label}.`;
  }

  return [
    `Your first class on ${label} is ${firstClass.courseCode}${firstClass.courseTitle ? ` - ${firstClass.courseTitle}` : ""}.`,
    `Time: ${firstClass.startTime} to ${firstClass.endTime}.`,
    `Venue: ${firstClass.venue || "No venue listed yet."}`
  ].join("\n");
}

function formatVenueFrequencyReply(venueStat) {
  if (!venueStat) {
    return "I could not find enough timetable venue data to tell which venue you use most.";
  }

  const sampleCourses = venueStat.classes.slice(0, 3).map((entry) => entry.courseCode).filter(Boolean);
  return [
    `Your most-used venue looks like ${venueStat.venue}.`,
    `It appears ${venueStat.count} time${venueStat.count === 1 ? "" : "s"} in your timetable.`,
    sampleCourses.length ? `Examples of classes there: ${sampleCourses.join(", ")}.` : ""
  ].filter(Boolean).join("\n");
}

function formatFreePeriodReply() {
  const currentClass = getCurrentClass();
  if (currentClass) {
    return [
      "You are not in a free period right now.",
      `Your current class is ${currentClass.courseCode}${currentClass.courseTitle ? ` - ${currentClass.courseTitle}` : ""} until ${currentClass.endTime}.`
    ].join("\n");
  }

  const nextClass = getNextClass();
  if (!nextClass) {
    return "You appear to be free right now, and I could not find another scheduled class in your timetable.";
  }

  return [
    "You appear to be free right now.",
    `Your next class is ${nextClass.courseCode}${nextClass.courseTitle ? ` - ${nextClass.courseTitle}` : ""} on ${nextClass.dayOfWeek} from ${nextClass.startTime} to ${nextClass.endTime}${nextClass.venue ? ` at ${nextClass.venue}` : ""}.`
  ].join("\n");
}

function buildHowAreYouReply() {
  return pickVariant([
    "I’m doing well and I’m ready to help with your timetable, announcements, routes, weather, or class locations.",
    "I’m good and fully on standby. Ask me about your next class, Friday schedule, announcements, weather, or directions.",
    "I’m here and ready to help. You can ask about ongoing classes, daily timetable, announcements, weather, or campus routes."
  ], "small-talk");
}

function describeWeatherCode(code) {
  const map = {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "foggy",
    51: "light drizzle",
    53: "drizzle",
    55: "dense drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    80: "rain showers",
    81: "moderate rain showers",
    82: "heavy rain showers",
    95: "thunderstorm"
  };
  return map[Number(code)] || "mixed conditions";
}

function getNextDayName(dayName) {
  const index = DAY_NAMES.indexOf(normalizeText(dayName));
  if (index === -1) {
    return "monday";
  }
  return DAY_NAMES[(index + 1) % DAY_NAMES.length];
}

function capitalizeDay(dayName) {
  const value = String(dayName || "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hashText(value) {
  return String(value || "").split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
}

function toTitleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function safeLoad(loader, fallback) {
  try {
    const result = await loader();
    return result ?? fallback;
  } catch (_) {
    return fallback;
  }
}

window.sendMessage = sendMessage;
window.askQuestion = askQuestion;
