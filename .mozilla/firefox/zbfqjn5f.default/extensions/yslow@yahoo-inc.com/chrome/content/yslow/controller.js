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
 * @class controller
 * @static
 */

YSLOW.controller = {

    rules: {},

    rulesets: {},

    onloadTimestamp: null,

    renderers: {},

    default_ruleset_id: 'ydefault',

    run_pending: undefined,

    /**
     * Init code.  Add event listeners.
     */
    init: function() {

        // listen to onload event.
        YSLOW.util.event.addListener("onload",
                                     function(e) {
                                         this.onloadTimestamp = e.time;
                                         YSLOW.platform.util.setTimer(function() { YSLOW.controller.run_pending_event(); });
                                     }, this);

        // listen to onunload event.
        YSLOW.util.event.addListener("onUnload",
                                     function(e) {
                                         this.run_pending = undefined;
                                         this.onloadTimestamp = null;
                                     }, this);

        // load custom ruleset
        var arr_rulesets = YSLOW.util.Preference.getPrefList("customRuleset.", undefined);
        if (arr_rulesets && arr_rulesets.length > 0) {
            for (var i = 0; i < arr_rulesets.length; i++) {
                var value = arr_rulesets[i].value;
                if (typeof value === "string" && value.length > 0) {
                    var obj = YSLOW.JSON.parse(value, null);
                    obj.custom = true;
                    this.addRuleset(obj);
                }
            }
        }

        this.default_ruleset_id = YSLOW.util.Preference.getPref("defaultRuleset", 'ydefault');

        // load rule config preference
        this.loadRulePreference();
    },

    /**
     * Run controller to start peeler. Don't start if the page is not done loading.
     * Delay the running until onload event.
     *
     * @param {Window} win window object
     * @param {YSLOW.context} yscontext YSlow context to use.
     * @param {Boolean} autorun value to indicate if triggered by autorun
     */
    run: function(win, yscontext, autorun) {

        var doc = win.document;
        var cset;

        if (!doc || ! doc.location || doc.location.href.indexOf("about:") === 0 ||
            "undefined" === typeof doc.location.hostname) {
            if (!autorun) {
                var line = 'Please enter a valid website address before running YSlow.';
                YSLOW.ysview.openDialog(YSLOW.ysview.panel_doc, 389, 150, line, '', 'Ok');
            }
            return;
        }

	// Since firebug 1.4, onload event is not passed to YSlow if firebug
	// panel is not opened. Recommendation from firebug dev team is to
	// refresh the page before running yslow, which is unnecessary from
	// yslow point of view.  For now, just don't enforce running YSlow
	// on a page has finished loading.
        if (false && !yscontext.PAGE.loaded) {
            this.run_pending = {'win': win,  'yscontext': yscontext};
            // @todo: put up spining logo to indicate waiting for page finish loading.
            return;
        }

        YSLOW.util.event.fire("peelStart", undefined);
        cset = YSLOW.peeler.peel(doc, this.onloadTimestamp);
        // need to set yscontext_component_set before firing peelComplete,
        // otherwise, may run into infinite loop.
        yscontext.component_set = cset;
        YSLOW.util.event.fire("peelComplete", {'component_set': cset });

        // notify ComponentSet peeling is done.
        cset.notifyPeelDone();

    },

    /**
     * Start pending run function.
     */
    run_pending_event: function() {
        if (this.run_pending !== undefined) {
            this.run(this.run_pending.win, this.run_pending.yscontext, false);
            this.run_pending = undefined;
        }
    },

    /**
     * Run lint function of the ruleset matches the passed rulset_id.
     * If ruleset_id is undefined, use Controller's default ruleset.
     * @param {Document} doc Document object of the page to run lint.
     * @param {YSLOW.context} yscontext YSlow context to use.
     * @param {String} ruleset_id ID of the ruleset to run.
     * @return Lint result
     * @type YSLOW.ResultSet
     */
    lint: function(doc, yscontext, ruleset_id) {

        var ruleset = [], rule, i, results = [], conf;
        if (ruleset_id) {
            ruleset = this.rulesets[ruleset_id];
        } else if (this.default_ruleset_id && this.rulesets[this.default_ruleset_id]) {
            ruleset = this.rulesets[this.default_ruleset_id];
        } else {
            // if no ruleset, take the first one available
            for (i in this.rulesets) {
                if (this.rulesets[i]) {
                    ruleset = this.rulesets[i];
                    break;
                }
            }
        }

        var total_score = 0;
        var total_weight = 0;

        for (i in ruleset.rules) {
            if (ruleset.rules[i] && i in this.rules) {
                try {
                rule = this.rules[i];
                conf = YSLOW.util.merge(rule.config, ruleset.rules[i]);

                var result = rule.lint(doc, yscontext.component_set, conf);

                // apply rule weight to result.
                var weight = (ruleset.weights ? ruleset.weights[i]: undefined);
                if (weight !== undefined) {
                    weight = parseInt(weight, 10);
                }
                if (weight === undefined || weight < 0 || weight > 100) {
                    if (this.rulesets['ydefault'].weights[i]) {
                        weight = this.rulesets['ydefault'].weights[i];
                    } else {
                        weight = 5;
                    }
                }
                result.weight = weight;

                if (result.score !== undefined) {
                    if (typeof result.score !== "number") {
                        var score = parseInt(result.score, 10);
                        if (!isNaN(score)) {
                            result.score = score;
                        }
                    }

                    if (typeof result.score == "number") {
                        total_weight += result.weight;

                        if (YSLOW.util.Preference.getPref('allowNegativeScore', false) === false) {
                            if (result.score < 0) {
                                result.score = 0;
                            }
                            if (typeof result.score !== "number") {
                                // for backward compatibilty of n/a
                                result.score = -1;
                            }
                        }

                        if (result.score !== 0) {
                            total_score += result.score * ( result.weight !== undefined ? result.weight : 1 );
                        }
                    }
                }

                result.name = rule.name;
                result.category = rule.category;
                result.rule_id = i;

                results[results.length] = result;
                } catch (err) {
                    YSLOW.util.dump("YSLOW.controller.lint: " + i,  err);
                    YSLOW.util.event.fire("lintError", {'rule': i, 'message': err });
                }
            }
        }

        yscontext.PAGE.overallScore = total_score / (total_weight > 0 ? total_weight: 1);
        yscontext.result_set = new YSLOW.ResultSet(results, yscontext.PAGE.overallScore, ruleset);
        yscontext.result_set.url = 
            (doc.defaultView && doc.defaultView.location.href)
            || (typeof content !== 'undefined'
            && content.location && content.location.href);
        YSLOW.util.event.fire("lintResultReady", {'yslowContext': yscontext });
        return yscontext.result_set;

    },

    /**
     * Run tool that matches the passed tool_id
     * @param {String} tool_id ID of the tool to be run.
     * @param {YSLOW.context} yscontext YSlow context
     * @param {Object} param parameters to be passed to run method of tool.
     */
    runTool: function(tool_id, yscontext, param) {
        var tool = YSLOW.Tools.getTool(tool_id);
        try {
        if (typeof tool == "object") {
            var result = tool.run(yscontext.document, yscontext.component_set, param);
            if (tool.print_output) {
                var html = '';
                if (typeof result == "object") {
                    html = result.html;
                } else if (typeof result == "string") {
                    html = result;
                }
                var doc = YSLOW.util.getNewDoc();
                doc.body.innerHTML = html;
                var h = doc.getElementsByTagName('head')[0];
                var css;
                if (typeof result.css == "undefined") {
                    // use default.
                    var URI = 'chrome://yslow/content/yslow/tool.css';
                    var req2 = new XMLHttpRequest();
                    req2.open('GET', URI, false);
                    req2.send(null);
                    css = req2.responseText;
                } else {
                    css = result.css;
                }
                if (typeof css == "string") {
                    var l = doc.createElement("style");
                    l.setAttribute("type", "text/css");
                    l.appendChild(doc.createTextNode(css));
                    h.appendChild(l);
                }

                if (typeof result.js !== "undefined") {
                    var s = doc.createElement("script");
                    s.setAttribute("type", "text/javascript");
                    s.appendChild(doc.createTextNode(result.js));
                    h.appendChild(s);
                }
                if (typeof result.plot_component !== "undefined" && result.plot_component === true) {
                    // plot components
                    YSLOW.renderer.plotComponents(doc, yscontext);
                }
            }
        } else {
            var message = tool_id + " is not a tool.";
            YSLOW.util.dump(message);
            YSLOW.util.event.fire("toolError", {'tool_id': tool_id, 'message': message});
        }
        } catch (err) {
            YSLOW.util.dump("YSLOW.controller.runTool: " + tool_id, err);
            YSLOW.util.event.fire("toolError", {'tool_id': tool_id, 'message': err});
        }
    },

    /**
     * Find a registered renderer with the passed id to render the passed view.
     * @param {String} id ID of renderer to be used. eg. 'html'
     * @param {String} view id of view, e.g. 'reportcard', 'stats' and 'components'
     * @param {Object} params parameter object to pass to XXXview method of renderer.
     * @return content the renderer generated.
     */
    render: function(id, view, params) {

        var renderer = this.renderers[id];
        var content = '';

        if (renderer.supports[view] !== undefined && renderer.supports[view] === 1) {
            switch (view) {
            case 'components':
                content = renderer.componentsView(params.comps, params.total_size);
                break;
            case 'reportcard':
                content = renderer.reportcardView(params.result_set);
                break;
            case 'stats':
                content = renderer.statsView(params.stats);
                break;
            case 'tools':
                content = renderer.toolsView(params.tools);
                break;
            case 'rulesetEdit':
                content = renderer.rulesetEditView(params.rulesets);
                break;
            }
        }
        return content;

    },

    /**
     * Get registered renderer with the passed id.
     * @param {String} id ID of the renderer
     */
    getRenderer: function(id) {
        return this.renderers[id];
    },

    /**
     * @see YSLOW.registerRule
     */
    addRule: function(rule) {

        // check YSLOW.doc class for text
        if (YSLOW.doc.rules && YSLOW.doc.rules[rule.id]) {
            var doc_obj = YSLOW.doc.rules[rule.id];
            if (doc_obj.name) {
                rule.name = doc_obj.name;
            }
            if (doc_obj.info) {
                rule.info = doc_obj.info;
            }
        }

        var i, required = ['id','name', 'config', 'info' ,'lint'];
        for (i = 0; i < required.length; i++) {
            if (typeof rule[required[i]] === 'undefined') {
                throw new YSLOW.Error('Interface error', 'Improperly implemented rule interface');
            }
        }
        if (this.rules[rule.id] !== undefined) {
            throw new YSLOW.Error('Rule register error', rule.id + " is already defined.");
        }
        this.rules[rule.id] = rule;
    },

    /**
     * @see YSLOW.registerRuleset
     */
    addRuleset: function(ruleset, update) {
        var i, required = ['id', 'name', 'rules'];
        for (i = 0; i < required.length; i++) {
            if (typeof ruleset[required[i]] === 'undefined') {
                throw new YSLOW.Error('Interface error', 'Improperly implemented ruleset interface');
            }
            if (this.checkRulesetName(ruleset.id) && update !== true) {
                throw new YSLOW.Error('Ruleset register error', ruleset.id + " is already defined.");
            }
        }
        this.rulesets[ruleset.id] = ruleset;
    },

    /**
     * Remove ruleset from controller.
     * @param {String} ruleset_id ID of the ruleset to be deleted.
     */
    removeRuleset: function(ruleset_id) {
        var ruleset = this.rulesets[ruleset_id];
        if (ruleset && ruleset.custom === true) {
            delete this.rulesets[ruleset_id];

            // if we are deleting the default ruleset, change default to 'ydefault'.
            if (this.default_ruleset_id == ruleset_id) {
                this.default_ruleset_id = 'ydefault';
                YSLOW.util.Preference.setPref("defaultRuleset", this.default_ruleset_id);
            }
            return ruleset;
        }
        return null;
    },

    /**
     * Save ruleset to preference.
     * @param {YSLOW.Ruleset} ruleset ruleset to be saved.
     */
    saveRulesetToPref: function(ruleset) {
        if (ruleset.custom === true) {
            YSLOW.util.Preference.setPref("customRuleset." + ruleset.id , YSLOW.JSON.stringify(ruleset, null, 2));
        }
    },

    /**
     * Remove ruleset from preference.
     * @param {YSLOW.Ruleset} ruleset ruleset to be deleted.
     */
    deleteRulesetFromPref: function(ruleset) {
        if (ruleset.custom === true) {
            YSLOW.util.Preference.deletePref("customRuleset." + ruleset.id);
        }
    },

    /**
     * Get ruleset with the passed id.
     * @param {String} ruleset_id ID of ruleset to be retrieved.
     */
    getRuleset: function(ruleset_id) {
        return this.rulesets[ruleset_id];
    },

    /**
     * @see YSLOW.registerRenderer
     */
    addRenderer: function(renderer) {
        this.renderers[renderer.id] = renderer;
    },

    /**
     * Return a hash of registered ruleset objects.
     * @return a hash of rulesets with ruleset_id => ruleset
     */
    getRegisteredRuleset: function() {
        return this.rulesets;
    },

    /**
     * Return a hash of registered rule objects.
     * @return all the registered rule objects in a hash. rule_id => rule object
     */
    getRegisteredRules: function() {
        return this.rules;
    },

    /**
     * Return the rule object identified by rule_id
     * @param {String} rule_id ID of rule object to be retrieved.
     * @return rule object.
     */
    getRule: function(rule_id) {
        return this.rules[rule_id];
    },

    /**
     * Check if name parameter is conflict with any existing ruleset name.
     * @param {String} name Name to check.
     * @return true if name conflicts, false otherwise.
     * @type Boolean
     */
    checkRulesetName: function(name) {
        name = name.toLowerCase();
        for (var id in this.rulesets) {
            if (this.rulesets[id].id.toLowerCase() == name || this.rulesets[id].name.toLowerCase() == name) {
                return true;
            }
        }
        return false;
    },

    /*
     * Set default ruleset.
     * @param {String} id ID of the ruleset to be used as default.
     */
    setDefaultRuleset: function(id) {
        if (this.rulesets[id] !== undefined) {
            this.default_ruleset_id = id;
            // save to pref
            YSLOW.util.Preference.setPref("defaultRuleset", id);
        }
    },

    /**
     * Get default ruleset.
     * @return default ruleset
     * @type YSLOW.Ruleset
     */
    getDefaultRuleset: function() {
        if (this.rulesets[this.default_ruleset_id] === undefined) {
            this.setDefaultRuleset('ydefault');
        }
        return this.rulesets[this.default_ruleset_id];
    },

    /**
     * Get default ruleset id
     * @return ID of the default ruleset
     * @type String
     */
    getDefaultRulesetId: function() {
        return this.default_ruleset_id;
    },

    /**
     * Load user preference for some rules. This is needed before enabling user writing ruleset yslow plugin.
     */
    loadRulePreference: function() {
        // CDN
        var cdn_hostnames = YSLOW.util.Preference.getPref("cdnHostnames", "");
        if (cdn_hostnames && cdn_hostnames.length > 0) {
            var rule = this.getRule('ycdn');
            if (rule && rule.config.patterns) {
                var CDNs = cdn_hostnames.split(",");
                for (var i = 0; i < CDNs.length; i++) {
                    var cdn = CDNs[i].replace(/^\s+|\s+$/g, "");
                    rule.config.patterns.push(cdn);
                }
            }
        }

        // minFutureExpiresSeconds
        var min_seconds = YSLOW.util.Preference.getPref("minFutureExpiresSeconds", 2*24*60*60);
        if (min_seconds > 0) {
            var rule2 = this.getRule('yexpires');
            if (rule2) {
                rule2.config.howfar = min_seconds;
            }
        }
    }

};
