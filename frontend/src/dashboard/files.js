export const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_MB = 5;

export function checkFiles(fileList) {
  const ok = [];
  const problems = [];
  [...fileList].forEach((f) => {
    if (!ALLOWED.includes(f.type)) problems.push(`${f.name}: only JPG, PNG or WebP`);
    else if (f.size > MAX_MB * 1024 * 1024) problems.push(`${f.name}: larger than ${MAX_MB} MB`);
    else ok.push(f);
  });
  return { ok, problems };
}
