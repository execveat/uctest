import * as plugins from './plugins';
import { pluginStore } from './store';

pluginStore.core = plugins.registerCorePlugins;
pluginStore.dotenv = plugins.registerDotenvPlugin;
pluginStore.graphql = plugins.registerGraphQL;
pluginStore.http = plugins.registerHttpPlugin;
pluginStore.intellij = plugins.registerIntellijPlugin;
pluginStore.injection = plugins.registerInjectionPlugin;
pluginStore.javascript = plugins.registerJavascriptPlugin;
pluginStore.oauth2 = plugins.registerOAuth2Plugin;
pluginStore.assert = plugins.registerAssertPlugin;
pluginStore.xml = plugins.registerXmlPuglin;
