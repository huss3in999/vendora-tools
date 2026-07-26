import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const adminHtmlPath = path.join(projectRoot, 'bahrain-saudi-gcc-transport', 'admin', 'index.html');

test('Admin index.html contains formatVisitorShortId and formatSessionShortId function declarations', () => {
  assert.ok(fs.existsSync(adminHtmlPath), 'admin index.html must exist');
  const content = fs.readFileSync(adminHtmlPath, 'utf8');

  assert.match(content, /function\s+formatVisitorShortId/, 'formatVisitorShortId must be declared');
  assert.match(content, /function\s+formatSessionShortId/, 'formatSessionShortId must be declared');
  assert.match(content, /function\s+formattedVisitorShortId/, 'formattedVisitorShortId must be declared');
  assert.match(content, /function\s+formattedSessionShortId/, 'formattedSessionShortId must be declared');
});

test('Admin short ID functions handle empty, null, and valid visitor/session IDs safely', () => {
  const content = fs.readFileSync(adminHtmlPath, 'utf8');

  // Extract function bodies from index.html using Function constructor
  const formatVisitorShortIdMatch = content.match(/function\s+formatVisitorShortId\s*\([\s\S]*?\n    \}/);
  const formatSessionShortIdMatch = content.match(/function\s+formatSessionShortId\s*\([\s\S]*?\n    \}/);
  const formattedVisitorShortIdMatch = content.match(/function\s+formattedVisitorShortId\s*\([\s\S]*?\n    \}/);
  const formattedSessionShortIdMatch = content.match(/function\s+formattedSessionShortId\s*\([\s\S]*?\n    \}/);

  assert.ok(formatVisitorShortIdMatch, 'formatVisitorShortId code must exist');
  assert.ok(formatSessionShortIdMatch, 'formatSessionShortId code must exist');
  assert.ok(formattedVisitorShortIdMatch, 'formattedVisitorShortId code must exist');
  assert.ok(formattedSessionShortIdMatch, 'formattedSessionShortId code must exist');

  const evalScope = {};
  const runner = new Function('scope', `
    ${formatVisitorShortIdMatch[0]}
    ${formatSessionShortIdMatch[0]}
    ${formattedVisitorShortIdMatch[0]}
    ${formattedSessionShortIdMatch[0]}
    scope.formatVisitorShortId = formatVisitorShortId;
    scope.formatSessionShortId = formatSessionShortId;
    scope.formattedVisitorShortId = formattedVisitorShortId;
    scope.formattedSessionShortId = formattedSessionShortId;
  `);

  runner(evalScope);

  const { formatVisitorShortId, formatSessionShortId, formattedVisitorShortId, formattedSessionShortId } = evalScope;

  // Test null/undefined/empty handling
  assert.equal(formatVisitorShortId(null), 'V-XXXX');
  assert.equal(formatVisitorShortId(undefined), 'V-XXXX');
  assert.equal(formatVisitorShortId(''), 'V-XXXX');
  assert.equal(formatSessionShortId(null), 'S-YYYY');
  assert.equal(formatSessionShortId(undefined), 'S-YYYY');
  assert.equal(formatSessionShortId(''), 'S-YYYY');

  // Test formatting real IDs
  assert.equal(formatVisitorShortId('v_123456788f2a'), 'V-8F2A');
  assert.equal(formatSessionShortId('s_abcdef31c9'), 'S-31C9');
  assert.equal(formattedVisitorShortId('v_123456788f2a'), 'V-8F2A');
  assert.equal(formattedSessionShortId('s_abcdef31c9'), 'S-31C9');
});
