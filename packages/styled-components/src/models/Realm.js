import generateName from "../utils/generateAlphabeticName";
import {hash} from "../utils/hash";
import type {RealmScope} from "../types";

function createRealm(name: string): RealmScope {
    return generateName(hash(name));
}

export default createRealm;
