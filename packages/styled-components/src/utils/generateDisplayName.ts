import { $PropertyType } from "utility-types";

import { IStyledComponent, IStyledNativeComponent } from "../types";
import getComponentName from "./getComponentName";
import isTag from "./isTag";

export default function generateDisplayName(target: $PropertyType<IStyledComponent, "target"> | $PropertyType<IStyledNativeComponent, "target">): string {
  return isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`;
}