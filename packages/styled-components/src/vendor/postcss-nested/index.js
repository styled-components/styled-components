// @flow
function selectors(parent, node) {
  const result = [];
  parent.selectors.forEach(i => {
    node.selectors.forEach(j => {
      if (j.indexOf('&') === -1) {
        result.push(`${i} ${j}`);
      } else {
        result.push(j.replace(/&/g, i));
      }
    });
  });
  return result;
}

function pickComment(comment, after) {
  if (comment && comment.type === 'comment') {
    return comment.moveAfter(after);
  } else {
    return after;
  }
}

function atruleChilds(rule, atrule) {
  const children = [];
  atrule.each(child => {
    if (child.type === 'comment') {
      children.push(child);
    }
    if (child.type === 'decl') {
      children.push(child);
    } else if (child.type === 'rule') {
      child.selectors = selectors(rule, child);
    } else if (child.type === 'atrule') {
      atruleChilds(rule, child);
    }
  });
  if (children.length) {
    const clone = rule.clone({ nodes: [] });
    for (let i = 0; i < children.length; i++) children[i].moveTo(clone);
    atrule.prepend(clone);
  }
}

function processRule(rule, bubble) {
  let unwrapped = false;
  let after = rule;
  rule.each(child => {
    if (child.type === 'rule') {
      unwrapped = true;
      child.selectors = selectors(rule, child);
      after = pickComment(child.prev(), after);
      after = child.moveAfter(after);
    } else if (child.type === 'atrule') {
      if (bubble.indexOf(child.name) !== -1) {
        unwrapped = true;
        atruleChilds(rule, child);
        after = pickComment(child.prev(), after);
        after = child.moveAfter(after);
      }
    }
  });
  if (unwrapped) {
    rule.raws.semicolon = true;
    if (rule.nodes.length === 0) rule.remove();
  }
}

const bubble = ['media', 'supports', 'document'];

const process = node => {
  node.each(child => {
    if (child.type === 'rule') {
      processRule(child, bubble);
    } else if (child.type === 'atrule') {
      process(child);
    }
  });
};

export default process;
