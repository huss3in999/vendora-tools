import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function collectFiles(dir, predicate, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'test-results' || entry.name === 'templates') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, predicate, files);
    else if (entry.isFile() && predicate(entry.name)) files.push(full);
  }
  return files;
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1].trim()));
}

function schemaNodes(data) {
  return Array.isArray(data['@graph']) ? data['@graph'] : [data];
}

test('transport HTML and AI files do not contain corrupted Arabic/mojibake markers', () => {
  const files = collectFiles(root, (name) => name.endsWith('.html') || name.endsWith('.txt'));
  const badPattern = /\?\?\?\?|Ø|Ù|�/;
  const offenders = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (badPattern.test(text)) {
      offenders.push(relative(root, file));
    }
  }

  expect(offenders).toEqual([]);
});

test('AggregateRating schema is not used without visible real review or rating proof', () => {
  const files = collectFiles(root, (name) => name.endsWith('.html'));
  const offenders = [];

  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const visibleHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '');

    for (const data of jsonLdBlocks(html)) {
      for (const node of schemaNodes(data)) {
        if (!node || !node.aggregateRating) continue;

        const ratingValue = String(node.aggregateRating.ratingValue || '');
        const reviewCount = String(node.aggregateRating.reviewCount || '');
        const hasVisibleRating = ratingValue && visibleHtml.includes(ratingValue);
        const hasVisibleReviewCount = reviewCount && visibleHtml.includes(reviewCount);
        const hasReviewUi = /review|rating|تقييم|مراجعة|نجوم/i.test(visibleHtml);

        if (!hasVisibleRating || !hasVisibleReviewCount || !hasReviewUi) {
          offenders.push(relative(root, file));
        }
      }
    }
  }

  expect(offenders).toEqual([]);
});
