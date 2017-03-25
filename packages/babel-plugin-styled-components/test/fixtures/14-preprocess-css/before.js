const Simple = styled.div`width: 100%;`;

const Nested = styled.div`
  width: 100%;

  &:hover {
    color: papayawhip;
  }

  > div {
    background: white;
  }
`;

const Interpolations = styled.div`
  width: ${props => props.width};
`;

const NestedAndInterpolations = styled.div`
  width: ${props => props.width};

  &:hover {
    color: ${props => props.color};
  }
`;

const SelectorInterpolation = styled.div`
  width: ${props => props.width};

  ${props => props.selector} {
    color: papayawhip;
  }
`;

const RulesetInterpolationA = styled.div`
  width: ${props => props.width};
  ${props => props.ruleset}

  &:hover {
    color: papayawhip;
  }
`;

const RulesetInterpolationB = styled.div`
  ${props => props.ruleset}
  width: ${props => props.width};

  &:hover {
    color: papayawhip;
  }
`;


const Prefixes = styled.div`
  display: flex;
  align-items: center;
`;

const DoubleInterpolation = styled.div`
  margin: ${props => props.vert} ${props => props.hori};
`;
