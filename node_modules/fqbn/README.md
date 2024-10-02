<a name="readmemd"></a>

fqbn / [Exports](#modulesmd)

# fqbn

Arduino FQBN (fully qualified board name)

> ℹ️ [What's the FQBN string?](https://arduino.github.io/arduino-cli/dev/FAQ/#whats-the-fqbn-string)

## Install

```sh
npm install fqbn
```

## Usage

CommonJS:

```js
const { FQBN, valid } = require('fqbn');
```

TypeScript:

```ts
import { FQBN, valid } from 'fqbn';
```

<a name="classesfqbnmd"></a>

[fqbn](#readmemd) / [Exports](#modulesmd) / FQBN

# Class: FQBN

FQBN stands for Fully Qualified Board Name. It has the following format:
`VENDOR:ARCHITECTURE:BOARD_ID[:MENU_ID=OPTION_ID[,MENU2_ID=OPTION_ID ...]]`,
with each `MENU_ID=OPTION_ID` being an optional key-value pair configuration.
Each field accepts letters (`A-Z` or `a-z`), numbers (`0-9`), underscores (`_`), dashes(`-`) and dots(`.`).
The special character `=` is accepted in the configuration value. The `VENDOR` an `ARCHITECTURE` parts can be empty.
For a deeper understanding of how FQBN works, you should understand the
[Arduino platform specification](https://arduino.github.io/arduino-cli/dev/platform-specification/).

## Table of contents

### Constructors

- [constructor](#constructor)

### Properties

- [arch](#arch)
- [boardId](#boardid)
- [options](#options)
- [vendor](#vendor)

### Methods

- [equals](#equals)
- [sanitize](#sanitize)
- [toString](#tostring)
- [withConfigOptions](#withconfigoptions)

## Constructors

### constructor

• **new FQBN**(`fqbn`): [`FQBN`](#classesfqbnmd)

Creates a new [FQBN](#classesfqbnmd) instance after parsing the raw FQBN string. Errors when the FQBN string is invalid.

#### Parameters

| Name   | Type     | Description                  |
| :----- | :------- | :--------------------------- |
| `fqbn` | `string` | the raw FQBN string to parse |

#### Returns

[`FQBN`](#classesfqbnmd)

**`Example`**

```ts
// valid FQBN
const fqbn1 = new FQBN('arduino:samd:mkr1000');
assert.ok(fqbn1);
assert.strictEqual(fqbn1.vendor, 'arduino');
assert.strictEqual(fqbn1.arch, 'samd');
assert.strictEqual(fqbn1.boardId, 'mkr1000');
assert.strictEqual(fqbn1.options, undefined);
```

**`Example`**

```ts
// valid FQBN with custom board options
const fqbn2 = new FQBN('arduino:samd:mkr1000:o1=v1');
assert.ok(fqbn2);
assert.strictEqual(fqbn2.vendor, 'arduino');
assert.strictEqual(fqbn2.arch, 'samd');
assert.strictEqual(fqbn2.boardId, 'mkr1000');
assert.deepStrictEqual(fqbn2.options, { o1: 'v1' });
```

**`Example`**

```ts
// invalid FQBN
assert.throws(() => new FQBN('invalid'));
```

## Properties

### arch

• `Readonly` **arch**: `string`

The architecture of the board. Can be any empty string.

---

### boardId

• `Readonly` **boardId**: `string`

The unique board identifier per [vendor](#vendor) and [architecture](#arch).

---

### options

• `Optional` `Readonly` **options**: `Readonly`\<`Record`\<`string`, `string`\>\>

Optional custom board options and their selected values.

---

### vendor

• `Readonly` **vendor**: `string`

The vendor identifier. Can be any empty string.

## Methods

### equals

▸ **equals**(`other`): `boolean`

`true` if the `other` [FQBN](#classesfqbnmd) equals to `this`. The custom board config options key order is insignificant.

#### Parameters

| Name    | Type                     | Description     |
| :------ | :----------------------- | :-------------- |
| `other` | [`FQBN`](#classesfqbnmd) | the other FQBN. |

#### Returns

`boolean`

`true` if equals. Otherwise, `false`.

**`Example`**

```ts
// the custom board option keys order is insignificant when comparing two FQBNs
assert.ok(
  new FQBN('arduino:samd:mkr1000:o1=v1,o2=v2').equals(
    new FQBN('arduino:samd:mkr1000:o2=v2,o1=v1')
  )
);
```

---

### sanitize

▸ **sanitize**(): [`FQBN`](#classesfqbnmd)

Returns a new [FQBN](#classesfqbnmd) instance without any config options.

#### Returns

[`FQBN`](#classesfqbnmd)

the new FQBN

**`Example`**

```ts
// removes the custom board config options
assert.strictEqual(
  new FQBN('arduino:samd:mkr1000:o1=v1,o2=v2').sanitize().toString(),
  'arduino:samd:mkr1000'
);
```

**`Example`**

```ts
// returns the same instance when no custom board options are available
const fqbn = new FQBN('arduino:samd:mkr1000');
assert.ok(fqbn === fqbn.sanitize());
```

---

### toString

▸ **toString**(`skipOptions?`): `string`

Creates the string representation of the FQBN instance.

#### Parameters

| Name          | Type      | Default value | Description                                                                                |
| :------------ | :-------- | :------------ | :----------------------------------------------------------------------------------------- |
| `skipOptions` | `boolean` | `false`       | when `true`, any custom board config options won't be serialized. It's `false` by default. |

#### Returns

`string`

the string representation of the FQBN.

**`Example`**

```ts
// creates the string representation of the FQBN
assert.strictEqual(
  new FQBN('arduino:samd:mkr1000').toString(),
  'arduino:samd:mkr1000'
);
```

**`Example`**

```ts
// keeps the order of the custom board option keys
assert.strictEqual(
  new FQBN('arduino:samd:mkr1000:o1=v1').toString(),
  'arduino:samd:mkr1000:o1=v1'
);
```

**`Example`**

```ts
// can skip the config options from the serialization
assert.strictEqual(
  new FQBN('arduino:samd:mkr1000:o1=v1').toString(true),
  'arduino:samd:mkr1000'
);
```

---

### withConfigOptions

▸ **withConfigOptions**(`...configOptions`): [`FQBN`](#classesfqbnmd)

Creates an immutable copy of the current [FQBN](#classesfqbnmd) after updating the [custom board config options](https://arduino.github.io/arduino-cli/latest/rpc/commands/#configoption).
Adds the new config options and updates the existing ones. New entries are appended to the end of the FQBN. Updates never changes the order.

#### Parameters

| Name               | Type                              | Description                                                                                                                                                                                                              |
| :----------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `...configOptions` | [`ConfigOption`](#configoption)[] | to update the FQBN with. The config options are provided by the Arduino CLI via the gRPC equivalent of the [`board --details`](https://arduino.github.io/arduino-cli/latest/rpc/commands/#boarddetailsresponse) command. |

#### Returns

[`FQBN`](#classesfqbnmd)

**`Example`**

```ts
// creates a new FQBN instance by appending the custom board options to the end of the FQBN
const fqbn1 = new FQBN('arduino:samd:mkr1000');
const fqbn2 = fqbn1.withConfigOptions({
  option: 'o1',
  values: [
    { value: 'v1', selected: true },
    { value: 'v2', selected: false },
  ],
});
assert.strictEqual(fqbn2.vendor, 'arduino');
assert.strictEqual(fqbn2.arch, 'samd');
assert.strictEqual(fqbn2.boardId, 'mkr1000');
assert.deepStrictEqual(fqbn2.options, { o1: 'v1' });
```

**`Example`**

```ts
// FQBNs are immutable
assert.strictEqual(fqbn1.options, undefined);
assert.ok(fqbn2.options);
```

**`Example`**

```ts
// never changes the position of existing config option keys, but updates the selected value
const fqbn3 = fqbn2.withConfigOptions(
  {
    option: 'o1',
    values: [
      { value: 'v1', selected: false },
      { value: 'v2', selected: true },
    ],
  },
  {
    option: 'o2',
    values: [
      { value: 'v2', selected: true },
      { value: 'w2', selected: false },
    ],
  }
);
assert.deepStrictEqual(fqbn3.options, { o1: 'v2', o2: 'v2' });
```

<a name="modulesmd"></a>

[fqbn](#readmemd) / Exports

# fqbn

## Table of contents

### Classes

- [FQBN](#classesfqbnmd)

### Type Aliases

- [ConfigOption](#configoption)
- [ConfigValue](#configvalue)

### Functions

- [valid](#valid)

## Type Aliases

### ConfigOption

Ƭ **ConfigOption**: `Object`

Lightweight representation of a custom board [config option](https://arduino.github.io/arduino-cli/latest/rpc/commands/#configoption) provided by the Arduino CLI.

#### Type declaration

| Name           | Type                                     | Description                                                             |
| :------------- | :--------------------------------------- | :---------------------------------------------------------------------- |
| `option`       | `string`                                 | ID of the configuration option. For identifying the option to machines. |
| `optionLabel?` | `string`                                 | Name of the configuration option for identifying the option to humans.  |
| `values`       | readonly [`ConfigValue`](#configvalue)[] | Possible values of the configuration option.                            |

---

### ConfigValue

Ƭ **ConfigValue**: `Object`

The bare minimum representation of the [`ConfigValue`](https://arduino.github.io/arduino-cli/latest/rpc/commands/#configvalue) provided by the CLI via the gRPC equivalent of the [`board --details`](https://arduino.github.io/arduino-cli/latest/rpc/commands/#boarddetailsrequest) command.

#### Type declaration

| Name          | Type      | Description                                           |
| :------------ | :-------- | :---------------------------------------------------- |
| `selected`    | `boolean` | Whether the configuration option is selected.         |
| `value`       | `string`  | The configuration option value.                       |
| `valueLabel?` | `string`  | Label to identify the configuration option to humans. |

## Functions

### valid

▸ **valid**(`fqbn`): [`FQBN`](#classesfqbnmd) \| `undefined`

Returns the parsed [FQBN](#classesfqbnmd) if valid. Otherwise, `undefined`.

#### Parameters

| Name   | Type     | Description      |
| :----- | :------- | :--------------- |
| `fqbn` | `string` | the FQBN string. |

#### Returns

[`FQBN`](#classesfqbnmd) \| `undefined`

the parsed FQBN or `undefined`.

**`Example`**

```ts
// valid FQBN
assert.ok(valid('arduino:samd:mkr1000') instanceof FQBN);
```

**`Example`**

```ts
// invalid FQBN
assert.strictEqual(valid('invalid'), undefined);
```
