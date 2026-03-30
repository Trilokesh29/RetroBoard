import { demoProfiles } from "./demoProfiles";

const demoStateKey = "retroboard_demo_state";
const demoSessionKey = "retroboard_demo_session";
const demoVoteLimit = 3;
const defaultBridgeUrl = import.meta.env.VITE_DEMO_JIRA_BRIDGE_URL || "";
const defaultTeamConfiguration = {
  jira: {
    enabled: false,
    boardUrl: "",
    baseUrl: "",
    boardId: "",
    projectKey: "",
    userName: "",
    hasCredentials: false,
    connectionMode: "mock",
    bridgeConnectionId: "",
    boardName: "",
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const slugify = (value) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const createId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function parseJiraBoardUrl(boardUrl) {
  if (!boardUrl) return null;
  try {
    const parsedUrl = new URL(String(boardUrl).trim());
    const boardMatch =
      parsedUrl.pathname.match(/\/jira\/software\/c\/projects\/([^/]+)\/boards\/(\d+)/i) ||
      parsedUrl.pathname.match(/\/boards\/(\d+)/i);
    if (!boardMatch) return null;
    return {
      boardUrl: String(boardUrl).trim(),
      baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
      projectKey: boardMatch[2] ? String(boardMatch[1] || "").toUpperCase() : "",
      boardId: boardMatch[2] || boardMatch[1],
    };
  } catch {
    return null;
  }
}

function normalizeTeamConfiguration(configuration) {
  const jira = configuration?.jira || {};
  const parsedBoard = parseJiraBoardUrl(jira.boardUrl);
  return {
    jira: {
      enabled: Boolean(jira.enabled),
      boardUrl: jira.boardUrl || "",
      baseUrl: jira.baseUrl || parsedBoard?.baseUrl || "",
      boardId: jira.boardId || parsedBoard?.boardId || "",
      projectKey: jira.projectKey || parsedBoard?.projectKey || "",
      userName: jira.userName || "",
      hasCredentials: Boolean(jira.hasCredentials || jira.apiToken),
      connectionMode: jira.connectionMode || (jira.enabled ? "mock" : "none"),
      bridgeConnectionId: jira.bridgeConnectionId || "",
      boardName: jira.boardName || "",
    },
  };
}

function inferPiValue(sprintName) {
  const explicitMatch = String(sprintName || "").match(/\bpi[\s_-]*(\d+)\b/i);
  if (explicitMatch) return explicitMatch[1];
  const fallbackMatch = String(sprintName || "").match(/(\d+)/);
  return fallbackMatch ? String(Math.max(1, Math.ceil(Number(fallbackMatch[1]) / 4))) : "1";
}

function createDemoJiraVelocity(teamRecord, sprintName) {
  const seed = `${teamRecord.integration?.jira?.boardId || "0"}:${sprintName}`
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const spPlanned = 18 + (seed % 18);
  const spBurnt = Math.max(0, spPlanned - (seed % 7) + (seed % 3));
  return {
    team: teamRecord.teamName,
    sprint: sprintName,
    spPlanned: String(spPlanned),
    spBurnt: String(spBurnt),
    pi: inferPiValue(sprintName),
    bbAccuracy: String(spPlanned > 0 ? Math.round((spBurnt / spPlanned) * 100) : 0),
    source: "jira",
    jiraSprintId: `${teamRecord.integration?.jira?.boardId || "demo"}-${slugify(sprintName)}`,
    jiraSprintName: sprintName,
    syncedAt: nowIso(),
  };
}

function createSeedState() {
  return {
    users: demoProfiles.map((profile) => ({
      userName: profile.userName,
      emailId: profile.emailId,
      password: profile.password,
      role: ["user"],
      teams: [...profile.teams],
    })),
    teams: {
      aurora: {
        teamName: "aurora",
        integration: {
          jira: {
            enabled: true,
            boardUrl: "https://demo-retroboard.atlassian.net/jira/software/c/projects/AUR/boards/24",
            baseUrl: "https://demo-retroboard.atlassian.net",
            boardId: "24",
            projectKey: "AUR",
            userName: "jira-demo@retroboard.local",
            hasCredentials: true,
            connectionMode: "mock",
            boardName: "Aurora Delivery",
          },
        },
        settings: { Good: "Wins", Bad: "Friction", Ugly: "Risks" },
        sprints: {
          sprint_24: {
            sorting: "vote",
            items: [
              { _id: createId("item"), team: "aurora", sprint: "sprint_24", name: "demo_lead", type: "Good", message: "Cross-team refinement landed much earlier this sprint.", date: nowIso(), votes: 4, voterList: [{ voterName: "demo_lead", voteCount: 2 }, { voterName: "guest_facilitator", voteCount: 1 }, { voterName: "product_partner", voteCount: 1 }], actionPoints: ["Keep the pre-refinement checklist lightweight."] },
              { _id: createId("item"), team: "aurora", sprint: "sprint_24", name: "guest_facilitator", type: "Bad", message: "Staging feedback arrived too late to change scope.", date: nowIso(), votes: 3, voterList: [{ voterName: "demo_lead", voteCount: 1 }, { voterName: "delivery_partner", voteCount: 2 }], actionPoints: ["Add staging signoff before sprint review."] },
              { _id: createId("item"), team: "aurora", sprint: "sprint_24", name: "delivery_partner", type: "Ugly", message: "Release notes were assembled manually again.", date: nowIso(), votes: 2, voterList: [{ voterName: "demo_lead", voteCount: 1 }], actionPoints: ["Prototype an automated release summary."] },
              { _id: createId("item"), team: "aurora", sprint: "sprint_24", name: "product_partner", type: "Good", message: "Review prep was clearer after we shared story demos mid-sprint.", date: nowIso(), votes: 1, voterList: [{ voterName: "product_partner", voteCount: 1 }], actionPoints: [] },
            ],
            happiness: [
              { _id: createId("happy"), team: "aurora", sprint: "sprint_24", name: "demo_lead", happiness: 4 },
              { _id: createId("happy"), team: "aurora", sprint: "sprint_24", name: "guest_facilitator", happiness: 3 },
              { _id: createId("happy"), team: "aurora", sprint: "sprint_24", name: "delivery_partner", happiness: 4 },
            ],
            velocity: { team: "aurora", sprint: "sprint_24", spPlanned: "31", spBurnt: "28", pi: "6", bbAccuracy: "90", source: "jira", jiraSprintId: "24-sprint_24", jiraSprintName: "Sprint 24", syncedAt: nowIso() },
          },
          sprint_23: {
            sorting: "date",
            items: [{ _id: createId("item"), team: "aurora", sprint: "sprint_23", name: "guest_facilitator", type: "Bad", message: "Dependency updates bunched up at the end of the sprint.", date: nowIso(), votes: 2, voterList: [{ voterName: "demo_lead", voteCount: 1 }], actionPoints: ["Reserve a hardening lane one sprint earlier."] }],
            happiness: [
              { _id: createId("happy"), team: "aurora", sprint: "sprint_23", name: "demo_lead", happiness: 5 },
              { _id: createId("happy"), team: "aurora", sprint: "sprint_23", name: "delivery_partner", happiness: 4 },
            ],
            velocity: { team: "aurora", sprint: "sprint_23", spPlanned: "26", spBurnt: "24", pi: "6", bbAccuracy: "92", source: "jira", jiraSprintId: "24-sprint_23", jiraSprintName: "Sprint 23", syncedAt: nowIso() },
          },
        },
      },
      nebula: {
        teamName: "nebula",
        integration: clone(defaultTeamConfiguration),
        settings: { Good: "Shipped", Bad: "Blocked", Ugly: "Needs Care" },
        sprints: {
          launch_pad: {
            sorting: "date",
            items: [
              { _id: createId("item"), team: "nebula", sprint: "launch_pad", name: "demo_lead", type: "Good", message: "Support tickets dropped after the onboarding refresh.", date: nowIso(), votes: 1, voterList: [{ voterName: "demo_lead", voteCount: 1 }], actionPoints: [] },
              { _id: createId("item"), team: "nebula", sprint: "launch_pad", name: "product_partner", type: "Bad", message: "Release checklist still depends on manual approvals.", date: nowIso(), votes: 2, voterList: [{ voterName: "delivery_partner", voteCount: 1 }], actionPoints: ["Pilot a lightweight release checklist in Slack."] },
            ],
            happiness: [
              { _id: createId("happy"), team: "nebula", sprint: "launch_pad", name: "demo_lead", happiness: 4 },
              { _id: createId("happy"), team: "nebula", sprint: "launch_pad", name: "product_partner", happiness: 5 },
            ],
            velocity: { team: "nebula", sprint: "launch_pad", spPlanned: "18", spBurnt: "19", pi: "2", bbAccuracy: "91", source: "manual", syncedAt: "" },
          },
        },
      },
    },
  };
}

function mergeSeedState(existingState) {
  const seedState = createSeedState();
  const nextState = { users: Array.isArray(existingState?.users) ? clone(existingState.users) : [], teams: existingState?.teams ? clone(existingState.teams) : {} };
  seedState.users.forEach((seedUser) => {
    if (!nextState.users.some((entry) => entry.userName === seedUser.userName)) nextState.users.push(seedUser);
  });
  Object.entries(seedState.teams).forEach(([teamName, seedTeam]) => {
    if (!nextState.teams[teamName]) {
      nextState.teams[teamName] = seedTeam;
      return;
    }
    nextState.teams[teamName].teamName = teamName;
    nextState.teams[teamName].integration = normalizeTeamConfiguration(nextState.teams[teamName].integration || seedTeam.integration);
    nextState.teams[teamName].settings = { ...seedTeam.settings, ...nextState.teams[teamName].settings };
    nextState.teams[teamName].sprints = nextState.teams[teamName].sprints || {};
    Object.entries(seedTeam.sprints).forEach(([sprintName, seedSprint]) => {
      if (!nextState.teams[teamName].sprints[sprintName]) nextState.teams[teamName].sprints[sprintName] = seedSprint;
    });
  });
  return nextState;
}

function readState() {
  const saved = window.localStorage.getItem(demoStateKey);
  if (!saved) {
    const initialState = createSeedState();
    window.localStorage.setItem(demoStateKey, JSON.stringify(initialState));
    return initialState;
  }
  try {
    const parsedState = JSON.parse(saved);
    const nextState = mergeSeedState(parsedState);
    writeState(nextState);
    return nextState;
  } catch (error) {
    const resetState = createSeedState();
    window.localStorage.setItem(demoStateKey, JSON.stringify(resetState));
    return resetState;
  }
}

function writeState(state) {
  window.localStorage.setItem(demoStateKey, JSON.stringify(state));
}

function readSession() {
  const saved = window.localStorage.getItem(demoSessionKey);
  return saved ? JSON.parse(saved) : null;
}

function writeSession(userName) {
  window.localStorage.setItem(demoSessionKey, JSON.stringify({ userName }));
}

function clearSession() {
  window.localStorage.removeItem(demoSessionKey);
}

function parseData(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function normalizePath(url) {
  if (!url) return "/";
  try {
    if (/^https?:\/\//.test(url)) return new URL(url).pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
  return url.startsWith("/") ? url : `/${url}`;
}

function buildResponse(config, data, status = 200) {
  return { config, data, headers: {}, status, statusText: "OK" };
}

function buildAxiosError(config, status, message) {
  const error = new Error(message);
  error.config = config;
  error.response = { config, data: message, headers: {}, status, statusText: "Error" };
  return error;
}

function getTeamRecord(state, team) {
  return state.teams[team] || null;
}

function isBridgeBackedJiraTeam(teamRecord, jiraBridgeUrl = defaultBridgeUrl) {
  return Boolean(
    jiraBridgeUrl &&
    teamRecord?.integration?.jira?.enabled &&
    teamRecord?.integration?.jira?.connectionMode === "bridge" &&
    teamRecord?.integration?.jira?.bridgeConnectionId
  );
}

function getSprintRecord(state, team, sprint) {
  const teamRecord = getTeamRecord(state, team);
  return teamRecord && teamRecord.sprints[sprint] ? teamRecord.sprints[sprint] : null;
}

function getActiveUser(state, config) {
  const session = readSession();
  if (!session?.userName) throw buildAxiosError(config, 401, "Authentication required");
  const user = state.users.find((entry) => entry.userName === session.userName);
  if (!user) {
    clearSession();
    throw buildAxiosError(config, 401, "Authentication required");
  }
  return user;
}

function buildUserPayload(user) {
  return { userName: user.userName, emailId: user.emailId, role: user.role || ["user"], teams: user.teams || [] };
}

function ensureTeamAccess(user, team) {
  if (!user.teams.includes(team)) user.teams.push(team);
}

function findItemById(state, itemId) {
  for (const teamRecord of Object.values(state.teams)) {
    for (const sprintRecord of Object.values(teamRecord.sprints)) {
      const item = sprintRecord.items.find((entry) => entry._id === itemId);
      if (item) return { sprintRecord, item };
    }
  }
  return null;
}

function calculateVoteState(items, userName) {
  const totalVotes = items.reduce((sum, item) => sum + Number(item.votes || 0), 0);
  const userVotes = items.reduce((sum, item) => {
    const voter = (item.voterList || []).find((entry) => entry.voterName === userName);
    return sum + (voter ? voter.voteCount : 0);
  }, 0);
  return [userVotes < demoVoteLimit, totalVotes];
}

function sortItems(items, sorting) {
  const clonedItems = clone(items);
  if (sorting === "vote") {
    clonedItems.sort((left, right) => Number(right.votes || 0) - Number(left.votes || 0));
    return clonedItems;
  }
  clonedItems.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  return clonedItems;
}

function getAverageHappiness(entries) {
  if (!entries.length) return { average: "" };
  const total = entries.reduce((sum, entry) => sum + Number(entry.happiness || 0), 0);
  return { average: (total / entries.length).toFixed(2) };
}

function ensureSprintVelocity(teamRecord, sprintName) {
  const sprintRecord = teamRecord.sprints[sprintName];
  if (!sprintRecord) return null;
  if (teamRecord.integration?.jira?.enabled && teamRecord.integration?.jira?.connectionMode === "mock") {
    sprintRecord.velocity = createDemoJiraVelocity(teamRecord, sprintName);
  } else if (teamRecord.integration?.jira?.enabled) {
    sprintRecord.velocity = {
      team: teamRecord.teamName,
      sprint: sprintName,
      source: "jira",
      jiraSprintName: sprintRecord.velocity?.jiraSprintName || sprintName,
      pi: sprintRecord.velocity?.pi || inferPiValue(sprintName),
      syncedAt: sprintRecord.velocity?.syncedAt || "",
      ...sprintRecord.velocity,
    };
  } else if (sprintRecord.velocity) {
    sprintRecord.velocity = { source: sprintRecord.velocity.source || "manual", syncedAt: sprintRecord.velocity.syncedAt || "", ...sprintRecord.velocity };
  }
  return sprintRecord.velocity;
}

async function bridgeRequest(config, method, path, { jiraBridgeUrl = defaultBridgeUrl, params, body } = {}) {
  if (!jiraBridgeUrl) {
    throw buildAxiosError(config, 503, "The local Jira demo bridge is not running. Start it with npm run demo:jira.");
  }

  const url = new URL(path, jiraBridgeUrl.endsWith("/") ? jiraBridgeUrl : `${jiraBridgeUrl}/`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  let response;

  try {
    response = await fetch(url.toString(), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw buildAxiosError(
      config,
      502,
      "RetroBoard couldn't reach the local Jira bridge. Start it with npm run demo:jira and try again."
    );
  }

  const responseText = await response.text();
  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof responseData === "string"
        ? responseData
        : responseData?.message || "RetroBoard couldn't reach Jira right now.";
    throw buildAxiosError(config, response.status, message);
  }

  return responseData;
}

function ensureSprintRecord(teamRecord, sprintName, jiraSprintName = sprintName) {
  if (!teamRecord.sprints[sprintName]) {
    teamRecord.sprints[sprintName] = {
      sorting: "date",
      items: [],
      happiness: [],
      velocity: null,
    };
  }

  if (teamRecord.integration?.jira?.enabled) {
    teamRecord.sprints[sprintName].velocity = {
      team: teamRecord.teamName,
      sprint: sprintName,
      source: "jira",
      pi: teamRecord.sprints[sprintName].velocity?.pi || inferPiValue(jiraSprintName),
      jiraSprintName,
      syncedAt: teamRecord.sprints[sprintName].velocity?.syncedAt || "",
      ...teamRecord.sprints[sprintName].velocity,
    };
  }

  return teamRecord.sprints[sprintName];
}

function syncJiraSprintsIntoTeam(teamRecord, jiraSprints) {
  const sprintKeys = [];

  jiraSprints.forEach((jiraSprintName) => {
    const sprintName = slugify(jiraSprintName) || jiraSprintName;
    const sprintRecord = ensureSprintRecord(teamRecord, sprintName, jiraSprintName);
    sprintRecord.velocity = {
      team: teamRecord.teamName,
      sprint: sprintName,
      source: "jira",
      pi: sprintRecord.velocity?.pi || inferPiValue(jiraSprintName),
      jiraSprintName,
      syncedAt: sprintRecord.velocity?.syncedAt || "",
      ...sprintRecord.velocity,
    };
    sprintKeys.push(sprintName);
  });

  return sprintKeys.sort();
}

async function refreshBridgeBackedTeam(config, state, teamRecord, jiraBridgeUrl = defaultBridgeUrl) {
  if (!isBridgeBackedJiraTeam(teamRecord, jiraBridgeUrl)) {
    return Object.keys(teamRecord.sprints).sort();
  }

  const bridgeResponse = await bridgeRequest(config, "GET", "/api/jira/sprints", {
    jiraBridgeUrl,
    params: {
      connectionId: teamRecord.integration.jira.bridgeConnectionId,
    },
  });

  const sprintNames = syncJiraSprintsIntoTeam(
    teamRecord,
    Array.isArray(bridgeResponse?.sprints) ? bridgeResponse.sprints : []
  );
  writeState(state);
  return sprintNames;
}

function getPiList(teamRecord) {
  const uniquePis = new Set();
  Object.keys(teamRecord.sprints).forEach((sprintName) => {
    const velocity = ensureSprintVelocity(teamRecord, sprintName);
    if (velocity?.pi) uniquePis.add(velocity.pi);
  });
  return Array.from(uniquePis).sort((left, right) => Number(left) - Number(right));
}

function getActionItems(sprintRecord) {
  return sortItems(sprintRecord.items, sprintRecord.sorting).filter((item) => Array.isArray(item.actionPoints) && item.actionPoints.length > 0);
}

async function resolveDemoRequest(config, options = {}) {
  const jiraBridgeUrl = options.jiraBridgeUrl || defaultBridgeUrl;
  const state = readState();
  const method = (config.method || "get").toLowerCase();
  const path = normalizePath(config.url);
  const params = config.params || {};
  const body = parseData(config.data);

  if (path === "/auth/session" && method === "get") {
    const session = readSession();
    if (!session) throw buildAxiosError(config, 401, "Authentication required");
    const user = state.users.find((entry) => entry.userName === session.userName);
    if (!user) {
      clearSession();
      throw buildAxiosError(config, 401, "Authentication required");
    }
    return buildResponse(config, { user: buildUserPayload(user) });
  }

  if (path === "/authenticate" && method === "post") {
    const user = state.users.find((entry) => entry.userName === String(body.userName || "").trim().toLowerCase());
    if (!user || user.password !== body.password) throw buildAxiosError(config, 400, "UserName/Password is incorrect!");
    writeSession(user.userName);
    return buildResponse(config, { user: buildUserPayload(user) });
  }

  if (path === "/verifyAndSignUp" && method === "post") {
    const requestedUserName = String(body.userName || "").trim().toLowerCase();
    const emailId = String(body.emailId || "").trim().toLowerCase();
    const existing = state.users.find((entry) => entry.userName === requestedUserName || entry.emailId === emailId);
    if (existing) throw buildAxiosError(config, 409, "That username or email is already registered.");
    const user = { userName: requestedUserName, emailId, password: body.password, role: ["user"], teams: Object.keys(state.teams) };
    state.users.push(user);
    writeState(state);
    writeSession(user.userName);
    return buildResponse(config, { user: buildUserPayload(user) });
  }

  if (path === "/logout" && method === "post") {
    clearSession();
    return buildResponse(config, {}, 204);
  }

  if (path === "/health" && method === "get") return buildResponse(config, { status: "ok", mode: "demo" });

  const activeUser = getActiveUser(state, config);

  if (path === "/getTeams" && method === "get") return buildResponse(config, Object.keys(state.teams).sort());

  if (path === "/createTeam" && method === "post") {
    const teamName = slugify(body.team);
    if (!teamName) throw buildAxiosError(config, 400, "Team name is not defined!");
    if (state.teams[teamName]) throw buildAxiosError(config, 400, "Team exists!");
    const integration = normalizeTeamConfiguration(body.integration);

    if (integration.jira.enabled && jiraBridgeUrl) {
      const jiraUserName = String(body.integration?.jira?.userName || "").trim();
      const jiraApiToken = String(body.integration?.jira?.apiToken || "");

      if (!jiraUserName || !jiraApiToken) {
        throw buildAxiosError(config, 400, "Enter your Jira email / username and API token to connect this demo team.");
      }

      const bridgeResponse = await bridgeRequest(config, "POST", "/api/jira/connect", {
        jiraBridgeUrl,
        body: {
          boardUrl: integration.jira.boardUrl,
          userName: jiraUserName,
          apiToken: jiraApiToken,
        },
      });

      const liveTeamRecord = {
        teamName,
        integration: normalizeTeamConfiguration({
          jira: {
            ...bridgeResponse.jira,
            bridgeConnectionId: bridgeResponse.connectionId,
          },
        }),
        settings: { Good: "Good", Bad: "Bad", Ugly: "Ugly" },
        sprints: {},
      };

      syncJiraSprintsIntoTeam(
        liveTeamRecord,
        Array.isArray(bridgeResponse?.sprints) ? bridgeResponse.sprints : []
      );

      state.teams[teamName] = liveTeamRecord;
      ensureTeamAccess(activeUser, teamName);
      writeState(state);
      return buildResponse(config, { ok: true, mode: "jira-bridge" });
    }

    const sprints = {};
    if (integration.jira.enabled) {
      ["Sprint 1", "Sprint 2"].forEach((name) => {
        const sprintName = slugify(name);
        sprints[sprintName] = {
          sorting: "date",
          items: [],
          happiness: [],
          velocity: null,
        };
      });
    }
    state.teams[teamName] = { teamName, integration, settings: { Good: "Good", Bad: "Bad", Ugly: "Ugly" }, sprints };
    ensureTeamAccess(activeUser, teamName);
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/getTeamConfiguration" && method === "get") {
    const teamRecord = getTeamRecord(state, params.team);
    return buildResponse(config, teamRecord ? normalizeTeamConfiguration(teamRecord.integration) : clone(defaultTeamConfiguration));
  }

  if (path === "/getSprints" && method === "get") {
    const teamRecord = getTeamRecord(state, params.team);
    if (!teamRecord) {
      return buildResponse(config, []);
    }

    const sprintNames = await refreshBridgeBackedTeam(config, state, teamRecord, jiraBridgeUrl);
    return buildResponse(config, sprintNames);
  }

  if (path === "/createSprint" && method === "post") {
    const teamRecord = getTeamRecord(state, body.team);
    const sprintName = slugify(body.sprint);
    if (!teamRecord) throw buildAxiosError(config, 400, "Team name is not defined!");
    if (!sprintName) throw buildAxiosError(config, 400, "Sprint name is not defined!");
    if (teamRecord.integration?.jira?.enabled) {
      throw buildAxiosError(config, 400, "This team's sprints are synced from Jira. Create the sprint in Jira and refresh RetroBoard.");
    }
    if (teamRecord.sprints[sprintName]) throw buildAxiosError(config, 400, "Sprint exists!");
    teamRecord.sprints[sprintName] = { sorting: "date", items: [], happiness: [], velocity: teamRecord.integration?.jira?.enabled ? createDemoJiraVelocity(teamRecord, sprintName) : null };
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/deleteSprint" && method === "post") {
    const teamRecord = getTeamRecord(state, body.team);
    if (!teamRecord || !body.sprint) throw buildAxiosError(config, 400, "Please update all the required fields!");
    if (teamRecord.integration?.jira?.enabled) {
      throw buildAxiosError(config, 400, "This sprint comes from Jira. Delete or close it in Jira instead.");
    }
    delete teamRecord.sprints[body.sprint];
    writeState(state);
    return buildResponse(config, {}, 200);
  }

  if (path === "/deleteTeam" && method === "post") {
    if (!body.team || !state.teams[body.team]) throw buildAxiosError(config, 400, "Please update all the required fields!");
    delete state.teams[body.team];
    state.users.forEach((user) => {
      user.teams = (user.teams || []).filter((entry) => entry !== body.team);
    });
    writeState(state);
    return buildResponse(config, {}, 200);
  }

  const boardMatch = path.match(/^\/team\/([^/]+)\/sprint\/([^/]+)\/userName\/([^/]+)$/);
  if (boardMatch && method === "get") {
    const [, teamName, sprintName] = boardMatch;
    const teamRecord = getTeamRecord(state, teamName);
    const sprintRecord = getSprintRecord(state, teamName, sprintName);
    if (!teamRecord || !sprintRecord) return buildResponse(config, { items: [], settings: teamRecord ? teamRecord.settings : null });
    return buildResponse(config, { items: sortItems(sprintRecord.items, sprintRecord.sorting), settings: teamRecord.settings });
  }

  if (path === "/setSortingCriteria" && method === "post") {
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    if (!sprintRecord) throw buildAxiosError(config, 400, "Please update all the required fields!");
    sprintRecord.sorting = body.criteria || "date";
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/getSortingCriteria" && method === "get") {
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    return buildResponse(config, [sprintRecord ? sprintRecord.sorting || "date" : "date"]);
  }

  if (path === "/update/Person" && method === "post") {
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    if (!sprintRecord) throw buildAxiosError(config, 400, "Please update all the required fields!");
    sprintRecord.items.push({ _id: createId("item"), team: body.team, sprint: body.sprint, name: activeUser.userName, type: body.type, message: body.message, date: body.date || nowIso(), votes: Number(body.vote || 0), voterList: [], actionPoints: [] });
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/deletepost" && method === "post") {
    const match = findItemById(state, body._id);
    if (!match) throw buildAxiosError(config, 400, "Unable to find that item.");
    if (match.item.name !== activeUser.userName) throw buildAxiosError(config, 400, "Insufficient permission");
    match.sprintRecord.items = match.sprintRecord.items.filter((entry) => entry._id !== body._id);
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/moveacrosscolumn" && method === "post") {
    const match = findItemById(state, body._id);
    if (!match) throw buildAxiosError(config, 400, "Please update all the required fields!");
    match.item.type = body.type;
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/renameColumn" && method === "post") {
    const teamRecord = getTeamRecord(state, body.team);
    if (!teamRecord) throw buildAxiosError(config, 400, "Please update all the required fields!");
    teamRecord.settings[body.column] = body.value;
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/applyColumnTemplate" && method === "post") {
    const teamRecord = getTeamRecord(state, body.team);
    if (!teamRecord || !body.columns?.Good || !body.columns?.Bad || !body.columns?.Ugly) throw buildAxiosError(config, 400, "Please update all the required fields!");
    teamRecord.settings = { Good: body.columns.Good, Bad: body.columns.Bad, Ugly: body.columns.Ugly };
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/addactionpoint" && method === "post") {
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    const item = sprintRecord ? sprintRecord.items.find((entry) => entry._id === body._id) : null;
    if (!item) throw buildAxiosError(config, 400, "Unable to find that item.");
    item.actionPoints = item.actionPoints || [];
    item.actionPoints.push(body.actionPoint);
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/checkIfVotingAllowed" && method === "get") {
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    return buildResponse(config, sprintRecord ? calculateVoteState(sprintRecord.items, activeUser.userName) : [true, 0]);
  }

  if (path === "/addvote" && method === "post") {
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    if (!sprintRecord) throw buildAxiosError(config, 400, "Please update all the required fields!");
    const voteState = calculateVoteState(sprintRecord.items, activeUser.userName);
    if (!voteState[0]) throw buildAxiosError(config, 400, "Vote limit reached");
    const item = sprintRecord.items.find((entry) => entry._id === body._id);
    if (!item) throw buildAxiosError(config, 400, "Unable to find that item.");
    const voter = (item.voterList = item.voterList || []).find((entry) => entry.voterName === activeUser.userName);
    if (voter) voter.voteCount += 1;
    else item.voterList.push({ voterName: activeUser.userName, voteCount: 1 });
    item.votes = Number(item.votes || 0) + 1;
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/removevote" && method === "post") {
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    const item = sprintRecord ? sprintRecord.items.find((entry) => entry._id === body._id) : null;
    if (!item) throw buildAxiosError(config, 400, "Unable to find that item.");
    const voter = (item.voterList || []).find((entry) => entry.voterName === activeUser.userName);
    if (!voter) return buildResponse(config, -2);
    if (Number(item.votes || 0) <= 0 || voter.voteCount <= 0) return buildResponse(config, -1);
    voter.voteCount -= 1;
    item.votes = Number(item.votes || 0) - 1;
    if (voter.voteCount === 0) item.voterList = item.voterList.filter((entry) => entry.voterName !== activeUser.userName);
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/updateHappiness" && method === "post") {
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    if (!sprintRecord) throw buildAxiosError(config, 400, "Please update all the required fields!");
    const existing = sprintRecord.happiness.find((entry) => entry.name === activeUser.userName);
    if (existing) existing.happiness = body.happiness;
    else sprintRecord.happiness.push({ _id: createId("happy"), team: body.team, sprint: body.sprint, name: activeUser.userName, happiness: body.happiness });
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/removeHappiness" && method === "post") {
    const teamRecord = Object.values(state.teams).find((team) => Object.values(team.sprints).some((sprint) => sprint.happiness.some((entry) => entry._id === body.id)));
    if (!teamRecord) throw buildAxiosError(config, 400, "id is missing!");
    const sprintRecord = Object.values(teamRecord.sprints).find((sprint) => sprint.happiness.some((entry) => entry._id === body.id));
    const existing = sprintRecord.happiness.find((entry) => entry._id === body.id);
    if (existing.name !== activeUser.userName) return buildResponse(config, -1);
    sprintRecord.happiness = sprintRecord.happiness.filter((entry) => entry._id !== body.id);
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/getHappinessForASprint" && method === "get") {
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    return buildResponse(config, sprintRecord ? clone(sprintRecord.happiness) : []);
  }

  if (path === "/getAvgHappinessForASprint" && method === "get") {
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    return buildResponse(config, getAverageHappiness(sprintRecord ? sprintRecord.happiness : []));
  }

  if (path === "/setVelocity" && method === "post") {
    const teamRecord = getTeamRecord(state, body.team);
    const sprintRecord = getSprintRecord(state, body.team, body.sprint);
    if (!teamRecord || !sprintRecord) throw buildAxiosError(config, 400, "Please update all the required fields!");
    if (teamRecord.integration?.jira?.enabled) throw buildAxiosError(config, 400, "Velocity for this team is synced from Jira and can't be edited manually.");
    sprintRecord.velocity = { team: body.team, sprint: body.sprint, spPlanned: body.spPlanned, spBurnt: body.spBurnt, pi: body.pi, bbAccuracy: body.bbAccuracy, source: "manual", syncedAt: "" };
    writeState(state);
    return buildResponse(config, { ok: true });
  }

  if (path === "/getVelocityForSprint" && method === "get") {
    const teamRecord = getTeamRecord(state, params.team);
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    if (!teamRecord || !sprintRecord) return buildResponse(config, []);

    if (isBridgeBackedJiraTeam(teamRecord, jiraBridgeUrl)) {
      const bridgeVelocity = await bridgeRequest(config, "GET", "/api/jira/velocity", {
        jiraBridgeUrl,
        params: {
          connectionId: teamRecord.integration.jira.bridgeConnectionId,
          sprint: sprintRecord.velocity?.jiraSprintName || params.sprint,
        },
      });
      const inferredPi =
        bridgeVelocity?.pi ||
        sprintRecord.velocity?.pi ||
        inferPiValue(bridgeVelocity?.jiraSprintName || sprintRecord.velocity?.jiraSprintName || params.sprint);

      sprintRecord.velocity = {
        team: params.team,
        sprint: params.sprint,
        ...bridgeVelocity,
        pi: inferredPi,
      };
    } else {
      ensureSprintVelocity(teamRecord, params.sprint);
    }

    writeState(state);
    return buildResponse(config, sprintRecord.velocity ? [clone(sprintRecord.velocity)] : []);
  }

  if (path === "/getTopVotedItemsForASprint" && method === "get") {
    const teamRecord = getTeamRecord(state, params.team);
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    const items = sprintRecord ? clone(sprintRecord.items).sort((left, right) => Number(right.votes || 0) - Number(left.votes || 0)).slice(0, 3) : [];
    return buildResponse(config, { items, settings: teamRecord ? teamRecord.settings : null });
  }

  if (path === "/getActionItemsForASprint" && method === "get") {
    const sprintRecord = getSprintRecord(state, params.team, params.sprint);
    return buildResponse(config, sprintRecord ? getActionItems(sprintRecord) : []);
  }

  if (path === "/getPIListForATeam" && method === "get") {
    const teamRecord = getTeamRecord(state, params.team);
    if (teamRecord) {
      await refreshBridgeBackedTeam(config, state, teamRecord, jiraBridgeUrl);
    }
    const result = teamRecord ? getPiList(teamRecord) : [];
    writeState(state);
    return buildResponse(config, result);
  }

  if (path === "/getSprintsForAPI" && method === "get") {
    const teamRecord = getTeamRecord(state, params.team);
    if (!teamRecord) return buildResponse(config, []);
    await refreshBridgeBackedTeam(config, state, teamRecord, jiraBridgeUrl);
    const sprints = Object.keys(teamRecord.sprints).filter((sprintName) => {
      const velocity = ensureSprintVelocity(teamRecord, sprintName);
      return velocity && String(velocity.pi) === String(params.pi);
    }).sort();
    writeState(state);
    return buildResponse(config, sprints);
  }

  throw buildAxiosError(config, 404, `Demo API route not implemented: ${method.toUpperCase()} ${path}`);
}

export function resetDemoState() {
  window.localStorage.removeItem(demoStateKey);
  window.localStorage.removeItem(demoSessionKey);
}

export function createDemoAdapter(options = {}) {
  return async function demoAdapter(config) {
    try {
      return resolveDemoRequest(config, options);
    } catch (error) {
      return Promise.reject(error);
    }
  };
}
