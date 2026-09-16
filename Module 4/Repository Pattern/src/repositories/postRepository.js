/**
 * Post Repository
 *
 * Implements the standard 5-method repository contract:
 * - findAll(): returns a new array of records
 * - findById(id): returns a record or null
 * - create(fields): generates id, stores record, returns complete created record
 * - update(id, patch): returns updated record or null if not found
 * - remove(id): returns true if removed, false if not found
 *
 * STORAGE-SWAP PROOF:
 * This repository is implemented using an in-memory Map-backed store rather than
 * the original array-backed store. Because postService depends entirely on the
 * repository interface rather than storage mechanics, it operates seamlessly
 * without requiring any knowledge of the underlying Map structure.
 *
 * PRISMA MIGRATION NOTES:
 *
 * When this in-memory repository is replaced with a Prisma-backed implementation:
 *
 * WHAT WILL CHANGE:
 * 1. Asynchronous Execution: Database I/O is asynchronous, so all 5 repository
 *    methods (findAll, findById, create, update, remove) will become `async` functions
 *    returning Promises. The consuming service layer will `await` these calls.
 * 2. Data Access Operations: Internal Map operations (posts.get, posts.set, posts.delete)
 *    will be replaced by Prisma Client calls:
 *    - findAll()   -> prisma.post.findMany()
 *    - findById(id)-> prisma.post.findUnique({ where: { id: Number(id) } })
 *    - create(data)-> prisma.post.create({ data })
 *    - update(id, patch) -> prisma.post.update({ where: { id: Number(id) }, data: patch })
 *    - remove(id)  -> prisma.post.delete({ where: { id: Number(id) } })
 * 3. ID Generation: Manual ID tracking (`let nextId = 3; nextId++`) will be removed.
 *    The database engine will automatically handle primary key generation via
 *    autoincrementing integers or UUIDs as defined in `schema.prisma`.
 * 4. Persistence & Lifecycle: Records will be durably persisted in an external SQL database
 *    (e.g., PostgreSQL, SQLite, MySQL) rather than living in volatile process memory,
 *    surviving server restarts.
 * 5. Error Translation: Prisma-specific exceptions (such as `P2025` RecordNotFound on
 *    update/delete) will be caught and mapped to the repository contract return values
 *    (returning `null` for update and `false` for remove).
 *
 * WHAT WILL REMAIN UNCHANGED:
 * 1. Interface Contract: The 5 core operations (findAll, findById, create, update, remove)
 *    and their expected parameter structures remain constant.
 * 2. Return Semantics & Shapes:
 *    - findAll() returns an array of post objects.
 *    - findById(id) returns the matching post or null.
 *    - create(fields) returns the newly created record with its assigned id.
 *    - update(id, patch) returns the updated record, or null when nonexistent.
 *    - remove(id) returns true when removed and false when no record matches.
 * 3. Decoupling & Separation of Concerns: The service layer (postService) and controller
 *    layer (postController) remain completely decoupled from database mechanics, SQL queries,
 *    table schemas, connection pools, and ORM specifics.
 * 4. Domain & Business Rules: All business validations (e.g., requiring title, HTTP 422),
 *    authorization checks, and workflows continue to reside strictly in the service layer.
 */

const posts = new Map([
  [
    1,
    {
      id: 1,
      title: 'First post',
      body: 'Repository boundaries protect change.',
      authorId: 7,
    },
  ],
  [
    2,
    {
      id: 2,
      title: 'Second post',
      body: 'Services should speak in domain language.',
      authorId: 8,
    },
  ],
]);

let nextId = 3;

/**
 * Retrieve all posts as a new array.
 * @returns {Array<Object>} Fresh array of cloned post records.
 */
function findAll() {
  return Array.from(posts.values()).map((post) => ({ ...post }));
}

/**
 * Find a post by its identifier.
 * @param {number|string} id - The post ID.
 * @returns {Object|null} A copy of the post record, or null if not found.
 */
function findById(id) {
  const post = posts.get(Number(id));
  return post ? { ...post } : null;
}

/**
 * Create and persist a new post.
 * @param {Object} fields - Post fields (title, body, authorId).
 * @returns {Object} Complete created record including its generated id.
 */
function create(fields) {
  const id = nextId++;
  const post = {
    id,
    title: fields.title,
    body: fields.body !== undefined ? fields.body : '',
    authorId: fields.authorId,
  };
  posts.set(id, post);
  return { ...post };
}

/**
 * Update an existing post by ID.
 * @param {number|string} id - The post ID.
 * @param {Object} patch - The fields to update.
 * @returns {Object|null} The updated post record, or null if not found.
 */
function update(id, patch) {
  const numericId = Number(id);
  const post = posts.get(numericId);
  if (!post) return null;

  if (patch && typeof patch === 'object') {
    if (patch.title !== undefined) post.title = patch.title;
    if (patch.body !== undefined) post.body = patch.body;
  }

  return { ...post };
}

/**
 * Remove a post by ID.
 * @param {number|string} id - The post ID.
 * @returns {boolean} True if a record was removed, false if no record matched.
 */
function remove(id) {
  return posts.delete(Number(id));
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
