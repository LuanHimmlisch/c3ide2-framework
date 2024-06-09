import { Action, Condition, Expression, Param } from "../c3ide.types";

class Instance extends globalThis.ISDKBehaviorInstanceBase {
  constructor() {
    super();

    const properties = this._getInitProperties();

    if (properties) {

    }
  }

  @Condition()
  isEnabled(
    @Param({
      desc: "A description",
      items: [
        { test: "test", }
      ]
    })
    tag: combo
  ) {
    return ''
  }

  // @Condition('Is Other Enabled', { deprecated: true, highlight: true })
  // isOtherEnabled(
  //   tag: string,
  //   wenas: any,
  // ): string {
  //   return ''
  // }

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