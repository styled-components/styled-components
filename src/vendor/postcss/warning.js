/**
 * Represents a plugin’s warning. It can be created using {@link Node#warn}.
 *
 * @example
 * if ( decl.important ) {
 *     decl.warn(result, 'Avoid !important', { word: '!important' });
 * }
 */
class Warning {

    /**
     * @param {string} text        - warning message
     * @param {Object} [opts]      - warning options
     * @param {Node}   opts.node   - CSS node that caused the warning
     * @param {string} opts.word   - word in CSS source that caused the warning
     * @param {number} opts.index  - index in CSS node string that caused
     *                               the warning
     * @param {string} opts.plugin - name of the plugin that created
     *                               this warning. {@link Result#warn} fills
     *                               this property automatically.
     */
    constructor(text, opts = { }) {
        /**
         * @member {string} - Type to filter warnings from
         *                    {@link Result#messages}. Always equal
         *                    to `"warning"`.
         *
         * @example
         * const nonWarning = result.messages.filter(i => i.type !== 'warning')
         */
        this.type = 'warning';
        /**
         * @member {string} - The warning message.
         *
         * @example
         * warning.text //=> 'Try to avoid !important'
         */
        this.text = text;

        if ( opts.node && opts.node.source ) {
            let pos     = opts.node.positionBy(opts);
            /**
             * @member {number} - Line in the input file
             *                    with this warning’s source
             *
             * @example
             * warning.line //=> 5
             */
            this.line   = pos.line;
            /**
             * @member {number} - Column in the input file
             *                    with this warning’s source.
             *
             * @example
             * warning.column //=> 6
             */
            this.column = pos.column;
        }

        for ( let opt in opts ) this[opt] = opts[opt];
    }

    /**
     * Returns a warning position and message.
     *
     * @example
     * warning.toString() //=> 'postcss-lint:a.css:10:14: Avoid !important'
     *
     * @return {string} warning position and message
     */
    toString() {
        if ( this.node ) {
            return this.node.error(this.text, {
                plugin: this.plugin,
                index:  this.index,
                word:   this.word
            }).message;
        } else if ( this.plugin ) {
            return this.plugin + ': ' + this.text;
        } else {
            return this.text;
        }
    }

    /**
     * @memberof Warning#
     * @member {string} plugin - The name of the plugin that created
     *                           it will fill this property automatically.
     *                           this warning. When you call {@link Node#warn}
     *
     * @example
     * warning.plugin //=> 'postcss-important'
     */

    /**
     * @memberof Warning#
     * @member {Node} node - Contains the CSS node that caused the warning.
     *
     * @example
     * warning.node.toString() //=> 'color: white !important'
     */

}

export default Warning;
