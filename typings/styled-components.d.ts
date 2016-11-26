// <reference path="../react/react.d.ts" />

declare module "styled-components" {
    import * as React from "react";
    import { StatelessComponent } from "react";

    interface StyledFunction<T> {
      (strs: TemplateStringsArray, ...fns: Array<(props: any) => string>): T;
    }

    interface StyledInterface {
        <T extends React.ReactType>(component: T): StyledFunction<T>;

        a: StyledFunction<React.HTMLFactory<HTMLAnchorElement>>;
        abbr: StyledFunction<React.HTMLFactory<HTMLElement>>;
        address: StyledFunction<React.HTMLFactory<HTMLElement>>;
        area: StyledFunction<React.HTMLFactory<HTMLAreaElement>>;
        article: StyledFunction<React.HTMLFactory<HTMLElement>>;
        aside: StyledFunction<React.HTMLFactory<HTMLElement>>;
        audio: StyledFunction<React.HTMLFactory<HTMLAudioElement>>;
        b: StyledFunction<React.HTMLFactory<HTMLElement>>;
        base: StyledFunction<React.HTMLFactory<HTMLBaseElement>>;
        bdi: StyledFunction<React.HTMLFactory<HTMLElement>>;
        bdo: StyledFunction<React.HTMLFactory<HTMLElement>>;
        big: StyledFunction<React.HTMLFactory<HTMLElement>>;
        blockquote: StyledFunction<React.HTMLFactory<HTMLElement>>;
        body: StyledFunction<React.HTMLFactory<HTMLBodyElement>>;
        br: StyledFunction<React.HTMLFactory<HTMLBRElement>>;
        button: StyledFunction<React.HTMLFactory<HTMLButtonElement>>;
        canvas: StyledFunction<React.HTMLFactory<HTMLCanvasElement>>;
        caption: StyledFunction<React.HTMLFactory<HTMLElement>>;
        cite: StyledFunction<React.HTMLFactory<HTMLElement>>;
        code: StyledFunction<React.HTMLFactory<HTMLElement>>;
        col: StyledFunction<React.HTMLFactory<HTMLTableColElement>>;
        colgroup: StyledFunction<React.HTMLFactory<HTMLTableColElement>>;
        data: StyledFunction<React.HTMLFactory<HTMLElement>>;
        datalist: StyledFunction<React.HTMLFactory<HTMLDataListElement>>;
        dd: StyledFunction<React.HTMLFactory<HTMLElement>>;
        del: StyledFunction<React.HTMLFactory<HTMLElement>>;
        details: StyledFunction<React.HTMLFactory<HTMLElement>>;
        dfn: StyledFunction<React.HTMLFactory<HTMLElement>>;
        dialog: StyledFunction<React.HTMLFactory<HTMLElement>>;
        div: StyledFunction<React.HTMLFactory<HTMLDivElement>>;
        dl: StyledFunction<React.HTMLFactory<HTMLDListElement>>;
        dt: StyledFunction<React.HTMLFactory<HTMLElement>>;
        em: StyledFunction<React.HTMLFactory<HTMLElement>>;
        embed: StyledFunction<React.HTMLFactory<HTMLEmbedElement>>;
        fieldset: StyledFunction<React.HTMLFactory<HTMLFieldSetElement>>;
        figcaption: StyledFunction<React.HTMLFactory<HTMLElement>>;
        figure: StyledFunction<React.HTMLFactory<HTMLElement>>;
        footer: StyledFunction<React.HTMLFactory<HTMLElement>>;
        form: StyledFunction<React.HTMLFactory<HTMLFormElement>>;
        h1: StyledFunction<React.HTMLFactory<HTMLHeadingElement>>;
        h2: StyledFunction<React.HTMLFactory<HTMLHeadingElement>>;
        h3: StyledFunction<React.HTMLFactory<HTMLHeadingElement>>;
        h4: StyledFunction<React.HTMLFactory<HTMLHeadingElement>>;
        h5: StyledFunction<React.HTMLFactory<HTMLHeadingElement>>;
        h6: StyledFunction<React.HTMLFactory<HTMLHeadingElement>>;
        head: StyledFunction<React.HTMLFactory<HTMLHeadElement>>;
        header: StyledFunction<React.HTMLFactory<HTMLElement>>;
        hgroup: StyledFunction<React.HTMLFactory<HTMLElement>>;
        hr: StyledFunction<React.HTMLFactory<HTMLHRElement>>;
        html: StyledFunction<React.HTMLFactory<HTMLHtmlElement>>;
        i: StyledFunction<React.HTMLFactory<HTMLElement>>;
        iframe: StyledFunction<React.HTMLFactory<HTMLIFrameElement>>;
        img: StyledFunction<React.HTMLFactory<HTMLImageElement>>;
        input: StyledFunction<React.HTMLFactory<HTMLInputElement>>;
        ins: StyledFunction<React.HTMLFactory<HTMLModElement>>;
        kbd: StyledFunction<React.HTMLFactory<HTMLElement>>;
        keygen: StyledFunction<React.HTMLFactory<HTMLElement>>;
        label: StyledFunction<React.HTMLFactory<HTMLLabelElement>>;
        legend: StyledFunction<React.HTMLFactory<HTMLLegendElement>>;
        li: StyledFunction<React.HTMLFactory<HTMLLIElement>>;
        link: StyledFunction<React.HTMLFactory<HTMLLinkElement>>;
        main: StyledFunction<React.HTMLFactory<HTMLElement>>;
        map: StyledFunction<React.HTMLFactory<HTMLMapElement>>;
        mark: StyledFunction<React.HTMLFactory<HTMLElement>>;
        menu: StyledFunction<React.HTMLFactory<HTMLElement>>;
        menuitem: StyledFunction<React.HTMLFactory<HTMLElement>>;
        meta: StyledFunction<React.HTMLFactory<HTMLMetaElement>>;
        meter: StyledFunction<React.HTMLFactory<HTMLElement>>;
        nav: StyledFunction<React.HTMLFactory<HTMLElement>>;
        noscript: StyledFunction<React.HTMLFactory<HTMLElement>>;
        object: StyledFunction<React.HTMLFactory<HTMLObjectElement>>;
        ol: StyledFunction<React.HTMLFactory<HTMLOListElement>>;
        optgroup: StyledFunction<React.HTMLFactory<HTMLOptGroupElement>>;
        option: StyledFunction<React.HTMLFactory<HTMLOptionElement>>;
        output: StyledFunction<React.HTMLFactory<HTMLElement>>;
        p: StyledFunction<React.HTMLFactory<HTMLParagraphElement>>;
        param: StyledFunction<React.HTMLFactory<HTMLParamElement>>;
        picture: StyledFunction<React.HTMLFactory<HTMLElement>>;
        pre: StyledFunction<React.HTMLFactory<HTMLPreElement>>;
        progress: StyledFunction<React.HTMLFactory<HTMLProgressElement>>;
        q: StyledFunction<React.HTMLFactory<HTMLQuoteElement>>;
        rp: StyledFunction<React.HTMLFactory<HTMLElement>>;
        rt: StyledFunction<React.HTMLFactory<HTMLElement>>;
        ruby: StyledFunction<React.HTMLFactory<HTMLElement>>;
        s: StyledFunction<React.HTMLFactory<HTMLElement>>;
        samp: StyledFunction<React.HTMLFactory<HTMLElement>>;
        script: StyledFunction<React.HTMLFactory<HTMLElement>>;
        section: StyledFunction<React.HTMLFactory<HTMLElement>>;
        select: StyledFunction<React.HTMLFactory<HTMLSelectElement>>;
        small: StyledFunction<React.HTMLFactory<HTMLElement>>;
        source: StyledFunction<React.HTMLFactory<HTMLSourceElement>>;
        span: StyledFunction<React.HTMLFactory<HTMLSpanElement>>;
        strong: StyledFunction<React.HTMLFactory<HTMLElement>>;
        style: StyledFunction<React.HTMLFactory<HTMLStyleElement>>;
        sub: StyledFunction<React.HTMLFactory<HTMLElement>>;
        summary: StyledFunction<React.HTMLFactory<HTMLElement>>;
        sup: StyledFunction<React.HTMLFactory<HTMLElement>>;
        table: StyledFunction<React.HTMLFactory<HTMLTableElement>>;
        tbody: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>>;
        td: StyledFunction<React.HTMLFactory<HTMLTableDataCellElement>>;
        textarea: StyledFunction<React.HTMLFactory<HTMLTextAreaElement>>;
        tfoot: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>>;
        th: StyledFunction<React.HTMLFactory<HTMLTableHeaderCellElement>>;
        thead: StyledFunction<React.HTMLFactory<HTMLTableSectionElement>>;
        time: StyledFunction<React.HTMLFactory<HTMLElement>>;
        title: StyledFunction<React.HTMLFactory<HTMLTitleElement>>;
        tr: StyledFunction<React.HTMLFactory<HTMLTableRowElement>>;
        track: StyledFunction<React.HTMLFactory<HTMLTrackElement>>;
        u: StyledFunction<React.HTMLFactory<HTMLElement>>;
        ul: StyledFunction<React.HTMLFactory<HTMLUListElement>>;
        "var": StyledFunction<React.HTMLFactory<HTMLElement>>;
        video: StyledFunction<React.HTMLFactory<HTMLVideoElement>>;
        wbr: StyledFunction<React.HTMLFactory<HTMLElement>>;

