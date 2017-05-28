// flow-typed signature: c099894613b849a251fe2231073ba9d0
// flow-typed version: d2849ed4c4/express_v4.x.x/flow_>=v0.25.x

// @flow
import type { Server } from 'http';
declare module 'express' {
  declare type RouterOptions = {
    caseSensitive?: boolean,
    mergeParams?: boolean,
    strict?: boolean
  };
  declare class RequestResponseBase {
    app: Application;
    get(field: string): string | void;
  }
  declare class Request extends http$IncomingMessage mixins RequestResponseBase {
    baseUrl: string;
    body: mixed;
    cookies: {[cookie: string]: string};
    fresh: boolean;
    hostname: boolean;
    ip: string;
    ips: Array<string>;
    method: string;
    originalUrl: string;
    params: {[param: string]: string};
    path: string;
    protocol: 'https' | 'http';
    query: {[name: string]: string};
    route: string;
    secure: boolean;
    signedCookies: {[signedCookie: string]: string};
    stale: boolean;
    subdomains: Array<string>;
    xhr: boolean;
    accepts(types: string): string | false;
    acceptsCharsets(...charsets: Array<string>): string | false;
    acceptsEncodings(...encoding: Array<string>): string | false;
    acceptsLanguages(...lang: Array<string>): string | false;
    header(field: string): string | void;
    is(type: string): boolean;
    param(name: string, defaultValue?: string): string | void;
  }


  declare type CookieOptions = {
    domain?: string,
    encode?: (value: string) => string,
    expires?: Date,
    httpOnly?: boolean,
    maxAge?: string,
    path?: string,
    secure?: boolean,
    signed?: boolean
  };

  declare type RenderCallback = (err: Error | null, html?: string) => mixed;

  declare type SendFileOptions = {
    maxAge?: number,
    root?: string,
    lastModified?: boolean,
    headers?: {[name: string]: string},
    dotfiles?: 'allow' | 'deny' | 'ignore'
  };
  declare class Response extends http$ClientRequest mixins RequestResponseBase {
    headersSent: boolean;
    locals: {[name: string]: mixed};
    append(field: string, value?: string): this;
    attachment(filename?: string): this;
    cookie(name: string, value: string, options?: CookieOptions): this;
    clearCookie(name: string, options?: CookieOptions): this;
    download(path: string, filename?: string, callback?: (err?: ?Error) => void): this;
    format(typesObject: {[type: string]: Function}): this;
    json(body?: mixed): this;
    jsonp(body?: mixed): this;
    links(links: {[name: string]: string}): this;
    location(path: string): this;
    redirect(url: string, ...args: Array<void>): this;
    redirect(status: number, url: string, ...args: Array<void>): this;
    render(view: string, locals?: {[name: string]: mixed}, callback?: RenderCallback): this;
    send(body?: mixed): this;
    sendFile(path: string, options?: SendFileOptions, callback?: (err?: ?Error) => mixed): this;
    sendStatus(statusCode: number): this;
    set(field: string, value?: string): this;
    status(statusCode: number): this;
    type(type: string): this;
    vary(field: string): this;
  }
  declare type $Response = Response;
  declare type $Request = Request;
  declare type NextFunction = (err?: ?Error) => mixed;
  declare type Middleware =
    ((req: Request, res: Response, next: NextFunction) => mixed) |
    ((error: ?Error, req : Request, res: Response, next: NextFunction) => mixed);
  declare interface RouteMethodType<T> {
    (middleware: Middleware): T;
    (...middleware: Array<Middleware>): T;
    (path: string|RegExp|string[], ...middleware: Array<Middleware>): T;
  }
  declare interface RouterMethodType<T> {
    (middleware: Middleware): T;
    (...middleware: Array<Middleware>): T;
    (path: string|RegExp|string[], ...middleware: Array<Middleware>): T;
    (path: string, router: Router): T;
  }
  declare class Route {
    all: RouteMethodType<this>;
    get: RouteMethodType<this>;
    post: RouteMethodType<this>;
    put: RouteMethodType<this>;
    head: RouteMethodType<this>;
    delete: RouteMethodType<this>;
    options: RouteMethodType<this>;
    trace: RouteMethodType<this>;
    copy: RouteMethodType<this>;
    lock: RouteMethodType<this>;
    mkcol: RouteMethodType<this>;
    move: RouteMethodType<this>;
    purge: RouteMethodType<this>;
    propfind: RouteMethodType<this>;
    proppatch: RouteMethodType<this>;
    unlock: RouteMethodType<this>;
    report: RouteMethodType<this>;
    mkactivity: RouteMethodType<this>;
    checkout: RouteMethodType<this>;
    merge: RouteMethodType<this>;

    // @TODO Missing 'm-search' but get flow illegal name error.

    notify: RouteMethodType<this>;
    subscribe: RouteMethodType<this>;
    unsubscribe: RouteMethodType<this>;
    patch: RouteMethodType<this>;
    search: RouteMethodType<this>;
    connect: RouteMethodType<this>;
  }
  declare class Router extends Route {
    constructor(options?: RouterOptions): void;

    use: RouterMethodType<this>;

    route(path: string): Route;
    
    static (): Router;
  }

  declare function serveStatic(root: string, options?: Object): Middleware;

  declare class Application extends Router mixins events$EventEmitter {
    constructor(): void;
    locals: {[name: string]: mixed};
    mountpath: string;
    listen(port: number, hostname?: string, backlog?: number, callback?: (err?: ?Error) => mixed): Server;
    listen(port: number, hostname?: string, callback?: (err?: ?Error) => mixed): Server;
    listen(port: number, callback?: (err?: ?Error) => mixed): Server;
    listen(path: string, callback?: (err?: ?Error) => mixed): Server;
    listen(handle: Object, callback?: (err?: ?Error) => mixed): Server;
    disable(name: string): void;
    disabled(name: string): boolean;
    enable(name: string): void;
    enabled(name: string): boolean;
    engine(name: string, callback: Function): void;
    /**
     * Mixed will not be taken as a value option. Issue around using the GET http method name and the get for settings.
     */
    //   get(name: string): mixed;
    set(name: string, value: mixed): mixed;
    render(name: string, optionsOrFunction: {[name: string]: mixed}, callback: RenderCallback): void;
  }

  declare type $Application = Application;

  declare module.exports: {
    (): Application, // If you try to call like a function, it will use this signature
    static: serveStatic, // `static` property on the function
    Router: typeof Router, // `Router` property on the function
  };
}
