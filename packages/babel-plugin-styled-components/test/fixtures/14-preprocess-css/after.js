const Simple = styled.div.withConfig({
  displayName: "before__Simple",
  componentId: "s1xqhw80-0"
})([[" {width: 100%;}"]]);

const Nested = styled.div.withConfig({
  displayName: "before__Nested",
  componentId: "s1xqhw80-1"
})([[" {width: 100%;}"], [":hover {color: papayawhip;}"], [" > div {background: white;}"]]);

const Interpolations = styled.div.withConfig({
  displayName: "before__Interpolations",
  componentId: "s1xqhw80-2"
})([[" {width: ", props => props.width, ";;}"]]);

const NestedAndInterpolations = styled.div.withConfig({
  displayName: "before__NestedAndInterpolations",
  componentId: "s1xqhw80-3"
})([[" {width: ", props => props.width, ";;}"], [":hover {color: ", props => props.color, ";;}"]]);

const SelectorInterpolation = styled.div.withConfig({
  displayName: "before__SelectorInterpolation",
  componentId: "s1xqhw80-4"
})([[" {width: ", props => props.width, ";;}"], [" ", props => props.selector, " {color: papayawhip;}"]]);

const RulesetInerpolation = styled.div.withConfig({
  displayName: "before__RulesetInerpolation",
  componentId: "s1xqhw80-5"
})([[" {width: ", props => props.width, ";;", props => props.ruleset, ";}"], [":hover {color: papayawhip;}"]]);

const Prefixes = styled.div.withConfig({
  displayName: "before__Prefixes",
  componentId: "s1xqhw80-6"
})([[" {display: -webkit-box;display: -webkit-flex;display: -ms-flexbox;display: flex;-webkit-box-align: center;-ms-flex-align: center;align-items: center;}"]]);

