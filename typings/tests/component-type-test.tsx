import styled from "../..";

declare const A: React.ComponentClass;
declare const B: React.StatelessComponent;
declare const C: React.ComponentClass | React.StatelessComponent;

styled(A); // succeeds
styled(B); // succeeds
styled(C); // fails
