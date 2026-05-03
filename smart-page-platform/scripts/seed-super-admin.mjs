import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 100_000;
const SALT_BYTES = 32;
const KEY_BYTES = 32;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, KEY_BYTES, "sha256");
  return [
    PASSWORD_ALGORITHM,
    String(PASSWORD_ITERATIONS),
    base64UrlEncode(salt),
    base64UrlEncode(hash)
  ].join("$");
}

const email = requiredEnv("SPP_ADMIN_EMAIL").toLowerCase();
const name = process.env.SPP_ADMIN_NAME?.trim() || "Platform Admin";
const password = requiredEnv("SPP_ADMIN_PASSWORD");
const databaseName = process.env.SPP_D1_DATABASE || "smart-page-platform";
const target = process.argv.includes("--remote") ? "--remote" : "--local";
const rotatePassword = process.argv.includes("--rotate-password");
const userId = `usr_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
const passwordHash = hashPassword(password);

const insertSql = `
INSERT INTO users (id, email, name, role, password_hash)
SELECT ${sqlString(userId)}, ${sqlString(email)}, ${sqlString(name)}, 'super_admin', ${sqlString(passwordHash)}
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ${sqlString(email)});
`;

const rotateSql = rotatePassword
  ? `
UPDATE users
SET password_hash = ${sqlString(passwordHash)},
    updated_at = CURRENT_TIMESTAMP
WHERE email = ${sqlString(email)}
  AND role = 'super_admin';
`
  : "";

const sql = `${insertSql}${rotateSql}`;

const tempDirectory = mkdtempSync(join(tmpdir(), "spp-seed-"));
const seedFile = join(tempDirectory, "seed-super-admin.sql");

try {
  writeFileSync(seedFile, sql, "utf8");
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "execute",
      databaseName,
      target,
      "--file",
      seedFile
    ],
    { stdio: "inherit" }
  );
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

console.log(
  rotatePassword
    ? `Super admin seed attempted for ${email}. Existing super admin password was rotated when the account already existed.`
    : `Super admin seed attempted for ${email}. If the user already existed, no row was changed.`
);
