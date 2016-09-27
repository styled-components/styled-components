import Declaration from './declaration';
import tokenizer   from './tokenize';
import Comment     from './comment';
import AtRule      from './at-rule';
import Root        from './root';
import Rule        from './rule';

export default class Parser {

    constructor(input) {
        this.input = input;

        this.pos       = 0;
        this.root      = new Root();
        this.current   = this.root;
        this.spaces    = '';
        this.semicolon = false;

        this.root.source = { input, start: { line: 1, column: 1 } };
    }

    tokenize() {
        this.tokens = tokenizer(this.input);
    }

    loop() {
        let token;
        while ( this.pos < this.tokens.length ) {
            token = this.tokens[this.pos];

            switch ( token[0] ) {

            case 'space':
            case ';':
                this.spaces += token[1];
                break;

            case '}':
                this.end(token);
                break;

            case 'comment':
                this.comment(token);
                break;

            case 'at-word':
                this.atrule(token);
                break;

            case '{':
                this.emptyRule(token);
                break;

            default:
                this.other();
                break;
            }

            this.pos += 1;
        }
        this.endFile();
    }

    comment(token) {
        let node = new Comment();
        this.init(node, token[2], token[3]);
        node.source.end = { line: token[4], column: token[5] };

        let text = token[1].slice(2, -2);
        if ( /^\s*$/.test(text) ) {
            node.text       = '';
            node.raws.left  = text;
            node.raws.right = '';
        } else {
            let match = text.match(/^(\s*)([^]*[^\s])(\s*)$/);
            node.text       = match[2];
            node.raws.left  = match[1];
            node.raws.right = match[3];
        }
    }

    emptyRule(token) {
        let node = new Rule();
        this.init(node, token[2], token[3]);
        node.selector = '';
        node.raws.between = '';
        this.current = node;
    }

    other() {
        let token;
        let end      = false;
        let type     = null;
        let colon    = false;
        let bracket  = null;
        let brackets = [];

        let start = this.pos;
        while ( this.pos < this.tokens.length ) {
            token = this.tokens[this.pos];
            type  = token[0];

            if ( type === '(' || type === '[' ) {
                if ( !bracket ) bracket = token;
                brackets.push(type === '(' ? ')' : ']');

            } else if ( brackets.length === 0 ) {
                if ( type === ';' ) {
                    if ( colon ) {
                        this.decl(this.tokens.slice(start, this.pos + 1));
                        return;
                    } else {
                        break;
                    }

                } else if ( type === '{' ) {
                    this.rule(this.tokens.slice(start, this.pos + 1));
                    return;

                } else if ( type === '}' ) {
                    this.pos -= 1;
                    end = true;
                    break;

                } else if ( type === ':' ) {
                    colon = true;
                }

            } else if ( type === brackets[brackets.length - 1] ) {
                brackets.pop();
                if ( brackets.length === 0 ) bracket = null;
            }

            this.pos += 1;
        }
        if ( this.pos === this.tokens.length ) {
            this.pos -= 1;
            end = true;
        }

        if ( brackets.length > 0 ) this.unclosedBracket(bracket);

        if ( end && colon ) {
            while ( this.pos > start ) {
                token = this.tokens[this.pos][0];
                if ( token !== 'space' && token !== 'comment' ) break;
                this.pos -= 1;
            }
            this.decl(this.tokens.slice(start, this.pos + 1));
            return;
        }

        this.unknownWord(start);
    }

    rule(tokens) {
        tokens.pop();

        let node = new Rule();
        this.init(node, tokens[0][2], tokens[0][3]);

        node.raws.between = this.spacesFromEnd(tokens);
        this.raw(node, 'selector', tokens);
        this.current = node;
    }

