// flow-typed signature: c4accb474c9c8dff69c710a8aeb51509
// flow-typed version: 622ff96b86/puppeteer_v1.2.x/flow_>=v0.76.x

// @flow

/**
 * Based on typescript definitions found at the url below
 * https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/puppeteer
 */

declare module 'puppeteer' {
  import type { ChildProcess } from 'child_process';

  declare class OverridableEventEmitter extends events$EventEmitter {
    /* eslint-disable flowtype/no-weak-types */
    +on: Function;
    +once: Function;
    /* eslint-enable flowtype/no-weak-types */
  }

  /** Keyboard provides an api for managing a virtual keyboard. */
  declare type Keyboard = {
    /**
     * Dispatches a keydown event.
     * @param key Name of key to press, such as ArrowLeft.
     * @param options Specifies a input text event.
     */
    down(key: string, options?: { text?: string }): Promise<void>,

    /** Shortcut for `keyboard.down` and `keyboard.up`. */
    press(key: string, options?: { delay?: number, text?: string }): Promise<void>,

    /** Dispatches a `keypress` and `input` event. This does not send a `keydown` or keyup `event`. */
    sendCharacter(char: string): Promise<void>,

    /**
     * Sends a keydown, keypress/input, and keyup event for each character in the text.
     * @param text A text to type into a focused element.
     * @param options Specifies the typing options.
     */
    type(text: string, options?: { delay?: number }): Promise<void>,

    /**
     * Dispatches a keyup event.
     * @param key Name of key to release, such as ArrowLeft.
     */
    up(key: string): Promise<void>,
  };

  declare type MousePressOptions = {
    /**
     * left, right, or middle.
     * @default left
     */
    button?: MouseButtons,

    /**
     * The number of clicks.
     * @default 1
     */
    clickCount?: number,
  };

  declare type Mouse = {
    /**
     * Shortcut for `mouse.move`, `mouse.down` and `mouse.up`.
     * @param x The x position.
     * @param y The y position.
     * @param options The click options.
     */
    click(x: number, y: number, options?: ClickOptions): Promise<void>,

    /**
     * Dispatches a `mousedown` event.
     * @param options The mouse press options.
     */
    down(options?: MousePressOptions): Promise<void>,

    /**
     * Dispatches a `mousemove` event.
     * @param x The x position.
     * @param y The y position.
     * @param options The mouse move options.
     */
    move(x: number, y: number, options?: { steps: number }): Promise<void>,
    /**
     * Dispatches a `mouseup` event.
     * @param options The mouse press options.
     */
    up(options?: MousePressOptions): Promise<void>,
  };

  declare type Touchscreen = {
    /**
     * Dispatches a touchstart and touchend event.
     * @param x The x position.
     * @param y The y position.
     */
    tap(x: number, y: number): Promise<void>,
  };

  /**
   * You can use `tracing.start` and `tracing.stop` to create a trace file which can be opened in Chrome DevTools or timeline viewer.
   */
  declare type Tracing = {
    start(options: TracingStartOptions): Promise<void>,

    stop(): Promise<void>,
  };

  declare type TracingStartOptions = {
    categories?: Array<string>,
    path: string,
    screenshots?: boolean,
  };

  /** Dialog objects are dispatched by page via the 'dialog' event. */
  declare type Dialog = {
    /**
     * Accepts the dialog.
     * @param promptText A text to enter in prompt. Does not cause any effects if the dialog's type is not prompt.
     */
    accept(promptText?: string): Promise<void>,

    /** If dialog is prompt, returns default prompt value. Otherwise, returns empty string. */
    defaultValue(): string,

    /** Dismiss the dialog */
    dismiss(): Promise<void>,

    /** Returns the message displayed in the dialog. */
    message(): string,

    /** The dialog type. Dialog's type, can be one of `alert`, `beforeunload`, `confirm` or `prompt`. */
    type(): 'alert' | 'beforeunload' | 'confirm' | 'prompt',
  };

  /** ConsoleMessage objects are dispatched by page via the 'console' event. */
  declare type ConsoleMessage = {
    /** The message arguments. */
    args(): Array<JSHandle>,

    /** The message text. */
    text(): string,

    type():
      | 'log'
      | 'debug'
      | 'info'
      | 'error'
      | 'warning'
      | 'dir'
      | 'dirxml'
      | 'table'
      | 'trace'
      | 'clear'
      | 'startGroup'
      | 'startGroupCollapsed'
      | 'endGroup'
      | 'assert'
      | 'profile'
      | 'profileEnd'
      | 'count'
      | 'timeEnd',
  };

  declare type PageEvents =
    | 'console'
    | 'dialog'
    | 'error'
    | 'frameattached'
    | 'framedetached'
    | 'framenavigated'
    | 'load'
    | 'pageerror'
    | 'request'
    | 'requestfailed'
    | 'requestfinished'
    | 'response';

  declare type BrowserEvents =
    | 'disconnected'
    | 'targetchanged'
    | 'targetcreated'
    | 'targetdestroyed';

  declare type AuthOptions = {
    password: string,
    username: string,
  };

  declare type MouseButtons = 'left' | 'right' | 'middle';

  declare type ClickOptions = {
    /** defaults to left */
    button?: MouseButtons,

    /** defaults to 1 */
    clickCount?: number,

    /**
     * Time to wait between mousedown and mouseup in milliseconds.
     * Defaults to 0.
     */
    delay?: number,
  };

