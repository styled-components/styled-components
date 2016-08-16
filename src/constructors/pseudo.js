import nested from './nested'

export default (pseudo, ...rules) =>
  nested(pseudo.split(/\,\s?/).map(p => '&:' + p).join(','), ...rules)
