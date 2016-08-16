import concat from "./concat"
import MediaQuery from "../models/MediaQuery";

export default (query, ...rules) => {
  return new MediaQuery(query, concat(...rules))
}
