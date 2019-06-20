// flow-typed signature: 164dcf1c9105e51cb17a374a807146a7
// flow-typed version: c7f4cf7a4d/express_v4.16.x/flow_>=v0.93.x

import * as http from "http";
import type { Socket } from "net";

declare type express$RouterOptions = {
  caseSensitive?: boolean,
  mergeParams?: boolean,
  strict?: boolean
};

declare class express$RequestResponseBase {
  app: express$Application;
  get(field: string): string | void;
}

declare type express$RequestParams = {
  [param: string]: string
};

declare class express$Request extends http$IncomingMessage mixins express$RequestResponseBase {
  baseUrl: string;
  body: mixed;
  cookies: { [cookie: string]: string };
  connection: Socket;
  fresh: boolean;
  hostname: string;
  ip: string;
  ips: Array<string>;
  method: string;
  originalUrl: string;
  params: express$RequestParams;
  path: string;
  protocol: "https" | "http";
  query: { [name: string]: string | Array<string> };
  route: string;
  secure: boolean;
  signedCookies: { [signedCookie: string]: string };
  stale: boolean;
  subdomains: Array<string>;
  xhr: boolean;
  accepts(types: string): string | false;
  accepts(types: Array<string>): string | false;
  acceptsCharsets(...charsets: Array<string>): string | false;
  acceptsEncodings(...encoding: Array<string>): string | false;
  acceptsLanguages(...lang: Array<string>): string | false;
  header(field: string): string | void;
  is(type: string): boolean;
  param(name: string, defaultValue?: string): string | void;
}

declare type express$CookieOptions = {
  domain?: string,
  encode?: (value: string) => string,
  expires?: Date,
  httpOnly?: boolean,
  maxAge?: number,
  path?: string,
  secure?: boolean,
  signed?: boolean
};

declare type express$Path = string | RegExp;

declare type express$RenderCallback = (
  err: Error | null,
  html?: string
) => mixed;

declare type express$SendFileOptions = {
  maxAge?: number,
  root?: string,
  lastModified?: boolean,
  headers?: { [name: string]: string },
  dotfiles?: "allow" | "deny" | "ignore"
};

declare class express$Response extends http$ServerResponse mixins express$RequestResponseBase {
  headersSent: boolean;
  locals: { [name: string]: mixed };
  append(field: string, value?: string): this;
  attachment(filename?: string): this;
  cookie(name: string, value: string, options?: express$CookieOptions): this;
  clearCookie(name: string, options?: express$CookieOptions): this;
  download(
    path: string,
    filename?: string,
    callback?: (err?: ?Error) => void
  ): this;
  format(typesObject: { [type: string]: Function }): this;
  json(body?: mixed): this;
  jsonp(body?: mixed): this;
  links(links: { [name: string]: string }): this;
  location(path: string): this;
  redirect(url: string, ...args: Array<void>): this;
  redirect(status: number, url: string, ...args: Array<void>): this;
  render(
    view: string,
    locals?: { [name: string]: mixed },
    callback?: express$RenderCallback
  ): this;
  send(body?: mixed): this;
  sendFile(
    path: string,
    options?: express$SendFileOptions,
    callback?: (err?: ?Error) => mixed
  ): this;
  sendStatus(statusCode: number): this;
  header(field: string, value?: string): this;
  header(headers: { [name: string]: string }): this;
  set(field: string, value?: string | string[]): this;
  set(headers: { [name: string]: string }): this;
  status(statusCode: number): this;
  type(type: string): this;
  vary(field: string): this;
  req: express$Request;
}

declare type express$NextFunction = (err?: ?Error | "route") => mixed;
declare type express$Middleware =
  | ((
      req: express$Request,
      res: express$Response,
      next: express$NextFunction
    ) => mixed)
  | ((
      error: Error,
      req: express$Request,
      res: express$Response,
      next: express$NextFunction
    ) => mixed);
declare interface express$RouteMethodType<T> {
  (middleware: express$Middleware): T;
  (...middleware: Array<express$Middleware>): T;
  (
    path: express$Path | express$Path[],
    ...middleware: Array<express$Middleware>
  ): T;
}
declare class express$Route {
  all: express$RouteMethodType<this>;
  get: express$RouteMethodType<this>;
  post: express$RouteMethodType<this>;
  put: express$RouteMethodType<this>;
  head: express$RouteMethodType<this>;
  delete: express$RouteMethodType<this>;
  options: express$RouteMethodType<this>;
  trace: express$RouteMethodType<this>;
  copy: express$RouteMethodType<this>;
  lock: express$RouteMethodType<this>;
  mkcol: express$RouteMethodType<this>;
  move: express$RouteMethodType<this>;
  purge: express$RouteMethodType<this>;
  propfind: express$RouteMethodType<this>;
  proppatch: express$RouteMethodType<this>;
  unlock: express$RouteMethodType<this>;
  report: express$RouteMethodType<this>;
  mkactivity: express$RouteMethodType<this>;
  checkout: express$RouteMethodType<this>;
  merge: express$RouteMethodType<this>;

