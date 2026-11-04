import React, { createElement, Ref } from 'react';
import isPropValid from '../utils/isPropValid';

/** React.memo's `$$typeof` symbol; constructed in-place to skip the
 *  `React.memo()` call's allocation + the per-static property transition
 *  that mutating its result would force. Pre-shaping the wrapper as a
 *  single object literal keeps every styled component on a single hidden
 *  class. */
const REACT_MEMO_TYPE = Symbol.for('react.memo');
import { RSC_REDUNDANT_EMIT_WARN_THRESHOLD, SC_ATTR, SC_VERSION } from '../constants';
import { BACKSLASH, CR, DOUBLE_QUOTE, FF, LF, SINGLE_QUOTE, urlTokenEnd } from '../utils/charCodes';
import { IS_RSC } from '../utils/isRsc';
import type StyleSheet from '../sheet';
import type {
  AnyComponent,
  Attrs,
  BaseObject,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  Compiler,
  IStyledComponentFactory,
  IStyledStatics,
  OmitNever,
  RuleSet,
  StyledOptions,
  WebTarget,
} from '../types';
import { evaluateForFastPath, type FastPathFragment } from '../parser/compile';
import { getSource, Source } from '../parser/source';
import { themeValue } from '../utils/themePath';
import {
  applyPostAttrs,
  buildPostAttrsPlans,
  camelizeProp,
  findBaseDecl,
  hasPostAttrs as chainHasPostAttrs,
  isPostAttr,
  type PostAttrsPlan,
} from '../utils/postAttrs';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses, {
  LIMIT as TOO_MANY_CLASSES_LIMIT,
} from '../utils/createWarnTooManyClasses';
import { fifoSet } from '../utils/fifoMap';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import { joinRules, joinStrings, stripSplitter } from '../utils/joinStrings';
import {
  getRscRequestState,
  noteRscEmit,
  recallRscRules,
  type RscRequestState,
} from '../utils/rscCache';
import { warnOnce } from '../utils/warnOnce';
import WebStyle, { GeneratedStyle } from './WebStyle';
import { type IStyleSheetContext, useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

declare const __SERVER__: boolean;

const identifiers: { [key: string]: number } = {};

const subscribeNoop = (): (() => void) => () => {};
const getFalse = (): boolean => false;
const getTrue = (): boolean => true;

/**
 * Writes one render's generated CSS into the sheet from an insertion effect,
 * so a committed render's rules land before paint and a discarded render
 * writes nothing. Mounted only when a render still has unwritten rules.
 */
function StyleInjector({
  generated,
  sheet,
  webStyle,
}: {
  generated: GeneratedStyle;
  sheet: StyleSheet;
  webStyle: WebStyle;
}): null {
  if (__DEV__) {
    // getServerSnapshot runs under renderToString; getSnapshot under createRoot.
    // Distinguishes the jsdom-without-ServerStyleSheet footgun (buffered path,
    // insertion effects never fire) from a normal client mount, without the
    // false positives a post-render microtask probe would raise on discarded
    // concurrent renders.
    // biome-ignore lint/correctness/useHookAtTopLevel: __DEV__ is a build-time constant, so a given bundle always runs this hook or never does
    const isServerRender = React.useSyncExternalStore(subscribeNoop, getFalse, getTrue);
    if (isServerRender) {
      warnOnce(
        'buffered-ssr-without-sheet',
        'this tree is rendered with renderToString / renderToStaticMarkup without ServerStyleSheet, so its styles are missing from the output. Wrap the tree in ServerStyleSheet#collectStyles.'
      );
    }
  }
  React.useInsertionEffect(() => {
    webStyle.inject(sheet, generated);
  });
  return null;
}

/** True when `generated` carries rules or keyframes the sheet has not emitted. */
function generatedNeedsSheetWrite(generated: GeneratedStyle, sheet: StyleSheet): boolean {
  if (generated.keyframes.length > 0) {
    for (let i = 0; i < generated.keyframes.length; i++) {
      const kf = generated.keyframes[i];
      if (!sheet.hasNameForId(kf.id, kf.name)) return true;
    }
  }
  const levels = generated.levels;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (level.rules.length > 0 && !sheet.hasNameForId(level.componentId, level.name)) {
      return true;
    }
  }
  return false;
}

