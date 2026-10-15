const store = require('../data/postStore');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 2; // default limit = 2 for exercise
const MAX_LIMIT = 10;     // server-side cap on client limit

function listPosts(query = {}) {
  const parsedPage = parseInt(query.page, 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;

  const parsedLimit = parseInt(query.limit, 10);
  let limit = DEFAULT_LIMIT;
  if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  const total = store.countPosts();
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const posts = store.getPaginatedPosts(skip, limit);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data: posts,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      hasMore: hasNextPage
    }
  };
}

function getPost(id) {
  return store.getPostById(id) || null;
}

function createPost(body = {}) {
  return store.createPost({
    title: body.title,
    author: body.author
  });
}

function likePost(id) {
  const post = store.incrementLikes(id);
  if (!post) {
    return null;
  }
  return post;
}

function explode() {
  const err = new Error('SQLITE_CONSTRAINT in posts table');
  err.statusCode = 500;
  throw err;
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
