const posts = [
  { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 },
  { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 },
];

let nextId = 3;

function findAll() {
  return posts.map((post) => ({ ...post }));
}

function findById(id) {
  const post = posts.find((p) => p.id === Number(id));
  return post ? { ...post } : null;
}

function create(fields) {
  const id = nextId++;
  const post = {
    id,
    title: fields.title,
    body: fields.body !== undefined ? fields.body : '',
    authorId: fields.authorId,
  };
  posts.push(post);
  return { ...post };
}

function update(id, patch) {
  const post = posts.find((p) => p.id === Number(id));
  if (!post) return null;

  if (patch && typeof patch === 'object') {
    if (patch.title !== undefined) post.title = patch.title;
    if (patch.body !== undefined) post.body = patch.body;
  }

  return { ...post };
}

function remove(id) {
  const index = posts.findIndex((p) => p.id === Number(id));
  if (index === -1) return false;
  posts.splice(index, 1);
  return true;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
