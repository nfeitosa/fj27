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
 * @todo:
 * - need better way to discover @import stylesheets, the current one doesn't find them
 * - add request type - post|get - when possible, maybe in the net part of the peeling process
 *
 */

/**
 * Peeler singleton
 * @class
 * @static
 */
YSLOW.peeler = {

    /**
     * @final
     */
    types: ['doc', 'js', 'css', 'iframe', 'flash', 'cssimage', 'image', 'favicon', 'xhr', 'redirect', 'font'],

    NODETYPE: {
        ELEMENT: 1,
        DOCUMENT: 9
    },

    /*
     * http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSRule
     */
    CSSRULE: {
        IMPORT_RULE: 3,
        FONT_FACE_RULE: 5
    },

    /**
     * Start peeling the document in passed window object.
     * The component may be requested asynchronously.
     *
     * @param {DOMElement} node object
     * @param {Number} onloadTimestamp onload timestamp
     * @return ComponentSet
     * @type YSLOW.ComponentSet
     */
    peel: function(node, onloadTimestamp) {

        var component_set;

        try {
            component_set = new YSLOW.ComponentSet(node, onloadTimestamp);
            if (component_set) {

                // Find all documents in the window.
                var docs = this.findDocuments(node);

                for (var i in docs) {
                    if (docs[i].document) {
                        var doc = docs[i].document;

                        var base_href = this.getBaseHref(doc);

                        // add the document.
                        component_set.addComponent(i, docs[i].type, base_href);

                        var objs = this.findComponentsInNode(doc, doc.URL, base_href);
                        this.addComponents(component_set, objs, base_href);
                    }
                }

                this.addComponentsNotInNode(component_set, base_href);
            }
        } catch (err) {
            YSLOW.util.dump('YSLOW.peeler.peel', err);
            YSLOW.util.event.fire("peelError", {'message': err} );
        }
        return component_set;

    },

    /**
     * @private
     * Finds all frames/iframes recursively
     * @param {DOMElement} node object
     * @return an array of documents in the passed DOM node.
     * @type Array
     */
    findDocuments: function(node) {

        var frames;
        var all_docs = {};

        YSLOW.util.event.fire("peelProgress", { 'total_step': 7, 'current_step': 1, 'message' : "Finding documents" });

        if (node) {
            // check if frame digging was diabled, if so, return the top doc and return.
            if (!YSLOW.util.Preference.getPref("extensions.yslow.getFramesComponents", true)) {
                all_docs[node.URL] = { 'document' : node, 'type' : 'doc' };
                return all_docs;
            }

            var doc;
            var doc_url;
            var type = 'doc';
            if (node.nodeType == this.NODETYPE.DOCUMENT) {
                // Document node
                doc = node;
                doc_url = node.URL;
            } else if (node.nodeType == this.NODETYPE.ELEMENT && node.nodeName.toLowerCase() == 'frame') {
                // Frame node
                doc = node.contentDocument;
                doc_url = node.src;
            } else if (node.nodeType == this.NODETYPE.ELEMENT && node.nodeName.toLowerCase() == 'iframe') {
                doc = node.contentDocument;
                doc_url = node.src;
                type = 'iframe';
                if (doc.defaultView.parent.document.URL === doc_url) {
                    // check attribute
                    var value = node.getAttribute('src');
                    if (value == '') {
                        // empty src
                        doc_url = '';
                    } else {
                        // probably with an specified src.
                        doc_url = "about:blank";
                    }
                }
            } else {
                return all_docs;
            }
            all_docs[doc_url] = { 'document' : doc, 'type' : type };

            var arr_element = doc.getElementsByTagName('iframe');
            for (var i = 0; i < arr_element.length; i++) {
                if ( (typeof arr_element[i].src == 'string') && (arr_element[i].src.length > 0) ) {
                    var iframe_docs = this.findDocuments(arr_element[i]);
                    if (iframe_docs) {
                        all_docs = YSLOW.util.merge(all_docs, iframe_docs);
                    }
                }
            }

            frames = doc.getElementsByTagName('frame');
            for (var j = 0; j < frames.length; j++) {
                var frame_docs = this.findDocuments(frames[j]);
                if (frame_docs) {
                    all_docs = YSLOW.util.merge(all_docs, frame_docs);
                }
            }
        }
        return all_docs;

    },

    /**
     * @private
     * Find all components in the passed node.
     * @param {DOMElement} node DOM object
     * @param {String} doc_location document.location
     * @param {String} base_href href
     * @return array of object (array[] = {'type': object.type, 'href': object.href } )
     * @type Array
     */
    findComponentsInNode: function(node, doc_location, base_href) {

        var all_objs = [];

        var objs;

        // find stylesheets
        all_objs = this.findStylesheets(node, doc_location, base_href);

        // find scripts
        objs = this.findScripts(node);
        all_objs = all_objs.concat(objs);

        // find flash
        objs = this.findFlash(node);
        all_objs = all_objs.concat(objs);

        // find css images
        objs = this.findCssImages(node);
        all_objs = all_objs.concat(objs);

        // find images
        objs = this.findImages(node, doc_location);
        all_objs = all_objs.concat(objs);

        // find favicon
        objs = this.findFavicon(node);
        all_objs = all_objs.concat(objs);

        return all_objs;

    },

    /**
     * @private
     * Add components in Net component that are not component list found by peeler.  These can be xhr requests
     * or images that are preloaded by javascript.
     *
     * @param {YSLOW.ComponentSet} component_set ComponentSet to be checked against.
     * @param {String} base_herf base href
     */
    addComponentsNotInNode: function(component_set, base_href) {

        var j;

        // Now, check net module for xhr component.
        var xhrs = YSLOW.net.getResponseURLsByType('xhr');
        if (xhrs.length > 0) {
            for (j = 0; j < xhrs.length; j++) {
                component_set.addComponent(xhrs[j], 'xhr', base_href);
            }
        }

        // check image beacons
        var imgs = YSLOW.net.getResponseURLsByType('image');
        if (imgs.length > 0) {
            for (j = 0; j < imgs.length; j++) {
                var type = 'image';
                if (imgs[j].indexOf("favicon.ico") != -1) {
                    type = 'favicon';
                }
                component_set.addComponentNoDuplicate(imgs[j], type, base_href);
            }
        }

        // should we check other types?
        var types = ['flash', 'js', 'css', 'doc', 'redirect'];
        for (var i = 0; i < types.length; i++) {
            var objs = YSLOW.net.getResponseURLsByType(types[i]);
            for (j = 0; j < objs.length;  j++) {
                component_set.addComponentNoDuplicate(objs[j], types[i], base_href);
            }
        }

    },

    /**
     * @private
     * Find all stylesheets in the passed DOM node.
     * @param {DOMElement} node DOM object
     * @param {String} doc_location document.location
     * @param {String} base_href base href
     * @return array of object (array[] =  {'type' : 'css', 'href': object.href } )
     * @type Array
     */
    findStylesheets: function(node, doc_location, base_href) {

        var objs = [];

        YSLOW.util.event.fire("peelProgress", {'total_step': 7, 'current_step': 2, 'message': "Finding StyleSheets" });

        var arr_element = node.getElementsByTagName("link");
        for (var i = 0; i < arr_element.length; i++) {
            var element = arr_element[i];
            if ((element.rel == "stylesheet" || element.type == "text/css") &&
                 ("string" == typeof element.href)) {
                if (element.href !== '' && element.href !== doc_location) {
                    objs[objs.length] = { 'type': 'css', 'href': element.href };
                    var css_url = YSLOW.util.makeAbsoluteUrl(element.href, base_href);
                    var ssobjs = this.findImportedStylesheets(element.sheet, css_url);
                    if (ssobjs) {
                        objs = objs.concat(ssobjs);
                    }
                } else {
                    // potential empty link, check attribute
                    if (element.getAttribute('href') === '') {
                        // empty href
                        objs[objs.length] = { 'type': 'css', 'href': '' };
                    }
                }
            }
        }

        arr_element = node.getElementsByTagName("style");
        for (var j = 0; j < arr_element.length; j++) {
            var ssobjs2 = this.findImportedStylesheets(arr_element[j].sheet, base_href);
            if (ssobjs2) {
                objs = objs.concat(ssobjs2);
            }
        }
        return objs;

    },

    /**
     * @private
     * Given a css rule, if it's an "@import" rule then add the style sheet component.
     * Also, do a recursive check to see if this imported stylesheet itself contains an imported stylesheet.
     * (FF only)
     * @param {DOMElement} stylesheet DOM stylesheet object
     * @return array of object
     * @type Array
     */
    findImportedStylesheets: function(styleSheet, parent_url) {

        var objs = [];

        try {
        // In FF when document.domain is set in the original page we can't access cssRules.
        if ( "object" == typeof styleSheet.cssRules ) {
            for (var irule in styleSheet.cssRules) {
                if ( "length" != irule ) {
                    var ruleobj = styleSheet.cssRules[irule];
                    if ( ruleobj.type === this.CSSRULE.IMPORT_RULE &&  // @import css urle
                         "object" == typeof ruleobj.styleSheet &&
                         "string" == typeof ruleobj.href &&
                         0 < ruleobj.href.length ) {

                         // It IS an imported stylesheet!
                         objs[objs.length] = { 'type': 'css', 'href': ruleobj.href, 'base': parent_url };
                         // Recursively check if this stylesheet itself imports any other stylesheets.
                         var css_url = YSLOW.util.makeAbsoluteUrl(ruleobj.href, parent_url);
                         var ssobjs = this.findImportedStylesheets(ruleobj.styleSheet, css_url);
                         if (ssobjs) {
                             objs = objs.concat(ssobjs);
                         }
                    } else if ( ruleobj.type === this.CSSRULE.FONT_FACE_RULE) {
                        if (ruleobj.style && typeof ruleobj.style.getPropertyValue == "function") {
                            var font_file = ruleobj.style.getPropertyValue("src");
                            var pattern = /url\([^\s\)]*\)/g;
                            font_file = pattern.exec(font_file);
                            if (font_file && font_file.length > 0) {
                                font_file = font_file.replace(/url\(/, '');
                                font_file = font_file.substr(0, font_file.lastIndexOf(')'));
                                if (font_file.indexOf('"') === 0) {
                                    font_file = font_file.substr(1, res.length - 2);
                                }
                                objs[objs.length] = { 'type': 'font', 'href': font_file, 'base': parent_url };
                            }
                        }
                    } else {
                        break;
                    }
                }
            } // end for
        }
        } catch (err) {
            // sometimes referencing styleSheet.cssRules throws NS_DOM_INVALID_ACCESS_ERR.
        }
        return objs;

    },

    /**
     * @private
     * Find all scripts in the passed DOM node.
     * @param {DOMElement} node DOM object
     * @return array of object (array[] =  {'type' : 'js', 'href': object.href } )
     * @type Array
     */
    findScripts: function(node) {

        YSLOW.util.event.fire("peelProgress", {'total_step': 7, 'current_step': 3, 'message': "Finding JavaScripts" });

        var objs = [];
        var arr_script = node.getElementsByTagName("script");
        for ( var i = 0; i < arr_script.length; i++ ) {
            var valobj = arr_script[i];
            if ( "string" == typeof valobj.src && 0 < valobj.src.length ) {
                // if type is specified, check if type is text/javascript, if type
                // is not specified, assume it's javascript.  I checked on IE and firefox,
                // javascript with no type will still be run.
                if (typeof valobj.type == "string" && valobj.type.length > 0 && valobj.type.indexOf('javascript') === -1) {
                    continue;
                }
                if (valobj.src === node.URL) {
                    objs[objs.length] = { 'type': 'js', 'href': '' };
                } else {
                    objs[objs.length] = { 'type': 'js', 'href': valobj.src };
                }
            }
        }
        return objs;

    },

    /**
     * @private
     * Find all flash in the passed DOM node.
     * @param {DOMElement} node DOM object
     * @return array of object (array[] =  {'type' : 'flash', 'href': object.href } )
     * @type Array
     */
    findFlash: function(node) {

        var objs = [];
        var element;

        YSLOW.util.event.fire("peelProgress", {'total_step': 7, 'current_step': 4, 'message': "Finding Flash" });

        var arr_element = node.getElementsByTagName("embed");
        for (var i = 0; i < arr_element.length; i++) {
            element = arr_element[i];
            if ( "string" == typeof element.src && 0 < element.src.length ) {
                objs[objs.length] = { 'type': 'flash', 'href': element.src };
            }
        }

        arr_element = node.getElementsByTagName("object");
        for (var j = 0; j < arr_element.length; j++) {
            element = arr_element[j];
            if ( "string" == typeof element.data && 0 < element.data.length &&
                 element.type == "application/x-shockwave-flash") {
                objs[objs.length] = { 'type': 'flash', 'href': element.data };
            }
        }

        return objs;

    },

    /**
     * @private
     * Find all css images in the passed DOM node.
     * @param {DOMElement} node DOM object
     * @return array of object (array[] = {'type' : 'cssimage', 'href': object.href } )
     * @type Array
     */
    findCssImages: function(node) {

        var objs = [],
            interesting = ['backgroundImage', 'listStyleImage', 'content', 'cursor'],
            els = node.getElementsByTagName('*');

        YSLOW.util.event.fire("peelProgress", {'total_step': 7, 'current_step': 5, 'message': "Finding CSS Images" });

        for (var i = 0, max = els.length; i < max; i++) {
            for (var j = 0; j < interesting.length; j++) {
                var s = YSLOW.util.getComputedStyle(els[i], interesting[j], true);
                if (s) {
                    objs[objs.length] = {'type': 'cssimage', 'href': s};
                }
            }
        }

        return objs;

    },

    /**
     * @private
     * Find all images in the passed DOM node.
     * @param {DOMElement} node DOM object
     * @return array of object (array[] = {'type': 'image', 'href': object.href} )
     * @type Array
     */
    findImages: function(node, doc_location) {

        var objs = [];
        YSLOW.util.event.fire("peelProgress", {'total_step': 7, 'current_step':6, 'message':"Finding Images" });

        var arr_element = node.getElementsByTagName("img");
        if ( arr_element && typeof arr_element != "undefined" && arr_element.length > 0 ) {
            for (var i = 0; i < arr_element.length; i++) {
                if ( arr_element[i].src && typeof arr_element[i].src == "string" && arr_element[i].src.length > 0 ) {

                    if (arr_element[i].src == doc_location) {
                        // check attribute
                        var value = arr_element[i].getAttribute('src');
                        if (value == '') {
                            // empty src
                            objs[objs.length] = { 'type': 'image', 'href': '' };
                            continue;
                        }
                    }
                    objs[objs.length] = { 'type': 'image', 'href': arr_element[i].src, 'obj': arr_element[i] };
                }
            }
        }
        return objs;

    },

    /**
     * @private
     * Find favicon link.
     * @param {DOMElement} node DOM object
     * @return array of object (array[] = {'type': 'favicon', 'href': object.href} )
     * @type Array
     */
    findFavicon: function(node) {

        var objs = [];
        YSLOW.util.event.fire("peelProgress", {'total_step': 7, 'current_step': 7, 'message': "Finding favicon" });

        var arr_element = node.getElementsByTagName("link");
        if (arr_element && typeof arr_element != "undefined" && arr_element.length > 0) {
            for (var i = 0; i < arr_element.length; i++) {
                if (arr_element[i].rel && typeof arr_element[i].rel == "string" &&
                    arr_element[i].href && typeof arr_element[i].href == "string" &&
                    (arr_element[i].rel == "icon" || arr_element[i].rel == "shortcut icon")) {
                    objs[objs.length] = { 'type': 'favicon', 'href': arr_element[i].href };
                }
            }
        }
        return objs;

    },

    /**
     * @private
     * Add an array of obj in the passed component set.
     * @param {YSLOW.ComponentSet} component_set ComponentSet object
     * @param {Array} array of objects to be added to ComponentSet.
     * @param {String} base_href base href
     */
    addComponents: function(component_set, objs, base_href) {

        if (objs) {
            for (var i = 0; i < objs.length; i++) {
                if (typeof objs[i].type == "string" && typeof objs[i].href == "string") {
                    if (objs[i].base !== undefined && objs[i].base !== null) {
                        component_set.addComponent(objs[i].href, objs[i].type, objs[i].base, objs[i].obj);
                    } else {
                        component_set.addComponent(objs[i].href, objs[i].type, base_href, objs[i].obj);
                    }
                }
            }
        }

    },

    /**
     * @private
     * Get base href of document.  If <base> element is not found, use doc.location.
     * @param {Document} doc Document object
     * @return base href
     * @type String
     */
    getBaseHref: function(doc) {

        var arr_element = doc.getElementsByTagName("base");
        var base_href = '';

        if ( arr_element && typeof(arr_element) != "undefined" && arr_element.length > 0) {
            base_href = arr_element[0].href;
        } else {
            base_href = doc.URL;
        }
        return base_href;

    }

};
