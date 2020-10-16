export default function isStyledComponent(target: any) {
  return typeof target !== 'string' && 'styledComponentId' in target;
}