/**
 * Shared `toString` for styled components: returns `.styledComponentId` so
 * `${StyledFoo}` interpolation resolves to the class selector.
 */
function styledToString(this: { styledComponentId: string }): string {
  return '.' + this.styledComponentId;
}

/**
 * SC-specific statics are copied explicitly into the wrapper, so the
 * hoist pass must skip them or it would stomp the wrapper's own values.
 */
const HOIST_EXCLUDE = {
  attrs: true,
  webStyle: true,
  displayName: true,
  foldedComponentIds: true,
  postAttrsPlans: true,
  shouldForwardProp: true,
  styledComponentId: true,
  target: true,
} as const;

/** Test-only: clear the per-displayName counter so component IDs stay stable
 *  across tests. Not for production use. */
export const resetIdentifiers = (): void => {
  for (const k in identifiers) delete identifiers[k];
};

function generateId(
  displayName?: string | undefined,
  parentComponentId?: string | undefined
): string {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  identifiers[name] = (identifiers[name] || 0) + 1;

  const componentId =
    name +
    '-' +
    generateComponentId(
      // Isolate multiple styled-components runtimes on one page.
      SC_VERSION + name + identifiers[name]
    );

  return parentComponentId ? parentComponentId + '-' + componentId : componentId;
}

/**
 * RSC counterpart to `webStyle.flush`. Runs `generate()` to produce the
 * inheritance chain's compiled CSS without writing to the tag; registers
 * each new class name so repeat renders of the same component/props skip
 * compilation. Returns both the class name (for the element) and the
 * generated levels (consumed by the inline <style> emission).
 */
function rscFlush<T extends ExecutionContext>(
  webStyle: WebStyle,
  resolvedAttrs: T,
  styleSheet: StyleSheet,
  compiler: Compiler
): GeneratedStyle {
  const generated = webStyle.generate(resolvedAttrs, styleSheet, compiler);
  for (let i = 0; i < generated.levels.length; i++) {
    const level = generated.levels[i];
    if (level.isNew) styleSheet.registerName(level.componentId, level.name);
  }
  return generated;
}

/**
 * A level whose name another instance registered first arrives empty; its rules
 * come from the process-wide cache (docs/react.md "RSC style emission and
 * Suspense"), or are compiled again when the cache has evicted them.
 */
function rscLevelRules(
  webStyle: WebStyle,
  level: GeneratedStyle['levels'][number],
  context: ExecutionContext,
  ssc: IStyleSheetContext
): string[] {
  if (level.rules.length > 0) return level.rules;

  for (let w: WebStyle | null | undefined = webStyle; w; w = w.baseStyle) {
    if (w.componentId !== level.componentId) continue;

    const recalled = recallRscRules(w, level.name);
    if (recalled !== undefined) return recalled;

    const regenerated = webStyle.generate(context, ssc.styleSheet, ssc.compiler, {
      recompile: true,
    }).levels;
    for (let i = 0; i < regenerated.length; i++) {
      if (regenerated[i].componentId === level.componentId && regenerated[i].name === level.name) {
        return regenerated[i].rules;
      }
    }
    break;
  }
  return level.rules;
}

/**
 * The CSS one RSC instance emits: referenced keyframes, then each level of its
 * chain with every base level wrapped in :where() for zero specificity, so any
 * extension overrides it without !important.
 */
function buildRscStyleCss(
  webStyle: WebStyle,
  generatedStyle: GeneratedStyle,
  context: ExecutionContext,
  ssc: IStyleSheetContext
): string {
  const levels = generatedStyle.levels;
  const lastIdx = levels.length - 1;
  let css = '';

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const rules = rscLevelRules(webStyle, level, context, ssc);
    if (rules.length === 0) continue;

    let levelCss = joinRules(rules);
    if (i !== lastIdx) levelCss = wrapLevelInWhere(levelCss, level.name);
    css += levelCss;
  }

  let kfCss = '';
  const kfList = generatedStyle.keyframes;
  outer: for (let i = 0; i < kfList.length; i++) {
    for (let j = 0; j < i; j++) {
      if (kfList[j].name === kfList[i].name) continue outer;
    }
    kfCss += joinRules(kfList[i].rules);
  }

  return stripSplitter(kfCss + css);
}

