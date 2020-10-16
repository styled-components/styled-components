import { $PropertyType } from "utility-types";

import { IStyledComponent, IStyledNativeComponent } from "../types";

export default function isTag(target: $PropertyType<IStyledComponent, "target"> | $PropertyType<IStyledNativeComponent, "target">): boolean {
  return (typeof target === 'string' && (process.env.NODE_ENV !== 'production' ? target.charAt(0) === target.charAt(0).toLowerCase() : true));
}