import { AddonConfig } from "../c3ide.types";

// @ts-ignore
const Config = {
  addonType: "behavior",
  id: "ExampleAddon",
  name: "Example Addon",
  version: "1.0.0.0",
  category: "general",
  author: "<@ADDON_AUTHOR>",
  website: "https://www.construct.net",
  documentation: "https://www.construct.net",
  description: "Description",
  icon: "icon.svg",
  addonUrl: 'https://www.construct.net/addons/####/XXXX',
  githubUrl: "https://github.com/skymen/XXXX",
  editorScripts: ['editor.js'],
  info: {
    Set: {
      IsOnlyOneAllowed: false,
      CanBeBundled: true,
      IsDeprecated: false,
    },
  },
  fileDependencies: {
    "anotherLib.ts": 'copy-to-output'
  },
  properties: [
    {
      type: "integer",
      id: "property_id",
      options: {
        initialValue: 0,
        interpolatable: false,
      },
      name: "Property Name",
      desc: "Property Description",
    }
  ],
  aceCategories: {
    general: "General",
  }
} as AddonConfig;

export default Config;

