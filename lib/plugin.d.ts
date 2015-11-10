import { IExtensionJSON, IExtensionPointJSON } from './extension';
export interface IPluginJSON {
    /**
     * The path to the javascript module for the plugin.
     *
     * This path is relative to the `package.json`.
     *
     * If not given, it will default to the top-level `package.json` main.
     */
    module?: string;
    /**
     * The name of the initialization function in the plugin `main` module.
     *
     * When the plugin is loaded, this function will be called to
     * return a Promise<Disposable> object.
     */
    initializer?: string;
    /**
     * The extension points provided by the plugin.
     *
     * Other plugins may contribute extensions to these extension points.
     */
    extensionPoints?: IExtensionPointJSON[];
    /**
     * The extensions provided by the plugin.
     *
     * These are contributions to extension points of other plugins.
     */
    extensions?: IExtensionJSON[];
}
/**
 * Get a list of available plugin names.
 */
export declare function listPlugins(): string[];
/**
 * Fetch the available plugins.
 *
 * Can be called more than once to update the available plugins.
 */
export declare function fetchPlugins(): Promise<void>;
/**
 * Load a plugin by name.
 *
 * Load all extension points and extensions, then call `initialize`.
 *
 * Throws an error if the plugin is not in the registry.
 */
export declare function loadPlugin(name: string): Promise<void>;
/**
 * Unload a plugin by name, disposing of its resources.
 *
 * This is a no-op if the plugin has not been loaded or has already
 * been unloaded.
 */
export declare function unloadPlugin(name: string): void;
