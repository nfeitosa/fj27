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
 *     Antonia Kwok
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Use Firebug's net panel
 *
 * @namespace YSLOW.FBYSlow
 * @class net
 * @static
 */
YSLOW.FBYSlow.net = {

    /**
     * Get detail info of the passed url gathered network response from http observation notification.
     * The callback is called with an info object that includes
     * <ul>
     * <li>url</li>
     * <li>status</li>
     * <li>headers</li>
     * <li>raw_headers</li>
     * <li>body</li>
     * <li>method</li>
     * <li>type</li>
     * <li>cookie</li>
     * <li>size</li>
     * <li>respTime</li>
     * <li>startTimestamp</li>
     * </ul>
     * The callback may be called before this function returns.
     *
     * @param {String} url URL of request
     * @param {Function} callback function to callback with the response.
     * @param {Boolean} binary pass true if requesting binary content.
     * @return true if info is found, otherwise returns false.
     * @type Boolean
     */
    getInfo: function(url, callback, binary) {

        if (typeof FirebugContext.netProgress === 'undefined') {
            /* Net Panel is disabled */
            return false;
        }

        for (var i = 0; i < FirebugContext.netProgress.files.length; i++) {
            if (url == FirebugContext.netProgress.files[i].href) {
                /* found it */
                var file = FirebugContext.netProgress.files[i];
		//If the component is cached or not modified, Net panel won't store the headers for it.
                if (file.status && file.status !== "304" && file.status !== 304) {
                    var response = this.getComponentDetails(file);
                    if (response.size === -1 && response.body.length === 0) {
                        return false;
                    }
                    callback(response);
                    return true;
                }
            }
        }
        return false;

    },

    /**
     * Get url of requests identified by type.
     * @param {String|Array} type The type of component to get, e.g. "js" or ['js', 'css']
     * @return array of url
     */
    getResponseURLsByType: function(type) {
        var urls = [];
        var types = {};

        if (typeof FirebugContext.netProgress !== 'undefined' && FirebugContext.netProgress.files.length > 0) {

            if (typeof type === 'string') {
                types[type] = 1;
            } else {
                for (var i in type) {
                    if (type[i]) {
                        types[type[i]] = 1;
                    }
                }
            }

            for (i = 0; i < FirebugContext.netProgress.files.length; i++) {
                var file = FirebugContext.netProgress.files[i];
                if (typeof types[this.getType(file)] !== 'undefined') {
                    urls.push(file.href);
                } else if (file.isXHR && typeof types.xhr !== 'undefined') {
                    urls.push(file.href);
                }
            }
        }
        return urls;
    },

    /**
     * @private
     * Set response object with info found in Firebug fle object.
     * @param {Object} file
     */
    getComponentDetails: function(file) {
        var response = {};

        response.url = file.href;
        response.status = file.status;
        response.respTime = file.endTime - file.startTime;
        response.startTimestamp = file.startTime;
        response.size = file.size;

        var respHeaders = this.getResponseHeaders(file);
        response.raw_headers = respHeaders.raw_headers;
        response.headers = respHeaders.headers;

        response.body = this.getResponseText(file, response.headers);
        response.method = file.method;
        response.type = this.getType(file);
        response.cookie = this.getCookie(file);

        response.req_headers = this.getRequestHeaders(file);

        // check if loaded after onload event.
        if (file.phase) {
            if (file.phase.windowLoadTime < file.startTime) {
                response.after_onload = true;
            }
            response.startTimestamp = file.startTime;
        }

        return response;
    },

    /**
     * @private
     */
    getResponseHeaders: function(file) {
        var headers = {};
        var raw_headers = '';

        if (typeof file.responseHeaders != "undefined" && typeof file.responseHeaders.length != "undefined") {
            for (var i = 0; i < file.responseHeaders.length; i++) {
                headers[file.responseHeaders[i].name] = file.responseHeaders[i].value;
                raw_headers += file.responseHeaders[i].name + ": " + file.responseHeaders[i].value + "\n";
            }
        }
        return { 'headers': headers, 'raw_headers': raw_headers };
    },

    /**
     * @private
     */
    getRequestHeaders: function(file) {
        var headers = {};
        if (typeof file.requestHeaders != "undefined" && typeof file.requestHeaders.length != "undefined") {
            if (file.requestHeaders.length > 0) {
                for (var i = 0; i < file.requestHeaders.length; i++) {
                    headers[file.requestHeaders[i].name] = file.requestHeaders[i].value;
                }
            }
            return headers;
        }
        return undefined;
    },

    /**
     * @private
     */
    getResponseText: function(file, headers) {
        if (typeof file.responseText != "undefined") {
            return file.responseText;
        }
        return '';
    },

    /**
     * @private
     */
    getCookie: function(file) {
        var cookie = '';

        if (typeof file.requestHeaders != "undefined" && typeof file.requestHeaders.length != "undefined") {
            for (var i = 0; i < file.requestHeaders.length; i++) {
                if (file.requestHeaders[i].name == "Cookie") {
                    if (cookie.length > 0) {
                        cookie += '\n';
                    }
                    cookie += file.requestHeaders[i].value;
                }
            }
        }
        return cookie;
    },

    /**
     * @private
     */
    getType: function(file) {
        var type = undefined;
        if (file.status == "302") {
            type = "redirect";
        } else if (typeof file.mimeType != "undefined") {
            type = YSLOW.util.getComponentType(file.mimeType);
        }
        return type;
    }

};
