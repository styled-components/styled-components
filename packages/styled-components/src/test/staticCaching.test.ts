import { resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('static style caching', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('non-production modes', () => {
    it('should mark styles without any functions as not static', () => {
      const TOP_AS_NUMBER = 10;
      const FONT_SIZE_NUMBER = 14;

      const Comp = styled.div`
        color: purple;
        font-size: ${FONT_SIZE_NUMBER}px
        position: absolute;
        top: ${TOP_AS_NUMBER}
      `;

      expect(Comp.componentStyle.isStatic).toEqual(false);
    });

    it('should mark styles with a nested styled component as not static', () => {
      const NestedComp = styled.div``;

      const Comp = styled.div`
        ${NestedComp} {
          color: purple;
        }
      `;

      expect(Comp.componentStyle.isStatic).toEqual(false);
    });

    it('should mark styles with a dynamic style as not not static', () => {
      const Comp = styled.div`
        color: ${props => props.color};
      `;

      expect(Comp.componentStyle.isStatic).toEqual(false);
    });

    it('should mark a static style wrapping a dynamic style as not static', () => {
      const Inner = styled.div`
        color: ${props => props.color};
      `;

      const Outer = styled(Inner)`
        padding: 5px;
      `;

      expect(Outer.componentStyle.isStatic).toEqual(false);
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should mark styles without any functions as static', () => {
      const TOP_AS_NUMBER = 10;
      const FONT_SIZE_NUMBER = 14;

      const Comp = styled.div`
        color: purple;
        font-size: ${FONT_SIZE_NUMBER}px
        position: absolute;
        top: ${TOP_AS_NUMBER}
      `;

      expect(Comp.componentStyle.isStatic).toEqual(true);
    });

    it('should mark styles with a nested styled component as static', () => {
      const NestedComp = styled.div``;

      const Comp = styled.div`
        ${NestedComp} {
          color: purple;
        }
      `;

      expect(Comp.componentStyle.isStatic).toEqual(true);
    });

    it('should mark styles with a dynamic style as not static', () => {
      const Comp = styled.div`
        color: ${props => props.color};
      `;

      expect(Comp.componentStyle.isStatic).toEqual(false);
    });

    it('should mark a static style wrapping a dynamic style as not static', () => {
      const Inner = styled.div`
        color: ${props => props.color};
      `;

      const Outer = styled(Inner)`
        padding: 5px;
      `;

      expect(Outer.componentStyle.isStatic).toEqual(false);
    });
  });
});
