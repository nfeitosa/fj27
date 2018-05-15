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
 * @namespace YSLOW
 * @class Component
 * @constructor
 */
YSLOW.Component = function(url, type, parent_set, obj) {

    /**
     * URL of the component
     * @type String
     */
    this.url = url;

    /**
     * Component type, one of the following:
     * <ul>
     *  <li>doc</li>
     *  <li>js</li>
     *  <li>css</li>
     *  <li>...</li>
     * </ul>
     * @type String
     */
    this.type = type;

    /**
     * Parent component set.
     */
    this.parent = parent_set;

    /**
     *
     */
    this.headers = {};
    this.raw_headers = '';
    this.req_headers = null;
    /**
     */
    this.body = '';
    this.compressed = false;
    this.expires = undefined;  // to be replaced by a Date object
    this.size = 0;
    this.status = 0;
    this.is_beacon = false;
    this.method = 'unknown';
    this.cookie = '';
    this.respTime = null;
    this.after_onload = false;

    // component object properties
    // e.g. for image, image element width, image element height, actual width, actual height
    this.object_prop = undefined;

    // construction part
    if (type === undefined) {
        this.type = 'unknown';
    }

    this._get_info_state = 'NONE';

    if (type == 'image') {
        if (obj !== undefined && obj !== null) {
            this.object_prop = { 'width': obj.width, 'height': obj.height };
        }
    }

    this.setComponentDetails();

};

YSLOW.Component.prototype.setComponentDetails = function(){

    var comp = this;

    YSLOW.net.getInfo(this.url,
        function(response){

            // copy from the response object
            comp.status = response.status;
            comp.headers = response.headers;
            comp.raw_headers = response.raw_headers;
            if (response.req_headers) {
                comp.req_headers = response.req_headers;
            }
            comp.body = (response.body !== null) ? response.body : '';
            if (typeof response.method === "string") {
                comp.method = response.method;
            }
            if ((comp.type == 'unknown' && response.type !== undefined) ||
                (comp.type == 'doc' && (response.type !== undefined && response.type !== 'unknown'))) {
                comp.type = response.type;
            }
            // for security checking
            comp.response_type = response.type;
            if (typeof response.cookie === "string") {
                comp.cookie = response.cookie;
            }
            if (typeof response.size == "number" && response.size > 0) {
                comp.nsize = response.size;
            }
            if (typeof response.respTime !== "undefined") {
                comp.respTime = response.respTime;
            }
            if (typeof response.startTimestamp !== "undefined" && comp.parent.onloadTimestamp !== null) {
                comp.after_onload = (response.startTimestamp > comp.parent.onloadTimestamp) ? true: false;
            } else if (typeof response.after_onload !== "undefined") {
                comp.after_onload = response.after_onload;
            }

            comp.populateProperties();

            comp._get_info_state = 'DONE';

            // notify parent ComponentSet that this component has gotten net response.
            comp.parent.onComponentGetInfoStateChange({ 'comp': comp, 'state': 'DONE' });

        },
        (this.type.indexOf('image') !== -1 ? true: false));

};

/**
 * Return the state of getting detail info from the net.
 */
YSLOW.Component.prototype.getInfoState = function() {
    return this._get_info_state;
};

