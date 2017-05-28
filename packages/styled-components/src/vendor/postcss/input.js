import './root' // break cyclical dependency deadlock – #87

import CssSyntaxError from './css-syntax-error';
// import PreviousMap    from './previous-map';

let sequence = 0;

/**
 * @typedef  {object} filePosition
 * @property {string} file   - path to file
 * @property {number} line   - source line in file
 * @property {number} column - source column in file
 */

/**
 * Represents the source CSS.
 *
 * @example
 * const root  = postcss.parse(css, { from: file });
 * const input = root.source.input;
 */
class Input {

    /**
     * @param {string} css    - input CSS source
     * @param {object} [opts] - {@link Processor#process} options
     */
    constructor(css, opts = { }) {
        /**
         * @member {string} - input CSS source
         *
         * @example
         * const input = postcss.parse('a{}', { from: file }).input;
         * input.css //=> "a{}";
         */
        this.css = css.toString();

        if ( this.css[0] === '\uFEFF' || this.css[0] === '\uFFFE' ) {
            this.css = this.css.slice(1);
        }

        if ( opts.from ) {
            if ( /^\w+:\/\//.test(opts.from) ) {
                /**
                 * @member {string} - The absolute path to the CSS source file
                 *                    defined with the `from` option.
                 *
                 * @example
                 * const root = postcss.parse(css, { from: 'a.css' });
                 * root.source.input.file //=> '/home/ai/a.css'
                 */
                this.file = opts.from;
            } else {
                this.file = path.resolve(opts.from);
            }
        }

/*
        let map = new PreviousMap(this.css, opts);
        if ( map.text ) {
            /!**
             * @member {PreviousMap} - The input source map passed from
             *                         a compilation step before PostCSS
             *                         (for example, from Sass compiler).
             *
             * @example
             * root.source.input.map.consumer().sources //=> ['a.sass']
             *!/
            this.map = map;
            let file = map.consumer().file;
            if ( !this.file && file ) this.file = this.mapResolve(file);
        }
*/

        if ( !this.file ) {
            sequence += 1;
            /**
             * @member {string} - The unique ID of the CSS source. It will be
             *                    created if `from` option is not provided
             *                    (because PostCSS does not know the file path).
             *
             * @example
             * const root = postcss.parse(css);
             * root.source.input.file //=> undefined
             * root.source.input.id   //=> "<input css 1>"
             */
            this.id   = '<input css ' + sequence + '>';
        }
        if ( this.map ) this.map.file = this.from;
    }

    error(message, line, column, opts = { }) {
        let result;
        let origin = this.origin(line, column);
        if ( origin ) {
            result = new CssSyntaxError(message, origin.line, origin.column,
                origin.source, origin.file, opts.plugin);
        } else {
            result = new CssSyntaxError(message, line, column,
                this.css, this.file, opts.plugin);
        }

        result.input = { line, column, source: this.css };
        if ( this.file ) result.input.file = this.file;

        return result;
    }

    /**
     * Reads the input source map and returns a symbol position
     * in the input source (e.g., in a Sass file that was compiled
     * to CSS before being passed to PostCSS).
     *
     * @param {number} line   - line in input CSS
     * @param {number} column - column in input CSS
     *
     * @return {filePosition} position in input source
     *
     * @example
     * root.source.input.origin(1, 1) //=> { file: 'a.css', line: 3, column: 1 }
     */
    origin(line, column) {
        if ( !this.map ) return false;
        let consumer = this.map.consumer();

        let from = consumer.originalPositionFor({ line, column });
        if ( !from.source ) return false;

        let result = {
            file:   this.mapResolve(from.source),
            line:   from.line,
            column: from.column
        };

        let source = consumer.sourceContentFor(from.source);
        if ( source ) result.source = source;

        return result;
    }

    mapResolve(file) {
        if ( /^\w+:\/\//.test(file) ) {
            return file;
        } else {
            return path.resolve(this.map.consumer().sourceRoot || '.', file);
        }
    }

    /**
     * The CSS source identifier. Contains {@link Input#file} if the user
     * set the `from` option, or {@link Input#id} if they did not.
     * @type {string}
     *
     * @example
     * const root = postcss.parse(css, { from: 'a.css' });
     * root.source.input.from //=> "/home/ai/a.css"
     *
     * const root = postcss.parse(css);
     * root.source.input.from //=> "<input css 1>"
     */
    get from() {
        return this.file || this.id;
    }

}

export default Input;
