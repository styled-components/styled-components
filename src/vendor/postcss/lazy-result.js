import stringify    from './stringify';
import warnOnce     from './warn-once';
import Result       from './result';
import parse        from './parse';

function isPromise(obj) {
    return typeof obj === 'object' && typeof obj.then === 'function';
}

/**
 * @callback onFulfilled
 * @param {Result} result
 */

/**
 * @callback onRejected
 * @param {Error} error
 */

/**
 * A Promise proxy for the result of PostCSS transformations.
 *
 * A `LazyResult` instance is returned by {@link Processor#process}.
 *
 * @example
 * const lazy = postcss([cssnext]).process(css);
 */
class LazyResult {

    constructor(processor, css, opts) {
        this.stringified = false;
        this.processed   = false;

        let root;
        if ( typeof css === 'object' && css.type === 'root' ) {
            root = css;
        } else if ( css instanceof LazyResult || css instanceof Result ) {
            root = css.root;
            if ( css.map ) {
                if ( typeof opts.map === 'undefined' ) opts.map = { };
                if ( !opts.map.inline ) opts.map.inline = false;
                opts.map.prev = css.map;
            }
        } else {
            let parser = parse;
            if ( opts.syntax )  parser = opts.syntax.parse;
            if ( opts.parser )  parser = opts.parser;
            if ( parser.parse ) parser = parser.parse;

            try {
                root = parser(css, opts);
            } catch (error) {
                this.error = error;
            }
        }

        this.result = new Result(processor, root, opts);
    }

    /**
     * Returns a {@link Processor} instance, which will be used
     * for CSS transformations.
     * @type {Processor}
     */
    get processor() {
        return this.result.processor;
    }

    /**
     * Options from the {@link Processor#process} call.
     * @type {processOptions}
     */
    get opts() {
        return this.result.opts;
    }

    /**
     * Processes input CSS through synchronous plugins, converts `Root`
     * to a CSS string and returns {@link Result#css}.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {string}
     * @see Result#css
     */
    get css() {
        return this.stringify().css;
    }

