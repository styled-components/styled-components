import css from "./css"
import Element from "../models/Element"

const styled = tagName => (...args) => {
  return Element(tagName, css(...args))
}

styled.div = styled('div')

export default styled
