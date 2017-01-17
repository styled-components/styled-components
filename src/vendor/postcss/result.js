import Warning from './warning';

/**
 * @typedef  {object} Message
 * @property {string} type   - message type
 * @property {string} plugin - source PostCSS plugin name
 */

/**
 * Provides the result of the PostCSS transformations.
 *
 * A Result instance is returned by {@link LazyResult#then}
 * or {@link Root#toResult} methods.
 *
 * @example
 * postcss([cssnext]).process(css).then(function (result) {
 *    console.log(result.css);
 * });
 *
 * @example
 * var result2 = postcss.parse(css).toResult();
 */
class Result {

    /**
     * @param {Processor} processor - processor used for this transformation.
     * @param {Root}      root      - Root node after all transformations.
     * @param {processOptions} opts - options from the {@link Processor#process}
     *                                or {@link Root#toResult}
     */
    constructor(processor, root, opts) {
        /**
         * @member {Processor} - The Processor instance used
         *                       for this transformation.
         *
         * @example
         * for ( let plugin of result.processor.plugins) {
         *   if ( plugin.postcssPlugin === 'postcss-bad' ) {
         *     throw 'postcss-good is incompatible with postcss-bad';
         *   }
         * });
         */
        this.processor = processor;
        /**
         * @member {Message[]} - Contains messages from plugins
         *                       (e.g., warnings or custom messages).
         *                       Each message should have type
         *                       and plugin properties.
         *
         * @example
         * postcss.plugin('postcss-min-browser', () => {
         *   return (root, result) => {
         *     var browsers = detectMinBrowsersByCanIUse(root);
         *     result.messages.push({
         *       type:    'min-browser',
         *       plugin:  'postcss-min-browser',
         *       browsers: browsers
         *     });
         *   };
         * });
         */
        this.messages = [];
        /**
         * @member {Root} - Root node after all transformations.
         *
         * @example
         * root.toResult().root == root;
         */
        this.root = root;
        /**
         * @member {processOptions} - Options from the {@link Processor#process}
         *                            or {@link Root#toResult} call
         *                            that produced this Result instance.
         *
         * @example
         * root.toResult(opts).opts == opts;
         */
        this.opts = opts;
        /**
         * @member {string} - A CSS string representing of {@link Result#root}.
         *
         * @example
         * postcss.parse('a{}').toResult().css //=> "a{}"
         */
        this.css = undefined;
        /**
         * @member {SourceMapGenerator} - An instance of `SourceMapGenerator`
         *                                class from the `source-map` library,
         *                                representing changes
         *                                to the {@link Result#root} instance.
         *
         * @example
         * result.map.toJSON() //=> { version: 3, file: 'a.css', … }
         *
         * @example
         * if ( result.map ) {
         *   fs.writeFileSync(result.opts.to + '.map', result.map.toString());
         * }
         */
        this.map = undefined;
    }

    /**
     * Returns for @{link Result#css} content.
     *
     * @example
     * result + '' === result.css
     *
     * @return {string} string representing of {@link Result#root}
     */
    toString() {
        return this.css;
    }

    /**
     * Creates an instance of {@link Warning} and adds it
     * to {@link Result#messages}.
     *
     * @param {string} text        - warning message
     * @param {Object} [opts]      - warning options
     * @param {Node}   opts.node   - CSS node that caused the warning
     * @param {string} opts.word   - word in CSS source that caused the warning
     * @param {number} opts.index  - index in CSS node string that caused
     *                               the warning
     * @param {string} opts.plugin - name of the plugin that created
     *                               this warning. {@link Result#warn} fills
     *                               this property automatically.
     *
     * @return {Warning} created warning
     */
    warn(text, opts = { }) {
        if ( !opts.plugin ) {
            if ( this.lastPlugin && this.lastPlugin.postcssPlugin ) {
                opts.plugin = this.lastPlugin.postcssPlugin;
            }
        }

        let warning = new Warning(text, opts);
        this.messages.push(warning);

        return warning;
    }

    /**
     * Returns warnings from plugins. Filters {@link Warning} instances
     * from {@link Result#messages}.
     *
     * @example
     * result.warnings().forEach(warn => {
     *   console.warn(warn.toString());
     * });
     *
     * @return {Warning[]} warnings from plugins
     */
    warnings() {
        return this.messages.filter( i => i.type === 'warning' );
    }

    /**
     * An alias for the {@link Result#css} property.
     * Use it with syntaxes that generate non-CSS output.
     * @type {string}
     *
     * @example
     * result.css === result.content;
     */
    get content() {
        return this.css;
    }

}

export default Result;