  /** Represents a browser cookie. */
  declare type Cookie = {
    /** The cookie domain. */
    domain: string,

    /** The cookie Unix expiration time in seconds. */
    expires: number,

    /** The cookie http only flag. */
    httpOnly: boolean,

    /** The cookie name. */
    name: string,

    /** The cookie path. */
    path: string,

    /** The cookie same site definition. */
    sameSite: 'Strict' | 'Lax',

    /** The cookie secure flag. */
    secure: boolean,

    /** The cookie value. */
    value: string,
  };

  declare type DeleteCookie = {
    domain?: string,
    /** The cookie name. */
    name: string,
    path?: string,
    secure?: boolean,
    url?: string,
  };

  declare type SetCookie = {
    /** The cookie domain. */
    domain?: string,

    /** The cookie Unix expiration time in seconds. */
    expires?: number,

    /** The cookie http only flag. */
    httpOnly?: boolean,

    /** The cookie name. */
    name: string,

    /** The cookie path. */
    path?: string,

    /** The cookie same site definition. */
    sameSite?: 'Strict' | 'Lax',

    /** The cookie secure flag. */
    secure?: boolean,

    /** The request-URI to associate with the setting of the cookie. This value can affect the default domain and path values of the created cookie. */
    url?: string,

    /** The cookie value. */
    value: string,
  };

  declare type Viewport = {
    /**
     * Specify device scale factor (can be thought of as dpr).
     * @default 1
     */
    deviceScaleFactor?: number,

    /**
     * Specifies if viewport supports touch events.
     * @default false
     */
    hasTouch?: boolean,

    /** The page height in pixels. */
    height: number,

    /**
     * Specifies if viewport is in landscape mode.
     * @default false
     */
    isLandscape?: boolean,

    /**
     * Whether the `meta viewport` tag is taken into account.
     * @default false
     */
    isMobile?: boolean,

    /** The page width in pixels. */
    width: number,
  };

  /** Page emulation options. */
  declare type EmulateOptions = {
    /** The emulated user-agent. */
    userAgent?: string,

    /** The viewport emulation options. */
    viewport?: Viewport,
  };

  declare type EvaluateFn = string | ((...args: Array<mixed>) => mixed);

  declare type LoadEvent = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';

  /** The navigation options. */
  declare type NavigationOptions = {
    /**
     * Maximum navigation time in milliseconds, pass 0 to disable timeout.
     * @default 30000
     */
    timeout?: number,
    /**
     * When to consider navigation succeeded.
     * @default load Navigation is consider when the `load` event is fired.
     */
    waitUntil?: LoadEvent | Array<LoadEvent>,
  };

  declare type PDFFormat =
    | 'Letter'
    | 'Legal'
    | 'Tabload'
    | 'Ledger'
    | 'A0'
    | 'A1'
    | 'A2'
    | 'A3'
    | 'A4'
    | 'A5';

  declare type PDFOptions = {
    /**
     * Display header and footer.
     * @default false
     */
    displayHeaderFooter?: boolean,

    /**
     * HTML template for the print footer. Should be valid HTML markup with following classes used to inject printing values into them:
     * - `date` formatted print date
     * - `title` document title
     * - `url` document location
     * - `pageNumber` current page number
     * - `totalPages` total pages in the document
     */
    footerTemplate?: string,

    /** Paper format. If set, takes priority over width or height options. Defaults to 'Letter'. */
    format?: PDFFormat,

    /**
     * HTML template for the print header. Should be valid HTML markup with following classes used to inject printing values into them:
     * - `date` formatted print date
     * - `title` document title
     * - `url` document location
     * - `pageNumber` current page number
     * - `totalPages` total pages in the document
     */
    headerTemplate?: string,

    /** Paper height, accepts values labeled with units. */
    height?: string,

    /**
     * Paper orientation.
     * @default false
     */
    landscape?: boolean,

    /** Paper margins, defaults to none.  */
    margin?: {
      /** Bottom margin, accepts values labeled with units. */
      bottom?: string,

      /** Left margin, accepts values labeled with units. */
      left?: string,

      /** Right margin, accepts values labeled with units. */
      right?: string,

      /** Top margin, accepts values labeled with units. */
      top?: string,
    },

    /**
     * Paper ranges to print, e.g., '1-5, 8, 11-13'. Defaults to the empty
     * string, which means print all pages.
     */
    pageRanges?: string,

    /**
     * The file path to save the PDF to.
     * If `path` is a relative path, then it is resolved relative to current working directory.
     * If no path is provided, the PDF won't be saved to the disk.
     */
    path?: string,

    /**
     * Print background graphics.
     * @default false
     */
    printBackground?: boolean,

    /**
     * Scale of the webpage rendering.
     * @default 1
     */
    scale?: number,

    /** Paper width, accepts values labeled with units. */
    width?: string,
  };

  /** Defines the screenshot options. */
  declare type ScreenshotOptions = {
    /**
     * An object which specifies clipping region of the page.
     */
    clip?: BoundingBox,

    /**
     * When true, takes a screenshot of the full scrollable page.
     * @default false
     */
    fullPage?: boolean,

    /**
     * Hides default white background and allows capturing screenshots with transparency.
     * @default false
     */
    omitBackground?: boolean,

    /**
     * The file path to save the image to. The screenshot type will be inferred from file extension.
     * If `path` is a relative path, then it is resolved relative to current working directory.
     * If no path is provided, the image won't be saved to the disk.
     */
    path?: string,

    /** The quality of the image, between 0-100. Not applicable to png images. */
    quality?: number,

    /**
     * The screenshot type.
     * @default png
     */
    type?: 'jpeg' | 'png',
  };

