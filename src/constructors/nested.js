import NestedSelector from "../models/NestedSelector";
import concat from "./concat";

export default (selector, ...rules) =>
  new NestedSelector(selector, concat(...rules))
