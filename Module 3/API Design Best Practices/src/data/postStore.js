function seedPosts() {
  return [
    { id: 1, title: 'Caching 101', author: 'maya', likes: 0, createdAt: 1 },
    { id: 2, title: 'Queues vs Cron', author: 'raj', likes: 1, createdAt: 2 },
    { id: 3, title: 'Why indexes matter', author: 'maya', likes: 3, createdAt: 3 },
    { id: 4, title: 'JWT expiry gotchas', author: 'sam', likes: 2, createdAt: 4 },
    { id: 5, title: 'Cursor pagination', author: 'maya', likes: 5, createdAt: 5 }
  ];
}

let posts = seedPosts();
let nextId = 6;

function resetData() {
  posts = seedPosts();
  nextId = 6;
}

function getAllPosts() {
  return posts.slice();
}

function countPosts() {
  return posts.length;
}

function getPaginatedPosts(skip = 0, limit = 2) {
  return posts.slice(skip, skip + limit);
}

function getPostById(id) {
  return posts.find((post) => post.id === Number(id));
}

function createPost({ title, author }) {
  const post = {
    id: nextId++,
    title,
    author,
    likes: 0,
    createdAt: posts.length + 1
  };
  posts.push(post);
  return post;
}

function incrementLikes(id) {
  const post = getPostById(id);
  if (!post) return null;
  post.likes += 1;
  return post;
}

module.exports = {
  resetData,
  getAllPosts,
  countPosts,
  getPaginatedPosts,
  getPostById,
  createPost,
  incrementLikes
};
