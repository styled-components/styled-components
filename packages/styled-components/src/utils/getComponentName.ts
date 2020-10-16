import { $PropertyType } from "utility-types";

import { IStyledComponent, IStyledNativeComponent } from "../types";

export default function getComponentName(target: $PropertyType<IStyledComponent, "target"> | $PropertyType<IStyledNativeComponent, "target">): string {
  return ((process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) || // $FlowFixMe
  target.displayName || // $FlowFixMe
  target.name || 'Component');
}