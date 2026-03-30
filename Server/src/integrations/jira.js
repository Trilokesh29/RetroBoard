const { decryptSecret } = require("../auth/security");

const jiraPageSize = 100;

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildAuthHeader(jiraConfig) {
  const jiraUser = String(jiraConfig.userName || "").trim();
  const jiraToken = decryptSecret(jiraConfig.apiTokenEncrypted || jiraConfig.apiToken);

  return `Basic ${Buffer.from(`${jiraUser}:${jiraToken}`).toString("base64")}`;
}

async function jiraRequest(jiraConfig, path, searchParams = {}) {
  const url = new URL(`${normalizeBaseUrl(jiraConfig.baseUrl)}${path}`);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: buildAuthHeader(jiraConfig),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira request failed (${response.status} ${response.statusText}): ${errorText || path}`
    );
  }

  return response.json();
}

async function fetchBoardConfiguration(jiraConfig) {
  return jiraRequest(jiraConfig, `/rest/agile/1.0/board/${jiraConfig.boardId}/configuration`);
}

async function fetchAllBoardSprints(jiraConfig) {
  const values = [];
  let startAt = 0;
  let shouldContinue = true;

  while (shouldContinue) {
    const response = await jiraRequest(
      jiraConfig,
      `/rest/agile/1.0/board/${jiraConfig.boardId}/sprint`,
      {
        startAt,
        maxResults: jiraPageSize,
      }
    );

    values.push(...(response.values || []));
    startAt += response.maxResults || jiraPageSize;
    shouldContinue = Boolean(response.isLast === false || startAt < (response.total || 0));
  }

  return values;
}

async function listBoardSprints(jiraConfig) {
  const sprints = await fetchAllBoardSprints(jiraConfig);

  return sprints
    .map((sprint) => ({
      id: String(sprint.id),
      name: sprint.name,
      state: sprint.state || "",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function fetchSprintIssues(jiraConfig, sprintId, estimationFieldId) {
  const issues = [];
  let startAt = 0;
  let shouldContinue = true;
  const issueFields = ["status", "fixVersions"];

  if (estimationFieldId) {
    issueFields.push(estimationFieldId);
  }

  while (shouldContinue) {
    const response = await jiraRequest(
      jiraConfig,
      `/rest/agile/1.0/sprint/${sprintId}/issue`,
      {
        startAt,
        maxResults: jiraPageSize,
        fields: issueFields.join(","),
      }
    );

    issues.push(...(response.issues || []));
    startAt += response.maxResults || jiraPageSize;
    shouldContinue = startAt < (response.total || 0);
  }

  return issues;
}

function findSprintByName(sprints, sprintName) {
  const normalizedSprintName = slugify(sprintName);

  return (
    sprints.find((entry) => slugify(entry.name) === normalizedSprintName) ||
    sprints.find((entry) => String(entry.name || "").trim() === String(sprintName || "").trim()) ||
    null
  );
}

function getEstimateForIssue(issue, estimationFieldId, estimationType) {
  if (estimationType === "issueCount") {
    return 1;
  }

  if (!estimationFieldId) {
    return 0;
  }

  return Number(issue.fields?.[estimationFieldId] || 0);
}

function isDoneIssue(issue) {
  return issue.fields?.status?.statusCategory?.key === "done";
}

function inferPiValue(sprintName) {
  const explicitMatch = String(sprintName || "").match(/\bpi[\s_-]*(\d+)\b/i);
  if (explicitMatch) {
    return explicitMatch[1];
  }

  const fallbackMatch = String(sprintName || "").match(/(\d+)/);
  return fallbackMatch ? String(Math.max(1, Math.ceil(Number(fallbackMatch[1]) / 4))) : "1";
}

function inferPiFromFixVersionName(fixVersionName) {
  const explicitMatch = String(fixVersionName || "").match(/\bpi[\s_-]*(\d+)\b/i);
  if (explicitMatch) {
    return explicitMatch[1];
  }

  const programIncrementMatch = String(fixVersionName || "").match(/\bprogram[\s_-]*increment[\s_-]*(\d+)\b/i);
  if (programIncrementMatch) {
    return programIncrementMatch[1];
  }

  return "";
}

function getPiFromSprintIssues(issues, sprintName) {
  const piCounts = new Map();

  issues.forEach((issue) => {
    (issue.fields?.fixVersions || []).forEach((fixVersion) => {
      const inferredPi = inferPiFromFixVersionName(fixVersion?.name);
      if (!inferredPi) {
        return;
      }

      piCounts.set(inferredPi, (piCounts.get(inferredPi) || 0) + 1);
    });
  });

  if (piCounts.size > 0) {
    return [...piCounts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return Number(left[0]) - Number(right[0]);
      })[0][0];
  }

  return inferPiValue(sprintName);
}

async function validateConfiguration(jiraConfig) {
  const boardConfiguration = await fetchBoardConfiguration(jiraConfig);

  return {
    boardName: boardConfiguration.name || "",
    estimationType: boardConfiguration.estimation?.type || "field",
    estimationFieldId: boardConfiguration.estimation?.field?.fieldId || "",
  };
}

async function getSprintMetrics(jiraConfig, sprintName) {
  const boardConfiguration = await fetchBoardConfiguration(jiraConfig);
  const sprints = await fetchAllBoardSprints(jiraConfig);
  const sprint = findSprintByName(sprints, sprintName);

  if (!sprint) {
    throw new Error(`Sprint "${sprintName}" was not found on the configured Jira board.`);
  }

  const estimationType = boardConfiguration.estimation?.type || "field";
  const estimationFieldId = boardConfiguration.estimation?.field?.fieldId || "";
  const issues = await fetchSprintIssues(jiraConfig, sprint.id, estimationFieldId);

  const planned = issues.reduce(
    (sum, issue) => sum + getEstimateForIssue(issue, estimationFieldId, estimationType),
    0
  );
  const completed = issues.reduce(
    (sum, issue) =>
      sum + (isDoneIssue(issue) ? getEstimateForIssue(issue, estimationFieldId, estimationType) : 0),
    0
  );
  const bugBufferAccuracy = planned > 0 ? Math.round((completed / planned) * 100) : 0;
  const pi = getPiFromSprintIssues(issues, sprint.name);

  return {
    source: "jira",
    jiraSprintId: String(sprint.id),
    jiraSprintName: sprint.name,
    pi,
    spPlanned: String(planned),
    spBurnt: String(completed),
    bbAccuracy: String(bugBufferAccuracy),
    syncedAt: new Date().toISOString(),
  };
}

module.exports = {
  getSprintMetrics,
  listBoardSprints,
  validateConfiguration,
  _test: {
    findSprintByName,
    getPiFromSprintIssues,
    inferPiFromFixVersionName,
    inferPiValue,
  },
};
