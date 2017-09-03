console.log('CONFIG FILE BEING LOADED')

const omg = {
  hax: false,
  touched: false,
}

export const config = () => {
  console.log('EXEC CONFIG')
  omg.touched = true
  return omg
}

export default () => {
  if (omg.touched) throw new Error("Can only configure Styled Components before you've used it!")
  console.log('EXEC HAX')
  omg.hax = true
  console.log(omg)
}
