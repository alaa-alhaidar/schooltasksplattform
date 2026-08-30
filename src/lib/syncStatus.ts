export const LAST_SYNC_KEY = 'schooltasks:last-sync';
export const SYNC_EVENT = 'schooltasks-synced';

export const markAppSynced = () => {
  const timestamp = new Date().toISOString();
  window.localStorage.setItem(LAST_SYNC_KEY, timestamp);
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: timestamp }));
};
