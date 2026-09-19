/** Vendor-aligned TypeScript representation of OpenCLI 1.0.0-alpha.14. */
/** Vendor extension keys permitted throughout an OpenCLI document. */
export type ExtensionProperties = { [key: `x-${string}`]: unknown };
/** Primitive value types supported by CLI arguments and flags. */
export type ValueType = 'string' | 'number' | 'integer' | 'boolean';
/** One allowed value and its optional user-facing description. */
export type ChoiceObject = ExtensionProperties & { value: string | number | boolean; description?: string };
/** License metadata for a described CLI. */
export type LicenseObject = ExtensionProperties & { name: string; spdxId?: string; url?: string };
/** A maintainer contact with at least one contact method. */
export type ContactObject = ExtensionProperties &
  (
    | { name: string; email?: string; url?: string }
    | { name?: string; email: string; url?: string }
    | { name?: string; email?: string; url: string }
  );
/** Identity and overview shown in generated documentation. */
export type InfoObject = ExtensionProperties & {
  title: string;
  binary: string;
  version: string;
  summary?: string;
  description?: string;
  license?: LicenseObject;
  contact?: ContactObject;
};
/** A command or URL users can use to install the CLI. */
export type InstallMethodItemObject = ExtensionProperties & { name: string; description?: string } & (
    | { command: string; url?: string }
    | { command?: string; url: string }
  );
/** A process exit code with its OpenCLI status and explanation. */
export type ExitCodeObject = ExtensionProperties & {
  code: number;
  status:
    | 'BAD_USER_INPUT_ERROR'
    | 'UNAUTHENTICATED_ERROR'
    | 'UNAUTHORIZED_ERROR'
    | 'CANCELED_ERROR'
    | 'INTERNAL_CLI_ERROR'
    | 'NOT_IMPLEMENTED_ERROR'
    | 'OK';
  summary: string;
  description?: string;
};
/** An environment variable or file that can supply a flag value. */
export type AlternativeSource = ExtensionProperties & { type: '$ENV' | '$FILE'; property: string };
/** A positional command argument and its constraints. */
export type ArgumentItemObject = ExtensionProperties & {
  name: string;
  type?: ValueType;
  variadic?: boolean;
  minItems?: number;
  maxItems?: number;
  choices?: ChoiceObject[];
  summary?: string;
  description?: string;
  required?: boolean;
  passthrough?: boolean;
};
/** A named command option and its constraints. */
export type FlagItemObject = ExtensionProperties & {
  name: string;
  type: ValueType;
  aliases?: string[];
  variadic?: boolean;
  minItems?: number;
  maxItems?: number;
  choices?: ChoiceObject[];
  hint?: string;
  summary?: string;
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  alternativeSources?: AlternativeSource[];
  hidden?: boolean;
};
/** A runnable example for a command. */
export type CommandExampleObject = ExtensionProperties & { title?: string; content: string };
/** A command or command group, including arguments, flags, and examples. */
export type CommandItemObject = ExtensionProperties & {
  summary?: string;
  description?: string;
  aliases?: string[];
  args?: ArgumentItemObject[];
  flags?: FlagItemObject[];
  hidden?: boolean;
  kind?: 'action' | 'group';
  exitCodes?: ExitCodeObject[];
  examples?: CommandExampleObject[];
};
/** Options and configuration shared by all commands. */
export type GlobalObject = ExtensionProperties & {
  exitCodes?: ExitCodeObject[];
  config?: ExtensionProperties & { json?: string; toml?: string; yaml?: string };
  flags?: FlagItemObject[];
};
/** The root OpenCLI document consumed by clidoc. */
export type OpenCliDocument = ExtensionProperties & {
  opencliVersion: '1.0.0-alpha.14';
  info: InfoObject;
  install?: InstallMethodItemObject[];
  global?: GlobalObject;
  commands?: Record<string, CommandItemObject>;
};
