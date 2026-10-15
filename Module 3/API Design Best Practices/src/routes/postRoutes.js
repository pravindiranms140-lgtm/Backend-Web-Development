const express = require('express');
const controller = require('../controllers/postController');

const router = express.Router();

// Resource routes for posts
// Supports both direct router usage and app.use('/posts', router) mounting
router.get('/', controller.listPosts);
router.post('/', controller.createPost);
router.get('/:id', controller.getPost);
router.post('/:id/likes', controller.likePost);
router.post('/:id/like', controller.likePost);

// Root fallback mounts in case router is mounted at '/'
router.get('/posts', controller.listPosts);
router.post('/posts', controller.createPost);
router.get('/posts/:id', controller.getPost);
router.post('/posts/:id/likes', controller.likePost);
router.post('/posts/:id/like', controller.likePost);

module.exports = router;