        // SVG
        circle: StyledFunction<React.SVGFactory>;
        clipPath: StyledFunction<React.SVGFactory>;
        defs: StyledFunction<React.SVGFactory>;
        ellipse: StyledFunction<React.SVGFactory>;
        g: StyledFunction<React.SVGFactory>;
        image: StyledFunction<React.SVGFactory>;
        line: StyledFunction<React.SVGFactory>;
        linearGradient: StyledFunction<React.SVGFactory>;
        mask: StyledFunction<React.SVGFactory>;
        path: StyledFunction<React.SVGFactory>;
        pattern: StyledFunction<React.SVGFactory>;
        polygon: StyledFunction<React.SVGFactory>;
        polyline: StyledFunction<React.SVGFactory>;
        radialGradient: StyledFunction<React.SVGFactory>;
        rect: StyledFunction<React.SVGFactory>;
        stop: StyledFunction<React.SVGFactory>;
        svg: StyledFunction<React.SVGFactory>;
        text: StyledFunction<React.SVGFactory>;
        tspan: StyledFunction<React.SVGFactory>;
    }

    const styled: StyledInterface;

    export const css: StyledFunction<(string | Function)[]>;
    export const keyframes: StyledFunction<string>;
    export const injectGlobal: StyledFunction<undefined>;

    interface ThemeProps {
      theme: Object;
    }

    export const ThemeProvider: StatelessComponent<ThemeProps>;

    export default styled;
}
