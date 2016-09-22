import Stringifier from './stringifier';

export default function stringify(node, builder) {
    let str = new Stringifier(builder);
    str.stringify(node);
}
