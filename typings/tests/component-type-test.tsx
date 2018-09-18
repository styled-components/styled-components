import styled from "../..";

declare const A: React.ComponentClass;
declare const B: React.StatelessComponent;
declare const C: React.ComponentType;

styled(A); // succeeds
styled(B); // succeeds
styled(C); // used to fail; see issue trail linked below

// https://github.com/mui-org/material-ui/pull/8781#issuecomment-349460247
// https://github.com/mui-org/material-ui/issues/9838
// https://github.com/styled-components/styled-components/pull/1420
// https://github.com/Microsoft/TypeScript/issues/21175
// https://github.com/styled-components/styled-components/pull/1427