  /** Options for `addStyleTag` */
  declare type StyleTagOptions = {
    /** Raw CSS content to be injected into frame. */
    content?: string,

    /** Path to the CSS file to be injected into frame. If `path` is a relative path, then it is resolved relative to current working directory. */
    path?: string,

    /** Url of the <link> tag. */
    url?: string,
  };
  /** Options for `addScriptTag` */
  declare type ScriptTagOptions = {
    /** Raw JavaScript content to be injected into frame. */
    content?: string,

    /** Path to the JavaScript file to be injected into frame. If `path` is a relative path, then it is resolved relative to current working directory. */
    path?: string,

    /** Script type. Use 'module' in order to load a Javascript ES6 module. */
    type?: string,

    /** Url of a script to be added. */
    url?: string,
  };

  declare type PageFnOptions = {
    polling?: 'raf' | 'mutation' | number,
    timeout?: number,
  };

  declare type BoundingBox = {
    /** The height. */
    height: number,

    /** The width. */
    width: number,

    /** The x-coordinate of top-left corner. */
    x: number,

    /** The y-coordinate of top-left corner. */
    y: number,
  };

  /**
   * Represents an in-page DOM element. ElementHandles can be created with the page.$ method.
   */
  declare type ElementHandle = JSHandle & {
    /**
     * The method runs element.querySelector within the page. If no element matches the selector, the return value resolve to null.
     * @param selector A selector to query element for
     * @since 0.13.0
     */
    $(selector: string): Promise<ElementHandle | null>,

    /**
     * The method runs element.querySelectorAll within the page. If no elements match the selector, the return value resolve to [].
     * @param selector A selector to query element for
     * @since 0.13.0
     */
    $$(selector: string): Promise<Array<ElementHandle>>,

    /**
     * @param selector XPath expression to evaluate.
     */
    $x(expression: string): Promise<Array<ElementHandle>>,

    /**
     * This method returns the value resolve to the bounding box of the element (relative to the main frame), or null if the element is not visible.
     */
    boundingBox(): Promise<BoundingBox | null>,

    /**
     * This method scrolls element into view if needed, and then uses page.mouse to click in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     * @param options Specifies the options.
     * @since 0.9.0
     */
    click(options?: ClickOptions): Promise<void>,

    /**
     * @returns Resolves to the content frame for element handles referencing iframe nodes, or null otherwise.
     * @since 1.2.0
     */
    contentFrame(): Promise<?Frame>,

    /**
     * Calls focus on the element.
     */
    focus(): Promise<void>,

    /**
     * This method scrolls element into view if needed, and then uses page.mouse to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    hover(): Promise<void>,

    /**
     * Focuses the element, and then uses keyboard.down and keyboard.up.
     * @param key Name of key to press, such as ArrowLeft. See USKeyboardLayout for a list of all key names.
     * @param options The text and delay options.
     */
    press(key: string, options?: { delay?: number, text?: string }): Promise<void>,

    /**
     * This method scrolls element into view if needed, and then uses page.screenshot to take a screenshot of the element.
     * If the element is detached from DOM, the method throws an error.
     * @param options Same options as in page.screenshot.
     */
    screenshot(options?: ScreenshotOptions): Promise<Buffer>,

    /**
     * This method scrolls element into view if needed, and then uses touchscreen.tap to tap in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    tap(): Promise<void>,

    toString(): string,

    /**
     * Focuses the element, and then sends a keydown, keypress/input, and keyup event for each character in the text.
     * @param text A text to type into a focused element.
     * @param options The typing options.
     */
    type(text: string, options?: { delay: number }): Promise<void>,

    /**
     * This method expects elementHandle to point to an input element.
     * @param filePaths Sets the value of the file input these paths. If some of the filePaths are relative paths, then they are resolved relative to current working directory.
     */
    uploadFile(...filePaths: Array<string>): Promise<void>,
  };

  /** The class represents a context for JavaScript execution. */
  declare type ExecutionContext = {
    evaluate(fn: EvaluateFn, ...args: Array<mixed>): Promise<mixed>,
    evaluateHandle(fn: EvaluateFn, ...args: Array<mixed>): Promise<JSHandle>,
    queryObjects(prototypeHandle: JSHandle): JSHandle,
  };

  /** JSHandle represents an in-page JavaScript object. */
  declare type JSHandle = {
    /**
     * Returns a ElementHandle
     */
    asElement(): ElementHandle | null,

    /**
     * Stops referencing the element handle.
     */
    dispose(): Promise<void>,

    /**
     * Gets the execution context.
     */
    executionContext(): ExecutionContext,

    /**
     * Returns a map with property names as keys and JSHandle instances for the property values.
     */
    getProperties(): Promise<Map<string, JSHandle>>,

    /**
     * Fetches a single property from the objectHandle.
     * @param propertyName The property to get.
     */
    getProperty(propertyName: string): Promise<JSHandle>,

    /**
     * Returns a JSON representation of the object.
     * The JSON is generated by running JSON.stringify on the object in page and consequent JSON.parse in puppeteer.
     * @throws The method will throw if the referenced object is not stringifiable.
     */
    jsonValue(): Promise<mixed>,
  };

