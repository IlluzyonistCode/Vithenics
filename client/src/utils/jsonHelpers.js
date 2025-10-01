export const safeJsonParse = (jsonString, fallback=null) => {
  if (!jsonString || typeof jsonString !== 'string')
    return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error);

    return fallback;
  }
};

export const safeJsonStringify = (obj, fallback='{}') => {
  if (obj === null || obj === undefined)
    return fallback;

  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('Failed to stringify object:', obj, error);

    return fallback;
  }
};

export const parseJsonArray = (jsonString, fallback = []) => {
  const parsed = safeJsonParse(jsonString, fallback);

  return Array.isArray(parsed) ? parsed : fallback;
};

export const parseJsonObject = (jsonString, fallback = {}) => {
  const parsed = safeJsonParse(jsonString, fallback);

  return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : fallback;
};
