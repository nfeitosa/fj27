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
 *     Stoyan Stefanov
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * @namespace YSLOW
 * @class net
 * @static
 */
YSLOW.net = {

    _native: null,

    pending_requests: [],

    num_active_requests: 0,

    max_active_requests: 3,

    registerNative: function(o) {
        if (this._native === null) {
            this._native = [];
            this._native.push(o);
        } else {
            this._native.splice(0, 0, o);
        }
    },

    /**
     * Get component info from the net.
     * @param url
     * @param callback function to be called when info is ready, the response hash will be passed to the callback.
     * @param binary, pass true if requesting binary content.
     * <ul>response
     * <li>status</li>
     * <li>header</li>
     * <li>body</li>
     * <li>size</li>
     * <li>expires</li>
     * <li>compressed</li>
     * </ul>
     */
    getInfo: function(url, callback, binary) {

        if (this._native) {
            // if native function can't find info of the url, request it using xhr.
            for (var i=0; i < this._native.length; i++) {
                if (this._native[i].getInfo(url, callback, binary)) {
                    return;
                }
            }
        }

        // By default, FF3 limits the number of xhr connections per server to 6 (previous versions limit
        // this to 2 per server). Some web sites may keep an XHR connection open, so opening multiple
        // sessions to such sites may result in the browser hanging in such a way that the window no
        // longer repaints and controls don't respond.  Here, we limit the number of xhrs requests by
        // by storing it away and processing 3 at a time.
        this.pending_requests.push({ 'url': url, 'callback': callback, 'binary': binary });
        YSLOW.platform.util.setTimer(YSLOW.net.servicePendingRequests, 0);

    },

    /**
     * @private
     */
    servicePendingRequests: function() {
        if (YSLOW.net.pending_requests.length > 0 && YSLOW.net.num_active_requests < YSLOW.net.max_active_requests) {
            var request = YSLOW.net.pending_requests.shift();
            YSLOW.net.num_active_request++;
            YSLOW.net.asyncRequest(request.url, request.callback, request.binary);
        }
    },

    /**
     * Get XHR info from net.
     */
    getResponseURLsByType: function(type) {

        var objs = [];

        if (this._native) {
            for (var i=0; i < this._native.length; i++) {
                objs = this._native[i].getResponseURLsByType(type);
                if (objs instanceof Array && objs.length === 0) {
                    break;
                }
            }
        }
        return objs;

    },

    /**
     * Requests a URL using XHR asynchronously.
     *
     * The callback passed to this method will receive a hash, containing:
     * <ul>
     *  <li><code>url</code></li>
     *  <li><code>status</code> - status code, e.g 200 or 404</li>
     *  <li><code>raw_headers</code> - a string of headers, as raw as it gets</li>
     *  <li><code>headers</code> - a hash of name=>value headers</li>
     *  <li><code>body</code> - the raw body of the component</li>
     *  <li><code>respTime</code> - the request time of the component</li>
     * </ul>
     *
     * @param url
     * @param callback to be called when XHR request is done.
     *        a response hash will be passed to the callback,
     *        containing status, headers and others
     * @param binary, pass true if requesting binary content.
     */
    asyncRequest: function(url, callback, binary) {
        var startTimestamp;
        var req = YSLOW.util.getXHR();
        req.open('GET', url, true);
        /**
         * @ignore
         */
        req.onreadystatechange = function (e) {
            var xhr = (e ? e.target : req);
            var response;
            if (xhr.readyState === 4) { // DONE
                response = {};
                response.url = url;
                response.status = xhr.status;
                try {
                    response.raw_headers = xhr.getAllResponseHeaders();
                } catch (err) {
                    response.raw_headers = '';
                }
                response.headers = YSLOW.net.getXHRResponseHeaders(xhr);
                response.body = xhr.responseText;

                if (response.headers && response.headers['Content-Type']) {
                    response.type = YSLOW.util.getComponentType(response.headers['Content-Type']);
                }

                var endTimestamp = (new Date()).getTime();
                if (startTimestamp !== undefined && startTimestamp !== null && endTimestamp !== null) {
                    response.respTime = endTimestamp - startTimestamp;
                }

                callback(response);
                YSLOW.net.num_active_request--;
            }
        };
        YSLOW.platform.util.setTimer(function() {
            req.abort();
        }, YSLOW.util.Preference.getPref("extensions.yslow.xhrWaitingTime", 120000)); // 2 min timeout

        if (binary) {
            req.overrideMimeType('text/plain; charset=x-user-defined');
        }

        startTimestamp = (new Date()).getTime();
        req.send(null);

    },

    /**
     * Turns response headers string into a hash.
     *
     * Accounts for set-cookie and potentially other duplicate headers.
     *
     * @param {XMLHttpRequest} req The XHR object
     * @return {Object} A hash of headers, like {'Content-Type': 'image/png', 'Content-encoding': 'gzip', etc... }
     */
    getXHRResponseHeaders: function(req) {

        var res = {}, name, value, i,
            hdr;

        try {
            hdr = req.getAllResponseHeaders();
        } catch(err) {
            return res;
        }
        if (hdr) {
            hdr = hdr.split('\n');

            for(i = 0; i < hdr.length; i++) {
                name = hdr[i].split(':')[0];
                if (name) {
                    value = req.getResponseHeader(name);
                    if (value) {
                        if (name.toLowerCase() == "set-cookie") {
                            res[name] = value;
                        } else {
                            res[name] = value.replace(/\n/g, ' ');
                        }
                    }
                }
            }
        }
        return res;

    }

};
