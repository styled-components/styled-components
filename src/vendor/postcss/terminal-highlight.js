import tokenize from './tokenize';
import Input    from './input';

const HIGHLIGHT_THEME = {
    'brackets': [36, 39], // cyan
    'string':   [31, 39], // red
    'at-word':  [31, 39], // red
    'comment':  [90, 39], // gray
    '{':        [32, 39], // green
    '}':        [32, 39], // green
    ':':        [ 1, 22], // bold
    ';':        [ 1, 22], // bold
    '(':        [ 1, 22], // bold
    ')':        [ 1, 22]  // bold
};

function code(color) {
    return '\u001b[' + color + 'm';
}

function terminalHighlight(css) {
    let tokens = tokenize(new Input(css), { ignoreErrors: true });
    let result = [];
    tokens.forEach(token =>  {
        let color = HIGHLIGHT_THEME[token[0]];
        if ( color ) {
            result.push(token[1].split(/\r?\n/)
              .map( i => code(color[0]) + i + code(color[1]) )
              .join('\n'));
        } else {
            result.push(token[1]);
        }
    })
    return result.join('');
}

export default terminalHighlight;