  declare type Metrics = {
    /** Number of documents in the page. */
    Documents: number,

    /** Number of frames in the page. */
    Frames: number,

    /** Number of events in the page. */
    JSEventListeners: number,

    /** Total JavaScript heap size. */
    JSHeapTotalSize: number,

    /** Used JavaScript heap size. */
    JSHeapUsedSize: number,
    /** Total number of full or partial page layout. */
    LayoutCount: number,

    /** Combined durations of all page layouts. */
    LayoutDuration: number,

    /** Number of DOM nodes in the page. */
    Nodes: number,

    /** Total number of page style recalculations. */
    RecalcStyleCount: number,

    /** Combined duration of all page style recalculations. */
    RecalcStyleDuration: number,

    /** Combined duration of JavaScript execution. */
    ScriptDuration: number,

    /** Combined duration of all tasks performed by the browser. */
    TaskDuration: number,

    /** The timestamp when the metrics sample was taken. */
    Timestamp: number,
  };

  declare type Headers = { [key: string]: string };
  declare type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'OPTIONS';

  declare type ResourceType =
    | 'document'
    | 'stylesheet'
    | 'image'
    | 'media'
    | 'font'
    | 'script'
    | 'texttrack'
    | 'xhr'
    | 'fetch'
    | 'eventsource'
    | 'websocket'
    | 'manifest'
    | 'other';

  declare type Overrides = {
    headers?: Headers,
    method?: HttpMethod,
    postData?: string,
    url?: string,
  };

  /** Represents a page request. */
  declare type Request = {
    /**
     * Aborts request.
     * To use this, request interception should be enabled with `page.setRequestInterception`.
     * @throws An exception is immediately thrown if the request interception is not enabled.
     */
    abort(): Promise<void>,

    /**
     * Continues request with optional request overrides.
     * To use this, request interception should be enabled with `page.setRequestInterception`.
     * @throws An exception is immediately thrown if the request interception is not enabled.
     */
    continue(overrides?: Overrides): Promise<void>,

    /**
     * @returns The `Frame` object that initiated the request, or `null` if navigating to error pages
     */
    frame(): Promise<?Frame>,

    /**
     * An object with HTTP headers associated with the request.
     * All header names are lower-case.
     */
    headers(): Headers,
    /** Returns the request's method (GET, POST, etc.) */

    method(): HttpMethod,

    /** Contains the request's post body, if any. */
    postData(): ?string,

    /**
     * A `redirectChain` is a chain of requests initiated to fetch a resource.
     *
     * - If there are no redirects and the request was successful, the chain will be empty.
     * - If a server responds with at least a single redirect, then the chain will contain all the requests that were redirected.
     *
     * `redirectChain` is shared between all the requests of the same chain.
     *
     * @since 1.2.0
     */
    redirectChain(): Array<Request>,

    /** Contains the request's resource type as it was perceived by the rendering engine.  */
    resourceType(): ResourceType,

    /**
     * Fulfills request with given response.
     * To use this, request interception should be enabled with `page.setRequestInterception`.
     * @throws An exception is immediately thrown if the request interception is not enabled.
     * @param response The response options that will fulfill this request.
     */
    respond(response: RespondOptions): Promise<void>,

    /** A matching `Response` object, or `null` if the response has not been received yet. */
    response(): ?Response,

    /** Contains the URL of the request. */
    url(): string,
  };

  /** Options for `Request.respond` method */
  declare type RespondOptions = {
    /** Specifies the response body. */
    body?: Buffer | string,

    /** Specifies the Content-Type response header. */
    contentType?: string,

    /** Specifies the response headers. */
    headers?: Headers,

    /**
     * Specifies the response status code.
     * @default 200
     */
    status?: number,
  };

  /** Response class represents responses which are received by page. */
  declare type Response = {
    /** Promise which resolves to a buffer with response body. */
    buffer(): Promise<Buffer>,

    /** True if the response was served from either the browser's disk cache or memory cache. */
    fromCache(): boolean,

    /** True if the response was served by a service worker. */
    fromServiceWorker(): boolean,

    /** An object with HTTP headers associated with the response. All header names are lower-case. */
    headers(): Headers,

    /**
     * Promise which resolves to a JSON representation of response body.
     * @throws This method will throw if the response body is not parsable via `JSON.parse`.
     */
    json(): Promise<mixed>,

    /** Contains a boolean stating whether the response was successful (status in the range 200-299) or not. */
    ok(): boolean,

    /** A matching Request object. */
    request(): Request,

    /** Contains the status code of the response (e.g., 200 for a success). */
    status(): number,

    /** Promise which resolves to a text representation of response body. */
    text(): Promise<string>,

    /** Contains the URL of the response. */
    url(): string,
  };

  declare class FrameBase {
    /**
     * The method runs document.querySelector within the page.
     * If no element matches the selector, the return value resolve to null.
     */
    $: (selector: string) => Promise<?ElementHandle>;

    /**
     * The method runs document.querySelectorAll within the page. If no elements match the selector, the return value resolve to [].
     */
    $$: (selector: string) => Promise<Array<ElementHandle>>;

