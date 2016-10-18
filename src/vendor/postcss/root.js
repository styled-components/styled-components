import './rule'; // break cyclical dependency deadlock – #87

import Container from './container';
import LazyResult from './lazy-result';
import Processor from './processor';
import warnOnce  from './warn-once';

/**
 * Represents a CSS file and contains all its parsed nodes.
 *
 * @extends Container
 *
 * @example
 * const root = postcss.parse('a{color:black} b{z-index:2}');
 * root.type         //=> 'root'
 * root.nodes.length //=> 2
 */
class Root extends Container {

    constructor(defaults) {
        super(defaults);
        this.type = 'root';
        if ( !this.nodes ) this.nodes = [];
    }

    removeChild(child) {
        child = this.index(child);

        if ( child === 0 && this.nodes.length > 1 ) {
            this.nodes[1].raws.before = this.nodes[child].raws.before;
        }

        return super.removeChild(child);
    }

    normalize(child, sample, type) {
        let nodes = super.normalize(child);

        if ( sample ) {
            if ( type === 'prepend' ) {
                if ( this.nodes.length > 1 ) {
                    sample.raws.before = this.nodes[1].raws.before;
                } else {
                    delete sample.raws.before;
                }
            } else if ( this.first !== sample ) {
                nodes.forEach(node => {
                    node.raws.before = sample.raws.before;
                })
            }
        }

        return nodes;
    }

    /**
     * Returns a {@link Result} instance representing the root’s CSS.
     *
     * @param {processOptions} [opts] - options with only `to` and `map` keys
     *
     * @return {Result} result with current root’s CSS
     *
     * @example
     * const root1 = postcss.parse(css1, { from: 'a.css' });
     * const root2 = postcss.parse(css2, { from: 'b.css' });
     * root1.append(root2);
     * const result = root1.toResult({ to: 'all.css', map: true });
     */
    toResult(opts = { }) {
        let lazy = new LazyResult(new Processor(), this, opts);
        return lazy.stringify();
    }

    remove(child) {
        warnOnce('Root#remove is deprecated. Use Root#removeChild');
        this.removeChild(child);
    }

    prevMap() {
        warnOnce('Root#prevMap is deprecated. Use Root#source.input.map');
        return this.source.input.map;
    }

    /**
     * @memberof Root#
     * @member {object} raws - Information to generate byte-to-byte equal
     *                         node string as it was in the origin input.
     *
     * Every parser saves its own properties,
     * but the default CSS parser uses:
     *
     * * `after`: the space symbols after the last child to the end of file.
     * * `semicolon`: is the last child has an (optional) semicolon.
     *
     * @example
     * postcss.parse('a {}\n').raws //=> { after: '\n' }
     * postcss.parse('a {}').raws   //=> { after: '' }
     */

}

export default Root;
