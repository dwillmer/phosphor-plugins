export interface IExtensionJSON {
    /**
     * The id of the extension point to which the extension contributes.
     */
    point: string;
    /**
     * The name of the loader function in the plugin `main` module.
     *
     * When the extension is loaded, this function will be called to
     * return a Promise which resolves to the actual extension object
     * to contribute to the extension point.
     */
    loader?: string;
    /**
     * The path to the JSON data file for the extension.
     *
     * Some extension points (like menus and keymaps) can make use of
     * data defined as JSON. This path will be used to load the JSON
     * and provide it to the extension point.
     */
    data?: string;
    /**
     * Extra configuration data for the extension.
     *
     * Some extension points can make use of extra static declarative
     * data associated with an extension. That data goes here in the
     * form of a JSON object.
     */
    config?: any;
}
export interface IExtensionPointJSON {
    /**
     * The unique id of the extension point.
     *
     * This should be namespaced: "my-plugin:extension-point-name".
     */
    id: string;
    /**
     * The name of the receiver function in the plugin `main` module.
     *
     * When an extension is loaded for this extension point, this
     * function will be invoked with an `IExtension` object.
     */
    receiver: string;
}
export interface IPluginJSON {
    /**
     * The path to the "main" javascript file for the plugin.
     *
     * This path is relative to the `package.json`.
     */
    main: string;
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
export interface IExtension<T> {
    /**
     * The actual extension object.
     *
     * This is the result of resolving the Promise returned by
     * the loader function specified by the extension JSON.
     *
     * This will be `null` if the extension does not specify a loader.
     */
    object: T;
    /**
     * The loaded JSON specified by the extension.
     *
     * This is the result of calling `JSON.parse` on the data file
     * specified by the extension JSON.
     *
     * This will be `null` if the extension does not specify a data file.
     */
    data: any;
    /**
     * The config specified by the extension.
     *
     * This will be the object representation of the config specified
     * in the extension JSON.
     *
     * This will be `null` if the extension does not specify a data file.
     */
    config: any;
}
/**
 * Get a list of available plugin names.
 */
export declare function listPlugins(reload?: boolean): Promise<string[]>;
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
