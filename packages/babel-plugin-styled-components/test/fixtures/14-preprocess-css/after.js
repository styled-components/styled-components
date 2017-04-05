const Simple = styled.div.withConfig({
  displayName: "before__Simple"
})([[" {width: 100%;}"]]);

const Nested = styled.div.withConfig({
  displayName: "before__Nested"
})([[" {width: 100%;}"], [":hover {color: papayawhip;}"], [" > div {background: white;}"]]);

const Interpolations = styled.div.withConfig({
  displayName: "before__Interpolations"
})([[" {width: ", props => props.width, ";}"]]);

const NestedAndInterpolations = styled.div.withConfig({
  displayName: "before__NestedAndInterpolations"
})([[" {width: ", props => props.width, ";}"], [":hover {color: ", props => props.color, ";}"]]);

const SelectorInterpolation = styled.div.withConfig({
  displayName: "before__SelectorInterpolation"
})([[" {width: ", props => props.width, ";}"], [" ", props => props.selector, " {color: papayawhip;}"]]);

const RulesetInterpolationA = styled.div.withConfig({
  displayName: "before__RulesetInterpolationA"
})([[" {width: ", props => props.width, ";", props => props.ruleset, ";}"], [":hover {color: papayawhip;}"]]);

const RulesetInterpolationB = styled.div.withConfig({
  displayName: "before__RulesetInterpolationB"
})([[" {", props => props.ruleset, ";width: ", props => props.width, ";}"], [":hover {color: papayawhip;}"]]);

const Prefixes = styled.div.withConfig({
  displayName: "before__Prefixes"
})([[" {display: -webkit-box;display: -webkit-flex;display: -ms-flexbox;display: flex;-webkit-align-items: center;-webkit-box-align: center;-ms-flex-align: center;align-items: center;}"]]);

const DoubleInterpolation = styled.div.withConfig({
  displayName: "before__DoubleInterpolation"
})([[" {margin: ", props => props.vert, " ", props => props.hori, ";}"]]);
