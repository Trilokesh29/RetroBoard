const test = require("node:test");
const assert = require("node:assert/strict");

const jira = require("../src/integrations/jira");

const { _test } = jira;

test("PI inference prefers fix version names before sprint-name fallback", () => {
  assert.equal(_test.inferPiFromFixVersionName("PI 6"), "6");
  assert.equal(_test.inferPiFromFixVersionName("Program Increment 9"), "9");
  assert.equal(_test.inferPiFromFixVersionName("Release Train"), "");

  const issues = [
    {
      fields: {
        fixVersions: [{ name: "Program Increment 8" }, { name: "Release 1" }],
      },
    },
    {
      fields: {
        fixVersions: [{ name: "PI 8" }],
      },
    },
    {
      fields: {
        fixVersions: [{ name: "PI 7" }],
      },
    },
  ];

  assert.equal(_test.getPiFromSprintIssues(issues, "Sprint 31"), "8");
  assert.equal(_test.getPiFromSprintIssues([], "Sprint 24"), "6");
});

test("findSprintByName matches slugged sprint names", () => {
  const sprints = [
    { id: "101", name: "Sprint 21" },
    { id: "102", name: "PI 6 Sprint 24" },
  ];

  assert.deepEqual(_test.findSprintByName(sprints, "sprint_21"), sprints[0]);
  assert.deepEqual(_test.findSprintByName(sprints, "PI 6 Sprint 24"), sprints[1]);
  assert.equal(_test.findSprintByName(sprints, "missing"), null);
});

test("getSprintMetrics aggregates estimates and derives PI from fix versions", async () => {
  const originalFetch = global.fetch;
  const fetchCalls = [];

  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (url.includes("/configuration")) {
      return {
        ok: true,
        json: async () => ({
          name: "Aurora Delivery",
          estimation: {
            type: "field",
            field: { fieldId: "customfield_10016" },
          },
        }),
      };
    }

    if (url.includes("/board/24/sprint?")) {
      return {
        ok: true,
        json: async () => ({
          values: [{ id: 200, name: "Sprint 24", state: "closed" }],
          maxResults: 100,
          total: 1,
          isLast: true,
        }),
      };
    }

    if (url.includes("/sprint/200/issue?")) {
      return {
        ok: true,
        json: async () => ({
          issues: [
            {
              fields: {
                status: { statusCategory: { key: "done" } },
                customfield_10016: 5,
                fixVersions: [{ name: "PI 6" }],
              },
            },
            {
              fields: {
                status: { statusCategory: { key: "in-flight" } },
                customfield_10016: 3,
                fixVersions: [{ name: "Program Increment 6" }],
              },
            },
            {
              fields: {
                status: { statusCategory: { key: "done" } },
                customfield_10016: 2,
                fixVersions: [{ name: "PI 5" }],
              },
            },
          ],
          maxResults: 100,
          total: 3,
        }),
      };
    }

    throw new Error(`Unexpected fetch request: ${url}`);
  };

  try {
    const metrics = await jira.getSprintMetrics(
      {
        baseUrl: "https://example.atlassian.net",
        boardId: "24",
        userName: "jira@example.com",
        apiToken: "demo-token",
      },
      "sprint_24"
    );

    assert.equal(metrics.jiraSprintId, "200");
    assert.equal(metrics.jiraSprintName, "Sprint 24");
    assert.equal(metrics.pi, "6");
    assert.equal(metrics.spPlanned, "10");
    assert.equal(metrics.spBurnt, "7");
    assert.equal(metrics.bbAccuracy, "70");
    assert.ok(metrics.syncedAt);
    assert.equal(fetchCalls.length, 3);
    assert.match(fetchCalls[0].options.headers.Authorization, /^Basic /);
  } finally {
    global.fetch = originalFetch;
  }
});
