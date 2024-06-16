import { Property, ProjectAddon } from "c3ide2-types";
import mime from 'mime';

export interface AddonConfig extends ProjectAddon {
    editorScripts?: string[];
    properties: Property[];
    aceCategories: {
        [key: string]: string;
    };
    fileDependencies: {
        [key: string]: "copy-to-output"
        | "inline-script"
        | "external-dom-script"
        | "external-runtime-script"
        | "external-css"
    },
    typeDefs?: string[],
    info: {
        Set: {
            IsOnlyOneAllowed: boolean;
            CanBeBundled: boolean;
            IsDeprecated: boolean;
        };
    };
}

export interface BuiltAddonConfig extends AddonConfig {
    Aces: {
        actions: any,
        expressions: any,
        conditions: any
    }
};

export interface BuildConfig {
    minify?: string,
    host?: string,
    port?: number,
    sourcePath?: string,
    addonScript?: string,
    defaultLang?: string,
    runtimeScript?: string,
    langPath?: string,
    libPath?: string,
    defPath: string
}

const camelCasedMap = new Map();

export function camel(str: string) {
    // If the string is already camelCased, return it
    if (camelCasedMap.has(str)) {
        return camelCasedMap.get(str);
    }
    // Replace any non-valid JavaScript identifier characters with spaces
    let cleanedStr = str.replace(/[^a-zA-Z0-9$_]/g, " ");

    // Split the string on spaces
    let words = cleanedStr.split(" ").filter(Boolean);

    // Capitalize the first letter of each word except for the first one
    for (let i = 1; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1);
    }

    // Join the words back together
    let result = words.join("");

    // If the first character is a number, prepend an underscore
    if (!isNaN(parseInt(result.charAt(0)))) {
        result = "_" + result;
    }

    camelCasedMap.set(str, result);

    return result;
}

/* ===============
 * Runtime classes
 ================ */

export function getBehaviorClass() {
    return class extends globalThis.ISDKBehaviorBase {
        constructor() {
            super();
        }

        _release() {
            super._release();
        }
    }
}

export function getBehaviorTypeClass() {
    return class extends globalThis.ISDKBehaviorTypeBase {
        constructor() {
            super();
        }

        _release() {
            super._release();
        }
    };
}

export function getBehaviorInstanceClass() {
    return class extends globalThis.ISDKBehaviorInstanceBase {
        constructor() {
            super();
        }

        _release() {
            super._release();
        }
    };
}

/* ===============
 * Editor Classes
 ================ */

export function getEditorBehaviorClass(config: BuiltAddonConfig) {
    const SDK = self.SDK;

    return class extends SDK.IBehaviorBase {
        constructor() {
            super(config.id);

            SDK.Lang.PushContext("behaviors." + config.id.toLowerCase());

            this._info.SetName(self.lang(".name"));
            this._info.SetDescription(self.lang(".description"));
            this._info.SetCategory(config.category);
            this._info.SetAuthor(config.author);
            this._info.SetHelpUrl(self.lang(".help-url"));

            if (config.icon) {
                this._info.SetIcon(
                    config.icon,
                    config.icon.endsWith(".svg") ? "image/svg+xml" : "image/png"
                );
            }

            if (config.fileDependencies) {
                Object.keys(config.fileDependencies).forEach((filename: any) => {
                    const type = config.fileDependencies[filename];
                    const dependency = {
                        filename,
                        type
                    } as any;

                    if (type === 'copy-to-output') {
                        dependency.fileType = mime.getType(filename);
                    }

                    this._info.AddFileDependency(dependency);
                });
            }

            if (config.typeDefs) {
                this._info.SetTypeScriptDefinitionFiles(config.typeDefs);
            }

            if (config.info && config.info.Set) {
                Object.keys(config.info.Set).forEach((key) => {
                    // @ts-ignore
                    const value = config.info.Set[key];
                    const fn = this._info[`Set${key}`];
                    if (fn && value !== null && value !== undefined)
                        fn.call(this._info, value);
                });
            }

            SDK.Lang.PushContext(".properties");

            this._info.SetProperties(
                (config.properties || []).map(
                    (prop: any) => new SDK.PluginProperty(prop.type, prop.id, prop.options)
                )
            );

            SDK.Lang.PopContext(); // .properties
            SDK.Lang.PopContext();
        }
    };
}

