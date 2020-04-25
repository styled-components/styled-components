import React, { createContext, createElement, Component } from 'react';
import hoist from 'hoist-non-react-statics';
import { Dimensions } from 'react-native';
import merge from '../utils/mixinDeep';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import generateDisplayName from '../utils/generateDisplayName';
import isFunction from '../utils/isFunction';
import isTag from '../utils/isTag';
import isStyledComponent from '../utils/isStyledComponent';
import { ThemeConsumer } from './ThemeProvider';

import type { Theme } from './ThemeProvider';
import type { Attrs, RuleSet, Target } from '../types';

// NOTE: no hooks available for react-native yet;
// if the user makes use of ThemeProvider or StyleSheetManager things will break.

const FontSizeContext = createContext(16)

// Validator defaults to true if not in HTML/DOM env
const validAttr = () => true;

/** HOC that will apply the screen size to the styles defined with vmin, vmax, vw, vh units */
const withScreenSize = Comp => ({vstyles = {}, generatedStyles = {}, ...props}) => {
  const [ size, setSize ] = React.useState(Dimensions.get('window'))
  const sizeListener = React.useCallback(() => setSize(Dimensions.get('window')), [])
  React.useEffect(() => {
    Dimensions.addEventListener('change', sizeListener)
    return () => Dimensions.removeEventListener('change', sizeListener)
  }, [])
  const { vmin = [], vmax = [], vw = [], vh = [] } = vstyles
  const styles = {...generatedStyles}
  const { width, height } = size
  vmin.forEach(key => styles[key]*=Math.min(width, height)/100)
  vmax.forEach(key => styles[key]*=Math.max(width, height)/100)
  vw.forEach(key => styles[key]*=width/100)
  vh.forEach(key => styles[key]*=height/100)
  return <Comp generatedStyles={styles} {...props} />
}

/** HOC that will apply the font size to the styles defined with em units */
const withFontSize = Comp => ({ generatedStyles = {}, emStyles = [], ...props }) => {
  return (
    <FontSizeContext.Consumer>
      {fontSize => {
        const styles = {...generatedStyles}
        emStyles.forEach(key => styles[key]*=fontSize)
        return <Comp generatedStyles={styles} {...props} />
      }}
    </FontSizeContext.Consumer>
  )
}

const withFontSizeUpdate = Comp => ({ generatedStyles = {}, fontSizeInEm = false, ...props}) => {
  // If the font size is expressed with em units, we need to read the current font size value
  return fontSizeInEm ? (
    <FontSizeContext.Consumer>
      {fontSizeValue => (
        <FontSizeContext.Provider value={generatedStyles.fontSize * fontSizeValue}>
          {/* We set the font size to 1 as it is relative to the value that we just took into account. */}
          <Comp generatedStyles={{...generatedStyles, fontSize: 1}} {...props} />
        </FontSizeContext.Provider>
      )}
    </FontSizeContext.Consumer>
  ) : (
    <FontSizeContext.Provider value={generatedStyles.fontSize}>
      <Comp generatedStyles={generatedStyles} {...props} />
    </FontSizeContext.Provider>
  )
}

const StyledComponent = ({ attrs, forwardedComponent, forwardedRef, forwardedAs, generatedStyles, style = [], elementToBeRendered, ...props }) => {
  const { shouldForwardProp } = forwardedComponent
  const isTargetTag = isTag(elementToBeRendered);
  const computedProps = attrs !== props ? { ...props, ...attrs } : props;
  const propFilterFn = shouldForwardProp || (isTargetTag && validAttr);
  const propsForElement = {};

  for (const key in computedProps) {
    if (key[0] === '$' || key === 'as') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = props[key];
    } else if (!propFilterFn || propFilterFn(key, validAttr)) {
      // Don't pass through filtered tags through to native elements
      propsForElement[key] = computedProps[key];
    }
  }

  propsForElement.style = [generatedStyles].concat(style);

  if (forwardedRef) propsForElement.ref = forwardedRef;
  if (forwardedAs) propsForElement.as = forwardedAs;

  return createElement(elementToBeRendered, propsForElement)
}

class StyledNativeComponent extends Component<*, *> {
  root: ?Object;

  attrs = {};

  emStyles: String[] = [];

  vhStyles: String[] = [];

  vwStyles: String[] = [];

  remStyles: String[] = [];

  vmaxStyles: String[] = [];

  vminStyles: String[] = [];

  fontSizeInEm: boolean = false;

  render() {
    return (
      <ThemeConsumer>
        {(theme?: Theme) => {
          const {
            $as: transientAsProp,
            as: renderAs,
            forwardedComponent,
            ...props
          } = this.props;

          const { defaultProps, target } = forwardedComponent;
          const elementToBeRendered =
            this.attrs.$as || this.attrs.as || transientAsProp || renderAs || target;

          const generatedStyles = {...this.generateAndInjectStyles(
            determineTheme(this.props, theme, defaultProps) || EMPTY_OBJECT,
            this.props
          )};
          
          let FinalComponent = StyledComponent

          // Apply rem units if needed
          this.remStyles.forEach(key => generatedStyles[key]*=16)

          // Apply vmin, vmax, vw, vh units if needed
          const vstyles = (this.vminStyles.length || this.vmaxStyles.length || this.vwStyles.length || this.vhStyles.length)
            ? { vw: this.vwStyles, vh: this.vhStyles, vmin: this.vminStyles, vmax: this.vmaxStyles }
            : undefined
          if(vstyles) {
            FinalComponent = withScreenSize(FinalComponent)
          }

          // Apply em units
          if(this.emStyles.length) {
            FinalComponent = withFontSize(FinalComponent)
          }

          // Apply fontSize changes
          if(generatedStyles.fontSize) {
            FinalComponent = withFontSizeUpdate(FinalComponent)
          }

          return <FinalComponent vstyles={vstyles} forwardedComponent={forwardedComponent} emStyles={this.emStyles.length ? this.emStyles : undefined} fontSizeInEm={this.fontSizeInEm || undefined} elementToBeRendered={elementToBeRendered} {...props} attrs={this.attrs} generatedStyles={generatedStyles} />
        }}
      </ThemeConsumer>
    );
  }

