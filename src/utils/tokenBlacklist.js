// after the user logout immedeatly add the token to the balacklit-for the porpose of invalidating it for agin logeed in by the smae token
// Simple in-memory blacklist (for demo/testing)
const blacklist = new Set();

export const addToBlacklist = (token) => {
  blacklist.add(token);
};

export const isBlacklisted = (token) => {
  return blacklist.has(token);
};

