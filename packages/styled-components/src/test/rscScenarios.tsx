import React from 'react';
import styled from '../index';
import { StyleSheetManager } from '../models/StyleSheetManager';
import rscPlugin from '../plugins/rsc';

/**
 * Server-component pages whose cascade must not depend on render order, for the
 * cascade invariant in `styled.rsc.test.tsx`. Each is a name and a tree; probed
 * elements carry `data-probe`. Components are built per call so every scenario
 * starts from fresh component IDs and group IDs.
 */
type Scenario = {
  name: string;
  tree: () => React.ReactElement;
};

function twoLevels() {
  const Base = styled.div`
    color: blue;
  `;
  const Ext = styled(Base)`
    color: red;
  `;

  return { Base, Ext };
}

function threeLevels() {
  const A = styled.div`
    color: blue;
  `;
  const B = styled(A)`
    color: green;
  `;
  const C = styled(B)`
    color: red;
  `;

  return { A, B, C };
}

/** Extensions (`styled(Base)`) in every render order the cascade could expose. */
export const extensionScenarios: Scenario[] = [
  {
    name: 'adjacent-with-rscPlugin',
    tree: () => {
      const Base = styled.div`
        & + & {
          margin-left: 8px;
        }
      `;
      const Ext = styled(Base)`
        color: red;
      `;

      return (
        <StyleSheetManager plugins={[rscPlugin]}>
          <main>
            <Base data-probe="b1" />
            <Ext data-probe="e1" />
            <Base data-probe="b2" />
            <Base data-probe="b3" />
            <Ext data-probe="e2" />
            <Ext data-probe="e3" />
          </main>
        </StyleSheetManager>
      );
    },
  },
  {
    name: 'dynamic-base-shared-ext-class',
    tree: () => {
      const Base = styled.div<{ $c: string }>`
        color: ${p => p.$c};
      `;
      const Ext = styled(Base)`
        padding: 1px;
      `;

      return (
        <main>
          <Ext data-probe="red" $c="red" />
          <Ext data-probe="blue" $c="blue" />
          <Base data-probe="bgreen" $c="green" />
        </main>
      );
    },
  },
  {
    name: 'empty-extension',
    tree: () => {
      const { Base } = twoLevels();
      const Ext = styled(Base)``;
      const Ext2 = styled(Ext)`
        color: red;
      `;

      return (
        <main>
          <Ext2 data-probe="ext2" />
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'ext-then-base',
    tree: () => {
      const { Base, Ext } = twoLevels();

      return (
        <main>
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'base-then-ext',
    tree: () => {
      const { Base, Ext } = twoLevels();

      return (
        <main>
          <Base data-probe="base" />
          <Ext data-probe="ext" />
        </main>
      );
    },
  },
  {
    name: 'three-C-B-A',
    tree: () => {
      const { A, B, C } = threeLevels();

      return (
        <main>
          <C data-probe="c" />
          <B data-probe="b" />
          <A data-probe="a" />
        </main>
      );
    },
  },
  {
    name: 'three-A-B-C',
    tree: () => {
      const { A, B, C } = threeLevels();

      return (
        <main>
          <A data-probe="a" />
          <B data-probe="b" />
          <C data-probe="c" />
        </main>
      );
    },
  },
  {
    name: 'three-C-A-then-B',
    tree: () => {
      const { A, B, C } = threeLevels();

      return (
        <main>
          <C data-probe="c" />
          <A data-probe="a" />
          <B data-probe="b" />
          <C data-probe="c2" />
        </main>
      );
    },
  },
  {
    name: 'siblings-ext1-ext2-base',
    tree: () => {
      const Base = styled.div`
        color: blue;
        background: white;
      `;
      const E1 = styled(Base)`
        color: red;
      `;
      const E2 = styled(Base)`
        color: green;
      `;

      return (
        <main>
          <E1 data-probe="e1" />
          <E2 data-probe="e2" />
          <Base data-probe="base" />
          <E1 data-probe="e1b" />
        </main>
      );
    },
  },
  {
    name: 'adjacent-self-selector',
    tree: () => {
      const Base = styled.div`
        & + & {
          margin-left: 8px;
        }
      `;
      const Ext = styled(Base)`
        color: red;
      `;

      return (
        <main>
          <Base data-probe="b1" />
          <Ext data-probe="e1" />
          <Base data-probe="b2" />
          <Base data-probe="b3" />
          <Ext data-probe="e2" />
          <Ext data-probe="e3" />
        </main>
      );
    },
  },
  {
    name: 'base-double-amp',
    tree: () => {
      const Base = styled.div`
        && {
          color: blue;
        }
      `;
      const Ext = styled(Base)`
        color: red;
      `;

      return (
        <main>
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'ext-double-amp',
    tree: () => {
      const { Base } = twoLevels();
      const Ext = styled(Base)`
        && {
          color: red;
        }
      `;

      return (
        <main>
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'three-B-C-A',
    tree: () => {
      const { A, B, C } = threeLevels();

      return (
        <main>
          <B data-probe="b" />
          <C data-probe="c" />
          <A data-probe="a" />
        </main>
      );
    },
  },
  {
    name: 'parent-component-selector',
    tree: () => {
      const { Base, Ext } = twoLevels();
      const Parent = styled.section`
        ${Base} {
          color: purple;
        }
      `;

      return (
        <Parent>
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </Parent>
      );
    },
  },
  {
    name: 'as-and-attrs',
    tree: () => {
      const Base = styled.div`
        color: blue;
      `;
      const Ext = styled(Base).attrs({ className: 'x' })`
        color: red;
      `;

      return (
        <main>
          <Ext as="span" data-probe="ext" />
          <Base as="span" data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'base-descendant-and-media',
    tree: () => {
      const Base = styled.div`
        color: blue;
        & > span {
          color: green;
        }
        @media (min-width: 1px) {
          color: orange;
        }
      `;
      const Ext = styled(Base)`
        color: red;
      `;

      return (
        <main>
          <Ext data-probe="ext">
            <span data-probe="extspan">x</span>
          </Ext>
          <Base data-probe="base">
            <span data-probe="basespan">x</span>
          </Base>
        </main>
      );
    },
  },
  {
    name: 'adjacent-general-sibling',
    tree: () => {
      const Base = styled.div`
        & ~ & {
          margin-left: 8px;
        }
      `;
      const Ext = styled(Base)`
        color: red;
      `;

      return (
        <main>
          <Base data-probe="b1" />
          <Ext data-probe="e1" />
          <Base data-probe="b2" />
          <Ext data-probe="e2" />
        </main>
      );
    },
  },
  {
    name: 'self-nested-selector',
    tree: () => {
      const Base = styled.div`
        & & {
          padding-top: 3px;
        }
      `;
      const Ext = styled(Base)`
        color: red;
      `;

      return (
        <main>
          <Base data-probe="b-outer">
            <Ext data-probe="e-in-b" />
          </Base>
          <Ext data-probe="e-outer">
            <Base data-probe="b-in-e" />
            <Ext data-probe="e-in-e" />
          </Ext>
        </main>
      );
    },
  },
  {
    name: 'parent-ext-selector',
    tree: () => {
      const { Base, Ext } = twoLevels();
      const Parent = styled.section`
        ${Ext} {
          color: purple;
        }
      `;

      return (
        <Parent>
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </Parent>
      );
    },
  },
];

/** A component that passes everything it gets, `className` included, to a styled element. */
export const passThrough = (Inner: React.ComponentType<{ className?: string }>) =>
  function PassThrough(props: object) {
    return <Inner {...props} />;
  };

/** Wrappers (`styled(Wrapper)` where Wrapper renders a styled element), whose tag and inner tag land apart. */
export const wrapperScenarios: Scenario[] = [
  {
    name: 'wrapped-composition',
    tree: () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;

      return (
        <main>
          <Red data-probe="ext" />
          <Btn data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-ext-composition',
    tree: () => {
      const { Base, Ext } = twoLevels();
      const Green = styled(passThrough(Ext))`
        color: green;
      `;

      return (
        <main>
          <Green data-probe="g" />
          <Ext data-probe="ext" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-base-first',
    tree: () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;

      return (
        <main>
          <Btn data-probe="base" />
          <Red data-probe="ext" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-double',
    tree: () => {
      const Btn = styled.div`
        color: blue;
        padding-top: 1px;
      `;
      const O1 = styled(passThrough(Btn))`
        color: red;
      `;
      const O2 = styled(passThrough(O1))`
        color: green;
      `;

      return (
        <main>
          <O2 data-probe="o2" />
          <O1 data-probe="o1" />
          <Btn data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-inner-double-amp',
    tree: () => {
      const Btn = styled.div`
        && {
          color: blue;
        }
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;

      return (
        <main>
          <Red data-probe="ext" />
          <Btn data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-outer-double-amp',
    tree: () => {
      const Btn = styled.div`
        && {
          color: blue;
        }
      `;
      const Red = styled(passThrough(Btn))`
        && {
          color: red;
        }
      `;

      return (
        <main>
          <Red data-probe="ext" />
          <Btn data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-dynamic-attrs',
    tree: () => {
      const Btn = styled.div<{ $c?: string | undefined }>`
        color: ${p => p.$c || 'blue'};
      `;
      const Wrap = ({ tone, ...rest }: { className?: string; tone?: string }) => (
        <Btn {...rest} $c={tone} />
      );
      const Out = styled(Wrap).attrs({ className: 'x' })<{ $o: string }>`
        color: ${p => p.$o};
      `;

      return (
        <main>
          <Out data-probe="red" $o="red" tone="orange" />
          <Out data-probe="green" $o="green" tone="orange" />
          <Btn data-probe="orange" $c="orange" />
          <Btn data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-plain-inner',
    tree: () => {
      const Wrap = (props: object) => <div {...props} />;
      const Red = styled(Wrap)`
        color: red;
      `;

      return (
        <main>
          <Red data-probe="ext" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-descendant-media',
    tree: () => {
      const Btn = styled.div`
        color: blue;
        & > span {
          color: purple;
        }
      `;
      const Red = styled(passThrough(Btn))`
        @media (min-width: 1px) {
          color: red;
        }
        & > span {
          color: green;
        }
      `;

      return (
        <main>
          <Red data-probe="ext">
            <span data-probe="extspan">x</span>
          </Red>
          <Btn data-probe="base">
            <span data-probe="basespan">x</span>
          </Btn>
        </main>
      );
    },
  },
  {
    name: 'adjacent-wrapped-general-sibling',
    tree: () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        & ~ & {
          margin-left: 8px;
        }
      `;

      return (
        <main>
          <Red data-probe="r1" />
          <Btn data-probe="b1" />
          <Red data-probe="r2" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-ext-of-wrapped',
    tree: () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;
      const Green = styled(Red)`
        color: green;
      `;

      return (
        <main>
          <Green data-probe="g" />
          <Red data-probe="ext" />
          <Btn data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'parent-wrapped-selector',
    tree: () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;
      const Parent = styled.section`
        ${Red} {
          color: purple;
        }
      `;

      return (
        <Parent>
          <Red data-probe="ext" />
          <Btn data-probe="base" />
        </Parent>
      );
    },
  },
  {
    name: 'wrapped-two-outers',
    tree: () => {
      const Btn = styled.div`
        color: blue;
      `;
      const Red = styled(passThrough(Btn))`
        color: red;
      `;
      const Green = styled(passThrough(Btn))`
        color: green;
      `;

      return (
        <main>
          <Red data-probe="red" />
          <Green data-probe="green" />
          <Btn data-probe="base" />
          <Red data-probe="red2" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-inner-defined-later',
    tree: () => {
      const Wrap = (props: object) => <Late {...props} />;
      const Red = styled(Wrap)`
        color: red;
      `;
      const Late = styled.div`
        color: blue;
      `;

      return (
        <main>
          <Red data-probe="ext" />
          <Late data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-mixed-groups',
    tree: () => {
      const Wrap1 = (props: object) => <Late {...props} />;
      const O1 = styled(Wrap1)`
        color: red;
        background-color: red;
      `;
      const Late = styled.div`
        color: blue;
      `;
      const O2 = styled(passThrough(O1))`
        background-color: green;
      `;

      return (
        <main>
          <O2 data-probe="o2" />
          <O1 data-probe="o1" />
          <Late data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'as-then-plain-ext',
    tree: () => {
      const { Base, Ext } = twoLevels();
      const Other = styled.span`
        color: green;
      `;

      return (
        <main>
          <Ext as={Other} data-probe="ext" />
          <Ext data-probe="ext2" />
          <Other data-probe="other" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'as-styled-component-defined-first',
    tree: () => {
      const Other = styled.span`
        color: green;
      `;
      const { Base, Ext } = twoLevels();

      return (
        <main>
          <Ext as={Other} data-probe="ext" />
          <Other data-probe="other" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'as-styled-component',
    tree: () => {
      const { Base, Ext } = twoLevels();
      const Other = styled.span`
        color: green;
      `;

      return (
        <main>
          <Ext as={Other} data-probe="ext" />
          <Other data-probe="other" />
          <Base data-probe="base" />
        </main>
      );
    },
  },
  {
    name: 'wrapped-variants-of-one-base',
    tree: () => {
      const Base = styled.div<{ $v?: string | undefined }>`
        color: ${p => p.$v || 'blue'};
      `;
      const Ext = styled(Base)`
        padding-top: 1px;
      `;
      const Inner = (props: { className?: string | undefined }) => (
        <Ext $v="red" className={props.className} data-probe="inner" />
      );
      const Middle = (props: { className?: string | undefined }) => (
        <Ext $v="green" as={Inner} className={props.className} />
      );

      return (
        <main>
          <Ext $v="red" as={Middle} />
        </main>
      );
    },
  },
];
