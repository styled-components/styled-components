// @flow
import constructWithOptions from './constructWithOptions';
import StyledComponent from '../models/StyledComponent';
import domElements from '../utils/domElements';
import type {RealmScope, Target} from "../types";
import {EMPTY_OBJECT} from "../utils/empties";

const styled = (tag: Target, realm: ?RealmScope) => constructWithOptions(StyledComponent, tag, EMPTY_OBJECT, realm);

// Shorthands for all valid HTML Elements
domElements.forEach(domElement => {
  styled[domElement] = styled(domElement, undefined);
});

export default styled;
