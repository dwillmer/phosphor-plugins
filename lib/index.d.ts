import { IDisposable } from 'phosphor-disposable';
/**
 * An object which represents a contribution to an extension point.
 *
 * #### Notes
 * All properties of an extension are treated as read-only.
 *
 * Extensions are automatically disposed by the framework. This occurs
 * when the plugin which registered the extension is unloaded, or when
 * a manually registered extension is unregistered. Before an extension
 * is disposed, it is first removed from any matching extension point.
 *
 * **See also** [[registerPlugin]], [[registerExtension]]
 */
export interface IExtension extends IDisposable {
    /**
     * The globally unique identifier of the extension.
     */
    id: string;
    /**
     * The identifier of the target extension point.
     */
    point: string;
    /**
     * The name of the plugin which owns the extension, or `''`.
     */
    plugin: string;
    /**
     * The behavioral object for the extension, or `null`.
     */
    item: any;
    /**
     * The parsed JSON data for the extension, or `null`.
     */
    data: any;
    /**
     * The static configuration data for the extension, or `null`.
     */
    config: any;
}
/**
 * An object which represents an extension point in an application.
 *
 * #### Notes
 * All properties of an extension point are treated as read-only.
 *
 * Extension points are automatically disposed by the framework. This
 * occurs when the plugin which registered the point is unloaded, or
 * when a manually registered extension point is unregistered.
 *
 * **See also** [[registerPlugin]], [[registerExtensionPoint]]
 */
export interface IExtensionPoint extends IDisposable {
    /**
     * The globally unique identifier of the extension point.
     */
    id: string;
    /**
     * The name of the plugin which owns the extension point, or `''`.
     */
    plugin: string;
    /**
     * Add an extension to the extension point.
     *
     * @param extension - The extension to add to the point.
     *
     * #### Notes
     * This should be a no-op if the extension has already been added.
     */
    add(extension: IExtension): void;
    /**
     * Remove an extension from the extension point.
     *
     * @param id - The id of the extension to remove.
     *
     * #### Notes
     * This should be a no-op if the extension has not been added.
     */
    remove(id: string): void;
}
/**
 * An object which represents a contribution to an extension point.
 *
 * #### Notes
 * Objects of this type are created by an extension factory function
 * to provide a behavioral object to a matching extension point.
 *
 * Contributions are automatically disposed when the plugin which
 * registered the extension is unloaded.
 *
 * This type is not used for manually registered extensions.
 */
export interface IContribution extends IDisposable {
    /**
     * The behavioral object to provide to the extension point.
     */
    item: any;
}
/**
 * A receiver object for an extension point.
 *
 * #### Notes
 * Objects of this type are created by an extension point factory
 * function to handle addition and removal of matching extensions.
 *
 * Receivers are automatically disposed when the plugin which
 * registered the extension point is unloaded.
 *
 * This type is not used for manually registered extension points.
 */
export interface IReceiver extends IDisposable {
    /**
     * Add an extension to the extension point.
     *
     * @param extension - The extension to add to the point.
     *
     * #### Notes
     * This should be a no-op if the extension has already been added.
     */
    add(extension: IExtension): void;
    /**
     * Remove an extension from the extension point.
     *
     * @param id - The id of the extension to remove.
     *
     * #### Notes
     * This should be a no-op if the extension has not been added.
     */
    remove(id: string): void;
}
/**
 * List the names of the currently registered plugins.
 *
 * @returns A new array of the current plugin names.
 */
export declare function listPlugins(): string[];
/**
 * List the ids of the currently registered extensions.
 *
 * @returns A new array of the current extension ids.
 */
export declare function listExtensions(): string[];
/**
 * List the ids of the currently registered extension points.
 *
 * @returns A new array of the current extension point ids.
 */
export declare function listExtensionPoints(): string[];
/**
 * Register a plugin and load its JSON specification.
 *
 * @param name - The name of the plugin to register.
 *
 * @returns A disposable which will unload the plugin.
 *
 * @throws An error if the plugin name is already registered.
 *
 * #### Notes
 * A plugin name is the same as the name of the package which contains
 * the plugin specification. For a plugin named `my-plugin`, this will
 * load the `my-plugin/package.json` file. The `phosphor-plugin` field
 * in that file will be used to configure the plugin.
 */
export declare function registerPlugin(name: string): IDisposable;
/**
 * Register an extension and connect the matching extension point.
 *
 * @param extension - The extension object to register.
 *
 * @returns A disposable which will unload the extension.
 *
 * @throws An error if the extension id is already registered.
 *
 * #### Notes
 * This function can be used to dynamically register an extension which
 * is created at runtime. Most extensions are registered automatically
 * as part of registering their owner plugin.
 */
export declare function registerExtension(extension: IExtension): IDisposable;
/**
 * Register an extension point and connect the matching extensions.
 *
 * @param point - The extension point object to register.
 *
 * @returns A disposable which will unload the extension point.
 *
 * @throws An error if the extension point id is already registered.
 *
 * #### Notes
 * This function can be used to dynamically register an extension point
 * which is created at runtime. Most extension points are registered
 * automatically as part of registering their owner plugin.
 */
export declare function registerExtensionPoint(point: IExtensionPoint): IDisposable;
