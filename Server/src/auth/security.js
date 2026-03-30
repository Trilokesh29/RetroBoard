const crypto = require("crypto");

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const SESSION_TOKEN_LENGTH = 48;
const ENCRYPTION_IV_LENGTH = 12;
const ENCRYPTION_TAG_LENGTH = 16;
const DEFAULT_APP_SECRET = "retroboard-local-dev-secret";
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(process.env.RETROBOARD_APP_SECRET || DEFAULT_APP_SECRET)
  .digest();

function createPasswordHash(password) {
  const salt = crypto.randomBytes(PASSWORD_SALT_LENGTH).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, PASSWORD_KEY_LENGTH)
    .toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPasswordHash) {
  if (!storedPasswordHash || !storedPasswordHash.includes(":")) {
    return false;
  }

  const [salt, storedHash] = storedPasswordHash.split(":");
  const derivedHash = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (storedHashBuffer.length !== derivedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedHashBuffer, derivedHash);
}

function createSessionToken() {
  return crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex");
}

function hashSessionToken(sessionToken) {
  return crypto.createHash("sha256").update(sessionToken).digest("hex");
}

function createIdentifier() {
  return crypto.randomBytes(16).toString("hex");
}

function encryptSecret(secretValue) {
  if (!secretValue) {
    return "";
  }

  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(secretValue), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptSecret(encryptedSecretValue) {
  if (!encryptedSecretValue) {
    return "";
  }

  const parts = String(encryptedSecretValue).split(":");
  if (parts.length !== 3) {
    return String(encryptedSecretValue);
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    ENCRYPTION_KEY,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  createIdentifier,
  createPasswordHash,
  createSessionToken,
  decryptSecret,
  encryptSecret,
  hashSessionToken,
  verifyPassword,
};
