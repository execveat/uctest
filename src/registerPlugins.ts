import * as plugins from './plugins';
import { pluginStore } from './store';

pluginStore.core = plugins.registerCorePlugins;
pluginStore.dotenv = plugins.registerDotenvPlugin;
pluginStore.http = plugins.registerHttpPlugin;
pluginStore.intellij = plugins.registerIntellijPlugin;
pluginStore.injection = plugins.registerInjectionPlugin;
pluginStore.javascript = plugins.registerJavascriptPlugin;
pluginStore.assert = plugins.registerAssertPlugin;