  buildExecutionContext(theme: ?Object, props: Object, attrs: Attrs) {
    const context = { ...props, theme };

    if (!attrs.length) return context;

    this.attrs = {};

    attrs.forEach(attrDef => {
      let resolvedAttrDef = attrDef;
      let attr;
      let key;

      if (isFunction(resolvedAttrDef)) {
        resolvedAttrDef = resolvedAttrDef(context);
      }

      /* eslint-disable guard-for-in */
      for (key in resolvedAttrDef) {
        attr = resolvedAttrDef[key];
        this.attrs[key] = attr;
        context[key] = attr;
      }
      /* eslint-enable */
    });

    return context;
  }

  generateAndInjectStyles(theme: any, props: any) {
    const { inlineStyle } = props.forwardedComponent;

    const executionContext = this.buildExecutionContext(
      theme,
      props,
      props.forwardedComponent.attrs
    );
    // We need to be warned when special units are being detected within the style
    const specialUnits = ['em', 'rem', 'vw', 'vh', 'vmin', 'vmax']
    const unitsInformation = { fontSizeInEm: false }
    specialUnits.forEach(unit => unitsInformation[unit] = [])// initialize the special units lists

    const generatedStyle = inlineStyle.generateStyleObject(executionContext, unitsInformation);

    // Transfer back the units informations to the current component
    Object.keys(unitsInformation).forEach(key => this[`${key}Styles`] = unitsInformation[key])
    this.fontSizeInEm = unitsInformation.fontSizeInEm

    return generatedStyle
  }

  setNativeProps(nativeProps: Object) {
    if (this.root !== undefined) {
      // $FlowFixMe
      this.root.setNativeProps(nativeProps);
    } else if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        'setNativeProps was called on a Styled Component wrapping a stateless functional component.'
      );
    }
  }
}

export default (InlineStyle: Function) => {
  const createStyledNativeComponent = (target: Target, options: Object, rules: RuleSet) => {
    const {
      attrs = EMPTY_ARRAY,
      displayName = generateDisplayName(target),
      ParentComponent = StyledNativeComponent,
    } = options;

    const isClass = !isTag(target);
    const isTargetStyledComp = isStyledComponent(target);

    // $FlowFixMe
    const WrappedStyledNativeComponent = React.forwardRef((props, ref) => (
      <ParentComponent
        {...props}
        forwardedComponent={WrappedStyledNativeComponent}
        forwardedRef={ref}
      />
    ));

    const finalAttrs =
      // $FlowFixMe
      isTargetStyledComp && target.attrs
        ? Array.prototype.concat(target.attrs, attrs).filter(Boolean)
        : attrs;

    // eslint-disable-next-line prefer-destructuring
    let shouldForwardProp = options.shouldForwardProp;

    // $FlowFixMe
    if (isTargetStyledComp && target.shouldForwardProp) {
      if (shouldForwardProp) {
        // compose nested shouldForwardProp calls
        shouldForwardProp = (prop, filterFn) =>
          // $FlowFixMe
          target.shouldForwardProp(prop, filterFn) && options.shouldForwardProp(prop, filterFn);
      } else {
        // eslint-disable-next-line prefer-destructuring
        shouldForwardProp = target.shouldForwardProp;
      }
    }

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */

    // $FlowFixMe
    WrappedStyledNativeComponent.attrs = finalAttrs;

    WrappedStyledNativeComponent.displayName = displayName;

    // $FlowFixMe
    WrappedStyledNativeComponent.shouldForwardProp = shouldForwardProp;

    // $FlowFixMe
    WrappedStyledNativeComponent.inlineStyle = new InlineStyle(
      // $FlowFixMe
      isTargetStyledComp ? target.inlineStyle.rules.concat(rules) : rules
    );

    // $FlowFixMe
    WrappedStyledNativeComponent.styledComponentId = 'StyledNativeComponent';
    // $FlowFixMe
    WrappedStyledNativeComponent.target = isTargetStyledComp
      ? // $FlowFixMe
        target.target
      : target;
    // $FlowFixMe
    WrappedStyledNativeComponent.withComponent = function withComponent(tag: Target) {
      const { displayName: _, componentId: __, ...optionsToCopy } = options;
      const newOptions = {
        ...optionsToCopy,
        attrs: finalAttrs,
        ParentComponent,
      };

      return createStyledNativeComponent(tag, newOptions, rules);
    };

    // $FlowFixMe
    Object.defineProperty(WrappedStyledNativeComponent, 'defaultProps', {
      get() {
        return this._foldedDefaultProps;
      },

      set(obj) {
        // $FlowFixMe
        this._foldedDefaultProps = isTargetStyledComp ? merge({}, target.defaultProps, obj) : obj;
      },
    });

    if (isClass) {
      hoist(WrappedStyledNativeComponent, (target: any), {
        // all SC-specific things should not be hoisted
        attrs: true,
        displayName: true,
        shouldForwardProp: true,
        inlineStyle: true,
        styledComponentId: true,
        target: true,
        withComponent: true,
      });
    }

    return WrappedStyledNativeComponent;
  };

  return createStyledNativeComponent;
};
