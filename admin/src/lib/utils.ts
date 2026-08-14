export const generateSlug = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '') // Keep unicode letters, marks (matras), numbers, spaces, underscores, and hyphens
    .replace(/[\s_]+/g, '-')            // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');           // Trim hyphens
};
