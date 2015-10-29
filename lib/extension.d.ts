import { IDisposable } from 'phosphor-disposable';
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
    /**
     * The path to the javascript module for the extension.
     *
     * This path is relative to the `package.json`.
     *
     * If not given, it will default to plugin main file.
     */
    module?: string;
    /**
     * The name of the initialization function for the extension.
     *
     * When the extension is loaded, this function will be called to
     * return a Promise<Disposable> object.
     */
    initializer?: string;
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
    /**
     * The path to the javascript module for the extension point.
     *
     * This path is relative to the `package.json`.
     *
     * If not given, it will default to plugin main file.
     */
    module?: string;
    /**
     * The name of the initialization function for the extension point.
     *
     * When the extension point is loaded, this function will be called to
     * return a Promise<Disposable> object.
     */
    initializer?: string;
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
 * Load an extension point, connecting any existing matching extensions.
 */
export declare function loadExtensionPoint(config: IExtensionPointJSON): Promise<IDisposable>;
/**
 * Load an extension, connecting to the corresponding extension point exists.
 */
export declare function loadExtension(config: IExtensionJSON): Promise<IDisposable>;
