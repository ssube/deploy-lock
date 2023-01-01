export function splitPath(path: string): Array<string> {
  const segments = path.split('/');

  const paths = [];
  for (let i = 1; i < segments.length; ++i) {
    const next = segments.slice(0, i).join('/');
    paths.push(next);
  }

  return paths;
}
