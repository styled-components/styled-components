const titleToDash = title => (
  title
    .toLowerCase()
    .split(' ')
    .join('-')
)

export default titleToDash
