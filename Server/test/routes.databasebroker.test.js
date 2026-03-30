const test = require("node:test");
const assert = require("node:assert/strict");

const databaseBroker = require("../src/routes/databasebroker");

const { _test } = databaseBroker;

test("parseJiraBoardUrl extracts host, project key, and board id", () => {
  assert.deepEqual(
    _test.parseJiraBoardUrl(
      "https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393"
    ),
    {
      baseUrl: "https://thermofisher-asg.atlassian.net",
      projectKey: "XENON",
      boardId: "1393",
    }
  );

  assert.equal(_test.parseJiraBoardUrl("https://thermofisher-asg.atlassian.net/browse/XENON-123"), null);
});

test("normalizeTeamIntegration derives Jira details from the pasted board URL", () => {
  assert.deepEqual(
    _test.normalizeTeamIntegration({
      jira: {
        enabled: true,
        boardUrl: "https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393",
        userName: "jira@example.com ",
        apiToken: " token-value ",
      },
    }),
    {
      jira: {
        enabled: true,
        boardUrl: "https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393",
        baseUrl: "https://thermofisher-asg.atlassian.net",
        boardId: "1393",
        projectKey: "XENON",
        userName: "jira@example.com",
        apiToken: "token-value",
      },
    }
  );

  assert.deepEqual(_test.normalizeTeamIntegration({ jira: { enabled: false } }), {
    jira: {
      enabled: false,
      boardUrl: "",
      baseUrl: "",
      boardId: "",
      projectKey: "",
      userName: "",
      apiToken: "",
    },
  });
});

test("validateTeamIntegration enforces the current Jira setup requirements", () => {
  assert.equal(
    _test.validateTeamIntegration({
      jira: {
        enabled: true,
        boardUrl: "",
        userName: "jira@example.com",
        apiToken: "token",
        boardId: "1393",
      },
    }),
    "Please provide the Jira board URL, username/email, and API token."
  );

  assert.equal(
    _test.validateTeamIntegration({
      jira: {
        enabled: true,
        boardUrl: "https://example.atlassian.net/jira/software/c/projects/XENON/boards/not-a-number",
        userName: "jira@example.com",
        apiToken: "token",
        boardId: "not-a-number",
      },
    }),
    "Please provide a valid Jira board URL."
  );

  assert.equal(
    _test.validateTeamIntegration({
      jira: {
        enabled: true,
        boardUrl: "https://example.atlassian.net/jira/software/c/projects/XENON/boards/1393",
        userName: "jira@example.com",
        apiToken: "token",
        boardId: "1393",
      },
    }),
    null
  );
});

test("auth response and cookie helpers keep stable contract values", () => {
  assert.deepEqual(
    _test.buildAuthResponse({
      userName: "demo_lead",
      emailId: "demo@example.com",
      role: ["user"],
      teams: ["aurora"],
    }),
    {
      user: {
        userName: "demo_lead",
        emailId: "demo@example.com",
        role: ["user"],
        teams: ["aurora"],
      },
    }
  );

  assert.deepEqual(_test.getCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  });

  assert.equal(
    _test.getSessionToken({
      cookies: {
        retroboard_session: "session-token",
      },
    }),
    "session-token"
  );
});
