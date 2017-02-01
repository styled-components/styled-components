const Simple = styled.div.withConfig({
  displayName: "before__Simple",
  componentId: "before__Simple-yie0o1"
})([[" {width: 100%;}"]]);

const Nested = styled.div.withConfig({
  displayName: "before__Nested",
  componentId: "before__Nested-uj1gw2"
})([[" {width: 100%;}"], [":hover {color: papayawhip;}"], [" > div {background: white;}"]]);

const Interpolations = styled.div.withConfig({
  displayName: "before__Interpolations",
  componentId: "before__Interpolations-1q4ya3i"
})([[" {width: ", props => props.width, ";;}"]]);

const NestedAndInterpolations = styled.div.withConfig({
  displayName: "before__NestedAndInterpolations",
  componentId: "before__NestedAndInterpolations-1mcoa1f"
})([[" {width: ", props => props.width, ";;}"], [":hover {color: ", props => props.color, ";;}"]]);

const SelectorInterpolation = styled.div.withConfig({
  displayName: "before__SelectorInterpolation",
  componentId: "before__SelectorInterpolation-1a1zlqa"
})([[" {width: ", props => props.width, ";;}"], [" ", props => props.selector, " {color: papayawhip;}"]]);

const RulesetInerpolation = styled.div.withConfig({
  displayName: "before__RulesetInerpolation",
  componentId: "before__RulesetInerpolation-11wer1a"
})([[" {width: ", props => props.width, ";;", props => props.ruleset, ";}"], [":hover {color: papayawhip;}"]]);

const Prefixes = styled.div.withConfig({
  displayName: "before__Prefixes",
  componentId: "before__Prefixes-1vitzne"
})([[" {display:-webkit-box;display:-webkit-flex;-ms-flexbox;display:flex;-webkit-box-align: center;-ms-flex-align: center;align-items: center;}"]]);

