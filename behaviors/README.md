<img src="./src/icon.svg" width="100" /><br>

# Example Addon 

Description

Author: <@ADDON_AUTHOR> <br>
Website: [https://www.construct.net](https://www.construct.net) <br>
Addon Url: [https://www.construct.net/addons/####/XXXX](https://www.construct.net/addons/####/XXXX) <br>
Download Latest Version : [Version: 1.0.0.0](https://github.com/skymen/XXXX/releases/latest) <br>

<br>

<sub>

Made using [c3-framework](https://github.com/MasterPose/c3-framework) 

</sub>

## Table of Contents

- [Usage](#usage)
- [Examples Files](#examples-files)
- [Properties](#properties)
- [Actions](#actions)
- [Conditions](#conditions)
- [Expressions](#expressions)

---

## Usage

First you must install the dependencies via NPM using:

```
npm install
```

To build the addon, run the following command:

```
npx alfred build
```

To start the dev server, run:

```
npx alfred build -D
```

The build uses the `addon.ts` file for the configurations and the `runtime.ts` file as the entry point to generate everything else.
The files defined with `@AceClass` contain all the Actions, Conditions and Expressions logic and configuration, you may want to check them. 

## Examples Files

- [demo](./examples/demo.c3p)
<br>
<img src="./examples/demo.png" width="200" />
<br>

---

## Properties

| Property Name | Description | Type |
| --- | --- | --- |
| Property Name | Property Description | integer |

---

## Actions

| Action | Description | Params
| --- | --- | --- |


---
## Conditions

| Condition | Description | Params
| --- | --- | --- |
| Is Enabled |  |  |
| Is Something |  | Tag *(combo)* <br> |

---
## Expressions

| Expression | Description | Return Type | Params
| --- | --- | --- | --- |

