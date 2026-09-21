/** A local reference to a reusable OpenCLI component. */
export type OpenCliDevReference = { $ref: string };
/** Draft 2020-12 JSON Schema, retained without expansion. */
export type JsonSchema = boolean | { [key: string]: unknown };
export type OpenCliDevValueType = 'string' | 'number' | 'integer' | 'boolean' | 'file' | 'path';
export type OpenCliDevValue = {
  name: string;
  description?: string;
  type?: OpenCliDevValueType;
  format?: string;
  default?: string | number | boolean | null;
  required?: boolean;
  choices?: string[];
  placeholder?: string;
  sensitive?: boolean;
};
export type OpenCliDevArgument = OpenCliDevValue & { variadic?: boolean };
export type OpenCliDevFlag = OpenCliDevValue & {
  short?: string;
  longDescription?: string;
  hidden?: boolean;
  deprecated?: boolean;
  deprecationMessage?: string;
  envVar?: string;
  repeatable?: boolean;
  splitOnComma?: boolean;
  count?: boolean;
  trackChanged?: boolean;
};
export type OpenCliDevExample = { command: string; description?: string; output?: string };
export type OpenCliDevExitCode = { code: number; label?: string; description?: string };
export type OpenCliDevCommand = {
  name: string;
  operationId?: string;
  aliases?: string[];
  description?: string;
  longDescription?: string;
  usage?: string;
  hidden?: boolean;
  deprecated?: boolean;
  deprecationMessage?: string;
  flags?: (OpenCliDevFlag | OpenCliDevReference)[];
  arguments?: (OpenCliDevArgument | OpenCliDevReference)[];
  commands?: (OpenCliDevCommand | OpenCliDevReference)[];
  examples?: (OpenCliDevExample | OpenCliDevReference)[];
  envVars?: { name: string; description?: string; default?: string }[];
  tags?: string[];
  exitCodes?: OpenCliDevExitCode[];
  flagGroups?: {
    type: 'mutuallyExclusive' | 'requiredTogether' | 'oneRequired';
    flags: string[];
    description?: string;
  }[];
  stdin?: { description?: string; required?: boolean; format?: string };
  output?: {
    formatFlag?: string;
    formats: { format: string; value?: string; description?: string; default?: boolean; schema?: JsonSchema }[];
  };
};
/** opencli-dev OpenCLI 0.1.0 document. This is distinct from bcdxn OpenCLI. */
export type OpenCliDevDocument = {
  $schema?: string;
  opencli: '0.1.0';
  info?: {
    title: string;
    version: string;
    description?: string;
    longDescription?: string;
    binaryName?: string;
    homepage?: string;
    documentationUrl?: string;
    contact?: { name?: string; email?: string; url?: string };
    license?: { name: string; url?: string };
  };
  commands: (OpenCliDevCommand | OpenCliDevReference)[];
  flags?: (OpenCliDevFlag | OpenCliDevReference)[];
  exitCodes?: OpenCliDevExitCode[];
  components?: {
    commands?: Record<string, OpenCliDevCommand>;
    flags?: Record<string, OpenCliDevFlag>;
    arguments?: Record<string, OpenCliDevArgument>;
    examples?: Record<string, OpenCliDevExample>;
    schemas?: Record<string, JsonSchema>;
  };
};
