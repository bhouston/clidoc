// Independently authored compatibility schema. No upstream schema/source is bundled.
const string = { type: 'string' };
const boolean = { type: 'boolean' };
const named = { type: 'string', pattern: '^[a-z][a-z0-9-]*$' };
const shortText = { type: 'string', maxLength: 120 };
const object = (properties: object, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const array = (items: object, minItems = 0) => ({ type: 'array', items, minItems });
const ref = (name: string) => ({ $ref: `#/$defs/${name}` });
// JSON Schema uses a non-callable 'then' keyword, not a Promise method.
// oxlint-disable-next-line unicorn/no-thenable
const reusable = (name: string) => ({ if: { required: ['$ref'] }, then: ref('reference'), else: ref(name) });
const dictionary = (item: object) => ({ type: 'object', additionalProperties: item });
const jsonSchema = { $ref: 'https://json-schema.org/draft/2020-12/schema' };
const value = {
  name: named,
  description: string,
  type: { enum: ['string', 'number', 'integer', 'boolean', 'file', 'path'] },
  format: string,
  default: { type: ['string', 'number', 'boolean', 'null'] },
  required: boolean,
  choices: array(string),
  placeholder: string,
  sensitive: boolean,
};
const prose = { description: shortText, longDescription: string };
const deprecated = { deprecated: boolean, deprecationMessage: string };
/** clidoc's independently implemented schema for the supported opencli-dev version. */
export const openCliDevSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  ...object(
    {
      $schema: { type: 'string', format: 'uri-reference' },
      opencli: { const: '0.1.0' },
      info: object(
        {
          title: string,
          version: string,
          ...prose,
          binaryName: string,
          homepage: { type: 'string', format: 'uri' },
          documentationUrl: { type: 'string', format: 'uri' },
          contact: object({
            name: string,
            email: { type: 'string', format: 'email' },
            url: { type: 'string', format: 'uri' },
          }),
          license: object({ name: string, url: { type: 'string', format: 'uri' } }, ['name']),
        },
        ['title', 'version'],
      ),
      commands: array(reusable('command'), 1),
      flags: array(reusable('flag')),
      exitCodes: array(ref('exitCode')),
      components: object({
        commands: dictionary(ref('command')),
        flags: dictionary(ref('flag')),
        arguments: dictionary(ref('argument')),
        examples: dictionary(ref('example')),
        schemas: dictionary(jsonSchema),
      }),
    },
    ['opencli', 'commands'],
  ),
  $defs: {
    reference: object(
      { $ref: { type: 'string', pattern: '^#/components/(flags|arguments|commands|examples)/[^/]+$' } },
      ['$ref'],
    ),
    argument: object({ ...value, name: { type: 'string', pattern: '^[A-Z][A-Z0-9_-]*$' }, variadic: boolean }, [
      'name',
    ]),
    flag: object(
      {
        ...value,
        ...prose,
        ...deprecated,
        short: { type: 'string', pattern: '^[a-zA-Z0-9]$' },
        hidden: boolean,
        envVar: { type: 'string', pattern: '^[A-Z_][A-Z0-9_]*$' },
        repeatable: boolean,
        splitOnComma: boolean,
        count: boolean,
        trackChanged: boolean,
      },
      ['name'],
    ),
    example: object({ command: string, description: string, output: string }, ['command']),
    exitCode: object({ code: { type: 'integer', minimum: 0, maximum: 255 }, label: string, description: string }, [
      'code',
    ]),
    command: object(
      {
        name: named,
        ...prose,
        ...deprecated,
        usage: string,
        hidden: boolean,
        operationId: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_]*$' },
        aliases: array(named),
        commands: array(reusable('command')),
        flags: array(reusable('flag')),
        arguments: array(reusable('argument')),
        examples: array(reusable('example')),
        tags: array(string),
        exitCodes: array(ref('exitCode')),
        envVars: array(object({ name: string, description: string, default: string }, ['name'])),
        flagGroups: array(
          object(
            {
              type: { enum: ['mutuallyExclusive', 'requiredTogether', 'oneRequired'] },
              flags: array(named, 2),
              description: string,
            },
            ['type', 'flags'],
          ),
        ),
        stdin: object({ description: string, required: boolean, format: string }),
        output: object(
          {
            formatFlag: named,
            formats: array(
              object({ format: string, value: string, description: string, default: boolean, schema: jsonSchema }, [
                'format',
              ]),
              1,
            ),
          },
          ['formats'],
        ),
      },
      ['name'],
    ),
  },
};
