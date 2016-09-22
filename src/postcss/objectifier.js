import camelizeStyleName from 'fbjs/lib/camelizeStyleName'

function process(node) {
    var name;
    var result = { };
    node.each(function (child) {
        var rules = {};

        node.each(function (rule) {
            if ( rule.type !== 'rule' ) {
                return;
            } else if ( rules[rule.selector] ) {
                if ( rules[rule.selector].append ) {
                    rules[rule.selector].append(rule.nodes);
                    rule.remove();
                }
            } else {
                rules[rule.selector] = rule;
            }
        });

        if ( child.type === 'atrule' ) {
            name = '@' + child.name;
            if ( child.params ) name += ' ' + child.params;
            if ( typeof child.nodes === 'undefined' ) {
                result[name] = true;
            } else {
                result[name] = process(child);
            }

        } else if ( child.type === 'rule' ) {
            result[child.selector] = process(child);

        } else if ( child.type === 'decl' ) {
            name = camelizeStyleName(child.prop);
            if ( typeof result[name] === 'undefined' ) {
                result[name] = child.value;
            } else if ( Array.isArray(result[name]) ) {
                result[name].push(child.value);
            } else {
                result[name] = [result[name], child.value];
            }
        }

    });
    return result;
}

module.exports = process;
