import { BuiltAddonConfig, initAddon } from "../c3ide.types";
import Config from "./addonConfig";
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