    decl(tokens) {
        let node = new Declaration();
        this.init(node);

        let last = tokens[tokens.length - 1];
        if ( last[0] === ';' ) {
            this.semicolon = true;
            tokens.pop();
        }
        if ( last[4] ) {
            node.source.end = { line: last[4], column: last[5] };
        } else {
            node.source.end = { line: last[2], column: last[3] };
        }

        while ( tokens[0][0] !== 'word' ) {
            node.raws.before += tokens.shift()[1];
        }
        node.source.start = { line: tokens[0][2], column: tokens[0][3] };

        node.prop = '';
        while ( tokens.length ) {
            let type = tokens[0][0];
            if ( type === ':' || type === 'space' || type === 'comment' ) {
                break;
            }
            node.prop += tokens.shift()[1];
        }

        node.raws.between = '';

        let token;
        while ( tokens.length ) {
            token = tokens.shift();

            if ( token[0] === ':' ) {
                node.raws.between += token[1];
                break;
            } else {
                node.raws.between += token[1];
            }
        }

        if ( node.prop[0] === '_' || node.prop[0] === '*' ) {
            node.raws.before += node.prop[0];
            node.prop = node.prop.slice(1);
        }
        node.raws.between += this.spacesFromStart(tokens);
        this.precheckMissedSemicolon(tokens);

        for ( let i = tokens.length - 1; i > 0; i-- ) {
            token = tokens[i];
            if ( token[1] === '!important' ) {
                node.important = true;
                let string = this.stringFrom(tokens, i);
                string = this.spacesFromEnd(tokens) + string;
                if ( string !== ' !important' ) node.raws.important = string;
                break;

            } else if (token[1] === 'important') {
                let cache = tokens.slice(0);
                let str   = '';
                for ( let j = i; j > 0; j-- ) {
                    let type = cache[j][0];
                    if ( str.trim().indexOf('!') === 0 && type !== 'space' ) {
                        break;
                    }
                    str = cache.pop()[1] + str;
                }
                if ( str.trim().indexOf('!') === 0 ) {
                    node.important = true;
                    node.raws.important = str;
                    tokens = cache;
                }
            }

            if ( token[0] !== 'space' && token[0] !== 'comment' ) {
                break;
            }
        }

        this.raw(node, 'value', tokens);

        if ( node.value.indexOf(':') !== -1 ) this.checkMissedSemicolon(tokens);
    }

    atrule(token) {
        let node  = new AtRule();
        node.name = token[1].slice(1);
        if ( node.name === '' ) {
            this.unnamedAtrule(node, token);
        }
        this.init(node, token[2], token[3]);

        let last   = false;
        let open   = false;
        let params = [];

        this.pos += 1;
        while ( this.pos < this.tokens.length ) {
            token = this.tokens[this.pos];

            if ( token[0] === ';' ) {
                node.source.end = { line: token[2], column: token[3] };
                this.semicolon = true;
                break;
            } else if ( token[0] === '{' ) {
                open = true;
                break;
            } else if ( token[0] === '}') {
                this.end(token);
                break;
            } else {
                params.push(token);
            }

            this.pos += 1;
        }
        if ( this.pos === this.tokens.length ) {
            last = true;
        }

        node.raws.between = this.spacesFromEnd(params);
        if ( params.length ) {
            node.raws.afterName = this.spacesFromStart(params);
            this.raw(node, 'params', params);
            if ( last ) {
                token = params[params.length - 1];
                node.source.end   = { line: token[4], column: token[5] };
                this.spaces       = node.raws.between;
                node.raws.between = '';
            }
        } else {
            node.raws.afterName = '';
            node.params         = '';
        }

        if ( open ) {
            node.nodes   = [];
            this.current = node;
        }
    }

    end(token) {
        if ( this.current.nodes && this.current.nodes.length ) {
            this.current.raws.semicolon = this.semicolon;
        }
        this.semicolon = false;

        this.current.raws.after = (this.current.raws.after || '') + this.spaces;
        this.spaces = '';

        if ( this.current.parent ) {
            this.current.source.end = { line: token[2], column: token[3] };
            this.current = this.current.parent;
        } else {
            this.unexpectedClose(token);
        }
    }