export function getEditorBehaviorTypeClass(config: BuiltAddonConfig) {
    return class extends SDK.IBehaviorTypeBase {
        constructor(sdkPlugin: any, iObjectType: any) {
            super(sdkPlugin, iObjectType);
        }
    };
}

export function getEditorBehaviorInstanceClass(config: BuiltAddonConfig) {
    return class extends SDK.IBehaviorInstanceBase {
        constructor(sdkType: any, inst: any) {
            super(sdkType, inst);
        }

        Release() { }

        OnCreate() { }

        OnPropertyChanged(id: any, value: any) { }

        LoadC2Property(name: any, valueString: any) {
            return false; // not handled
        }
    };
}

export function loadAddonClass(addonBase: C3AddonBase & { [key: string]: any }, config: BuiltAddonConfig) {
    addonBase.Acts = {};
    addonBase.Cnds = {};
    addonBase.Exps = {};

    Object.keys(config.Aces.actions).forEach((key) => {
        const ace = config.Aces.actions[key];
        addonBase.Acts[camel(key)] = function (...args: any) {
            return ace(this).call(this, ...args);
        };
    });

    Object.keys(config.Aces.conditions).forEach((key) => {
        const ace = config.Aces.conditions[key];

        addonBase.Cnds[camel(key)] = function (...args: any) {
            return ace(this).call(this, ...args);
        };
    });

    Object.keys(config.Aces.expressions).forEach((key) => {
        const ace = config.Aces.expressions[key];
        addonBase.Exps[camel(key)] = function (...args: any) {
            return ace(this).call(this, ...args);
        };
    });
}

/**
 * Automatically sets the Addon base, type and instance classes depending your configuration
 * 
 * You can choose to manually set the classes, just copy this method as example.
 * 
 * @param {BuiltAddonConfig} config
 * @see `loadAddonClass()`
 */
export function initAddon(config: BuiltAddonConfig, {
    Base = null,
    Type = null,
    Instance = null,
}: InitAddonOpts = {}) {
    //TODO: This should guess the type of Addon and inject accordingly

    const C3 = globalThis.C3;

    const B_C = C3.Behaviors[config.id] = Base ?? getBehaviorClass();

    B_C.Type = Type ?? getBehaviorTypeClass();

    B_C.Instance = Instance ?? getBehaviorInstanceClass();

    loadAddonClass(B_C, config)

    return B_C;
}

export function initEditorAddon(config: BuiltAddonConfig, {
    Base = null,
    Type = null,
    Instance = null
}: InitAddonOpts = {}) {
    const SDK = self.SDK;

    const B_C = SDK.Behaviors[config.id] = Base ?? getEditorBehaviorClass(config);

    B_C.Register(config.id, B_C);

    B_C.Type = Type ?? getEditorBehaviorTypeClass(config);

    B_C.Instance = Instance ?? getEditorBehaviorInstanceClass(config);
}

/* ===============
 * Interfaces
 ================ */

interface IAction {
    displayText?: string;
    description?: string;
    category?: string;
    highlight?: boolean;
    deprecated?: boolean;
    isAsync?: boolean;
}

interface ICondition {
    displayText?: string;
    category?: string;
    description?: string;
    highlight?: boolean;
    deprecated?: boolean;
    isTrigger?: boolean;
    isFakeTrigger?: boolean;
    isStatic?: boolean;
    isLooping?: boolean;
    isInvertible?: boolean;
    isCompatibleWithTriggers?: boolean;
}

interface IExpression {
    listName?: string;
    category?: string;
    description?: string;
    highlight?: boolean;
    deprecated?: boolean;
    isVariadicParameters?: boolean;
    returnType?:
    | "string"
    | "number"
    | "any";
}

