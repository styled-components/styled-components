// flow-typed signature: 066c92e9ccb5f0711df8d73cbca837d6
// flow-typed version: 9e32affdbd/prettier_v1.x.x/flow_>=v0.56.x

declare module "prettier" {
  declare export type AST = Object;
  declare export type Doc = Object;
  declare export type FastPath = Object;

  declare export type PrettierParserName =
    | "babylon"
    | "flow"
    | "typescript"
    | "postcss"
    | "css"
    | "less"
    | "scss"
    | "json"
    | "graphql"
    | "markdown"
    | "vue";

  declare export type PrettierParser = {
    [name: PrettierParserName]: (text: string, options?: Object) => AST
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
    parsers: { [parserName: string]: Parser },
    printers: { [astFormat: string]: Printer }
  };

  declare export type Parser = {
    parse: (
      text: string,
      parsers: { [parserName: string]: Parser },
      options: Object
    ) => AST,
    astFormat: string
  };

  declare export type Printer = {
    print: (
      path: FastPath,
      options: Object,
      print: (path: FastPath) => Doc
    ) => Doc,
    embed: (
      path: FastPath,
      print: (path: FastPath) => Doc,
      textToDoc: (text: string, options: Object) => Doc,
      options: Object
    ) => ?Doc
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
    vscodeLanguageIds: Array<string>
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

  declare export type Prettier = {|
    format: (source: string, options?: Options) => string,
    check: (source: string, options?: Options) => boolean,
    formatWithCursor: (source: string, options: CursorOptions) => CursorResult,
    resolveConfig: {
      (filePath: string, options?: ResolveConfigOptions): Promise<?Options>,
      sync(filePath: string, options?: ResolveConfigOptions): ?Options
    },
    clearConfigCache: () => void,
    getSupportInfo: (version?: string) => SupportInfo
  |};

  declare export default Prettier;
}
