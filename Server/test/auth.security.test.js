const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createIdentifier,
  createPasswordHash,
  createSessionToken,
  decryptSecret,
  encryptSecret,
  hashSessionToken,
  verifyPassword,
} = require("../src/auth/security");

test("password hashing verifies only the original password", () => {
  const passwordHash = createPasswordHash("retroboard-demo-password");

  assert.notEqual(passwordHash, "retroboard-demo-password");
  assert.equal(verifyPassword("retroboard-demo-password", passwordHash), true);
  assert.equal(verifyPassword("not-the-password", passwordHash), false);
});

test("secret encryption round-trips and leaves plain values readable", () => {
  const encryptedSecret = encryptSecret("jira-api-token");

  assert.notEqual(encryptedSecret, "jira-api-token");
  assert.equal(decryptSecret(encryptedSecret), "jira-api-token");
  assert.equal(decryptSecret("plain-text-token"), "plain-text-token");
});

test("session helpers return stable shapes", () => {
  const sessionToken = createSessionToken();
  const hashedToken = hashSessionToken(sessionToken);
  const identifier = createIdentifier();

  assert.match(sessionToken, /^[a-f0-9]{96}$/);
  assert.match(hashedToken, /^[a-f0-9]{64}$/);
  assert.match(identifier, /^[a-f0-9]{32}$/);
});