interface IParam {
    id?: string;
    name?: string;
    desc?: string;
    type?: string | number | any | C3Type;
    initialValue?: any;
    items?: Array<{ [key: string]: string }>;
    allowedPluginIds?: string[];
}

/* ===============
 * ACEs Decorators
 ================ */

/**
 * Action decorator
 */
export function Action(displayText?: string, opts?: IAction): MethodDecorator {
    return function (target) {
    };
}

/**
 * Expression decorator
 */
export function Expression(opts?: IExpression): MethodDecorator {
    return function (target) {
    };
}

/**
 * Condition decorator
 */
export function Condition(displayText?: string, opts?: ICondition): MethodDecorator {
    return function (target) {
    };
}

/**
 * Shortcut for Condition decorator with `isTrigger` as `true`
 */
export function Trigger(displayText?: string, opts?: ICondition): MethodDecorator {
    return function (target) {
    };
}

/**
 * ACE Parameter decorator. 
 * 
 * Use `string`, `number`, `any`,`Cnd.*`, `Act.*`, `Effect.*` for types
 */
export function Param(opts?: IParam): ParameterDecorator {
    return function () {
    }
}

export function AceClass(opts?: {}): ClassDecorator {
    return function (target) {

    }
}

export function Schema(opts?: {}): MethodDecorator {
    return function (target) {

    }
}

/* ===============
 * Global suggar
 ================ */

// TODO: check way to threat `ISDK*Base` as classes without loosing the globalThis.
type C3AddonBase = any;

interface InitAddonOpts {
    Base?: any;
    Type?: any;
    Instance?: any;
}

type C3Type = combo
    | cmp
    | objectname
    | layer
    | layout
    | keyb
    | instancevar
    | instancevarbool
    | eventvar
    | eventvarbool
    | animation
    | objinstancevar
    | float
    | percent
    | color;

declare global {
    interface Window {
        [any: string]: any;
    }

    type combo = number;
    type cmp = string;
    type objectname = string;
    type layer = string;
    type layout = string;
    type keyb = string;
    type instancevar = string;
    type instancevarbool = string;
    type eventvar = string;
    type eventvarbool = string;
    type animation = string;
    type objinstancevar = string;
    type float = number;
    type percent = string;
    type color = string;

    namespace Cnd {
        type combo = globalThis.combo;
        type cmp = globalThis.cmp;
        type objectname = globalThis.objectname;
        type layer = globalThis.layer;
        type layout = globalThis.layout;
        type keyb = globalThis.keyb;
        type instancevar = globalThis.instancevar;
        type instancevarbool = globalThis.instancevarbool;
        type eventvar = globalThis.eventvar;
        type eventvarbool = globalThis.eventvarbool;
        type animation = globalThis.animation;
        type objinstancevar = globalThis.objinstancevar;
    }

    namespace Act {
        type combo = globalThis.combo;
        type cmp = globalThis.cmp;
        type objectname = globalThis.objectname;
        type layer = globalThis.layer;
        type layout = globalThis.layout;
        type keyb = globalThis.keyb;
        type instancevar = globalThis.instancevar;
        type instancevarbool = globalThis.instancevarbool;
        type eventvar = globalThis.eventvar;
        type eventvarbool = globalThis.eventvarbool;
        type animation = globalThis.animation;
        type objinstancevar = globalThis.objinstancevar;
    }

    namespace Effect {
        type float = globalThis.float;
        type percent = globalThis.percent;
        type color = globalThis.color;
    }

    var SDK: any;
    var C3: any;
    var ISDKPluginBase: any;
    var ISDKObjectTypeBase: any;
    var ISDKInstanceBase: any;
    var ISDKWorldInstanceBase: any;
    var ISDKDOMPluginBase: any;
    var ISDKDOMInstanceBase: any;
    var ISDKBehaviorBase: any;
    var ISDKBehaviorTypeBase: any;
    var ISDKBehaviorInstanceBase: any;
}