    /**
     * This method runs document.querySelectorAll within the page and passes it as the first argument to `fn`.
     * If `fn` returns a Promise, then $$eval would wait for the promise to resolve and return its value.
     * @param selector A selector to query frame for
     * @param fn Function to be evaluated in browser context
     * @param args Arguments to pass to pageFunction
     * @returns Promise which resolves to the return value of pageFunction
     */
    $$eval: (
      selector: string,
      pageFunction: (
        elements: NodeList<Element>,
        ...args: Array<mixed>
      ) => mixed,
      ...args: Array<mixed>
    ) => Promise<mixed>;

    /**
     * This method runs document.querySelector within the page and passes it as the first argument to `fn`.
     * If there's no element matching selector, the method throws an error.
     * If `fn` returns a Promise, then $eval would wait for the promise to resolve and return its value.
     */
    $eval: (
      selector: string,
      pageFunction: (element: Element, ...args: Array<mixed>) => mixed,
      ...args: Array<mixed>
    ) => Promise<mixed>;

    /**
     * @param expression XPath expression to evaluate.
     */
    $x: (expression: string) => Promise<Array<ElementHandle>>;

    /** Adds a `<script>` tag into the page with the desired url or content. */
    addScriptTag: (options: ScriptTagOptions) => Promise<void>;

    /** Adds a `<link rel="stylesheet">` tag into the page with the desired url or a `<style type="text/css">` tag with the content. */
    addStyleTag: (options: StyleTagOptions) => Promise<void>;

    /** Gets the full HTML contents of the page, including the doctype. */
    content: () => Promise<string>;

    /**
     * Evaluates a function in the browser context.
     * If the function, passed to the frame.evaluate, returns a Promise, then frame.evaluate would wait for the promise to resolve and return its value.
     * If the function passed into frame.evaluate returns a non-Serializable value, then frame.evaluate resolves to undefined.
     * @param fn Function to be evaluated in browser context
     * @param args Arguments to pass to `fn`
     */
    evaluate: (fn: EvaluateFn, ...args: Array<mixed>) => Promise<mixed>;

    /**
     * Sets the page content.
     * @param html HTML markup to assign to the page.
     */
    setContent: (html: string) => Promise<void>;

    /** Returns page's title. */
    +title: () => Promise<string>;

    /** Returns frame's url. */
    +url: () => string;

    waitFor: (
      // fn can be an abritary function
      // eslint-disable-next-line flowtype/no-weak-types
      selectorOrFunctionOrTimeout: string | number | Function,
      options?: mixed,
      ...args: Array<mixed>
    ) => Promise<mixed>;

    waitForFunction: (
      // fn can be an abritary function
      // eslint-disable-next-line flowtype/no-weak-types
      fn: string | Function,
      options?: PageFnOptions,
      ...args: Array<mixed>
    ) => Promise<mixed>;

    waitForSelector: (
      selector: string,
      options?: {hidden?: boolean, timeout?: number, visible?: boolean}
    ) => Promise<ElementHandle>;
  }

  declare type Frame = FrameBase & {
    childFrames(): Array<Frame>,

    /** Execution context associated with this frame. */
    executionContext(): ExecutionContext,

    /** Returns `true` if the frame has been detached, or `false` otherwise. */
    isDetached(): boolean,

    /** Returns frame's name attribute as specified in the tag. */
    name(): string,

    /** Returns parent frame, if any. Detached frames and main frames return null. */
    parentFrame(): ?Frame,
  };

  declare type PageEventObj = {
    /**
     * Emitted when JavaScript within the page calls one of console API methods, e.g. console.log or console.dir.
     * Also emitted if the page throws an error or a warning.
     */
    console: ConsoleMessage,

    /**
     * Emitted when a JavaScript dialog appears, such as alert, prompt, confirm or beforeunload.
     * Puppeteer can respond to the dialog via Dialog's accept or dismiss methods.
     */
    dialog: Dialog,

    /** Emitted when the page crashes. */
    error: Error,

    /** Emitted when a frame is attached. */
    frameattached: Frame,

    /** Emitted when a frame is detached. */
    framedetached: Frame,

    /** Emitted when a frame is navigated to a new url. */
    framenavigated: Frame,

    /** Emitted when the JavaScript load event is dispatched. */
    load: void,

    /**
     * Emitted when the JavaScript code makes a call to `console.timeStamp`.
     * For the list of metrics see `page.metrics`.
     */
    metrics: { metrics: mixed, title: string },

    /** Emitted when an uncaught exception happens within the page. */
    pageerror: string,

    /**
     * Emitted when a page issues a request. The request object is read-only.
     * In order to intercept and mutate requests, see page.setRequestInterceptionEnabled.
     */
    request: Request,

    /** Emitted when a request fails, for example by timing out. */
    requestfailed: Request,

    /** Emitted when a request finishes successfully. */
    requestfinished: Request,

    /** Emitted when a response is received. */
    response: Response,
  };

  /** Page provides methods to interact with a single tab in Chromium. One Browser instance might have multiple Page instances. */
  declare interface Page extends OverridableEventEmitter, FrameBase {
    /**
     * Provide credentials for http authentication.
     * To disable authentication, pass `null`.
     */
    authenticate(credentials: AuthOptions | null): Promise<void>;

    /** Brings page to front (activates tab). */
    bringToFront(): Promise<void>;

