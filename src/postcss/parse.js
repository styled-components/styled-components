import Parser from './parser';
import Input  from './input';

export default function parse(css, opts) {
    if ( opts && opts.safe ) {
        throw new Error('Option safe was removed. ' +
                        'Use parser: require("postcss-safe-parser")');
    }

    let input = new Input(css, opts);

    let parser = new Parser(input);
    try {
        parser.tokenize();
        parser.loop();
    } catch (e) {
        if ( e.name === 'CssSyntaxError' && opts && opts.from ) {
            if ( /\.scss$/i.test(opts.from) ) {
                e.message += '\nYou tried to parse SCSS with ' +
                             'the standard CSS parser; ' +
                             'try again with the postcss-scss parser';
            } else if ( /\.less$/i.test(opts.from) ) {
                e.message += '\nYou tried to parse Less with ' +
                             'the standard CSS parser; ' +
                             'try again with the postcss-less parser';
            }
        }
        throw e;
    }

    return parser.root;
}
