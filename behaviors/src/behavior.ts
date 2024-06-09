import { AddonConfig, camel } from "../c3ide.types";
import Config from "./addonConfig";
import Instance from "./instance";

const C3 = globalThis.C3;

const BEHAVIOR_INFO = Config as (AddonConfig & { Aces: { actions: any, expressions: any, conditions: any } });

C3.Behaviors[BEHAVIOR_INFO.id] = class extends globalThis.ISDKBehaviorBase {
  constructor() {
    super();
  }

  _release() {
    super._release();
  }
};

const B_C = C3.Behaviors[BEHAVIOR_INFO.id];

B_C.Type = class extends globalThis.ISDKBehaviorTypeBase {
  constructor() {
    super();
  }

  _release() {
    super._release();
  }

  _onCreate() { }
};

B_C.Instance = Instance;

// * ACEs Injection

B_C.Acts = {};
B_C.Cnds = {};
B_C.Exps = {};

Object.keys(BEHAVIOR_INFO.Aces.actions).forEach((key) => {
  const ace = BEHAVIOR_INFO.Aces.actions[key];
  B_C.Acts[camel(key)] = function (...args: any) {
    return ace.forward(this).call(this, ...args);
  };
});

Object.keys(BEHAVIOR_INFO.Aces.conditions).forEach((key) => {
  const ace = BEHAVIOR_INFO.Aces.conditions[key];
  B_C.Cnds[camel(key)] = function (...args: any) {
    return ace.forward(this).call(this, ...args);
  };
});

Object.keys(BEHAVIOR_INFO.Aces.expressions).forEach((key) => {
  const ace = BEHAVIOR_INFO.Aces.expressions[key];
  B_C.Exps[camel(key)] = function (...args: any) {
    return ace.forward(this).call(this, ...args);
  };
});