    /**
     * This method fetches an element with selector, scrolls it into view if needed, and
     * then uses `page.mouse` to click in the center of the element. If there's no element
     * matching selector, the method throws an error.
     * @param selector A selector to search for element to click. If there are multiple elements satisfying the selector, the first will be clicked.
     * @param options Specifies the click options.
     */
    click(selector: string, options?: ClickOptions): Promise<void>;

    /** Closes the current page. */
    close(): Promise<void>;

    /**
     * Gets the cookies.
     * If no URLs are specified, this method returns cookies for the current page URL.
     * If URLs are specified, only cookies for those URLs are returned.
     */
    cookies(...urls: Array<string>): Promise<Array<Cookie>>;

    coverage: Coverage;

    /**
     * Deletes the specified cookies.
     */
    deleteCookie(...cookies: Array<DeleteCookie>): Promise<void>;

    /** Emulates given device metrics and user agent. This method is a shortcut for `setUserAgent` and `setViewport`.  */
    emulate(options: $Shape<EmulateOptions>): Promise<void>;

    /** Emulates the media. */
    emulateMedia(mediaType: 'screen' | 'print' | null): Promise<void>;

    /**
     * Evaluates a function in the page context.
     * If the function, passed to the page.evaluateHandle, returns a Promise, then page.evaluateHandle
     * would wait for the promise to resolve and return its value.
     * @param fn The function to be evaluated in the page context.
     * @param args The arguments to pass to the `fn`.
     * @returns A promise which resolves to return value of `fn`.
     */
    evaluateHandle(fn: EvaluateFn, ...args: Array<mixed>): Promise<JSHandle>;

    /**
     * Adds a function which would be invoked in one of the following scenarios: whenever the page is navigated; whenever the child frame is attached or navigated.
     * The function is invoked after the document was created but before any of its scripts were run. This is useful to amend JavaScript environment, e.g. to seed Math.random.
     * @param fn The function to be evaluated in browser context.
     * @param args The arguments to pass to the `fn`.
     */
    evaluateOnNewDocument(fn: EvaluateFn, ...args: Array<mixed>): Promise<void>;

    /**
     * The method adds a function called name on the page's `window` object.
     * When called, the function executes `puppeteerFunction` in node.js and returns a
     * Promise which resolves to the return value of `puppeteerFunction`.
     * @param name The name of the function on the window object.
     * @param fn Callback function which will be called in Puppeteer's context.
     */
    exposeFunction(
      name: string,
      puppeteerFunction: (...args: Array<mixed>) => mixed
    ): Promise<void>;

    /** This method fetches an element with selector and focuses it. */
    focus(selector: string): Promise<void>;

    /** An array of all frames attached to the page. */
    frames(): Array<Frame>;

    /**
     * Navigate to the previous page in history.
     * @param options The navigation parameters.
     */
    goBack(options?: $Shape<NavigationOptions>): Promise<Response | null>;

    /**
     * Navigate to the next page in history.
     * @param options The navigation parameters.
     */
    goForward(options?: $Shape<NavigationOptions>): Promise<Response | null>;

    /**
     * Navigates to a URL.
     * @param url URL to navigate page to. The url should include scheme, e.g. `https://`
     * @param options The navigation parameters.
     */
    goto(url: string, options?: $Shape<NavigationOptions>): Promise<Response | null>;

    /**
     * This method fetches an element with `selector`, scrolls it into view if needed,
     * and then uses page.mouse to hover over the center of the element. If there's no
     * element matching `selector`, the method throws an error.
     * @param selector A selector to search for element to hover. If there are multiple elements satisfying the selector, the first will be hovered.
     */
    hover(selector: string): Promise<void>;

    /** Returns the virtual keyboard. */
    keyboard: Keyboard;

    /** Page is guaranteed to have a main frame which persists during navigation's. */
    mainFrame(): Frame;

    /** Gets the page metrics. */
    metrics(): Promise<Metrics>;

    /** Gets the virtual mouse. */
    mouse: Mouse;

    /**
     * Adds the listener function to the end of the listeners array for the event named `eventName`.
     * No checks are made to see if the listener has already been added. Multiple calls passing the same combination of
     * `eventName` and listener will result in the listener being added, and called, multiple times.
     * @param event The name of the event.
     * @param handler The callback function.
     */
    on<K: PageEvents>(
      eventName: K,
      handler: (e: $ElementType<PageEventObj, K>, ...args: Array<mixed>) => void
    ): Page;

    /**
     * Adds a one time listener function for the event named `eventName`.
     * The next time `eventName` is triggered, this listener is removed and then invoked.
     * @param event The name of the event.
     * @param handler The callback function.
     */
    once<K: PageEvents>(
      eventName: K,
      handler: (e: $ElementType<PageEventObj, K>, ...args: Array<mixed>) => void
    ): Page;

    /**
     * Generates a PDF of the page with `print` css media.
     * To generate a pdf with `screen` media, call `page.emulateMedia('screen')` before calling `page.pdf()`:
     * @param options The PDF parameters.
     */
    pdf(options?: $Shape<PDFOptions>): Promise<Buffer>;

    /**
     * The method iterates JavaScript heap and finds all the objects with the given prototype.
     * @param prototypeHandle A handle to the object prototype.
     */
    queryObjects(prototypeHandle: JSHandle): Promise<JSHandle>;

