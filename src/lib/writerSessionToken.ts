const SESSION_TOKEN_KEY = 'schooltasks:writer-session-token';

export const getWriterSessionToken = () => {
  let token = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
};
