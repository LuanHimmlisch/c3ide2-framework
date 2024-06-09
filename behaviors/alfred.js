import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import * as acorn from 'acorn'
import tsPlugin from 'acorn-typescript'
import AdmZip from 'adm-zip';
import express from 'express';
import cors from 'cors';
import chokidar from 'chokidar';
import escodegen from 'escodegen';

const args = process.argv.slice(2);
const devBuild = args.includes("--dev");

function removeFilesRecursively(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(function (file) {
      var curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        removeFilesRecursively(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }
}

function ensureFoldersExists() {
  if (fs.existsSync("./export")) {
    removeFilesRecursively("./export");
  }

  fs.mkdirSync("./export");
  fs.mkdirSync("./export/lang");
  fs.mkdirSync("./export/c3runtime");
}

function createEmptyFiles() {
  const emptyFiles = [
    "actions.js",
    "conditions.js",
    "expressions.js",
    "instance.js",
    "type.js",
  ];

  emptyFiles.forEach((file) => {
    fs.closeSync(fs.openSync(`./export/c3runtime/${file}`, "w"));
  });
}

function titleCase(str) {
  return str.replace(/(?<=\w)([A-Z])/g, ' $1').replace(
    /\w\S*/g,
    function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}


const ACE_TYPES = {
  actions: 'Acts',
  conditions: 'Cnds',
  expressions: 'Exps',
};

const ACE_DECORATORS = {
  Action: 'actions',
  Condition: 'conditions',
  Trigger: 'conditions',
  Expression: 'expressions',
};

const PARAM_DECORATOR = 'Param';

const TS_Types = {
  'TSStringKeyword': 'string',
  'TSNumberKeyword': 'number',
  'TSAnyAnnotation': 'any',
};

function getParserType(typeArg = '') {
  let type = typeArg;
  const isNode = typeof type === typeof {};

  if (isNode) {
    type = type.typeAnnotation?.type ??
      type.typeAnnotation?.typeName?.name.toLowerCase() ??
      type.type;

    if (type === 'TSTypeReference') {
      type = typeArg.typeAnnotation?.typeName?.name;
    }
  }


  if (!type) {
    return 'any';
  }

  return TS_Types[type] ?? (type.startsWith('TS') ? 'any' : type);
}

function getDecoratorParams(decoratorParams = {}) {
  return decoratorParams?.properties
    ?.reduce((obj, v) => {
      if (v.value.value) { // Literal/Scalar value
        obj[v.key.name] = v.value.value;
      } else { // Complex value
        try {
          obj[v.key.name] = eval(escodegen.generate(v.value));
        } catch (error) {
          throw Error(`ACE parameter '${v.key.name}' is not compilable. Use static values.`)
        }
      }
      return obj;
    }, {}) ?? {};
}

function formatParam(param = {}) {
  let id, initialValue, type;

  if (param.type === 'Identifier') {
    id = param.name;
    type = getParserType(param.typeAnnotation);
  } else if (param.type === 'AssignmentPattern') {
    id = param.left.name;
    type = getParserType(param.left.typeAnnotation);
    initialValue = param.right.value;
  } else {
    throw Error(`Unhandled ACE parameter assignation. Try using the '@${PARAM_DECORATOR}' decorator or typings.`);
  }

  let config = (param.decorators ?? [])?.filter((v) => v.expression.callee?.name === PARAM_DECORATOR);

  if (config.length > 1) {
    throw Error(`Decorator '@${PARAM_DECORATOR}' must be declared once per parameter`);
  }

  config = getDecoratorParams(config[0]?.expression?.arguments[0]);

  return {
    ...config,
    id: config.id ?? id,
    name: config.name ?? titleCase(id),
    desc: config.desc ?? '',
    type: config.type ?? type ?? 'any',
    ...(initialValue ? { initialValue } : {})
  }
}

function aceDict() {
  return Object.keys(ACE_TYPES).reduce((obj, k) => {
    obj[k] = {};
    return obj;
  }, {});
}

function aceList() {
  return Object.keys(ACE_TYPES).reduce((obj, k) => {
    obj[k] = [];
    return obj;
  }, {});
}

function getFileListFromConfig(config) {
  const files = [];

  if (config.fileDependencies) {
    config.fileDependencies.forEach(function (file) {
      files.push(`c3runtime/${file.filename}`);
    });
  }

  return files;
}

function addonFromConfig(config) {
  return {
    "is-c3-addon": true,
    "sdk-version": 2,
    type: config.addonType,
    name: config.name,
    id: config.id,
    version: config.version,
    author: config.author,
    website: config.website,
    documentation: config.documentation,
    description: config.description,
    "editor-scripts": ["editor.js"],
    "file-list": [
      "c3runtime/actions.js",
      "c3runtime/conditions.js",
      "c3runtime/expressions.js",
      "c3runtime/instance.js",
      "c3runtime/behavior.js",
      "c3runtime/type.js",
      "lang/en-US.json",
      "aces.json",
      "addon.json",
      config.icon ? config.icon : "icon.svg",
      "editor.js",
      ...getFileListFromConfig(config),
    ],
  };
}

function langFromConfig(config, aces) {
  let id = config.id.toLowerCase();
  const lang = {
    languageTag: "en-US",
    fileDescription: `Strings for ${id}.`,
    text: {},
  };

  let root;
  if (config.addonType === "plugin") {
    lang.text.plugins = {};
    lang.text.plugins[id] = {};
    root = lang.text.plugins[id];
  } else if (config.addonType === "behavior") {
    lang.text.behaviors = {};
    lang.text.behaviors[id] = {};
    root = lang.text.behaviors[id];
  } else if (config.addonType === "effect") {
    lang.text.effects = {};
    lang.text.effects[id] = {};
    root = lang.text.effects[id];
  } else {
    throw new Error("Invalid addon type");
  }
  root.name = config.name;
  root.description = config.description;
  root["help-url"] = config.documentation;
  root.aceCategories = config.aceCategories;
  root.properties = {};
  config.properties.forEach((property) => {
    root.properties[property.id] = {
      name: property.name,
      desc: property.desc,
    };
    if (property.type === "combo") {
      root.properties[property.id].items = {};
      property.options.items.forEach((item) => {
        const key = Object.keys(item)[0];
        root.properties[property.id].items[key] = item[key];
      });
    } else if (property.type === "link") {
      root.properties[property.id]["link-text"] = property.linkText;
    }
  });

  const ungroupedAces = aceList();

  Object.keys(aces)
    .reduce((dict, k) => {
      for (const type in dict) {
        dict[type] = [...dict[type], ...aces[k][type]];
      }
    }, ungroupedAces);

  root.actions = {};
  Object.keys(ungroupedAces.actions).forEach((key) => {
    const action = ungroupedAces.actions[key];
    root.actions[action.id] = {
      "list-name": action.listName,
      "display-text": action.displayText,
      description: action.description,
      params: {},
    };
    action.params = action.params || [];
    action.params.forEach((param) => {
      root.actions[action.id].params[param.id] = {
        name: param.name,
        desc: param.desc,
      };
      if (param.type === "combo") {
        root.actions[action.id].params[param.id].items = {};
        param.items.forEach((item) => {
          const itemkey = Object.keys(item)[0];
          root.actions[key].params[param.id].items[itemkey] = item[itemkey];
        });
      }
    });
  });

  root.conditions = {};
  Object.keys(ungroupedAces.conditions).forEach((key) => {
    const condition = ungroupedAces.conditions[key];
    root.conditions[condition.id] = {
      "list-name": condition.listName,
      "display-text": condition.displayText,
      description: condition.description,
      params: {},
    };
    condition.params = condition.params || [];
    condition.params.forEach((param) => {
      root.conditions[condition.id].params[param.id] = {
        name: param.name,
        desc: param.desc,
      };
      if (param.type === "combo") {
        root.conditions[condition.id].params[param.id].items = {};
        (param.items ?? []).forEach((item) => {
          const itemkey = Object.keys(item)[0];
          root.conditions[condition.id].params[param.id].items[itemkey] = item[itemkey];
        });
      }
    });
  });

  root.expressions = {};
  Object.keys(ungroupedAces.expressions).forEach((key) => {
    const expression = ungroupedAces.expressions[key];
    root.expressions[expression.id] = {
      "translated-name": key,
      description: expression.description,
      params: {},
    };

    expression.params = expression.params || [];
    expression.params.forEach((param) => {
      root.expressions[expression.id].params[param.id] = {
        name: param.name,
        desc: param.desc,
      };
      if (param.type === "combo") {
        root.expressions[expression.id].params[param.id].items = {};
        param.items.forEach((item) => {
          const itemkey = Object.keys(item)[0];
          root.expressions[expression.id].params[param.id].items[itemkey] = item[itemkey];
        });
      }
    });
  });

  return lang;
}

function acesFromConfig(config) {
  const aces = {};

  Object.keys(config).forEach((category) => {
    aces[category] = {
      conditions: config[category].conditions
        .map((ace) => {
          const ret = {
            id: ace.id,
            scriptName: ace.id,
          };
          Object.keys(ace).forEach((key) => {
            switch (key) {
              case "category":
              case "forward":
              case "handler":
              case "listName":
              case "displayText":
              case "description":
              case "params":
                break;
              default:
                ret[key] = ace[key];
            }
          });
          if (ace.params) {
            ret.params = ace.params.map((param) => {
              const ret = {};
              Object.keys(param).forEach((key) => {
                switch (key) {
                  case "name":
                  case "desc":
                  case "items":
                    break;
                  default:
                    ret[key] = param[key];
                }
              });
              if (param.items) {
                ret.items = param.items.map((item) => Object.keys(item)[0]);
              }

              return ret;
            });
          }
          return ret;
        }),
      actions: config[category].actions
        .map((ace) => {
          const ret = {
            id: ace.id,
            scriptName: ace.id,
          };
          Object.keys(ace).forEach((key) => {
            switch (key) {
              case "category":
              case "forward":
              case "handler":
              case "listName":
              case "displayText":
              case "description":
              case "params":
                break;
              default:
                ret[key] = ace[key];
            }
          });
          if (ace.params) {
            ret.params = ace.params.map((param) => {
              const ret = {};
              Object.keys(param).forEach((key) => {
                switch (key) {
                  case "name":
                  case "desc":
                  case "items":
                    break;
                  default:
                    ret[key] = param[key];
                }
              });
              if (param.items) {
                ret.items = param.items.map((item) => Object.keys(item)[0]);
              }

              return ret;
            });
          }
          return ret;
        }),
      expressions: config[category].expressions
        .map((ace) => {
          const ret = {
            id: key,
            scriptName: ace.id,
            expressionName: ace.id,
          };
          Object.keys(ace).forEach((key) => {
            switch (key) {
              case "category":
              case "forward":
              case "handler":
              case "listName":
              case "displayText":
              case "description":
              case "params":
                break;
              default:
                ret[key] = ace[key];
            }
          });
          if (ace.params) {
            ret.params = ace.params.map((param) => {
              const ret = {};
              Object.keys(param).forEach((key) => {
                switch (key) {
                  case "name":
                  case "desc":
                  case "items":
                    break;
                  default:
                    ret[key] = param[key];
                }
              });
              if (param.items) {
                ret.items = param.items.map((item) => Object.keys(item)[0]);
              }

              return ret;
            });
          }
          return ret;
        }),
    };
  });

  return aces;
}

function distribute(config) {
  // zip the content of the export folder and name it with the plugin id and version and use .c3addon as extension
  const zip = new AdmZip();
  zip.addLocalFolder("./export/c3runtime", "c3runtime");
  zip.addLocalFolder("./export/lang", "lang");

  // for each remaining file in the root export folder
  fs.readdirSync("./export").forEach((file) => {
    // if the file is not the c3runtime or lang folder
    if (file !== "c3runtime" && file !== "lang") {
      // add it to the zip
      zip.addLocalFile(`./export/${file}`, "");
    }
  });

  // if dist folder does not exist, create it
  if (!fs.existsSync("./dist")) {
    fs.mkdirSync("./dist");
  }
  zip.writeZip(`./dist/${config.id}-${config.version}.c3addon`);
}

export function readTsConfig(tsConfig = '', { loader = 'ts' } = {}) {
  let config = new Function(
    esbuild.transformSync(tsConfig, {
      format: 'iife',
      globalName: 'config',
      loader
    }).code + ' return config;'
  );

  try {
    config = config().default;
  } catch (error) {
    throw Error("Error on reading `addonConfig.ts`. Please be sure to not execute external libraries from there." + "\n" + error);
  }

  for (const key in ACE_TYPES) {
    delete config[key];
  }

  return config;
}

// Collection of ACEs by group for aces.json
let aces;
// Collection of ACEs to call on runtime
let acesRuntime;

let addonJson;

/** @returns {import('esbuild').Plugin} */
function parser() {
  return {
    name: 'c3ide-parser',
    setup(build) {
      aces = {}
      acesRuntime = aceDict()
      addonJson = {}

      build.onLoad({ filter: /src\/instance\.ts/ }, (args) => {
        let ts = fs.readFileSync(args.path).toString('utf-8');
        let offset = 0;
        // console.log(ts);
        const tree = acorn.Parser.extend(tsPlugin()).parse(ts, {
          ecmaVersion: '2021',
          sourceType: 'module',
          // TODO: Allow description via docblock
          // onComment: (isBlock, text, s, e, loc, endLoc) => {
          //   console.log(loc, endLoc);
          // }
        });

        const className = tree.body.filter((v) => v.type === 'ExportDefaultDeclaration')[0].declaration.name;
        const classDeclaration = tree.body.filter(v => v.type === 'ClassDeclaration' && v.id.name === className)[0];
        /** @type {import('acorn').Node[]} */
        const classFeatures = classDeclaration.body.body;

        // console.log(classFeatures);
        const methodAces = classFeatures.filter(v => v.type == 'MethodDefinition' && v.decorators?.length && Object.keys(ACE_DECORATORS).includes(v.decorators[0]?.expression.callee?.name));

        const removeDecorator = (decorator) => {
          ts = ts.slice(0, decorator.start - offset) + ts.slice(decorator.end - offset)
          offset += decorator.end - decorator.start;
        }

        methodAces.forEach(v => {
          const id = v.key.name;
          const title = titleCase(id);

          if (v.decorators.length > 1) {
            throw Error(`Method '${id}' can only be one ACE`);
          }

          const decorator = v.decorators[0];

          const aceType = ACE_DECORATORS[decorator.expression.callee.name];
          // ACE_TYPES[decorator.expression.callee.name];

          if (!aceType) {
            throw Error(`Unkown ACE operation on '${id}'`);
          }

          removeDecorator(decorator);

          const decoratorParams = decorator.expression.arguments;

          if (decoratorParams?.length > 1) {
            if (decoratorParams.length > 2 || decoratorParams[1].type !== 'ObjectExpression') {
              throw Error(`You must pass an object as option argument on '${id}' ACE`);
            }
          }

          const config = getDecoratorParams(decoratorParams[1]);

          let returnType = config?.returnType;

          const method = v.value;

          if (!returnType && method.returnType) {
            returnType = getParserType(method.returnType);
          }

          const category = config.category ?? 'general';

          const params = method.params?.map((v) => {
            return formatParam(v);
          }) ?? [];

          let displayText = decoratorParams[0]?.value;

          if (!displayText) {
            // Auto-assign params to display text
            if (params.length) {
              displayText = title + " (" + Object.keys(params).map(v => `{${v}}`).join(', ') + ")";
            } else {
              displayText = title;
            }
          }

          if (!aces[category]) {
            aces[category] = {};
            for (const type in ACE_TYPES) {
              aces[category][type] = [];
            }
          }

          acesRuntime[aceType][id] = `(inst) => inst.${id}`;
          aces[category][aceType].push({
            ...config,
            id,
            displayText,
            listName: config.listName ?? title,
            category,
            params,
            description: config.description ?? '',
            ...(returnType ? { returnType } : {}),
          });

        });
      });

      build.onLoad({ filter: /src\/addonConfig\.ts/ }, (config) => {
        const content = fs.readFileSync(config.path).toString('utf-8');
        const inject = JSON.stringify(acesRuntime, null, 4).replace(/"(\(inst\) => inst\.[a-zA-Z0-9$_]+)"/, '$1');
        const injected = content.replace(/(export\s+default\s+)([^;]+);/, `$1{\n...($2), \n...(${inject})\n};`);
        // console.log(injected);
        const jsConfig = esbuild.transformSync(injected, {
          format: 'esm',
          target: 'ES2021',
          loader: 'ts',
        }).code;

        try {
          addonJson = readTsConfig(jsConfig, { loader: 'js' });
        } catch (error) {
          throw Error("Error on `addonConfig.ts`. Please be sure to not execute external libraries from there." + "\n" + error);
        }

        return {
          contents: jsConfig
        };
      });

      build.onEnd(() => {
        if (!devBuild) {
          distribute(addonJson);
        }
      })
    }
  };
}

let _buildConfig;

/** @returns {Promise<import('./c3ide.types.js').BuildConfig | {}>} */
async function loadBuildConfig() {
  if (_buildConfig) {
    return _buildConfig;
  }

  if (fs.existsSync('./c3ide.config.js')) {
    _buildConfig = await import('./c3ide.config.js').then(v => v.default);
    return _buildConfig;
  }

  return _buildConfig = {};
}

async function parseFile(file = '', plugins = []) {
  const extra = await loadBuildConfig();
  return await esbuild.build({
    entryPoints: [file],
    bundle: true,
    target: 'ES2021',
    allowOverwrite: true,
    plugins,
    write: false,
    minify: extra?.minify ?? true,
  }).then(v => v.outputFiles[0].text);
}

async function build() {
  ensureFoldersExists();
  createEmptyFiles();

  const main = await parseFile('./src/behavior.ts', [parser()]);
  fs.writeFileSync("./export/c3runtime/behavior.js", main);

  fs.writeFileSync("./export/aces.json", JSON.stringify(acesFromConfig(aces), null, 4));
  fs.writeFileSync("./export/lang/en-US.json", JSON.stringify(langFromConfig(addonJson, aces), null, 2));
  fs.writeFileSync("./export/addon.json", JSON.stringify(addonFromConfig(addonJson), null, 4));

  const editor = await parseFile('./src/editor.ts');
  fs.writeFileSync("./export/editor.js", editor);

  if (addonJson.icon) {
    fs.copyFileSync("./src/" + addonJson.icon, "./export/" + addonJson.icon);
  } else {
    fs.copyFileSync("./src/icon.svg", "./export/icon.svg");
  }

}

let port = 3000;

async function runServer(callback = async () => { }) {
  const path = () => `http://localhost:${port}/addon.json`;

  await callback();

  const watcher = chokidar.watch("src", {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  function message() {
    process.stdout.write('\x1Bc');
    console.log(`|===| Alfred Butler |===|

Server is running at http://localhost:${port}

Import addon.json path:
${path()}
`);
  }

  watcher.on("change", async (path) => {
    console.log(`* Changed '${path}', rebuilding...`);
    await callback()
      .then(() => setTimeout(() => message(), 200))
      .catch(e => console.error(e));
  });

  // Create an express application
  const app = express();

  // Enable all CORS requests
  app.use(cors());

  // Serve static files from the 'export' directory
  app.use(express.static("export"));

  // Start the server
  function tryListen() {
    app.listen(port, () => {
      message();
    });
  }

  process.on("uncaughtException", function (err) {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is already in use. Trying another port...`);
      port++;
      tryListen();
    } else {
      console.log(err);
      process.exit(1);
    }
  });

  tryListen();
}

if (devBuild) {
  runServer(async () => {
    build();
  });
} else {
  await build();
}