YSLOW.Component.prototype.populateProperties = function() {

    var encoding, expires, cache_control, maxage, index, content_length;

    // check location
    if (this.headers.Location !== undefined) {
        // Add a new component.
        var comp = this.parent.addComponentNoDuplicate(this.headers.Location, (this.type !== "redirect" ? this.type: 'unknown'), this.url);
        if (comp && this.after_onload) {
            comp.after_onload = true;
        }
        this.type = 'redirect';
    }

    content_length = this.headers['Content-Length'];

    // gzip, deflate
    encoding = this.headers['Content-Encoding'];
    if (encoding === 'gzip' || encoding === 'deflate') {
        this.compressed = encoding;
        this.size = (this.body.length > 0) ? this.body.length: null;
        if (content_length) {
            this.size_compressed = content_length;
        } else if (this.nsize !== undefined) {
            this.size_compressed = this.nsize;
        } else {
            // a hack
            this.size_compressed = this.size / 3;
        }
    } else {
        this.compressed = false;
        this.size_compressed = null;
        if (content_length) {
            this.size = Number(content_length);
        } else if (this.nsize !== undefined) {
            this.size = Number(this.nsize);
        } else {
            this.size = this.body.length;
        }
    }

    // size check/correction, @todo be more precise here
    if (!this.size) {
        if (this.nsize !== undefined) {
            this.size = this.nsize;
        } else {
            this.size = this.body.length;
        }
    }
    this.uncompressed_size = this.body.length;

    // expiration based on either Expires or Cache-control headers
    expires = this.headers.Expires;
    if (expires && expires.length > 0) {
        // set expires as a JS object
        this.expires = new Date(expires);
        if (this.expires.toString() == "Invalid Date") {
            this.expires = this.getMaxAge();
        }
    } else {
        this.expires = this.getMaxAge();
    }

    if (this.type === 'image') {
        var img_src;
        var obj = new Image();
        if (this.body.length > 0) {
            img_src = 'data:' + this.headers['Content-Type'] + ';base64,' + YSLOW.util.base64Encode(this.body);
        } else {
            img_src = this.url;
        }
        obj.src = img_src;

        if (obj && obj.width && obj.height) {
            if (this.object_prop !== undefined) {
                this.object_prop.actual_width = obj.width;
                this.object_prop.actual_height = obj.height;
            } else {
                this.object_prop = {'width': obj.width, 'height': obj.height, 'actual_width': obj.width, 'actual_height': obj.height };
            }
            if (obj.width < 2 && obj.height < 2) {
                this.is_beacon = true;
            }
        }

    }

};

/**
 *  Return true if this object has a last-modified date significantly in the past.
 */
YSLOW.Component.prototype.hasOldModifiedDate = function() {
    var now = Number(new Date());
    var modified_date = this.headers["Last-Modified"];
    if (typeof modified_date !== "undefined") {
        return ( (now - Number(new Date(modified_date))) > (24*60*60*1000) );  // at least 1 day in the past
    }
    return false;
};

/**
 * Return true if this object has a far future Expires.
 * @todo: make the "far" interval configurable
 * @param expires Date object
 * @return true if this object has a far future Expires.
 */
YSLOW.Component.prototype.hasFarFutureExpiresOrMaxAge = function() {
    var now = Number(new Date());
    var minSeconds = YSLOW.util.Preference.getPref("minFutureExpiresSeconds", 2*24*60*60);
    var minMilliSeconds = minSeconds * 1000;

    if (typeof this.expires === "object") {
        var expires_in_seconds = Number(this.expires);
        if ((expires_in_seconds - now) > minMilliSeconds) {
            return true;
        }
    }
    return false;
};

YSLOW.Component.prototype.getEtag = function() {
    var etag = this.headers.Etag;
    if (etag !== undefined) {
        return etag;
    }
    return '';
};

YSLOW.Component.prototype.getMaxAge = function() {
    var cache_control = this.headers['Cache-Control'];
    var index, maxage, expires;

    if (cache_control) {
        index = cache_control.indexOf('max-age');
        if (index > -1) {
            maxage = parseInt(cache_control.substring(index + 8), 10);
            if (maxage > 0) {
                expires = YSLOW.util.maxAgeToDate(maxage);
            }
        }
    }
    return expires;
};

/**
 * Return total size of Set-Cookie headers of this component.
 * @return total size of Set-Cookie headers of this component.
 * @type Number
 */
YSLOW.Component.prototype.getSetCookieSize = function() {
    // only return total size of cookie received.
    var size = 0;
    if (this.headers && this.headers['Set-Cookie']) {
        var aCookies = this.headers['Set-Cookie'].split("\n");
        if (aCookies.length > 0) {
            for (var k = 0; k < aCookies.length; k++) {
                size += aCookies[k].length;
            }
        }
    }
    return size;
};

/**
 * Return total size of Cookie HTTP Request headers of this component.
 * @return total size of Cookie headers Request of this component.
 * @type Number
 */
YSLOW.Component.prototype.getReceivedCookieSize = function() {
    // only return total size of cookie sent.
    var size = 0;
    if (this.cookie && this.cookie.length > 0) {
        var aCookies = this.cookie.split("\n");
        if (aCookies.length > 0) {
            for (var k = 0; k < aCookies.length; k++) {
                size += aCookies[k].length;
            }
        }
    }
    return size;
};
