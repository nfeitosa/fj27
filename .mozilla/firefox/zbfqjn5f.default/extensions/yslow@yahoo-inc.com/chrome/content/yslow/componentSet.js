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
 * ComponentSet holds an array of all the components and get the response info from net module for each component.
 *
 * @constructor
 * @param {DOMElement} node DOM Element
 * @param {Number} onloadTimestamp onload timestamp
 */
YSLOW.ComponentSet = function(node, onloadTimestamp) {

    //
    // properties
    //
    this.root_node = node;
    this.components = [];
    this.outstanding_net_request = 0;
    this.component_info = [];
    this.onloadTimestamp = onloadTimestamp;
    this.nextID = 1;
    this.notified_fetch_done = false;

};

YSLOW.ComponentSet.prototype = {

    /**
     * Call this function when you don't use the component set any more.
     * A chance to do proper clean up, e.g. remove event listener.
     */
    clear: function() {
        this.components = [];
        this.component_info = [];
        this.cleared = true;
        if (this.outstanding_net_request > 0) {
            YSLOW.util.dump("YSLOW.ComponentSet.Clearing component set before all net requests finish.");
        }
    },

    /**
     * Add a new component to the set.
     * @param {String} url URL of component
     * @param {String} type type of component
     * @param {String} base_href base href of document that the component belongs.
     * @param {Object} obj DOMElement (for image type only)
     * @return Component object that was added to ComponentSet
     * @type ComponentObject
     */
    addComponent: function(url, type, base_href, obj) {

        var comp;
        if (url == '') {
            if (this.empty_url === undefined) {
                this.empty_url = [];
            }
            var n = (this.empty_url[type] === undefined ? 0 : this.empty_url[type]);
            this.empty_url[type] = n + 1;
        }
        if (url && type) {
            // check if url is valid.
            if (!YSLOW.ComponentSet.isValidProtocol(url) || !YSLOW.ComponentSet.isValidURL(url)) {
                return comp;
            }

            // Make sure url is absolute url.
            url = YSLOW.util.makeAbsoluteUrl(url, base_href);
            // For security purpose
            url = YSLOW.util.escapeHtml(url);

            if (this.component_info[url] === undefined) {
                // make sure this component is not already in this component set.
                this.component_info[url] = { 'state': 'NONE', 'count' : 0 };

                comp = new YSLOW.Component(url, type, this, obj);
                if (comp) {
                    comp.id = this.nextID++;
                    this.components[this.components.length] = comp;
                    if (this.component_info[url].state === 'NONE') {
                        // net.js has probably made an async request.
                        this.component_info[url].state = 'REQUESTED';
                        this.outstanding_net_request++;
                    }
                } else {
                    this.component_info[url].state = 'ERROR';
                    YSLOW.util.event.fire("componentFetchError");
                }
            }
            this.component_info[url].count++;
        }
        return comp;

    },

    /**
     * Add a new component to the set, ignore duplicate.
     * @param {String} url url of component
     * @param {String} type type of component
     * @param {String} base_href base href of document that the component belongs.
     */
    addComponentNoDuplicate: function(url, type, base_href) {

        if (url && type) {
            // For security purpose
            url = YSLOW.util.escapeHtml(url);
            url = YSLOW.util.makeAbsoluteUrl(url, base_href);
            if (this.component_info[url] === undefined) {
                return this.addComponent(url, type, base_href);
            }
        }

    },

    /**
     * Get components by type.
     *
     * @param {String|Array} type The type of component to get, e.g. "js" or ['js', 'css']
     * @param {Boolean} include_after_onload If component loaded after onload should be included in the returned results, default is FALSE, don't include
     * @param {Boolean} include_beacons If image beacons (1x1 images) should be included in the returned results, default is FALSE, don't include
     * @return An array of matching components
     * @type Array
     */
    getComponentsByType: function(type, include_after_onload, include_beacons) {

        var comps = [], types = {}, i;

        if (include_after_onload === undefined) {
            include_after_onload = !(YSLOW.util.Preference.getPref("excludeAfterOnload", true));
        }
        if (include_beacons === undefined) {
            include_beacons = !(YSLOW.util.Preference.getPref("excludeBeaconsFromLint", true));
        }

        if (typeof type === 'string') {
            types[type] = 1;
        } else {
            for (i in type) {
                if (type[i]) {
                    types[type[i]] = 1;
                }
            }
        }


        for (var j in this.components) {
            if (this.components[j]) {
                if (typeof types[this.components[j].type] !== 'undefined') {
                    if (!include_beacons && this.components[j].is_beacon) {
                        continue;
                    }
                    if (this.components[j].after_onload && !include_after_onload) {
                        continue;
                    }
                    comps[comps.length] = this.components[j];
                    if (this.component_info[j] && this.component_info[j].count > 1) {
                        for (var k = 1; k < this.component_info[j].count; k++) {
                            if (!include_beacons && this.components[j].is_beacon) {
                                continue; // skip beacons
                            }
                            if (this.components[j].after_onload && !include_after_onload) {
                                continue;
                            }
                            comps[comps.length] = this.components[j];
                        }
                    }
                }
            }
        }
        return comps;

    },

    /**
     * @private
     * Get fetching progress.
     * @return { 'total' => total number of component, 'received' => number of components fetched  }
     */
    getProgress: function() {

        var total = 0;
        var received = 0;

        for (var i in this.component_info) {
            if (this.component_info[i]) {
                if (this.component_info[i].state === 'RECEIVED') {
                    received++;
                }
                total++;
            }
        }
        return { 'total': total, 'received': received };
    },

    /**
     * Event callback when component's GetInfoState changes.
     * @param {Object} event object
     */
    onComponentGetInfoStateChange: function(event_object) {

        var comp, state;

        if (event_object) {
            if (event_object.comp !== undefined) {
                comp = event_object.comp;
            }
            if (event_object.state !== undefined) {
                state = event_object.state;
            }
        }
        if (this.component_info[comp.url] === undefined) {
            // this should not happen.
            YSLOW.util.dump("YSLOW.ComponentSet.onComponentGetInfoStateChange(): Unexpected component: " + comp.url);
            return;
        }

        if (this.component_info[comp.url].state === "NONE" && state == 'DONE') {
            this.component_info[comp.url].state = "RECEIVED";
        } else if (this.component_info[comp.url].state === "REQUESTED" && state == 'DONE') {
            this.component_info[comp.url].state = "RECEIVED";
            this.outstanding_net_request--;
            // Got all component detail info.
            if (this.outstanding_net_request === 0) {
                this.notified_fetch_done = true;
                YSLOW.util.event.fire("componentFetchDone", {'component_set': this } );
            }
        } else {
            // how does this happen?
            YSLOW.util.dump("Unexpected component info state: [" + comp.type + "]" + comp.url + "state: " + state + " comp_info_state: " + this.component_info[comp.url].state);
        }

        // fire event.
        var progress = this.getProgress();
        YSLOW.util.event.fire("componentFetchProgress", {'total': progress.total, 'current': progress.received, 'last_component_url': comp.url });

    },

    /**
     * This is called when peeler is done.
     * If ComponentSet has all the component info, fire componentFetchDone event.
     */
    notifyPeelDone: function() {
        if (this.outstanding_net_request === 0 && !this.notified_fetch_done) {
            this.notified_fetch_done = true;
            YSLOW.util.event.fire("componentFetchDone", {'component_set': this } );
        }
    }

};

