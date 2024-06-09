import { BuiltAddonConfig, initAddon } from "../c3ide.types";
import Config from "./addon";
import Instance from "./instance";

/*
 * Automatic injection...
 * If you need to extend base and type classes:
 * - Remove this function
 * - Create new classes that extends the `get*BaseClass()` & `get*TypeClass()` functions
 * - Call the `loadAddonClass()` at the end
 * See the `initAddon` function for reference.
 */
initAddon(
    Config as BuiltAddonConfig,
    {
        Instance
    }
);


// const C3 = globalThis.C3;

// @AceClass()
// class Behavior extends getBehaviorClass() {

// };

// @AceClass()
// class BehaviorType extends getBehaviorTypeClass() {

// };

// const B_C = C3.Behaviors[Config.id] = Behavior as any;

// B_C.Type = BehaviorType;

// B_C.Instance = Instance;

// loadAddonClass(B_C, Config as BuiltAddonConfig);


