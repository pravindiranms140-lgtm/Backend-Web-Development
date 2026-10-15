function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateRegisterInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Malformed or missing request body';
  }
  const { name, email, password } = body;
  if (!isNonEmptyString(name)) {
    return 'Name is required and must be a non-empty string';
  }
  if (!isNonEmptyString(email)) {
    return 'Email is required and must be a non-empty string';
  }
  if (!isNonEmptyString(password)) {
    return 'Password is required and must be a non-empty string';
  }
  return null;
}

function validateLoginInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Malformed or missing request body';
  }
  const { email, password } = body;
  if (!isNonEmptyString(email)) {
    return 'Email is required and must be a non-empty string';
  }
  if (!isNonEmptyString(password)) {
    return 'Password is required and must be a non-empty string';
  }
  return null;
}

module.exports = {
  isNonEmptyString,
  validateRegisterInput,
  validateLoginInput,
};