    /**
     * Reloads the current page.
     * @param options The navigation parameters.
     */
    reload(options?: NavigationOptions): Promise<Response>;

    /**
     * Captures a screenshot of the page.
     * @param options The screenshot options.
     */
    screenshot(options?: ScreenshotOptions): Promise<Buffer>;

    /**
     * Triggers a `change` and `input` event once all the provided options have been selected.
     * If there's no `<select>` element matching selector, the method throws an error.
     * @param selector A selector to query page for.
     * @param values Values of options to select. If the `<select>` has the `multiple` attribute,
     * all values are considered, otherwise only the first one is taken into account.
     */
    select(selector: string, ...values: Array<string>): Promise<Array<string>>;

    /**
     * Determines whether cache is enabled on the page.
     * @param enabled Whether or not to enable cache on the page.
     */
    setCacheEnabled(enabled: boolean): Promise<void>;

    /**
     * Sets the cookies on the page.
     * @param cookies The cookies to set.
     */
    setCookie(...cookies: Array<SetCookie>): Promise<void>;

    /**
     * This setting will change the default maximum navigation time of 30 seconds for the following methods:
     * - `page.goto`
     * - `page.goBack`
     * - `page.goForward`
     * - `page.reload`
     * - `page.waitForNavigation`
     */
    setDefaultNavigationTimeout(timeout: number): void;

    /**
     * The extra HTTP headers will be sent with every request the page initiates.
     * @param headers An object containing additional http headers to be sent with every request. All header values must be strings.
     */
    setExtraHTTPHeaders(headers: Headers): Promise<void>;

    /**
     * Determines whether JavaScript is enabled on the page.
     * @param enable Whether or not to enable JavaScript on the page.
     */
    setJavaScriptEnabled(enabled: boolean): Promise<void>;

    /**
     * Determines whether the offline mode is enabled.
     * @param enabled When `true`, enables the offline mode for the page.
     */
    setOfflineMode(enabled: boolean): Promise<void>;

    /**
     * Determines whether the request interception is enabled.
     * @param enabled When `true` the methods `request.abort`, `request.continue` and `request.respond` must be used.
     */
    setRequestInterception(enabled: boolean): Promise<void>;

    /**
     * Specifies the User-Agent used in this page.
     * @param userAgent The user-agent to be used in the page.
     */
    setUserAgent(userAgent: string): Promise<void>;

    /**
     * Sets the viewport of the page.
     * @param viewport The viewport parameters.
     */
    setViewport(viewport: Viewport): Promise<void>;

    /**
     * This method fetches an element with `selector`, scrolls it into view if needed,
     * and then uses page.touchscreen to tap in the center of the element.
     * @param selector A `selector` to search for element to tap. If there are multiple elements
     * satisfying the selector, the first will be tapped.
     */
    tap(selector: string): Promise<void>;

    /** @returns The target this page was created from */
    target(): Target;

    /** Returns the page's title. */
    title(): Promise<string>;

    /** Returns the virtual touchscreen object. */
    touchscreen: Touchscreen;

    /** Returns the tracing object. */
    tracing: Tracing;

    /**
     * Sends a `keydown`, `keypress/input`, and `keyup` event for each character in the text.
     * @param selector A selector of an element to type into. If there are multiple elements satisfying the selector, the first will be used.
     * @param text: A text to type into a focused element.
     * @param options: The typing parameters.
     */
    type(selector: string, text: string, options?: { delay: number }): Promise<void>;

    /**
     * The page's URL. This is a shortcut for `page.mainFrame().url()`
     */
    url(): string;

    /** Gets the page viewport. */
    viewport(): Viewport;

    /**
     * Wait for the page navigation occur.
     * @param options The navigation parameters.
     */
    waitForNavigation(options?: NavigationOptions): Promise<Response>;
  }

  /** A Browser is created when Puppeteer connects to a Chromium instance, either through puppeteer.launch or puppeteer.connect. */
  declare interface Browser extends OverridableEventEmitter {
    /**
     * Closes browser with all the pages (if any were opened).
     * The browser object itself is considered to be disposed and can not be used anymore.
     */
    close(): Promise<void>;

    /**
     * Disconnects Puppeteer from the browser, but leaves the Chromium process running.
     * After calling `disconnect`, the browser object is considered disposed and cannot be used anymore.
     */
    disconnect(): void;

    /** Promise which resolves to a new Page object. */
    newPage(): Promise<Page>;

    /**
     * Adds the listener function to the end of the listeners array for the event named `eventName`.
     * No checks are made to see if the listener has already been added. Multiple calls passing the same combination of
     * `eventName` and listener will result in the listener being added, and called, multiple times.
     * @param event The name of the event.
     * @param handler The callback function.
     */
    on<K: BrowserEvents>(
      eventName: K,
      handler: (e: $ElementType<BrowserEventObj, K>, ...args: Array<mixed>) => void
    ): Browser;

    /**
     * Adds a one time listener function for the event named `eventName`.
     * The next time `eventName` is triggered, this listener is removed and then invoked.
     * @param event The name of the event.
     * @param handler The callback function.
     */
    once<K: BrowserEvents>(
      eventName: K,
      handler: (e: $ElementType<BrowserEventObj, K>, ...args: Array<mixed>) => void
    ): Browser;

    /** Promise which resolves to an array of all open pages. */
    pages(): Promise<Array<Page>>;

