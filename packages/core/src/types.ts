/** Vendor-aligned TypeScript representation of OpenCLI 1.0.0-alpha.14. */
export type ExtensionProperties = { [key: `x-${string}`]: unknown };
export type ValueType = 'string' | 'number' | 'integer' | 'boolean';
export type ChoiceObject = ExtensionProperties & { value: string | number | boolean; description?: string };
export type LicenseObject = ExtensionProperties & { name: string; spdxId?: string; url?: string };
export type ContactObject = ExtensionProperties &
  (
    | { name: string; email?: string; url?: string }
    | { name?: string; email: string; url?: string }
    | { name?: string; email?: string; url: string }
  );
export type InfoObject = ExtensionProperties & {
  title: string;
  binary: string;
  version: string;
  summary?: string;
  description?: string;
  license?: LicenseObject;
  contact?: ContactObject;
};
export type InstallMethodItemObject = ExtensionProperties & { name: string; description?: string } & (
    | { command: string; url?: string }
    | { command?: string; url: string }
  );
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
export type AlternativeSource = ExtensionProperties & { type: '$ENV' | '$FILE'; property: string };
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
export type CommandExampleObject = ExtensionProperties & { title?: string; content: string };
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
export type GlobalObject = ExtensionProperties & {
  exitCodes?: ExitCodeObject[];
  config?: ExtensionProperties & { json?: string; toml?: string; yaml?: string };
  flags?: FlagItemObject[];
};
export type OpenCliDocument = ExtensionProperties & {
  opencliVersion: '1.0.0-alpha.14';
  info: InfoObject;
  install?: InstallMethodItemObject[];
  global?: GlobalObject;
  commands?: Record<string, CommandItemObject>;
};
