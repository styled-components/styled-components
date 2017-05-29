import { pages } from '../pages/docs.json'

const pathnameDict = pages
  .reduce((acc, { pathname, sections }) => ({
    ...acc,
    ...sections
      .reduce((subAcc, { pathname: subPathname, title }) => {
        subAcc[`${pathname}/${subPathname}`] = title
        return subAcc
      }, {})
  }), {})

const pathnameToTitle = pathname => {
  let routeArr = pathname
    .split('/')
    .filter(Boolean)

  if (routeArr[0] === 'docs') {
    if (routeArr.length === 1) {
      return 'Documentation'
    }

    routeArr = routeArr.slice(1)
  }

  return pathnameDict[routeArr.join('/')] || ''
}

export default pathnameToTitle
