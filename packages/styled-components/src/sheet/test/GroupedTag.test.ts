import { makeGroupedTag } from '../GroupedTag';
import { VirtualTag } from '../Tag';

let tag: InstanceType<typeof VirtualTag>;
let groupedTag: ReturnType<typeof makeGroupedTag>;

beforeEach(() => {
  tag = new VirtualTag();
  groupedTag = makeGroupedTag(tag);
});

it('inserts and retrieves rules by groups correctly', () => {
  groupedTag.insertRules('g2', ['.g2-a {}', '.g2-b {}']);
  groupedTag.insertRules('g1', ['.g1-a {}', '.g1-b {}']);
  groupedTag.insertRules('g2', ['.g2-c {}', '.g2-d {}']);

  expect(tag.length).toBe(6);

  expect(groupedTag.getGroup('unknown')).toBe('');
  expect(groupedTag.getGroup('g1')).toBe('.g1-a {}/*!sc*/\n.g1-b {}/*!sc*/\n');
  expect(groupedTag.getGroup('g2')).toBe(
    '.g2-a {}/*!sc*/\n.g2-b {}/*!sc*/\n' + '.g2-c {}/*!sc*/\n.g2-d {}/*!sc*/\n'
  );

  expect(tag.getRule(0)).toBe('.g2-a {}');
  expect(tag.getRule(4)).toBe('.g1-a {}');
});

it('inserts rules at correct indices if some rules are dropped', () => {
  const tag = new VirtualTag();
  jest.spyOn(tag, 'insertRule').mockImplementationOnce(() => false);
  const groupedTag = makeGroupedTag(tag);

  groupedTag.insertRules('g1', ['.skipped {}', '.inserted {}']);

  expect(tag.length).toBe(1);
  expect(groupedTag.getGroup('g1')).toBe('.inserted {}/*!sc*/\n');
});

it('inserts and deletes groups correctly', () => {
  groupedTag.insertRules('g1', ['.g1-a {}']);
  expect(tag.length).toBe(1);
  expect(groupedTag.getGroup('g1')).not.toBe('');
  groupedTag.clearGroup('g1');
  expect(tag.length).toBe(0);
  expect(groupedTag.getGroup('g1')).toBe('');

  groupedTag.clearGroup('unknown');
  expect(tag.length).toBe(0);
});

it('supports many groups', () => {
  for (let i = 0; i < 100; i++) {
    groupedTag.insertRules(`group-${i}`, [`.rule-${i} {}`]);
  }

  expect(tag.length).toBe(100);
  expect(groupedTag.getGroup('group-50')).toBe('.rule-50 {}/*!sc*/\n');
  expect(groupedTag.getGroup('group-99')).toBe('.rule-99 {}/*!sc*/\n');
});

it('maintains correct indices after clearing groups', () => {
  groupedTag.insertRules('g1', ['.g1-a {}', '.g1-b {}']);
  groupedTag.insertRules('g2', ['.g2-a {}']);
  groupedTag.insertRules('g3', ['.g3-a {}', '.g3-b {}', '.g3-c {}']);

  expect(tag.length).toBe(6);

  groupedTag.clearGroup('g2');
  expect(tag.length).toBe(5);

  expect(groupedTag.getGroup('g1')).toBe('.g1-a {}/*!sc*/\n.g1-b {}/*!sc*/\n');
  expect(groupedTag.getGroup('g2')).toBe('');
  expect(groupedTag.getGroup('g3')).toBe('.g3-a {}/*!sc*/\n.g3-b {}/*!sc*/\n.g3-c {}/*!sc*/\n');
});
