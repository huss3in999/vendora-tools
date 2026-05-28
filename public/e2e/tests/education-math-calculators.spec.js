const { test, expect } = require('@playwright/test');

const EDUCATION_MATH_PAGES = [
  '/calculators/percentage-calculator/',
  '/calculators/grade-calculator/',
  '/calculators/gpa-calculator/',
  '/calculators/fraction-calculator/',
];

function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function getJsonLdSummary(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent));
    const graph = nodes.flatMap((node) => node['@graph'] || [node]);
    const types = graph.flatMap((node) => Array.isArray(node['@type']) ? node['@type'] : [node['@type']]);
    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    return {
      types,
      faqQuestions: faq ? faq.mainEntity.map((item) => item.name) : [],
      hasRating: graph.some((node) => ['AggregateRating', 'Review'].includes(node['@type']) || node.aggregateRating || node.review),
    };
  });
}

test.describe('Education & Math calculators', () => {
  test('all four pages load with SEO tags, schema, and no console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    for (const path of EDUCATION_MATH_PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(/.+\| Vendora/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path.replace(/\//g, '\\/')}$`));
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', /.+/);

      const schema = await getJsonLdSummary(page);
      expect(schema.types, `${path} schema types`).toEqual(expect.arrayContaining(['FAQPage', 'SoftwareApplication', 'BreadcrumbList']));
      expect(schema.hasRating, `${path} should not include reviews or ratings`).toBe(false);

      const visibleFaqs = await page.locator('section[aria-labelledby="calc-guide-title"] p.font-medium').allTextContents();
      expect(schema.faqQuestions, `${path} FAQ schema should match visible FAQs`).toEqual(visibleFaqs);
    }

    expect(errors).toEqual([]);
  });

  test('mobile viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of EDUCATION_MATH_PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflow`).toBeLessThanOrEqual(2);
    }
  });

  test('percentage calculations are correct', async ({ page }) => {
    await page.goto('/calculators/percentage-calculator/');
    await expect(page.locator('#percentageResult')).toContainText('20% of 50 = 10');

    await page.locator('#percentageMode').selectOption('change');
    await page.locator('#xValue').fill('80');
    await page.locator('#yValue').fill('100');
    await expect(page.locator('#percentageResult')).toContainText('Percentage change from 80 to 100 = 25%');
  });

  test('grade calculator produces a required final score result', async ({ page }) => {
    await page.goto('/calculators/grade-calculator/');
    await expect(page.locator('#gradeResult')).toContainText('Current grade: 88%');
    await expect(page.locator('#gradeResult')).toContainText('Required final exam score: 98%');

    await page.locator('#gradeMode').selectOption('points');
    await expect(page.locator('#gradeResult')).toContainText('Mode: points only');
  });

  test('GPA calculator produces unweighted and weighted results', async ({ page }) => {
    await page.goto('/calculators/gpa-calculator/');
    await expect(page.locator('#gpaResult')).toContainText('Semester GPA: 3.50');

    await page.locator('#gpaType').selectOption('weighted');
    await expect(page.locator('#gpaResult')).toContainText('Semester GPA: 3.75');
  });

  test('fraction calculations are correct', async ({ page }) => {
    await page.goto('/calculators/fraction-calculator/');
    await expect(page.locator('#fractionResult')).toContainText('Simplified result: 5/6');

    await page.locator('#fractionOperation').selectOption('multiply');
    await expect(page.locator('#fractionResult')).toContainText('Simplified result: 1/6');
  });

  test('calculator hub links to all four education and math pages', async ({ page }) => {
    await page.goto('/calculators/');

    for (const href of [
      'percentage-calculator/',
      'grade-calculator/',
      'gpa-calculator/',
      'fraction-calculator/',
    ]) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    }
  });
});
