const ALLOWED_USER_FIELDS = ['id', 'name', 'email'];

function serializeUser(user) {
  if (!user) return null;
  const safeUser = {};
  for (const field of ALLOWED_USER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(user, field)) {
      safeUser[field] = user[field];
    }
  }
  return safeUser;
}

module.exports = {
  serializeUser,
  ALLOWED_USER_FIELDS,
};
