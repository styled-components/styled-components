// flow-typed signature: 4eed8da2dc730dc33e7710b465eaa44b
// flow-typed version: cc7a557b34/prettier_v1.x.x/flow_>=v0.56.x

declare module "prettier" {
  declare type AST = Object;
  declare type Doc = Object;
  declare type FastPath = Object;

  declare type PrettierParserName =
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

  declare type PrettierParser = {
    [name: PrettierParserName]: (text: string, options?: Object) => AST
  };

  declare type CustomParser = (
    text: string,
    parsers: PrettierParser,
    options: Options
  ) => AST;

  declare type Options = {|
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

  declare type Plugin = {
    languages: SupportLanguage,
    parsers: { [parserName: string]: Parser },
    printers: { [astFormat: string]: Printer }
  };

  declare type Parser = {
    parse: (
      text: string,
      parsers: { [parserName: string]: Parser },
      options: Object
    ) => AST,
    astFormat: string
  };

  declare type Printer = {
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

  declare type CursorOptions = {|
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

  declare type CursorResult = {|
    formatted: string,
    cursorOffset: number
  |};

  declare type ResolveConfigOptions = {|
    useCache?: boolean,
    config?: string,
    editorconfig?: boolean
  |};

  declare type SupportLanguage = {
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

  declare type SupportOption = {|
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

  declare type SupportOptionRedirect = {|
    options: string,
    value: SupportOptionValue
  |};

  declare type SupportOptionRange = {|
    start: number,
    end: number,
    step: number
  |};

  declare type SupportOptionChoice = {|
    value: boolean | string,
    description?: string,
    since?: string,
    deprecated?: string,
    redirect?: SupportOptionValue
  |};

  declare type SupportOptionValue = number | boolean | string;

  declare type SupportInfo = {|
    languages: Array<SupportLanguage>,
    options: Array<SupportOption>
  |};

  declare type Prettier = {|
    format: (source: string, options?: Options) => string,
    check: (source: string, options?: Options) => boolean,
    formatWithCursor: (source: string, options: CursorOptions) => CursorResult,
    resolveConfig: {
      (filePath: string, options?: ResolveConfigOptions): Promise<?Options>,
      sync(filePath: string, options?: ResolveConfigOptions): Promise<?Options>
    },
    clearConfigCache: () => void,
    getSupportInfo: (version?: string) => SupportInfo
  |};

  declare export default Prettier;
}