    /** Spawned browser process. Returns `null` if the browser instance was created with `puppeteer.connect` method */
    process(): ChildProcess;

    /** Promise which resolves to an array of all active targets. */
    targets(): Promise<Array<Target>>;

    /**
     * Promise which resolves to the browser's original user agent.
     * **NOTE** Pages can override browser user agent with `page.setUserAgent`.
     */
    userAgent(): Promise<string>;

    /** For headless Chromium, this is similar to HeadlessChrome/61.0.3153.0. For non-headless, this is similar to Chrome/61.0.3153.0. */
    version(): Promise<string>;

    /** Browser websocket endpoint which can be used as an argument to puppeteer.connect. The format is ws://${host}:${port}/devtools/browser/<id> */
    wsEndpoint(): string;
  }

  declare type BrowserEventObj = {
    /** Emitted when puppeteer gets disconnected from the browser instance. */
    disconnected: void,

    /** Emitted when the url of a target changes. */
    targetchanged: Target,

    /** Emitted when a target is created, for example when a new page is opened by `window.open` or `browser.newPage`. */
    targetcreated: Target,

    /** Emitted when a target is destroyed, for example when a page is closed. */
    targetdestroyed: Target,
  };

  declare type Target = {
    /** Creates a Chrome Devtools Protocol session attached to the target. */
    createCDPSession(): Promise<CDPSession>,

    /** Returns the target `Page` or a `null` if the type of the page is not "page". */
    page(): Promise<Page>,

    /** Identifies what kind of target this is.  */
    type(): 'page' | 'service_worker' | 'other',

    /** Returns the target URL. */
    url(): string,
  };

  declare type LaunchOptions = {
    /** Whether to open chrome in appMode. Defaults to false. */
    appMode?: boolean,

    /**
     * Additional arguments to pass to the Chromium instance. List of Chromium
     * flags can be found here.
     */
    args?: Array<string>,

    /** Whether to auto-open DevTools panel for each tab. If this option is true, the headless option will be set false. */
    devtools?: boolean,

    /**
     * Whether to pipe browser process stdout and stderr into process.stdout and
     * process.stderr. Defaults to false.
     */
    dumpio?: boolean,

    /** Specify environment variables that will be visible to Chromium. Defaults to process.env. */
    env?: mixed,

    /**
     * Path to a Chromium executable to run instead of bundled Chromium. If
     * executablePath is a relative path, then it is resolved relative to current
     * working directory.
     */
    executablePath?: string,

    /** Close chrome process on SIGHUP. Defaults to true. */
    handleSIGHUP?: boolean,

    /** Close chrome process on Ctrl-C. Defaults to true. */
    handleSIGINT?: boolean,

    /** Close chrome process on SIGTERM. Defaults to true. */
    handleSIGTERM?: boolean,

    /** Whether to run Chromium in headless mode. Defaults to true. */
    headless?: boolean,

    /** Do not use `puppeteer.defaultArgs()` for launching Chromium. Defaults to false. */
    ignoreDefaultArgs?: boolean,

    /** Whether to ignore HTTPS errors during navigation. Defaults to false. */
    ignoreHTTPSErrors?: boolean,

    /**
     * Slows down Puppeteer operations by the specified amount of milliseconds.
     * Useful so that you can see what is going on.
     */
    slowMo?: number,

    /**
     * Maximum time in milliseconds to wait for the Chrome instance to start.
     * Defaults to 30000 (30 seconds). Pass 0 to disable timeout.
     */
    timeout?: number,

    /** Path to a User Data Directory. */
    userDataDir?: string,
  };

  declare type ConnectOptions = {
    /** A browser websocket endpoint to connect to. */
    browserWSEndpoint?: string,

    /**
     * Whether to ignore HTTPS errors during navigation.
     * @default false
     */
    ignoreHTTPSErrors?: boolean,
  };

  declare interface CDPSession extends events$EventEmitter {
    /**
     * Detaches session from target. Once detached, session won't emit any events and can't be used
     * to send messages.
     */
    detach(): Promise<void>;

    /**
     * @param method Protocol method name
     */
    // eslint-disable-next-line flowtype/no-weak-types
    send(method: string, params?: Object): Promise<mixed>;
  }

  declare type Coverage = {
    startCSSCoverage(options?: StartCoverageOptions): Promise<void>,
    startJSCoverage(options?: StartCoverageOptions): Promise<void>,
    stopCSSCoverage(): Promise<Array<CoverageEntry>>,
    stopJSCoverage(): Promise<Array<CoverageEntry>>,
  };

  declare type StartCoverageOptions = {
    /** Whether to reset coverage on every navigation. Defaults to `true`. */
    resetOnNavigation?: boolean,
  };

  declare type CoverageEntry = {
    ranges: Array<{ end: number, start: number }>,
    text: string,
    url: string,
  };

  /** Attaches Puppeteer to an existing Chromium instance */
  declare function connect(options?: ConnectOptions): Promise<Browser>;
  /** The default flags that Chromium will be launched with */
  declare function defaultArgs(): Array<string>;
  /** Path where Puppeteer expects to find bundled Chromium */
  declare function executablePath(): string;
  /** The method launches a browser instance with given arguments. The browser will be closed when the parent node.js process is closed. */
  declare function launch(options?: LaunchOptions): Promise<Browser>;
}
