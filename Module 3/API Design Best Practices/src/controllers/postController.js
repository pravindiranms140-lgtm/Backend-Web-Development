const service = require('../services/postService');
const http = require('../utils/http');

function listPosts(req, res, next) {
  try {
    const { data, meta } = service.listPosts(req.query);
    return http.sendList(res, data, meta);
  } catch (err) {
    if (next) return next(err);
    return http.sendInternalError(res);
  }
}

function getPost(req, res, next) {
  try {
    const post = service.getPost(req.params.id);
    if (!post) {
      return http.sendNotFound(res, 'Post not found');
    }
    return http.sendOk(res, post);
  } catch (err) {
    if (next) return next(err);
    return http.sendInternalError(res);
  }
}

function createPost(req, res, next) {
  try {
    const post = service.createPost(req.body);
    return http.sendCreated(res, post);
  } catch (err) {
    if (next) return next(err);
    return http.sendInternalError(res);
  }
}

function likePost(req, res, next) {
  try {
    const post = service.likePost(req.params.id);
    if (!post) {
      return http.sendNotFound(res, 'Post not found');
    }
    return http.sendOk(res, post);
  } catch (err) {
    if (next) return next(err);
    return http.sendInternalError(res);
  }
}

function explode(req, res) {
  try {
    service.explode();
  } catch (err) {
    // Catch internal failure and send safe 500 without leaking stack traces or internal DB details
    return http.sendInternalError(res);
  }
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
