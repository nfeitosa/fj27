/* ***** BEGIN LICENSE BLOCK *****
 *
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is: YSlow 2
 *
 * The Initial Developer of the Original Code is Yahoo! Inc.
 *
 * Copyright (C) 2010, Yahoo! Inc. All Rights Reserved.
 *
 * Contributor(s):
 *     Marcel Duran
 *     Antonia Kwok
 *     Stoyan Stefanov
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * @module YSLOW
 * @class YSLOW
 * @static
 */
var YSLOW = YSLOW || {};

/**
 * Enable/disable debbuging messages
 */
YSLOW.DEBUG = true;

/**
 * @ignore
 */
var g_latest_yslowContext = undefined;

/**
 *
 * Adds a new rule to the pool of rules.
 *
 * Rule objects must implement the rule interface or an error will be thrown. The interface
 * of a rule object is as follows:
 * <ul>
 *   <li><code>id</code>, e.g. "numreq"</li>
 *   <li><code>name</code>, e.g. "Minimize HTTP requests"</li>
 *   <li><code>url</code>, more info about the rule</li>
 *   <li><code>config</code>, configuration object with defaults</li>
 *   <li><code>lint()</code> a method that accepts a document, array of components and a config object and returns a reuslt object</li>
 * </ul>
 *
 * @param {YSLOW.Rule} rule A new rule object to add
 */
YSLOW.registerRule = function(rule) {
    YSLOW.controller.addRule(rule);
};


/**
 *
 * Adds a new ruleset (new grading algorithm).
 *
 * Ruleset objects must implement the ruleset interface or an error will be thrown. The interface
 * of a ruleset object is as follows:
 * <ul>
 *   <li><code>id</code>, e.g. "ydefault"</li>
 *   <li><code>name</code>, e.g. "Yahoo! Default"</li>
 *   <li><code>rules</code> a hash of ruleID => ruleconfig </li>
 *   <li><code>weights</code> a hash of ruleID => ruleweight </li>
 * </ul>
 *
 * @param {YSLOW.Ruleset} ruleset The new ruleset object to be registered
 */
YSLOW.registerRuleset = function(ruleset) {
    YSLOW.controller.addRuleset(ruleset);
};

/**
 * Register a renderer.
 *
 * Renderer objects must implement the renderer interface.
 * The interface is as follows:
 * <ul>
 * <li><code>id</code></li>
 * <li><code>supports</code> a hash of view_name => 1 or 0 to indicate what views are supported</li>
 * <li>and the methods</li>
 * </ul>
 *
 * For instance if you define a JSON renderer that only render grade. Your renderer object will look like this:
 * { id: 'json',
 *    supports: { reportcard: 1, components: 0, stats: 0, cookies: 0},
 *    reportcardView: function(resultset) { ... }
 * }
 *
 * Refer to YSLOW.HTMLRenderer for the function prototype.
 *
 *
 * @param {YSLOW.renderer} renderer The new renderer object to be registered.
 */
YSLOW.registerRenderer = function(renderer) {
    YSLOW.controller.addRenderer(renderer);
};

/**
 * Adds a new tool.
 *
 * Tool objects must implement the tool interface or an error will be thrown.
 * The interface of a tool object is as follows:
 * <ul>
 *   <li><code>id</code>, e.g. 'mytool'</li>
 *   <li><code>name</code>, eg. 'Custom tool #3'</li>
 *   <li><code>print_output</code>, whether this tool will produce output.</li>
 *   <li><code>run</code>, function that takes doc and componentset object, return content to be output</li>
 * </ul>
 *
 * @param {YSLOW.Tool} tool The new tool object to be registered
 */
YSLOW.registerTool = function(tool) {
    YSLOW.Tools.addCustomTool(tool);
};


/**
 * Register an event listener
 *
 * @param {String} event_name Name of the event
 * @param {Function} callback A function to be called when the event fires
 * @param {Object} that Object to be assigned to the "this" value of the callback function
 */
YSLOW.addEventListener = function(event_name, callback, that) {
    YSLOW.util.event.addListener(event_name, callback, that);
};

/**
 * Unregister an event listener.
 *
 * @param {String} event_name Name of the event
 * @param {Function} callback The callback function that was added as a listener
 * @return {Boolean} TRUE is the listener was removed successfully, FALSE otherwise (for example in cases when the listener doesn't exist)
 */
YSLOW.removeEventListener = function(event_name, callback) {
    return YSLOW.util.event.removeListener(event_name, calllback);
};

/**
 * @namespace YSLOW
 * @constructor
 * @param {String} name Error type
 * @param {String} message Error description
 */
YSLOW.Error = function(name, message) {
    /**
     * Type of error, e.g. "Interface error"
     * @type String
     */
    this.name = name;
    /**
     * Error description
     * @type String
     */
    this.message = message;

};

YSLOW.Error.prototype = {

    toString: function() {
        return this.name + "\n" + this.message;
    }

}