function resolveContext<Props extends BaseObject>(
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[],
  props: ExecutionProps & Props,
  theme: DefaultTheme | undefined
): React.HTMLAttributes<Element> & ExecutionContext & Props {
  const context: React.HTMLAttributes<Element> & ExecutionContext & Props = {
    ...props,
    // unset, add `props.className` back at the end so props always "wins"
    className: undefined,
    theme,
  } as React.HTMLAttributes<Element> & ExecutionContext & Props;

  const needsCopy = attrs.length > 1;
  for (let i = 0; i < attrs.length; i++) {
    const attrDef = attrs[i];
    // Arity-2 attrs are post-compile (need access to resolved decls); they
    // run later in `applyPostAttrsWeb`, not here.
    if (isPostAttr(attrDef)) continue;
    const resolvedAttrDef = isFunction(attrDef)
      ? (attrDef as unknown as (p: typeof context) => ExecutionProps & Partial<Props>)(
          needsCopy ? { ...context } : context
        )
      : attrDef;

    mergeAttrDict(context, resolvedAttrDef as Dict<unknown>);
  }

  if ('className' in props && typeof props.className === 'string') {
    context.className = joinStrings(context.className, props.className);
  }

  return context;
}

let seenUnknownProps: Set<string> | undefined;

/**
 * Cache RegExp objects for :where() wrapping to avoid recompilation per
 * render. Bounded with FIFO eviction at the same threshold the
 * warn-too-many-classes machinery uses; without the cap, RSC SSR with
 * unbounded class-name variation would leak a regex per unique class.
 */
const whereRegExpCache = new Map<string, RegExp>();
function getWhereRegExp(name: string): RegExp {
  let re = whereRegExpCache.get(name);
  if (!re) {
    re = new RegExp('\\.' + name + '(?![a-zA-Z0-9_-])', 'g');
    fifoSet(whereRegExpCache, name, re, TOO_MANY_CLASSES_LIMIT);
  }
  return re;
}

/**
 * A url token ends at its first `)`, so the `(` of `:where(` inside one would end it there and
 * turn the text after into real rules. Only the text around url tokens is wrapped. A `(` inside a
 * string is not a url token, so strings are skipped whole.
 */
function wrapLevelInWhere(levelCss: string, name: string): string {
  const re = getWhereRegExp(name);
  const wrapped = ':where(.' + name + ')';
  const len = levelCss.length;
  let out = '';
  let from = 0;
  let escape = -1;
  let nextEscape = levelCss.indexOf('\\');
  /** Everything before this index is read: outside a string, or skipped as one. */
  let read = 0;
  for (let open = levelCss.indexOf('('); open !== -1; open = levelCss.indexOf('(', open + 1)) {
    while (nextEscape !== -1 && nextEscape < open) {
      escape = nextEscape;
      nextEscape = levelCss.indexOf('\\', escape + 1);
    }
    if (escape === open - 1) continue;

    while (read < open) {
      const code = levelCss.charCodeAt(read++);
      if (code === BACKSLASH) {
        read++;
      } else if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
        // A raw newline ends a string.
        while (read < len) {
          const inner = levelCss.charCodeAt(read);
          if (inner === code) {
            read++;
            break;
          }
          if (inner === LF || inner === CR || inner === FF) break;
          read += inner === BACKSLASH ? 2 : 1;
        }
      }
    }
    if (read > open) continue;

    const urlEnd = urlTokenEnd(levelCss, open, len, escape);
    if (urlEnd !== -1) {
      out += levelCss.substring(from, open).replace(re, wrapped) + levelCss.substring(open, urlEnd);
      from = open = read = urlEnd;
    }
  }
  return out + levelCss.substring(from).replace(re, wrapped);
}

/**
 * Merge an attrs-resolved dict into the execution context: `className` joins,
 * `style` shallow-merges, and every other key overwrites, so attrs always wins
 * (docs/attrs.md). An `undefined` value deletes the key when context held a
 * defined value; context already holding the caller's explicit `undefined`
 * (an identity-spread attrs function echoes it back) keeps it, so a component
 * target still receives it. A key context never held stays absent. Only a
 * render where attrs clears a key pays the `delete` slow-object cost.
 */
