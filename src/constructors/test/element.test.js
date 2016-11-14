// @flow
// import proxyquire from 'proxyquire'
// import expect from 'expect'
//
// // Inject FakeRoot into the "import '../models/Root'" call in element.js with proxyquire
// const injectStylesSpy = expect.createSpy()
// const constructorSpy = expect.createSpy()
// const generatedClassname = 'generated-classname'
// class FakeRoot {
//   constructor(...rules) {
//     constructorSpy(...rules)
//   }
//   injectStyles() {
//     injectStylesSpy()
//     return generatedClassname
//   }
// }
// const element = proxyquire('../element', { '../models/Root': FakeRoot })
//
// describe('element', () => {
//   afterEach(() => {
//     injectStylesSpy.restore()
//     constructorSpy.restore()
//   })
//
//   it('should return a stateless functional component', () => {
//     expect(element('div')).toBeA('function')
//   })
//
//   it('should add the rules to the style root on creation', () => {
//     const rule1 = 'background: "red";'
//     const rule2 = 'color: "blue";'
//     element('div', rule1, rule2)
//     expect(constructorSpy).toHaveBeenCalled()
//     expect(constructorSpy).toHaveBeenCalledWith(rule1, rule2)
//   })
//
//   it('should call injectStyles of the style root on render', () => {
//     // Pretend a react render is happening
//     element('div')({})
//     expect(injectStylesSpy).toHaveBeenCalled()
//   })
//
//   it('should adopt the classname of the injectStyles call', () => {
//     // Pretend a react render is happening
//     const renderedComp = element('div')({})
//     expect(renderedComp.props.className).toEqual(` ${generatedClassname}`)
//   })
//
//   it('should adopt a passed in className', () => {
//     const className = 'other-classname'
//     const renderedComp = element('div')({
//       className,
//     })
//     expect(renderedComp.props.className).toEqual(`${className} ${generatedClassname}`)
//   })
// })