/*
 * List of protocols to ignore in component set.
 */
YSLOW.ComponentSet.ignoreProtocols = ['data', 'chrome', 'javascript', 'about', 'resource', 'jar'];

/**
 * @private
 * Check if url has an allowed protocol (no chrome://, about:)
 * @param url
 * @return false if url does not contain hostname.
 */
YSLOW.ComponentSet.isValidProtocol = function(s) {

    s = s.toLowerCase();
    var index = s.indexOf(':');
    if (index != -1) {
        var protocol = s.substr(0, index);
        for (var max = this.ignoreProtocols.length, i = 0; i < max; i++) {
            if (protocol == this.ignoreProtocols[i]) {
                return false;
            }
        }
    }
    return true;

};


/**
 * @private
 * Check if passed url has hostname specified.
 * @param url
 * @return false if url does not contain hostname.
 */
YSLOW.ComponentSet.isValidURL = function(url) {

    url = url.toLowerCase();

    // all url is in the format of <protocol>:<the rest of the url>
    var arr = url.split(":");

    // for http protocol, we want to make sure there is a host in the url.
    if (arr[0] == "http" || arr[0] == "https") {
        if (arr[1].substr(0, 2) != "//") {
            return false;
        }
        var host = arr[1].substr(2);
        if (host.length === 0 || host.indexOf("/") === 0) {
            // no host specified.
            return false;
        }
    }
    return true;

};

