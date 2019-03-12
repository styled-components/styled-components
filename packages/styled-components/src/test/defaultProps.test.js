import { expectCSSMatches, resetStyled } from './utils';

// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

let styled;

describe('defaultProps', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('inheritance', () => {
    const setupParent = () => {
      const colors = {
        primary: 'red',
        secondary: 'blue',
        tertiary: 'green',
      };
      const Parent = styled.h1`
        position: relative;
        color: ${props => colors[props.color]};
        background-color: ${props => colors[props.backgroundColor]};
        border-color: ${props => colors[props.borderColor]};
      `;
      return Parent;
    };

    it('should extends parents defaultProps', () => {
      const Parent = setupParent();
      Parent.defaultProps = {
        color: 'primary',
      };
      const Child = styled(Parent)``;
      Child.defaultProps = {
        backgroundColor: 'secondary',
      };
      const Grandson = styled(Child)``;
      Grandson.defaultProps = {
        borderColor: 'tertiary',
      };
      TestRenderer.create(<Parent />);
      TestRenderer.create(<Child />);
      TestRenderer.create(<Grandson />);
      expectCSSMatches(`
        .d{ position:relative; color:red; }
        .e{ position:relative; color:red; background-color:blue; }
        .f{ position:relative; color:red; background-color:blue; border-color: green; }
      `);
    });

    it('should extends parents default style', () => {
      const Parent = styled.div``;
      Parent.defaultProps = {
        style: { color: 'blue' },
      };

      const Child = styled(Parent)``;
      Child.defaultProps = {
        style: { background: 'red' },
      };

      expect(TestRenderer.create(<Parent />).toJSON().props.style).toEqual({
        color: 'blue',
      });
      expect(TestRenderer.create(<Child />).toJSON().props.style).toEqual({
        color: 'blue',
        background: 'red',
      });
    });

    it('should override default styles with styles', () => {
      const Comp = styled.div``;
      Comp.defaultProps = {
        style: { color: 'blue' },
      };

      expect(
        TestRenderer.create(<Comp style={{ border: 'none' }} />).toJSON().props.style
      ).toEqual({
        border: 'none',
      });
    });
  });
});
