import * as React from "react";

import styled from "../..";

const Link = styled.a`
    color: red;
`;

const OtherLink = styled.a`
    color: blue;
`;

const Article = styled.section`
    color: red;
    & > ${Link} {
        color: green;
    }
    ${p => p.alt ? OtherLink : Link} {
        color: black
    }
`;
