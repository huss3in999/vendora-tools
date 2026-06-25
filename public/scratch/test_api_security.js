// Node.js test script for Maroc Market isolated R2 API security and functionality
import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:8787/demo/maroc-market/api';
const PASSWORD = '1234';

async function runTests() {
  console.log('--- STARTING MAROC MARKET R2 API SECURITY TESTS ---');

  // Test 1: CORS Preflight OPTIONS
  {
    console.log('Testing OPTIONS preflight...');
    const res = await fetch(`${BASE_URL}/upload-image`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://getvendora.net' }
    });
    console.log('Response status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    assert.strictEqual(res.status, 204);
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.ok(
      allowOrigin === 'https://getvendora.net' ||
      allowOrigin === 'https://127.0.0.1:8787' ||
      allowOrigin === 'http://127.0.0.1:8787',
      `Unexpected access-control-allow-origin header: ${allowOrigin}`
    );
    assert.ok(res.headers.get('access-control-allow-headers').includes('x-admin-password'));
  }

  // Test 2: Unauthorized requests (no password)
  {
    console.log('Testing unauthorized request blocks...');
    const resList = await fetch(`${BASE_URL}/list-images`);
    const dataList = await resList.json();
    assert.strictEqual(resList.status, 401);
    assert.strictEqual(dataList.ok, false);

    const resDel = await fetch(`${BASE_URL}/delete-image?key=maroc-market/logo/test.png`, { method: 'DELETE' });
    const dataDel = await resDel.json();
    assert.strictEqual(resDel.status, 401);
    assert.strictEqual(dataDel.ok, false);
  }

  // Test 3: Upload with incorrect password
  {
    console.log('Testing upload blocks with bad password...');
    const formData = new FormData();
    const mockFile = new Blob(['mock content'], { type: 'image/png' });
    formData.append('file', mockFile, 'test.png');
    formData.append('type', 'logo');

    const res = await fetch(`${BASE_URL}/upload-image`, {
      method: 'POST',
      headers: { 'x-admin-password': 'wrong' },
      body: formData
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.ok, false);
  }

  // Test 4: Dangerous delete paths (Blocked with 400 Bad Request)
  const dangerousKeys = [
    '',                                 // Empty
    '/',                                // Root
    'maroc-market/../../logo/test.png', // Directory traversal
    'vendora-images/logo.png',          // Other bucket/prefix path
    'maroc-market/',                    // Prefix itself (directory delete check)
    'logo/test.png',                    // Missing parent prefix
    'maroc-market/logo/test;rm -rf.png',// Dangerous character injection
  ];

  for (const key of dangerousKeys) {
    console.log(`Testing delete block for key: "${key}"...`);
    const res = await fetch(`${BASE_URL}/delete-image?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': PASSWORD }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Key "${key}" should have been rejected with 400`);
    assert.strictEqual(data.ok, false);
  }

  // Test 5: Dangerous serve asset paths (Blocked with 403 Forbidden)
  const dangerousAssetPaths = [
    'logo/test.png',
    'maroc-market/../../logo/test.png',
    'maroc-market/',
    'vendora-images/logo.png'
  ];

  for (const path of dangerousAssetPaths) {
    console.log(`Testing serve asset block for path: "${path}"...`);
    const res = await fetch(`http://127.0.0.1:8787/demo/maroc-market/api/assets/${encodeURIComponent(path)}`);
    assert.strictEqual(res.status, 403, `Path "${path}" should have been rejected with 403`);
  }

  // Test 6: Successful Upload, List, Serve, and Delete Cycle
  {
    console.log('Testing successful upload cycle...');
    const formData = new FormData();
    // 1x1 transparent PNG pixel representation to mock a real compressed image
    const mockPngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    const mockFile = new Blob([mockPngBytes], { type: 'image/png' });
    formData.append('file', mockFile, 'logo.png');
    formData.append('type', 'logo');

    const uploadRes = await fetch(`${BASE_URL}/upload-image`, {
      method: 'POST',
      headers: { 'x-admin-password': PASSWORD },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadData.ok, true);
    assert.ok(uploadData.key.startsWith('maroc-market/logo/'));
    assert.ok(uploadData.url.startsWith('/demo/maroc-market/api/assets/maroc-market/logo/'));

    const key = uploadData.key;
    const url = uploadData.url;

    // Test serving the uploaded image
    console.log('Testing serve uploaded asset...');
    const serveRes = await fetch(`http://127.0.0.1:8787${url}`);
    assert.strictEqual(serveRes.status, 200);
    assert.strictEqual(serveRes.headers.get('content-type'), 'image/png');
    assert.strictEqual(serveRes.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    // Test listing images
    console.log('Testing image listing...');
    const listRes = await fetch(`${BASE_URL}/list-images`, {
      headers: { 'x-admin-password': PASSWORD }
    });
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listData.ok, true);
    assert.ok(listData.images.some(img => img.key === key));

    // Test deleting the uploaded image
    console.log('Testing successful image delete...');
    const deleteRes = await fetch(`${BASE_URL}/delete-image?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': PASSWORD }
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteData.ok, true);

    // Verify it is gone from head/serve
    console.log('Testing head/serve after delete...');
    const serveAfterRes = await fetch(`http://127.0.0.1:8787${url}`);
    assert.strictEqual(serveAfterRes.status, 404);
  }

  // Test 7: Catalog GET / POST tests
  {
    console.log('Testing GET catalog (should return default data or fallback)...');
    const getRes = await fetch(`${BASE_URL}/catalog`);
    assert.strictEqual(getRes.status, 200);
    const catalog = await getRes.json();
    assert.ok(catalog.settings);
    assert.ok(Array.isArray(catalog.products));
    assert.ok(Array.isArray(catalog.categories));

    console.log('Testing POST catalog (unauthorized block)...');
    const badPostRes = await fetch(`${BASE_URL}/catalog`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-password': 'wrong'
      },
      body: JSON.stringify({ settings: { storeName: 'Hack' }, products: [], categories: [] })
    });
    assert.strictEqual(badPostRes.status, 401);

    console.log('Testing POST catalog (successful write)...');
    const testCatalog = {
      settings: { storeName: 'Test Maroc Store' },
      products: [{ id: 'prod-1', nameAr: 'منتج تجريبي', price: 1.5, visible: true }],
      categories: [{ nameAr: 'العروض', nameEn: 'sale', visible: true, sortOrder: 0 }]
    };
    const postRes = await fetch(`${BASE_URL}/catalog`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-password': PASSWORD
      },
      body: JSON.stringify(testCatalog)
    });
    assert.strictEqual(postRes.status, 200);
    const postData = await postRes.json();
    assert.strictEqual(postData.ok, true);

    console.log('Testing GET catalog (should return the newly written catalog)...');
    const getUpdatedRes = await fetch(`${BASE_URL}/catalog`);
    assert.strictEqual(getUpdatedRes.status, 200);
    const updatedCatalog = await getUpdatedRes.json();
    assert.strictEqual(updatedCatalog.settings.storeName, 'Test Maroc Store');
    assert.strictEqual(updatedCatalog.products[0].nameAr, 'منتج تجريبي');

    console.log('Testing POST catalog size limit block (> 512KB)...');
    const hugePayload = {
      settings: {},
      products: Array.from({ length: 5000 }, (_, i) => ({
        id: `prod-${i}`,
        nameAr: 'ألف باء تاء ثاء جيم حاء خاء دال ذال راء زاي سين شين صاد ضاد طاء ظاء عين غين فاء قاف كاف لام ميم نون هاء واو ياء'.repeat(5)
      })),
      categories: []
    };
    const hugePostRes = await fetch(`${BASE_URL}/catalog`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-password': PASSWORD
      },
      body: JSON.stringify(hugePayload)
    });
    assert.strictEqual(hugePostRes.status, 413); // Payload Too Large
  }

  console.log('\n--- ALL API SECURITY AND FUNCTIONALITY TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:');
  console.error(err);
  process.exit(1);
});
