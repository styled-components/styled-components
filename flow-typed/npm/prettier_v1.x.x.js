// flow-typed signature: a18c145fa181510ba16b10d17fc3a5a8
// flow-typed version: 01acbe56d4/prettier_v1.x.x/flow_>=v0.104.x

declare module "prettier" {
  declare export type AST = { [key: string]: any, ... };
  declare export type Doc = {
    [key: string]: any,
    ...
  };
  declare export type FastPath<T = any> = {
    stack: any[],
    getName(): null | string | number | Symbol,
    getValue(): T,
    getNode(count?: number): null | T,
    getParentNode(count?: number): null | T,
    call<U>(callback: (path: FastPath<T>) => U, ...names: Array<string | number | Symbol>): U,
    each(callback: (path: FastPath<T>) => void, ...names: Array<string | number | Symbol>): void,
    map<U>(callback: (path: FastPath<T>, index: number) => U, ...names: Array<string | number | Symbol>): U[],
    ...
  };

  declare export type PrettierParserName =
    | "babylon" // deprecated
    | "babel"
    | "babel-flow"
    | "flow"
    | "typescript"
    | "postcss" // deprecated
    | "css"
    | "less"
    | "scss"
    | "json"
    | "json5"
    | "json-stringify"
    | "graphql"
    | "markdown"
    | "vue"
    | "html"
    | "angular"
    | "mdx"
    | "yaml";

  declare export type PrettierParser = {
    [name: PrettierParserName]: (text: string, options?: { [key: string]: any, ... }) => AST,
    ...
  };

  declare export type CustomParser = (
    text: string,
    parsers: PrettierParser,
    options: Options
  ) => AST;

  declare export type Options = {|
    printWidth?: number,
    tabWidth?: number,
    useTabs?: boolean,
    semi?: boolean,
    singleQuote?: boolean,
    trailingComma?: "none" | "es5" | "all",
    bracketSpacing?: boolean,
    jsxBracketSameLine?: boolean,
    arrowParens?: "avoid" | "always",
    rangeStart?: number,
    rangeEnd?: number,
    parser?: PrettierParserName | CustomParser,
    filepath?: string,
    requirePragma?: boolean,
    insertPragma?: boolean,
    proseWrap?: "always" | "never" | "preserve",
    plugins?: Array<string | Plugin>
  |};

  declare export type Plugin = {
    languages: SupportLanguage,
    parsers: { [parserName: string]: Parser, ... },
    printers: { [astFormat: string]: Printer, ... },
    options?: SupportOption[],
    ...
  };

  declare export type Parser = {
    parse: (
      text: string,
      parsers: { [parserName: string]: Parser, ... },
      options: { [key: string]: any, ... }
    ) => AST,
    astFormat: string,
    hasPragma?: (text: string) => boolean,
    locStart: (node: any) => number,
    locEnd: (node: any) => number,
    preprocess?: (text: string, options: { [key: string]: any, ... }) => string,
    ...
  };

  declare export type Printer = {
    print: (
      path: FastPath<>,
      options: { [key: string]: any, ... },
      print: (path: FastPath<>) => Doc
    ) => Doc,
    embed: (
      path: FastPath<>,
      print: (path: FastPath<>) => Doc,
      textToDoc: (text: string, options: { [key: string]: any, ... }) => Doc,
      options: { [key: string]: any, ... }
    ) => ?Doc,
    insertPragma?: (text: string) => string,
    massageAstNode?: (node: any, newNode: any, parent: any) => any,
    hasPrettierIgnore?: (path: FastPath<>) => boolean,
    canAttachComment?: (node: any) => boolean,
    willPrintOwnComments?: (path: FastPath<>) => boolean,
    printComments?: (path: FastPath<>, print: (path: FastPath<>) => Doc, options: { [key: string]: any, ... }, needsSemi: boolean) => Doc,
    handleComments?: {
      ownLine?: (commentNode: any, text: string, options: { [key: string]: any, ... }, ast: any, isLastComment: boolean) => boolean,
      endOfLine?: (commentNode: any, text: string, options: { [key: string]: any, ... }, ast: any, isLastComment: boolean) => boolean,
      remaining?: (commentNode: any, text: string, options: { [key: string]: any, ... }, ast: any, isLastComment: boolean) => boolean,
      ...
    },
    ...
  };

  declare export type CursorOptions = {|
    cursorOffset: number,
    printWidth?: $PropertyType<Options, "printWidth">,
    tabWidth?: $PropertyType<Options, "tabWidth">,
    useTabs?: $PropertyType<Options, "useTabs">,
    semi?: $PropertyType<Options, "semi">,
    singleQuote?: $PropertyType<Options, "singleQuote">,
    trailingComma?: $PropertyType<Options, "trailingComma">,
    bracketSpacing?: $PropertyType<Options, "bracketSpacing">,
    jsxBracketSameLine?: $PropertyType<Options, "jsxBracketSameLine">,
    arrowParens?: $PropertyType<Options, "arrowParens">,
    parser?: $PropertyType<Options, "parser">,
    filepath?: $PropertyType<Options, "filepath">,
    requirePragma?: $PropertyType<Options, "requirePragma">,
    insertPragma?: $PropertyType<Options, "insertPragma">,
    proseWrap?: $PropertyType<Options, "proseWrap">,
    plugins?: $PropertyType<Options, "plugins">
  |};

  declare export type CursorResult = {|
    formatted: string,
    cursorOffset: number
  |};

  declare export type ResolveConfigOptions = {|
    useCache?: boolean,
    config?: string,
    editorconfig?: boolean
  |};

  declare export type SupportLanguage = {
    name: string,
    since: string,
    parsers: Array<string>,
    group?: string,
    tmScope: string,
    aceMode: string,
    codemirrorMode: string,
    codemirrorMimeType: string,
    aliases?: Array<string>,
    extensions: Array<string>,
    filenames?: Array<string>,
    linguistLanguageId: number,
    vscodeLanguageIds: Array<string>,
    ...
  };

  declare export type SupportOption = {|
    since: string,
    type: "int" | "boolean" | "choice" | "path",
    deprecated?: string,
    redirect?: SupportOptionRedirect,
    description: string,
    oppositeDescription?: string,
    default: SupportOptionValue,
    range?: SupportOptionRange,
    choices?: SupportOptionChoice
  |};

  declare export type SupportOptionRedirect = {|
    options: string,
    value: SupportOptionValue
  |};

  declare export type SupportOptionRange = {|
    start: number,
    end: number,
    step: number
  |};

  declare export type SupportOptionChoice = {|
    value: boolean | string,
    description?: string,
    since?: string,
    deprecated?: string,
    redirect?: SupportOptionValue
  |};

  declare export type SupportOptionValue = number | boolean | string;

  declare export type SupportInfo = {|
    languages: Array<SupportLanguage>,
    options: Array<SupportOption>
  |};
                                                             
  declare export type FileInfo = {|
    ignored: boolean,
    inferredParser: PrettierParserName | null,
  |};                                                          

  declare export type Prettier = {|
    format: (source: string, options?: Options) => string,
    check: (source: string, options?: Options) => boolean,
    formatWithCursor: (source: string, options: CursorOptions) => CursorResult,
    resolveConfig: {
      (filePath: string, options?: ResolveConfigOptions): Promise<?Options>,
      sync(filePath: string, options?: ResolveConfigOptions): ?Options,
      ...
    },
    clearConfigCache: () => void,
    getSupportInfo: (version?: string) => SupportInfo,
    getFileInfo: (filePath: string) => Promise<FileInfo>
  |};

  declare export default Prettier;
}
