import generateName from "../utils/generateAlphabeticName";
import {hash} from "../utils/hash";

function createRealm(name: string) {
    return generateName(hash(name));
}

export default createRealm;
