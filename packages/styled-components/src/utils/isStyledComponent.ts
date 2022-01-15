export default function isStyledComponent(target: any) {
  return typeof target === 'object' && 'styledComponentId' in target;
}
