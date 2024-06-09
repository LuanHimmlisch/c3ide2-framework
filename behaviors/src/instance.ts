import { Action, Condition, Trigger, Expression, Param } from "../c3ide.types";
import { getBehaviorInstanceClass as parent } from '../c3ide.types';

class Instance extends parent() {
  constructor() {
    super();
  }

  _release() {
    super._release();
  }

  _saveToJson() {
    return {
      // data to be saved for savegames
    };
  }

  _loadFromJson(o: string) {
    // load state for savegames
  }
}

export default Instance;