    /**
     * An alias for the `css` property. Use it with syntaxes
     * that generate non-CSS output.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {string}
     * @see Result#content
     */
    get content() {
        return this.stringify().content;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#map}.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {SourceMapGenerator}
     * @see Result#map
     */
    get map() {
        return this.stringify().map;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#root}.
     *
     * This property will only work with synchronous plugins. If the processor
     * contains any asynchronous plugins it will throw an error.
     *
     * This is why this method is only for debug purpose,
     * you should always use {@link LazyResult#then}.
     *
     * @type {Root}
     * @see Result#root
     */
    get root() {
        return this.sync().root;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#messages}.
     *
     * This property will only work with synchronous plugins. If the processor
     * contains any asynchronous plugins it will throw an error.
     *
     * This is why this method is only for debug purpose,
     * you should always use {@link LazyResult#then}.
     *
     * @type {Message[]}
     * @see Result#messages
     */
    get messages() {
        return this.sync().messages;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and calls {@link Result#warnings()}.
     *
     * @return {Warning[]} warnings from plugins
     */
    warnings() {
        return this.sync().warnings();
    }

    /**
     * Alias for the {@link LazyResult#css} property.
     *
     * @example
     * lazy + '' === lazy.css;
     *
     * @return {string} output CSS
     */
    toString() {
        return this.css;
    }

    /**
     * Processes input CSS through synchronous and asynchronous plugins
     * and calls `onFulfilled` with a Result instance. If a plugin throws
     * an error, the `onRejected` callback will be executed.
     *
     * It implements standard Promise API.
     *
     * @param {onFulfilled} onFulfilled - callback will be executed
     *                                    when all plugins will finish work
     * @param {onRejected}  onRejected  - callback will be execited on any error
     *
     * @return {Promise} Promise API to make queue
     *
     * @example
     * postcss([cssnext]).process(css).then(result => {
     *   console.log(result.css);
     * });
     */
    then(onFulfilled, onRejected) {
        return this.async().then(onFulfilled, onRejected);
    }

    /**
     * Processes input CSS through synchronous and asynchronous plugins
     * and calls onRejected for each error thrown in any plugin.
     *
     * It implements standard Promise API.
     *
     * @param {onRejected} onRejected - callback will be execited on any error
     *
     * @return {Promise} Promise API to make queue
     *
     * @example
     * postcss([cssnext]).process(css).then(result => {
     *   console.log(result.css);
     * }).catch(error => {
     *   console.error(error);
     * });
     */
    catch(onRejected) {
        return this.async().catch(onRejected);
    }

    handleError(error, plugin) {
        try {
            this.error = error;
            if ( error.name === 'CssSyntaxError' && !error.plugin ) {
                error.plugin = plugin.postcssPlugin;
                error.setMessage();
            } else if ( plugin.postcssVersion ) {
                let pluginName = plugin.postcssPlugin;
                let pluginVer  = plugin.postcssVersion;
                let runtimeVer = this.result.processor.version;
                let a = pluginVer.split('.');
                let b = runtimeVer.split('.');

                if ( a[0] !== b[0] || parseInt(a[1]) > parseInt(b[1]) ) {
                    warnOnce('Your current PostCSS version ' +
                             'is ' + runtimeVer + ', but ' + pluginName + ' ' +
                             'uses ' + pluginVer + '. Perhaps this is ' +
                             'the source of the error below.');
                }
            }
        } catch (err) {
            if ( console && console.error ) console.error(err);
        }
    }

    asyncTick(resolve, reject) {
        if ( this.plugin >= this.processor.plugins.length ) {
            this.processed = true;
            return resolve();
        }

        try {
            let plugin  = this.processor.plugins[this.plugin];
            let promise = this.run(plugin);
            this.plugin += 1;

            if ( isPromise(promise) ) {
                promise.then( () => {
                    this.asyncTick(resolve, reject);
                }).catch( error => {
                    this.handleError(error, plugin);
                    this.processed = true;
                    reject(error);
                });
            } else {
                this.asyncTick(resolve, reject);
            }

        } catch (error) {
            this.processed = true;
            reject(error);
        }
    }

    async() {
        if ( this.processed ) {
            return new Promise( (resolve, reject) => {
                if ( this.error ) {
                    reject(this.error);
                } else {
                    resolve(this.stringify());
                }
            });
        }
        if ( this.processing ) {
            return this.processing;
        }

        this.processing = new Promise( (resolve, reject) => {
            if ( this.error ) return reject(this.error);
            this.plugin = 0;
            this.asyncTick(resolve, reject);
        }).then( () => {
            this.processed = true;
            return this.stringify();
        });

        return this.processing;
    }

    sync() {
        if ( this.processed ) return this.result;
        this.processed = true;

        if ( this.processing ) {
            throw new Error(
                'Use process(css).then(cb) to work with async plugins');
        }

        if ( this.error ) throw this.error;

        this.result.processor.plugins.forEach(plugin => {
            let promise = this.run(plugin);
            if ( isPromise(promise) ) {
                throw new Error(
                    'Use process(css).then(cb) to work with async plugins');
            }
        })

        return this.result;
    }

    run(plugin) {
        this.result.lastPlugin = plugin;

        try {
            return plugin(this.result.root, this.result);
        } catch (error) {
            this.handleError(error, plugin);
            throw error;
        }
    }

    stringify() {
        if ( this.stringified ) return this.result;
        this.stringified = true;

        this.sync();

        let opts = this.result.opts;
        let str  = stringify;
        if ( opts.syntax )      str = opts.syntax.stringify;
        if ( opts.stringifier ) str = opts.stringifier;
        if ( str.stringify )    str = str.stringify;

        let result = '';
        str(this.root, i => {
            result += i;
        });
        this.result.css = result;

        return this.result;
    }

}

export default LazyResult;
