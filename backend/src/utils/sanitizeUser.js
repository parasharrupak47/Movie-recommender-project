/**
 * Strips a User document down to the fields that are safe to send to the client.
 * Single source of truth so auth and profile responses can never drift apart
 * or accidentally leak the password hash.
 *
 * @param {import('mongoose').Document} user
 * @returns {{id: string, username: string, fullName: string, email: string, avatar: string}}
 */
export const sanitizeUser = (user) => ({
  id:       user._id,
  username: user.username,
  fullName: user.fullName,
  email:    user.email,
  avatar:   user.avatar || "",
});

export default sanitizeUser;
