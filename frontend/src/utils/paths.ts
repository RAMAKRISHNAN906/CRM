export const getAppUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, `${window.location.origin}${import.meta.env.BASE_URL}`).toString();
};
