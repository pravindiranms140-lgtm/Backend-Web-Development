const http = require('http');
const { createApp, resetData } = require('./src/app');

function runTests() {
  const app = createApp();
  const server = http.createServer(app);

  server.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    let passed = 0;
    let failed = 0;

    function assert(condition, testName, details = '') {
      if (condition) {
        console.log(`  ✓ ${testName}`);
        passed++;
      } else {
        console.error(`  ✗ ${testName} - ${details}`);
        failed++;
      }
    }

    async function request(path, options = {}) {
      const url = `${baseUrl}${path}`;
      const method = options.method || 'GET';
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const body = options.body ? JSON.stringify(options.body) : undefined;

      const res = await fetch(url, { method, headers, body });
      const status = res.status;
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        // Not JSON
      }
      return { status, body: json };
    }

    console.log('\n--- 1. Verification of List Posts (GET /posts) ---');
    resetData();
    {
      const res = await request('/posts');
      assert(res.status === 200, 'GET /posts returns 200 status');
      assert(Array.isArray(res.body?.data), 'GET /posts response envelope has data array');
      assert(res.body?.data?.length === 2, 'GET /posts uses default limit of 2 items', `length=${res.body?.data?.length}`);
      assert(res.body?.data[0]?.id === 1 && res.body?.data[1]?.id === 2, 'GET /posts returns posts 1 & 2');
      assert(res.body?.meta?.page === 1, 'Pagination meta.page is 1');
      assert(res.body?.meta?.limit === 2, 'Pagination meta.limit is 2');
      assert(res.body?.meta?.total === 5, 'Pagination meta.total is 5');
      assert(res.body?.meta?.totalPages === 3, 'Pagination meta.totalPages is 3');
      assert(res.body?.meta?.hasNextPage === true, 'Pagination meta.hasNextPage is true');
      assert(res.body?.meta?.hasPrevPage === false, 'Pagination meta.hasPrevPage is false');
    }

    console.log('\n--- 2. Pagination Page 2 & Page 3 & Bounds ---');
    {
      const res2 = await request('/posts?page=2');
      assert(res2.status === 200, 'GET /posts?page=2 returns 200');
      assert(res2.body?.data?.length === 2, 'Page 2 returns 2 items');
      assert(res2.body?.data[0]?.id === 3 && res2.body?.data[1]?.id === 4, 'Page 2 returns posts 3 & 4');
      assert(res2.body?.meta?.page === 2, 'Page 2 meta.page is 2');
      assert(res2.body?.meta?.hasNextPage === true, 'Page 2 hasNextPage is true');
      assert(res2.body?.meta?.hasPrevPage === true, 'Page 2 hasPrevPage is true');

      const res3 = await request('/posts?page=3');
      assert(res3.status === 200, 'GET /posts?page=3 returns 200');
      assert(res3.body?.data?.length === 1, 'Page 3 returns remaining 1 item');
      assert(res3.body?.data[0]?.id === 5, 'Page 3 returns post 5');
      assert(res3.body?.meta?.hasNextPage === false, 'Page 3 hasNextPage is false');
      assert(res3.body?.meta?.hasPrevPage === true, 'Page 3 hasPrevPage is true');

      const res4 = await request('/posts?page=4');
      assert(res4.status === 200, 'GET /posts?page=4 returns 200');
      assert(res4.body?.data?.length === 0, 'Page 4 returns empty data array');
      assert(res4.body?.meta?.hasNextPage === false, 'Page 4 hasNextPage is false');
    }

    console.log('\n--- 3. Client Limit Capping & Fallbacks ---');
    {
      const resLarge = await request('/posts?limit=100');
      assert(resLarge.status === 200, 'GET /posts?limit=100 returns 200');
      assert(resLarge.body?.meta?.limit <= 10, 'Client limit 100 is capped server-side at 10', `got ${resLarge.body?.meta?.limit}`);

      const resCustom = await request('/posts?limit=3');
      assert(resCustom.status === 200, 'GET /posts?limit=3 returns 200');
      assert(resCustom.body?.data?.length === 3, 'GET /posts?limit=3 returns 3 items');
      assert(resCustom.body?.meta?.limit === 3, 'meta.limit reflects 3');
      assert(resCustom.body?.meta?.totalPages === 2, 'meta.totalPages is 2 (5/3)');

      const resBad = await request('/posts?page=-2&limit=abc');
      assert(resBad.body?.meta?.page === 1, 'Invalid page defaults to 1');
      assert(resBad.body?.meta?.limit === 2, 'Invalid limit defaults to 2');
    }

    console.log('\n--- 4. Fetch Single Post (GET /posts/:id) ---');
    {
      const res = await request('/posts/1');
      assert(res.status === 200, 'GET /posts/1 returns 200 status');
      assert(res.body?.data && !Array.isArray(res.body.data), 'Returns consistent data object envelope');
      assert(res.body?.data?.id === 1 && res.body?.data?.title === 'Caching 101', 'Returns correct post details');

      const resMissing = await request('/posts/999');
      assert(resMissing.status === 404, 'GET /posts/999 returns 404 status');
      assert(resMissing.body?.error && typeof resMissing.body.error === 'object', 'Error response uses consistent error envelope');
      assert(resMissing.body?.error?.message === 'Post not found', 'Error message is "Post not found"');
      assert(resMissing.body?.error?.code === 'NOT_FOUND', 'Error code is "NOT_FOUND"');
      assert(!resMissing.body?.stack, 'Does not leak stack trace');
    }

    console.log('\n--- 5. Create Post (POST /posts) ---');
    {
      const newPost = { title: 'RESTful API Contracts', author: 'maya' };
      const res = await request('/posts', { method: 'POST', body: newPost });
      assert(res.status === 201, 'POST /posts returns 201 Created status');
      assert(res.body?.data?.id === 6, 'Created post has assigned id 6');
      assert(res.body?.data?.title === 'RESTful API Contracts', 'Created post has correct title');
      assert(res.body?.data?.author === 'maya', 'Created post has correct author');
      assert(res.body?.data?.likes === 0, 'Created post starts with 0 likes');
    }

    console.log('\n--- 6. Like Post Sub-Resource (POST /posts/:id/likes) ---');
    {
      const resBefore = await request('/posts/1');
      const likesBefore = resBefore.body?.data?.likes;

      const res = await request('/posts/1/likes', { method: 'POST' });
      assert(res.status === 200, 'POST /posts/1/likes returns 200 OK');
      assert(res.body?.data?.id === 1, 'Returns updated post in consistent data envelope');
      assert(res.body?.data?.likes === likesBefore + 1, 'Likes incremented correctly', `likes=${res.body?.data?.likes}`);

      // Also test singular /posts/:id/like alias
      const resAlias = await request('/posts/1/like', { method: 'POST' });
      assert(resAlias.status === 200, 'POST /posts/1/like (alias) returns 200 OK');
      assert(resAlias.body?.data?.likes === likesBefore + 2, 'Likes incremented again via alias');

      // Test liking non-existent post
      const resMissing = await request('/posts/999/likes', { method: 'POST' });
      assert(resMissing.status === 404, 'Liking missing post returns 404 instead of 500 fake DB error');
      assert(resMissing.body?.error?.message === 'Post not found', 'Returns structured error for missing post');
      assert(!JSON.stringify(resMissing.body).includes('POSTS_TABLE'), 'Does not leak POSTS_TABLE or internal DB error');
    }

    console.log('\n--- 7. Safe Internal Failure Testing (GET /explode) ---');
    {
      const res = await request('/explode');
      assert(res.status === 500, 'GET /explode returns 500 status');
      assert(res.body?.error?.message === 'Internal server error', 'Returns sanitized "Internal server error" message');
      assert(res.body?.error?.code === 'INTERNAL_SERVER_ERROR', 'Returns code "INTERNAL_SERVER_ERROR"');
      assert(!res.body?.stack && !res.body?.debug, 'Does not leak stack trace or debug object');
      assert(!JSON.stringify(res.body).includes('SQLITE_CONSTRAINT'), 'Does not leak SQLITE_CONSTRAINT fake error');
    }

    console.log('\n--- 8. Retirement of Old Verb Routes ---');
    {
      const oldRoutes = [
        ['GET', '/getPosts'],
        ['GET', '/getPost/1'],
        ['POST', '/createPost'],
        ['POST', '/likePost/1']
      ];

      for (const [method, route] of oldRoutes) {
        const res = await request(route, { method });
        assert(res.status === 404, `Old verb route ${method} ${route} returns 404`);
        assert(res.body?.error?.code === 'NOT_FOUND', `${route} returns structured NOT_FOUND envelope`);
      }
    }

    console.log(`\n========================================`);
    console.log(`Total tests: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`========================================\n`);

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  });
}

runTests();
