const http = require("http");
const { createIdentifier } = require("../Server/src/auth/security");
const {
  getSprintMetrics,
  listBoardSprints,
  validateConfiguration,
} = require("../Server/src/integrations/jira");

const bridgePort = Number(process.env.RETROBOARD_DEMO_JIRA_PORT || 3001);
const bridgeHost = process.env.RETROBOARD_DEMO_JIRA_HOST || "127.0.0.1";
const connections = new Map();

function parseJiraBoardUrl(boardUrl) {
  if (!boardUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(String(boardUrl).trim());
    const match =
      parsedUrl.pathname.match(/\/jira\/software\/c\/projects\/([^/]+)\/boards\/(\d+)/i) ||
      parsedUrl.pathname.match(/\/boards\/(\d+)/i);

    if (!match) {
      return null;
    }

    return {
      boardUrl: String(boardUrl).trim(),
      baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
      projectKey: match[2] ? String(match[1] || "").toUpperCase() : "",
      boardId: match[2] || match[1],
    };
  } catch (error) {
    return null;
  }
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { message });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk.toString("utf8");
    });

    request.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function getConnection(connectionId) {
  if (!connectionId || !connections.has(connectionId)) {
    const error = new Error("The Jira demo connection expired. Recreate the team to reconnect.");
    error.statusCode = 410;
    throw error;
  }

  return connections.get(connectionId);
}

async function handleConnect(request, response) {
  const body = await readJsonBody(request);
  const parsedBoard = parseJiraBoardUrl(body.boardUrl);
  const userName = String(body.userName || "").trim();
  const apiToken = String(body.apiToken || "");

  if (!parsedBoard) {
    return sendError(response, 400, "Paste a valid Jira board URL to continue.");
  }

  if (!userName || !apiToken) {
    return sendError(response, 400, "Enter both your Jira email / username and API token.");
  }

  const jiraConfig = {
    ...parsedBoard,
    userName,
    apiToken,
  };

  try {
    const boardConfiguration = await validateConfiguration(jiraConfig);
    const sprints = await listBoardSprints(jiraConfig);
    const connectionId = createIdentifier();

    connections.set(connectionId, jiraConfig);

    return sendJson(response, 200, {
      connectionId,
      jira: {
        enabled: true,
        boardUrl: parsedBoard.boardUrl,
        baseUrl: parsedBoard.baseUrl,
        boardId: parsedBoard.boardId,
        projectKey: parsedBoard.projectKey,
        userName,
        hasCredentials: true,
        connectionMode: "bridge",
        boardName: boardConfiguration.boardName || "",
      },
      sprints: sprints.map((entry) => entry.name),
    });
  } catch (error) {
    return sendError(
      response,
      502,
      error.message || "RetroBoard couldn't reach Jira with that board and credential set."
    );
  }
}

async function handleSprints(response, requestUrl) {
  try {
    const jiraConfig = getConnection(requestUrl.searchParams.get("connectionId"));
    const sprints = await listBoardSprints(jiraConfig);
    return sendJson(response, 200, { sprints: sprints.map((entry) => entry.name) });
  } catch (error) {
    return sendError(response, error.statusCode || 502, error.message || "Unable to load Jira sprints.");
  }
}

async function handleVelocity(response, requestUrl) {
  const sprint = String(requestUrl.searchParams.get("sprint") || "").trim();

  if (!sprint) {
    return sendError(response, 400, "Sprint name is required.");
  }

  try {
    const jiraConfig = getConnection(requestUrl.searchParams.get("connectionId"));
    const metrics = await getSprintMetrics(jiraConfig, sprint);
    return sendJson(response, 200, metrics);
  } catch (error) {
    return sendError(
      response,
      error.statusCode || 502,
      error.message || "Unable to load Jira sprint metrics."
    );
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    setCorsHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestUrl.pathname === "/health" && request.method === "GET") {
    return sendJson(response, 200, { status: "ok", mode: "demo-jira-bridge" });
  }

  if (requestUrl.pathname === "/api/jira/connect" && request.method === "POST") {
    return handleConnect(request, response);
  }

  if (requestUrl.pathname === "/api/jira/sprints" && request.method === "GET") {
    return handleSprints(response, requestUrl);
  }

  if (requestUrl.pathname === "/api/jira/velocity" && request.method === "GET") {
    return handleVelocity(response, requestUrl);
  }

  return sendError(response, 404, "Route not found.");
});

server.listen(bridgePort, bridgeHost, () => {
  console.log(`RetroBoard demo Jira bridge listening on http://${bridgeHost}:${bridgePort}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
