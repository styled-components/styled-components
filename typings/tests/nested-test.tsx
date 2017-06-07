import * as React from "react";

import styled, { css } from "../..";

const Link = styled.a`
    color: red;
`;

const AlternativeLink = styled.a`
    color: blue;
`;

const freeStyles = css`
    background-color: black;
    color: white;
    ${Link} {
        color: blue;
    }
`;

const Article = styled.section`
    color: red;
    ${freeStyles}
    & > ${Link} {
        color: green;
    }
    ${p => p.theme.useAlternativeLink ? AlternativeLink : Link} {
        color: black
    }
`;