function mergeAttrDict<Props extends BaseObject>(
  context: React.HTMLAttributes<Element> & ExecutionContext & Props,
  resolved: Dict<unknown>
): void {
  const target = context as unknown as Dict<unknown>;

  for (const key in resolved) {
    if (key === 'className') {
      context.className = joinStrings(context.className, resolved[key] as string);
    } else if (key === 'style') {
      context.style = {
        ...context.style,
        ...(resolved[key] as React.CSSProperties),
      };
    } else if (resolved[key] !== undefined) {
      target[key] = resolved[key];
    } else if (target[key] !== undefined) {
      delete target[key];
    }
  }
}

/** Evaluated interpolations of one chain level, or `null` when unavailable. */
type FilledOf = (style: WebStyle, source: Source) => ReadonlyArray<string> | null;

const noFilled: FilledOf = () => null;

/**
 * Resolve a declaration key across the extension chain, innermost template
 * first: each level emits its own class after its base's, so the innermost
 * match is the cascade winner. Returns {@link findBaseDecl}'s tri-state.
 */
function findChainDecl(
  style: WebStyle | null | undefined,
  prop: string,
  filledOf: FilledOf
): string | undefined | null {
  for (let w = style; w; w = w.baseStyle) {
    const source = getSource(w.rules);
    if (source === undefined) continue;
    const v = findBaseDecl(source.ast, prop, filledOf(w, source));
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Post-compile attrs phase for the web runtime. Pop calls collect keys into
 * `popOverrides` so the caller applies inline-style overrides (CSS `unset`)
 * to the rendered element; best-effort removal because the emitted class is
 * hash-derived from the full decl set. Native removes the decl from the
 * compiled style object instead.
 */
function applyPostAttrsWeb<Props extends BaseObject>(
  context: React.HTMLAttributes<Element> & ExecutionContext & Props,
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[],
  plans: ReadonlyArray<PostAttrsPlan | null>,
  webStyle: WebStyle
): Dict<string> | null {
  let popOverrides: Dict<string> | null = null;
  // Per-render evaluated interpolations by level, built on the first read
  // of a templated declaration.
  let filledByLevel: Map<WebStyle, ReadonlyArray<string> | null> | null = null;
  const filledOf: FilledOf = (style, source) => {
    if (filledByLevel === null) filledByLevel = new Map();
    let filled = filledByLevel.get(style);
    if (filled === undefined) {
      // Push-fill to keep these PACKED_ELEMENTS; `new Array(n)` stays
      // HOLEY_ELEMENTS and infects the IC for `evaluateForFastPath`.
      const n = source.interpolations.length;
      const buf: string[] = [];
      const fragBuf: (FastPathFragment | null)[] = [];
      for (let i = 0; i < n; i++) {
        buf.push('');
        fragBuf.push(null);
      }
      filled = evaluateForFastPath(source, context, buf, undefined, fragBuf);
      filledByLevel.set(style, filled);
    }
    return filled;
  };
  applyPostAttrs(context, attrs, plans, {
    lookup: keyOrPath => {
      if (keyOrPath.indexOf('.') !== -1) return themeValue(context.theme, keyOrPath);
      const v = findChainDecl(webStyle, keyOrPath, filledOf);
      return v === null ? undefined : v;
    },
    merge: mergeAttrDict,
    onPop: key => {
      if (popOverrides === null) popOverrides = {};
      popOverrides[camelizeProp(key)] = 'unset';
    },
  });
  return popOverrides;
}

function buildPropsForElement<Context extends ExecutionContext>(
  context: Context,
  elementToBeCreated: WebTarget,
  theme: DefaultTheme | undefined,
  shouldForwardProp: ((prop: string, el: WebTarget) => boolean) | undefined,
  isDOMTarget: boolean
): Dict<unknown> {
  const out: Dict<unknown> = {};

  for (const key in context) {
    // Attrs delete the keys they clear, so an `undefined` left here is the caller's
    // explicit one: it takes the normal filters to a component target so that
    // component can fall back to its own default, and never reaches a DOM tag.
    // `className` is assigned after the loop, so it must not claim key order here.
    if (
      context[key] === undefined &&
      (isDOMTarget || key === 'className' || key === 'forwardedAs')
    ) {
      continue;
    }
    if (
      key[0] === '$' ||
      key === 'as' ||
      key === 'ref' || // React 19 ref-as-prop: the ref is re-attached explicitly below.
      (key === 'theme' && context.theme === theme)
    ) {
      continue;
    }
    if (key === 'forwardedAs') {
      out.as = context.forwardedAs;
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      out[key] = context[key];

      if (
        __DEV__ &&
        !shouldForwardProp &&
        !isPropValid(key) &&
        !(seenUnknownProps || (seenUnknownProps = new Set())).has(key) &&
        isTag(elementToBeCreated) &&
        !elementToBeCreated.includes('-')
      ) {
        seenUnknownProps.add(key);
        warnOnce(
          'unknown-prop',
          `unknown prop "${key}" is being sent to the DOM, which will likely trigger a React console error. Use transient props (\`$\` prefix) to keep the prop in the component, or set a \`<StyleSheetManager shouldForwardProp={...}>\` filter.`,
          key
        );
      }
    }
  }

  return out;
}

function useImpl<Props extends BaseObject>(
  forwardedComponent: IStyledComponent<'web', Props>,
  props: ExecutionProps & Props,
  forwardedRef: Ref<Element> | undefined
) {
  const {
    attrs: componentAttrs,
    webStyle,
    foldedComponentIds,
    styledComponentId,
    target,
  } = forwardedComponent;

  // biome-ignore lint/correctness/useHookAtTopLevel: IS_RSC is a load-time constant, so this branch is fixed for the whole bundle rather than varying per render
  const contextTheme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
  const ssc = useStyleSheetContext();
  const shouldForwardProp = forwardedComponent.shouldForwardProp || ssc.shouldForwardProp;

  // Skipped in server components, where it does nothing and Flight can render with no hook dispatcher (items of an async iterable).
  if (__DEV__ && !IS_RSC) {
    // biome-ignore lint/correctness/useHookAtTopLevel: __DEV__ and IS_RSC are build and load-time constants, and useDebugValue allocates no hook slot in any case
    React.useDebugValue(styledComponentId);
  }

  const theme = determineTheme(props, contextTheme) || (IS_RSC ? undefined : EMPTY_OBJECT);

  let generatedClassName: string;
  let generatedStyle: GeneratedStyle | null = null;
  let rscState: RscRequestState | null = null;
  let popOverrides: Dict<string> | null = null;
  const postAttrsPlans = forwardedComponent.postAttrsPlans;
  /** The CSSOM write to schedule in the insertion effect (buffered path only). */
  let pendingInject: GeneratedStyle | null = null;

  // Interpolations and arity-2 attrs are the component's own render-body user
  // code: they run every render so a hook called inside one keeps a stable hook
  // count, and a value read inside one (a context, ref, or module state outside
  // props and theme) always reflects its current state (#5788). Cross-render
  // bailout on equal props is the wrapping React.memo's job, not this path's;
  // `webStyle`'s content-addressed caches keep a repeat render that yields the
  // same CSS cheap.
  const context = resolveContext<Props>(componentAttrs, props, theme);
  if (postAttrsPlans !== undefined) {
    popOverrides = applyPostAttrsWeb<Props>(context, componentAttrs, postAttrsPlans, webStyle);
  }
  if (IS_RSC) {
    rscState = getRscRequestState ? getRscRequestState() : null;
    generatedStyle = rscFlush(webStyle, context, ssc.styleSheet, ssc.compiler);
    generatedClassName = generatedStyle.className;
  } else if (__SERVER__ || ssc.styleSheet.server) {
    // ServerStyleSheet SSR (in either a server or a browser build) never runs
    // insertion effects, so the CSSOM write must stay synchronous.
    generatedClassName = webStyle.flush(context, ssc.styleSheet, ssc.compiler);
  } else {
    // Browser path: generate during render and inject via StyleInjector.
    const generated = webStyle.generate(context, ssc.styleSheet, ssc.compiler);
    generatedClassName = generated.className;
    pendingInject = generatedNeedsSheetWrite(generated, ssc.styleSheet) ? generated : null;
  }

  if (__DEV__ && !IS_RSC) {
    // biome-ignore lint/correctness/useHookAtTopLevel: __DEV__ and IS_RSC are build and load-time constants, and useDebugValue allocates no hook slot in any case
    React.useDebugValue(generatedClassName);
  }

  if (__DEV__ && forwardedComponent.warnTooManyClasses) {
    forwardedComponent.warnTooManyClasses(generatedClassName);
  }

  const elementToBeCreated: WebTarget = context.as || target;
  const isDOMTarget = isTag(elementToBeCreated);
  const elementProps = buildPropsForElement(
    context,
    elementToBeCreated,
    theme,
    shouldForwardProp,
    isDOMTarget
  );

  // Apply popped declarations as inline-style overrides; user-passed
  // `style` keys win so explicit overrides aren't clobbered by the reset.
  if (popOverrides !== null) {
    elementProps.style = { ...popOverrides, ...(elementProps.style as object | undefined) };
  }

  let classString = joinStrings(foldedComponentIds, styledComponentId);
  if (generatedClassName) {
    classString += ' ' + generatedClassName;
  }
  if (context.className) {
    classString += ' ' + context.className;
  }

  elementProps[isDOMTarget && elementToBeCreated.includes('-') ? 'class' : 'className'] =
    classString;

  if (forwardedRef) {
    elementProps.ref = forwardedRef;
  }

  // Client path: stable Fragment shape so the host element keeps identity
  // when the injector mounts or unmounts across commits. Only instances that
  // still need a CSSOM write mount StyleInjector.
  const injectsAfterCommit = !__SERVER__ && !IS_RSC && !ssc.styleSheet.server;

  if (injectsAfterCommit) {
    elementProps.key = 'sc-el';
  }

  const element = createElement(elementToBeCreated, elementProps);

  if (injectsAfterCommit) {
    return createElement(
      React.Fragment,
      null,
      pendingInject
        ? createElement(StyleInjector, {
            key: 'sc-inject',
            generated: pendingInject,
            sheet: ssc.styleSheet,
            webStyle,
          })
        : null,
      element
    );
  }

  // RSC: one plain tag per instance, shared element objects; see docs/react.md "RSC style emission and Suspense".
  if (IS_RSC && generatedStyle) {
    const sharedElements = rscState !== null ? rscState.styleElements : null;
    const sharedKey = webStyle.componentId + ' ' + generatedClassName;
    let styleElement = sharedElements ? sharedElements.get(sharedKey) : undefined;

    if (styleElement === undefined) {
      const combined = buildRscStyleCss(webStyle, generatedStyle, context, ssc);
      if (combined) {
        styleElement = React.createElement('style', {
          [SC_ATTR]: '',
          key: 'sc-' + webStyle.componentId,
          children: combined,
        });
        if (sharedElements) sharedElements.set(sharedKey, styleElement);
      }
    }

    if (styleElement !== undefined) {
      if (__DEV__ && rscState !== null) {
        const emitted = noteRscEmit(rscState, webStyle.componentId);
        if (emitted === RSC_REDUNDANT_EMIT_WARN_THRESHOLD) {
          warnOnce(
            'rsc-redundant-emit',
            `${emitted} instances of the styled component ${forwardedComponent.displayName || styledComponentId} were rendered on one server-rendered page, so its styles repeat that many times in the HTML. This is fine at normal sizes. To trim a very large list, style the items from one styled parent element (for example a \`& > li\` selector) and render plain children, so the whole list emits a single tag.`,
            webStyle.componentId
          );
        }
      }

      return React.createElement(React.Fragment, null, styleElement, element);
    }
  }

  return element;
}

function createStyledComponent<
  Target extends WebTarget,
  OuterProps extends BaseObject,
  Statics extends BaseObject = BaseObject,
>(
  target: Target,
  options: StyledOptions<'web', OuterProps>,
  rules: RuleSet<OuterProps>
): ReturnType<IStyledComponentFactory<'web', Target, OuterProps, Statics>> {
  const isTargetStyledComp = isStyledComponent(target);
  const styledComponentTarget = target as IStyledComponent<'web', OuterProps>;
  const targetIsTag = isTag(target);
  const isCompositeComponent = !targetIsTag;

  const {
    attrs = EMPTY_ARRAY,
    componentId = generateId(options.displayName, options.parentComponentId),
    displayName = targetIsTag
      ? `styled.${target as string}`
      : `Styled(${getComponentName(target as AnyComponent)})`,
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? escape(options.displayName) + '-' + options.componentId
      : options.componentId || componentId;

  const finalAttrs =
    isTargetStyledComp && styledComponentTarget.attrs
      ? styledComponentTarget.attrs.concat(attrs as unknown as Attrs<OuterProps>[]).filter(Boolean)
      : (attrs as Attrs<OuterProps>[]);

  let { shouldForwardProp } = options;

  if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
    const shouldForwardPropFn = styledComponentTarget.shouldForwardProp;

    if (options.shouldForwardProp) {
      const passedShouldForwardPropFn = options.shouldForwardProp;

      shouldForwardProp = (prop, elementToBeCreated) =>
        shouldForwardPropFn(prop, elementToBeCreated) &&
        passedShouldForwardPropFn(prop, elementToBeCreated);
    } else {
      shouldForwardProp = shouldForwardPropFn;
    }
  }

  const webStyle = new WebStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? styledComponentTarget.webStyle : undefined
  );

  /**
   * React 19 ref-as-prop; no `React.forwardRef` wrapper. We shape the
   * wrapper as a `React.memo` object directly (`{$$typeof, type, compare,
   * …}`) rather than calling `React.memo(...)` and then mutating ten
   * statics onto the result. The single object literal lets V8 use one
   * hidden class for every styled component instead of walking a fresh
   * transition chain per construction. `React.memo` lets the parent's
   * re-render skip this component when props are shallow-equal, which is
   * the sound place to bail out: only the caller knows the full set of
   * inputs its interpolations depend on. `webStyle`'s content-addressed
   * caches keep the per-render work cheap when memo does re-run.
   */
  const RenderInner: {
    (props: ExecutionProps & OuterProps & { ref?: Ref<Element> }): React.JSX.Element;
    displayName?: string;
  } = props => useImpl<OuterProps>(WrappedStyledComponent, props, props.ref);
  RenderInner.displayName = displayName;

  const foldedComponentIds = isTargetStyledComp
    ? joinStrings(styledComponentTarget.foldedComponentIds, styledComponentTarget.styledComponentId)
    : '';
  const resolvedTarget: WebTarget = isTargetStyledComp ? styledComponentTarget.target : target;

  let WrappedStyledComponent = {
    $$typeof: REACT_MEMO_TYPE,
    type: RenderInner,
    compare: null,
    // styled-component statics laid out in a fixed order. Same shape for
    // every component → one hidden class for the whole population.
    attrs: finalAttrs,
    webStyle,
    displayName,
    shouldForwardProp,
    // Static plan where possible; null slots fall back to runtime invocation.
    // `undefined` when the chain has no arity-2 attrs.
    postAttrsPlans: chainHasPostAttrs(finalAttrs)
      ? buildPostAttrsPlans(finalAttrs, prop => findChainDecl(webStyle, prop, noFilled))
      : undefined,
    foldedComponentIds,
    target: resolvedTarget,
    styledComponentId,
    // Shared toString: reads `this.styledComponentId` so a single function
    // serves every styled component instead of allocating a per-component
    // closure. ${StyledFoo} interpolation calls toString() with the styled
    // component as `this`, so the lookup binds correctly.
    toString: styledToString,
  } as unknown as IStyledComponent<'web', OuterProps> & Statics;

  if (__DEV__) {
    checkDynamicCreation(displayName, styledComponentId);

    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  }

  if (isCompositeComponent) {
    const compositeComponentTarget = target as AnyComponent;

    hoist<typeof WrappedStyledComponent, typeof compositeComponentTarget>(
      WrappedStyledComponent,
      compositeComponentTarget,
      HOIST_EXCLUDE as { [key in keyof OmitNever<IStyledStatics<'web', OuterProps>>]: true }
    );
  }

  return WrappedStyledComponent;
}

export default createStyledComponent;