    endFile() {
        if ( this.current.parent ) this.unclosedBlock();
        if ( this.current.nodes && this.current.nodes.length ) {
            this.current.raws.semicolon = this.semicolon;
        }
        this.current.raws.after = (this.current.raws.after || '') + this.spaces;
    }

    // Helpers

    init(node, line, column) {
        this.current.push(node);

        node.source = { start: { line, column }, input: this.input };
        node.raws.before = this.spaces;
        this.spaces = '';
        if ( node.type !== 'comment' ) this.semicolon = false;
    }

    raw(node, prop, tokens) {
        let token, type;
        let length = tokens.length;
        let value  = '';
        let clean  = true;
        for ( let i = 0; i < length; i += 1 ) {
            token = tokens[i];
            type  = token[0];
            if ( type === 'comment' || type === 'space' && i === length - 1 ) {
                clean = false;
            } else {
                value += token[1];
            }
        }
        if ( !clean ) {
            let raw = tokens.reduce( (all, i) => all + i[1], '');
            node.raws[prop] = { value, raw };
        }
        node[prop] = value;
    }

    spacesFromEnd(tokens) {
        let lastTokenType;
        let spaces = '';
        while ( tokens.length ) {
            lastTokenType = tokens[tokens.length - 1][0];
            if ( lastTokenType !== 'space' &&
                lastTokenType !== 'comment' ) break;
            spaces = tokens.pop()[1] + spaces;
        }
        return spaces;
    }

    spacesFromStart(tokens) {
        let next;
        let spaces = '';
        while ( tokens.length ) {
            next = tokens[0][0];
            if ( next !== 'space' && next !== 'comment' ) break;
            spaces += tokens.shift()[1];
        }
        return spaces;
    }

    stringFrom(tokens, from) {
        let result = '';
        for ( let i = from; i < tokens.length; i++ ) {
            result += tokens[i][1];
        }
        tokens.splice(from, tokens.length - from);
        return result;
    }

    colon(tokens) {
        let brackets = 0;
        let token, type, prev;
        for ( let i = 0; i < tokens.length; i++ ) {
            token = tokens[i];
            type  = token[0];

            if ( type === '(' ) {
                brackets += 1;
            } else if ( type === ')' ) {
                brackets -= 1;
            } else if ( brackets === 0 && type === ':' ) {
                if ( !prev ) {
                    this.doubleColon(token);
                } else if ( prev[0] === 'word' && prev[1] === 'progid' ) {
                    continue;
                } else {
                    return i;
                }
            }

            prev = token;
        }
        return false;
    }

    // Errors

    unclosedBracket(bracket) {
        throw this.input.error('Unclosed bracket', bracket[2], bracket[3]);
    }

    unknownWord(start) {
        let token = this.tokens[start];
        throw this.input.error('Unknown word', token[2], token[3]);
    }

    unexpectedClose(token) {
        throw this.input.error('Unexpected }', token[2], token[3]);
    }

    unclosedBlock() {
        let pos = this.current.source.start;
        throw this.input.error('Unclosed block', pos.line, pos.column);
    }

    doubleColon(token) {
        throw this.input.error('Double colon', token[2], token[3]);
    }

    unnamedAtrule(node, token) {
        throw this.input.error('At-rule without name', token[2], token[3]);
    }

    precheckMissedSemicolon(tokens) {
        // Hook for Safe Parser
        tokens;
    }

    checkMissedSemicolon(tokens) {
        let colon = this.colon(tokens);
        if ( colon === false ) return;

        let founded = 0;
        let token;
        for ( let j = colon - 1; j >= 0; j-- ) {
            token = tokens[j];
            if ( token[0] !== 'space' ) {
                founded += 1;
                if ( founded === 2 ) break;
            }
        }
        throw this.input.error('Missed semicolon', token[2], token[3]);
    }

}
