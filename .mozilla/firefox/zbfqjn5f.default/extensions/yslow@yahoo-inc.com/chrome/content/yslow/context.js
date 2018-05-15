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
 * YSlow context object that holds components set, result set and statistics of current page.
 *
 * @constructor
 * @param {Document} doc Document object of current page.
 */
YSLOW.context = function(doc) {
    this.document = doc;
    this.component_set = null;
    this.result_set = null;
    this.onloadTimestamp = null;

    // reset renderer variables
    YSLOW.renderer.reset();

    this.PAGE = {
        totalSize: 0,
        totalRequests: 0,
        totalObjCount: {},
        totalObjSize: {},

        totalSizePrimed: 0,
        totalRequestsPrimed: 0,
        totalObjCountPrimed: {},
        totalObjSizePrimed: {},

        canvas_data: {},

        statusbar: false,
        overallScore: 0,

        t_done: undefined,
        loaded: false
    };

};

YSLOW.context.prototype = {

    defaultview: "ysPerfButton",

    /**
     * @private
     * Compute statistics of current page.
     * @param {Boolean} bCacheFull set to true if based on primed cache, false for empty cache.
     * @return stats object
     * @type Object
     */
    computeStats: function(bCacheFull) {

        if (!this.component_set) {
            /* need to run peeler first */
            return undefined;
        }

        var comps = this.component_set.components;
        if (comps === undefined) {
            return undefined;
        }

        // SUMMARY - Find the number and total size for the categories.
        // Iterate over all the components and add things up.
        var hCount = {}, hSize = {};   // hashes where the key is the object type
        var types = [];
        var nHttpRequests = 0;
        var i;
        for (i = 0; i < comps.length; i++) {
            var compObj = comps[i];

            if ( bCacheFull && compObj.hasFarFutureExpiresOrMaxAge() ) {
                // If the object has a far future Expires date it won't add any HTTP requests nor size to the page.
            }
            else {
                // It adds to the HTTP requests (at least a condition GET request).
                nHttpRequests++;

                var compType = compObj.type;

                hCount[compType] = ("undefined" == typeof hCount[compType] ? 1 : hCount[compType]+1 );

                var size = 0;
                if ( !bCacheFull || !compObj.hasOldModifiedDate() ) {
                    // If we're doing EMPTY cache stats OR this component is newly modified (so is probably changing).
                    if (compObj.compressed == "gzip" || compObj.compressed == "deflate") {
                        if (compObj.size_compressed !== undefined) {
                            size = parseInt(compObj.size_compressed, 10);
                        }
                    } else {
                        size = compObj.size;
                    }
                }
                hSize[compType] = ( "undefined" == typeof hSize[compType] ? size : hSize[compType]+size );
            }
        }

        var totalSize = 0;
	var aTypes = YSLOW.peeler.types;
        var canvas_data = {};
        for (i = 0; i < aTypes.length; i++) {
            var sType = aTypes[i];
            if (typeof hCount[sType] !== "undefined") {

                // canvas
                if (hSize[sType] > 0) {
                    canvas_data[sType] = hSize[sType];
                }

                totalSize += hSize[sType];
            }
        }

        return { 'total_size': totalSize, 'num_requests': nHttpRequests, 'count_obj': hCount, 'size_obj': hSize, 'canvas_data': canvas_data };
    },

    /**
     * Collect Statistics of the current page.
     */
    collectStats: function() {
        var stats = this.computeStats();
        if (stats !== undefined) {
            this.PAGE.totalSize = stats.total_size;
            this.PAGE.totalRequests = stats.num_requests;
            this.PAGE.totalObjCount = stats.count_obj;
            this.PAGE.totalObjSize = stats.size_obj;
            this.PAGE.canvas_data.empty = stats.canvas_data;
        }

        stats = this.computeStats(true);
        if (stats !== undefined) {
            this.PAGE.totalSizePrimed = stats.total_size;
            this.PAGE.totalRequestsPrimed = stats.num_requests;
            this.PAGE.totalObjCountPrimed = stats.count_obj;
            this.PAGE.totalObjSizePrimed = stats.size_obj;
            this.PAGE.canvas_data.primed = stats.canvas_data;
        }
    },

    /**
     * Call registered renderer to generate Grade view with the passed output format.
     *
     * @param {String} output_format output format, e.g. 'html', 'xml'
     * @return Grade in the passed output format.
     */
    genPerformance: function(output_format, doc) {
        if (this.result_set === null) {
            if (doc === undefined) {
                doc = this.document;
            }
            YSLOW.controller.lint(doc, this);
        }
        return YSLOW.controller.render(output_format, 'reportcard', { 'result_set': this.result_set });
    },

    /**
     * Call registered renderer to generate Stats view with the passed output format.
     *
     * @param {String} output_format output format, e.g. 'html', 'xml'
     * @return Stats in the passed output format.
     */
    genStats: function(output_format) {
        var stats = {};
        if ( ! this.PAGE.totalSize ) {
            // collect stats
            this.collectStats();
        }
        stats.PAGE = this.PAGE;
        return YSLOW.controller.render(output_format, 'stats', { 'stats': stats });
    },

    /**
     * Call registered renderer to generate Components view with the passed output format.
     *
     * @param {String} output_format output format, e.g. 'html', 'xml'
     * @return Components in the passed output format.
     */
    genComponents: function(output_format) {
        if ( ! this.PAGE.totalSize ) {
            // collect stats
            this.collectStats();
        }
        return YSLOW.controller.render(output_format, 'components', { 'comps': this.component_set.components, 'total_size': this.PAGE.totalSize });
    },

    /**
     * Call registered renderer to generate Tools view with the passed output format.
     *
     * @param {String} output_format output format, e.g. 'html'
     * @return Tools in the passed output format.
     */
    genToolsView: function(output_format) {
        var tools = YSLOW.Tools.getAllTools();
        return YSLOW.controller.render(output_format, 'tools', { 'tools' : tools });
    },

    /**
     * Call registered renderer to generate Ruleset Settings view with the passed output format.
     *
     * @param {String} output_format output format, e.g. 'html'
     * @return Ruleset Settings in the passed output format.
     */
    genRulesetEditView: function(output_format) {
        return YSLOW.controller.render(output_format, 'rulesetEdit', { 'rulesets' : YSLOW.controller.getRegisteredRuleset() });
    }

};
