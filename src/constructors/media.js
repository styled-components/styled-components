import concat from './concat'
import MediaQuery from '../models/MediaQuery'

export default (query, ...rules) => new MediaQuery(query, concat(...rules))
