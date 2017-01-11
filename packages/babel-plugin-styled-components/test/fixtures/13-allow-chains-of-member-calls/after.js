const WithAttrs = styled.div.attrs({ some: 'value' }).withConfig({
  displayName: 'WithAttrs'
})``;
const WithAttrsWrapped = styled(Inner).attrs({ some: 'value' }).withConfig({
  displayName: 'WithAttrsWrapped'
})``;
