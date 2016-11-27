// <reference path="../react/react.d.ts" />

declare module "styled-components" {
    import * as React from "react";
    import { StatelessComponent } from "react";

    interface StyledFunction<T, P> {
      (strs: TemplateStringsArray, ...fns: Array<(props: P) => string>): T;
    }

    interface StyledInterface {
        <T extends React.ReactType, P extends React.ReactPropTypes>(component: T): StyledFunction<T, P>;

        a: StyledFunction<React.HTMLFactory<HTMLAnchorElement>, React.HTMLAttributes<HTMLAnchorElement>>;
        abbr: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        address: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        area: StyledFunction<React.HTMLFactory<HTMLAreaElement>, React.HTMLAttributes<HTMLAreaElement>>;
        article: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        aside: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        audio: StyledFunction<React.HTMLFactory<HTMLAudioElement>, React.HTMLAttributes<HTMLAudioElement>>;
        b: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        base: StyledFunction<React.HTMLFactory<HTMLBaseElement>, React.HTMLAttributes<HTMLBaseElement>>;
        bdi: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        bdo: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        big: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        blockquote: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        body: StyledFunction<React.HTMLFactory<HTMLBodyElement>, React.HTMLAttributes<HTMLBodyElement>>;
        br: StyledFunction<React.HTMLFactory<HTMLBRElement>, React.HTMLAttributes<HTMLBRElement>>;
        button: StyledFunction<React.HTMLFactory<HTMLButtonElement>, React.HTMLAttributes<HTMLButtonElement>>;
        canvas: StyledFunction<React.HTMLFactory<HTMLCanvasElement>, React.HTMLAttributes<HTMLCanvasElement>>;
        caption: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        cite: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        code: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        col: StyledFunction<React.HTMLFactory<HTMLTableColElement>, React.HTMLAttributes<HTMLTableColElement>>;
        colgroup: StyledFunction<React.HTMLFactory<HTMLTableColElement>, React.HTMLAttributes<HTMLTableColElement>>;
        data: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        datalist: StyledFunction<React.HTMLFactory<HTMLDataListElement>, React.HTMLAttributes<HTMLDataListElement>>;
        dd: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        del: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        details: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        dfn: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        dialog: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        div: StyledFunction<React.HTMLFactory<HTMLDivElement>, React.HTMLAttributes<HTMLDivElement>>;
        dl: StyledFunction<React.HTMLFactory<HTMLDListElement>, React.HTMLAttributes<HTMLDListElement>>;
        dt: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        em: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        embed: StyledFunction<React.HTMLFactory<HTMLEmbedElement>, React.HTMLAttributes<HTMLEmbedElement>>;
        fieldset: StyledFunction<React.HTMLFactory<HTMLFieldSetElement>, React.HTMLAttributes<HTMLFieldSetElement>>;
        figcaption: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        figure: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        footer: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        form: StyledFunction<React.HTMLFactory<HTMLFormElement>, React.HTMLAttributes<HTMLFormElement>>;
        h1: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, React.HTMLAttributes<HTMLHeadingElement>>;
        h2: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, React.HTMLAttributes<HTMLHeadingElement>>;
        h3: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, React.HTMLAttributes<HTMLHeadingElement>>;
        h4: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, React.HTMLAttributes<HTMLHeadingElement>>;
        h5: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, React.HTMLAttributes<HTMLHeadingElement>>;
        h6: StyledFunction<React.HTMLFactory<HTMLHeadingElement>, React.HTMLAttributes<HTMLHeadingElement>>;
        head: StyledFunction<React.HTMLFactory<HTMLHeadElement>, React.HTMLAttributes<HTMLHeadElement>>;
        header: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        hgroup: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        hr: StyledFunction<React.HTMLFactory<HTMLHRElement>, React.HTMLAttributes<HTMLHRElement>>;
        html: StyledFunction<React.HTMLFactory<HTMLHtmlElement>, React.HTMLAttributes<HTMLHtmlElement>>;
        i: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        iframe: StyledFunction<React.HTMLFactory<HTMLIFrameElement>, React.HTMLAttributes<HTMLIFrameElement>>;
        img: StyledFunction<React.HTMLFactory<HTMLImageElement>, React.HTMLAttributes<HTMLImageElement>>;
        input: StyledFunction<React.HTMLFactory<HTMLInputElement>, React.HTMLAttributes<HTMLInputElement>>;
        ins: StyledFunction<React.HTMLFactory<HTMLModElement>, React.HTMLAttributes<HTMLModElement>>;
        kbd: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        keygen: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        label: StyledFunction<React.HTMLFactory<HTMLLabelElement>, React.HTMLAttributes<HTMLLabelElement>>;
        legend: StyledFunction<React.HTMLFactory<HTMLLegendElement>, React.HTMLAttributes<HTMLLegendElement>>;
        li: StyledFunction<React.HTMLFactory<HTMLLIElement>, React.HTMLAttributes<HTMLLIElement>>;
        link: StyledFunction<React.HTMLFactory<HTMLLinkElement>, React.HTMLAttributes<HTMLLinkElement>>;
        main: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        map: StyledFunction<React.HTMLFactory<HTMLMapElement>, React.HTMLAttributes<HTMLMapElement>>;
        mark: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        menu: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        menuitem: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        meta: StyledFunction<React.HTMLFactory<HTMLMetaElement>, React.HTMLAttributes<HTMLMetaElement>>;
        meter: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        nav: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        noscript: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        object: StyledFunction<React.HTMLFactory<HTMLObjectElement>, React.HTMLAttributes<HTMLObjectElement>>;
        ol: StyledFunction<React.HTMLFactory<HTMLOListElement>, React.HTMLAttributes<HTMLOListElement>>;
        optgroup: StyledFunction<React.HTMLFactory<HTMLOptGroupElement>, React.HTMLAttributes<HTMLOptGroupElement>>;
        option: StyledFunction<React.HTMLFactory<HTMLOptionElement>, React.HTMLAttributes<HTMLOptionElement>>;
        output: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        p: StyledFunction<React.HTMLFactory<HTMLParagraphElement>, React.HTMLAttributes<HTMLParagraphElement>>;
        param: StyledFunction<React.HTMLFactory<HTMLParamElement>, React.HTMLAttributes<HTMLParamElement>>;
        picture: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        pre: StyledFunction<React.HTMLFactory<HTMLPreElement>, React.HTMLAttributes<HTMLPreElement>>;
        progress: StyledFunction<React.HTMLFactory<HTMLProgressElement>, React.HTMLAttributes<HTMLProgressElement>>;
        q: StyledFunction<React.HTMLFactory<HTMLQuoteElement>, React.HTMLAttributes<HTMLQuoteElement>>;
        rp: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        rt: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        ruby: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        s: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        samp: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        script: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        section: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        select: StyledFunction<React.HTMLFactory<HTMLSelectElement>, React.HTMLAttributes<HTMLSelectElement>>;
        small: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        source: StyledFunction<React.HTMLFactory<HTMLSourceElement>, React.HTMLAttributes<HTMLSourceElement>>;
        span: StyledFunction<React.HTMLFactory<HTMLSpanElement>, React.HTMLAttributes<HTMLSpanElement>>;
        strong: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        style: StyledFunction<React.HTMLFactory<HTMLStyleElement>, React.HTMLAttributes<HTMLStyleElement>>;
        sub: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        summary: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        sup: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        table: StyledFunction<React.HTMLFactory<HTMLTableElement>, React.HTMLAttributes<HTMLTableElement>>;
        tbody: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>, React.HTMLAttributes<HTMLTableSectionElement>>;
        td: StyledFunction<React.HTMLFactory<HTMLTableDataCellElement>, React.HTMLAttributes<HTMLTableDataCellElement>>;
        textarea: StyledFunction<React.HTMLFactory<HTMLTextAreaElement>, React.HTMLAttributes<HTMLTextAreaElement>>;
        tfoot: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>, React.HTMLAttributes<HTMLTableSectionElement>>;
        th: StyledFunction<React.HTMLFactory<HTMLTableHeaderCellElement>, React.HTMLAttributes<HTMLTableHeaderCellElement>>;
        thead: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>, React.HTMLAttributes<HTMLTableSectionElement>>;
        time: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        title: StyledFunction<React.HTMLFactory<HTMLTitleElement>, React.HTMLAttributes<HTMLTitleElement>>;
        tr: StyledFunction<React.HTMLFactory<HTMLTableRowElement>, React.HTMLAttributes<HTMLTableRowElement>>;
        track: StyledFunction<React.HTMLFactory<HTMLTrackElement>, React.HTMLAttributes<HTMLTrackElement>>;
        u: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        ul: StyledFunction<React.HTMLFactory<HTMLUListElement>, React.HTMLAttributes<HTMLUListElement>>;
        "var": StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;
        video: StyledFunction<React.HTMLFactory<HTMLVideoElement>, React.HTMLAttributes<HTMLVideoElement>>;
        wbr: StyledFunction<React.HTMLFactory<HTMLElement>, React.HTMLAttributes<HTMLElement>>;

        // SVG
        circle: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGCircleElement>>;
        clipPath: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGClipPathElement>>;
        defs: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGDefsElement>>;
        ellipse: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGEllipseElement>>;
        g: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGGElement>>;
        image: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGImageElement>>;
        line: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGLineElement>>;
        linearGradient: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGLinearGradientElement>>;
        mask: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGMaskElement>>;
        path: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPathElement>>;
        pattern: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPatternElement>>;
        polygon: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPolygonElement>>;
        polyline: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGPolylineElement>>;
        radialGradient: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGRadialGradientElement>>;
        rect: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGRect>>;
        stop: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGStopElement>>;
        svg: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGSVGElement>>;
        text: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGTextElement>>;
        tspan: StyledFunction<React.SVGFactory, React.SVGAttributes<SVGTSpanElement>>;
    }

    const styled: StyledInterface;

    export const css: StyledFunction<(string | Function)[], any>;
    export const keyframes: StyledFunction<string, any>;
    export const injectGlobal: StyledFunction<undefined, any>;

    interface ThemeProps {
      theme: Object;
    }

    export const ThemeProvider: StatelessComponent<ThemeProps>;

    export default styled;
}