  // @TODO Missing 'm-search' but get flow illegal name error.

  notify: express$RouteMethodType<this>;
  subscribe: express$RouteMethodType<this>;
  unsubscribe: express$RouteMethodType<this>;
  patch: express$RouteMethodType<this>;
  search: express$RouteMethodType<this>;
  connect: express$RouteMethodType<this>;
}

declare class express$Router extends express$Route {
  constructor(options?: express$RouterOptions): void;
  route(path: string): express$Route;
  static (options?: express$RouterOptions): express$Router;
  use(middleware: express$Middleware): this;
  use(...middleware: Array<express$Middleware>): this;
  use(
    path: express$Path | express$Path[],
    ...middleware: Array<express$Middleware>
  ): this;
  use(path: string, router: express$Router): this;
  handle(
    req: http$IncomingMessage<>,
    res: http$ServerResponse,
    next: express$NextFunction
  ): void;
  param(
    param: string,
    callback: (
      req: express$Request,
      res: express$Response,
      next: express$NextFunction,
      id: string
    ) => mixed
  ): void;
  (
    req: http$IncomingMessage<>,
    res: http$ServerResponse,
    next?: ?express$NextFunction
  ): void;
}

/*
With flow-bin ^0.59, express app.listen() is deemed to return any and fails flow type coverage.
Which is ironic because https://github.com/facebook/flow/blob/master/Changelog.md#misc-2 (release notes for 0.59)
says "Improves typings for Node.js HTTP server listen() function."  See that?  IMPROVES!
To work around this issue, we changed Server to ?Server here, so that our invocations of express.listen() will
not be deemed to lack type coverage.
*/

declare class express$Application extends express$Router mixins events$EventEmitter {
  constructor(): void;
  locals: { [name: string]: mixed };
  mountpath: string;
  listen(
    port: number,
    hostname?: string,
    backlog?: number,
    callback?: (err?: ?Error) => mixed
  ): ?http.Server;
  listen(
    port: number,
    hostname?: string,
    callback?: (err?: ?Error) => mixed
  ): ?http.Server;
  listen(port: number, callback?: (err?: ?Error) => mixed): ?http.Server;
  listen(path: string, callback?: (err?: ?Error) => mixed): ?http.Server;
  listen(handle: Object, callback?: (err?: ?Error) => mixed): ?http.Server;
  disable(name: string): void;
  disabled(name: string): boolean;
  enable(name: string): express$Application;
  enabled(name: string): boolean;
  engine(name: string, callback: Function): void;
  /**
   * Mixed will not be taken as a value option. Issue around using the GET http method name and the get for settings.
   */
  //   get(name: string): mixed;
  set(name: string, value: mixed): mixed;
  render(
    name: string,
    optionsOrFunction: { [name: string]: mixed },
    callback: express$RenderCallback
  ): void;
  handle(
    req: http$IncomingMessage<>,
    res: http$ServerResponse,
    next?: ?express$NextFunction
  ): void;
  // callable signature is not inherited
  (
    req: http$IncomingMessage<>,
    res: http$ServerResponse,
    next?: ?express$NextFunction
  ): void;
}

declare type JsonOptions = {
  inflate?: boolean,
  limit?: string | number,
  reviver?: (key: string, value: mixed) => mixed,
  strict?: boolean,
  type?: string | Array<string> | ((req: express$Request) => boolean),
  verify?: (
    req: express$Request,
    res: express$Response,
    buf: Buffer,
    encoding: string
  ) => mixed
};

declare type express$UrlEncodedOptions = {
  extended?: boolean,
  inflate?: boolean,
  limit?: string | number,
  parameterLimit?: number,
  type?: string | Array<string> | ((req: express$Request) => boolean),
  verify?: (
    req: express$Request,
    res: express$Response,
    buf: Buffer,
    encoding: string
  ) => mixed,
}

declare module "express" {
  declare export type RouterOptions = express$RouterOptions;
  declare export type CookieOptions = express$CookieOptions;
  declare export type Middleware = express$Middleware;
  declare export type NextFunction = express$NextFunction;
  declare export type RequestParams = express$RequestParams;
  declare export type $Response = express$Response;
  declare export type $Request = express$Request;
  declare export type $Application = express$Application;

  declare module.exports: {
    (): express$Application, // If you try to call like a function, it will use this signature
    json: (opts: ?JsonOptions) => express$Middleware,
    static: (root: string, options?: Object) => express$Middleware, // `static` property on the function
    Router: typeof express$Router, // `Router` property on the function
    urlencoded: (opts: ?express$UrlEncodedOptions) => express$Middleware,
  };
}
