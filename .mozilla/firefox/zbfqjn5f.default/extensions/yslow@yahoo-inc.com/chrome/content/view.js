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
 * YSLOW.view manages the YSlow UI.
 * @class
 * @constructor
 * @param {Object} panel This panel object can be YSLOW.firefox.Panel or FirebugPanel.
 * @param {YSLOW.context} yscontext YSlow context to associated with this view.
 */
YSLOW.view = function(panel, yscontext) {
    this.panel_doc = panel.document;
    this.buttonViews = {};
    this.curButtonId = "";
    this.panelNode = panel.panelNode;

    this.loadCSS(this.panel_doc);

    var toolbar = this.panel_doc.createElement("div");
    toolbar.id = "toolbarDiv";
    toolbar.innerHTML = this.getToolbarSource();
    toolbar.style.display = "block";

    var elem = this.panel_doc.createElement("div");
    elem.style.display = "block";

    // create modal dialog.
    var dialogHtml = '<div class="dialog-box"><div class="gradient"><h1><span></span><div class="dialog-text">text</div></h1></div><div class="dialog-more-text"></div><div class="buttons"><div id="middle"><input class="dialog-left-button" type="button" value="Ok" onclick="javascript:document.ysview.closeDialog(document)"><input class="dialog-right-button" type="button" value="Cancel" onclick="javascript:document.ysview.closeDialog(document)"></div><div id="bottom"></div></div></div>';

    var modaldlg = this.panel_doc.createElement('div');
    modaldlg.id = "dialogDiv";
    modaldlg.innerHTML = dialogHtml;
    modaldlg.style.display = "none";
    // save modaldlg in view, make look up easier.
    this.modaldlg = modaldlg;

    this.tooltip = new YSLOW.view.Tooltip(this.panel_doc, panel.panelNode);

    var copyright = this.panel_doc.createElement('div');
    copyright.id = "copyrightDiv";
    copyright.innerHTML = YSLOW.doc.copyright;
    this.copyright = copyright;

    if (panel.panelNode) {
        panel.panelNode.id = "yslowDiv";
        panel.panelNode.appendChild(modaldlg);
        panel.panelNode.appendChild(toolbar);
        panel.panelNode.appendChild(elem);
        panel.panelNode.appendChild(copyright);
    }
    this.viewNode = elem;
    this.viewNode.id = "viewDiv";
    this.viewNode.className = "yui-skin-sam";

    this.yscontext = yscontext;

    this.panelNode.addEventListener("click", function(e) {
        var help;
        // In order to support YSlow running on mutli-tab,
        // we need to look up helpDiv using panelNode.
        // panel_doc.getElementById('helpDiv') will always find
        // helpDiv of YSlow running on the first browser tab.
        var toolbar = panel.document.ysview.getElementByTagNameAndId(panel.panelNode, "div", "toolbarDiv");
        if (toolbar) {
            var helplink = panel.document.ysview.getElementByTagNameAndId(toolbar, "li", "helpLink");
            if (helplink) {
                var x = helplink.offsetLeft;
                var y = helplink.offsetTop;
                var parent = helplink.offsetParent;
                while (parent) {
                    x += parent.offsetLeft;
                    y += parent.offsetTop;
                    parent = parent.offsetParent;
                }
                if (e.clientX >= x && e.clientY >=y &&
                    e.clientX < x + helplink.offsetWidth &&
                    e.clientY < y + helplink.offsetHeight) {
                    /* clicking on help link, do nothing */
                    return;
                }
            }
            help = panel.document.ysview.getElementByTagNameAndId(toolbar, "div", "helpDiv");
        }
        if (help && help.style.visibility == "visible") {
            help.style.visibility = "hidden";
        }
    }, false);

    this.panelNode.addEventListener("scroll", function(e) {
        var overlay = panel.document.ysview.modaldlg;
        if (overlay && overlay.style.display == "block") {
            overlay.style.top = panel.panelNode.scrollTop + 'px';
            overlay.style.left = panel.panelNode.scrollLeft + 'px';
        }
    }, false);

    this.panelNode.addEventListener("mouseover", function(e) {
        if (e.target && typeof e.target == "object") {
            if (e.target.nodeName == "LABEL" && e.target.className == "rules") {
                if (e.target.firstChild && e.target.firstChild.nodeName == "INPUT" && e.target.firstChild.type == "checkbox") {
                    var rule = YSLOW.controller.getRule(e.target.firstChild.value);
                    panel.document.ysview.tooltip.show('<b>' + rule.name + '</b><br><br>' + rule.info, e.target);
                }
            }
        }
    }, false);

    this.panelNode.addEventListener("mouseout", function(e) {
        panel.document.ysview.tooltip.hide();
    }, false);

    this.panel_doc.defaultView.addEventListener("resize", function(e) {
        var overlay = panel.document.ysview.modaldlg;
        if (overlay && overlay.style.display == "block") {
            overlay.style.display = "none";
        }
    }, false);

};

YSLOW.view.prototype = {

    /**
     * Update the document object store in View object.
     * @param {Document} doc New Document object to be store in View.
     */
    setDocument: function(doc) {
        this.panel_doc = doc;
    },

    /**
     * Load CSS needed for YSlow UI.
     * @param {Document} doc Document to load the CSS files.
     */
    loadCSS: function(doc) {
        YSLOW.util.loadCSS("chrome://yslow/content/yslow/yui/tabview.css", doc);
        YSLOW.util.loadCSS("chrome://yslow/content/yslow/yslow.css", doc);
    },

    /**
     * @private
     */
    addButtonView: function(sButtonId, sHtml) {
        var btnView = this.getButtonView(sButtonId);
        if ( ! btnView ) {
            btnView = this.panel_doc.createElement("div");
            btnView.style.display = "none";
            this.viewNode.appendChild(btnView);
            this.buttonViews[sButtonId] = btnView;
        }

        btnView.innerHTML = sHtml;
        this.showButtonView(sButtonId);
    },

    /**
     * @private
     */
    showButtonView: function(sButtonId) {
        var btnView = this.getButtonView(sButtonId);

        if ( ! btnView ) {
            YSLOW.util.dump("ERROR: YSLOW.view.showButtonView: Couldn't find ButtonView '" + sButtonId + "'.");
            return;
        }

        // Hide all the other button views.
        for ( var sId in this.buttonViews ) {
            if ( this.buttonViews.hasOwnProperty(sId) && sId != sButtonId ) {
                this.buttonViews[sId].style.display = "none";
            }
        }

        // special handling for copyright text in grade view
        if (sButtonId == "ysPerfButton") {
            // hide the main copyright text
            if (this.copyright) {
                this.copyright.style.display = "none";
            }
        } else if (this.curButtonId == "ysPerfButton") {
            // show the main copyright text
            if (this.copyright) {
                this.copyright.style.display = "block";
            }
        }

        btnView.style.display = "block";
        this.curButtonId = sButtonId;
    },

    /**
     * @private
     */
    getButtonView: function(sButtonId) {
        return ( this.buttonViews.hasOwnProperty(sButtonId) ? this.buttonViews[sButtonId] : undefined );
    },

    /**
     * @private
     */
    setButtonView: function(sButtonId, sHtml) {
        var btnView = this.getButtonView(sButtonId);
        if ( ! btnView ) {
	    YSLOW.util.dump("ERROR: YSLOW.view.setButtonView: Couldn't find ButtonView '" + sButtonId + "'.");
	    return;
        }

        btnView.innerHTML = sHtml;
        this.showButtonView(sButtonId);
    },

    /**
     * Show landing page.
     */
    setSplashView: function() {
        var title = 'Grade your web pages with YSlow';
        var header = 'YSlow gives you:';
        var text = '<ul><li>Grade based on the performance (you can define your own rules)</li><li>Summary of the Components in the page</li><li>Chart with statistics</li><li>Tools including Smush.It and JSLint</li></ul>';
        var more_info_text = 'Learn more about YSlow and YDN';

        if (YSLOW.doc.splash){
            if (YSLOW.doc.splash.title) {
                title = YSLOW.doc.splash.title;
            }
            if (YSLOW.doc.splash.content) {
                if (YSLOW.doc.splash.content.header) {
                    header = YSLOW.doc.splash.content.header;
                }
                if (YSLOW.doc.splash.content.text) {
                    text = YSLOW.doc.splash.content.text;
                }
            }
            if (YSLOW.doc.splash.more_info) {
                more_info_text = YSLOW.doc.splash.more_info;
            }
        }

        var sHtml = '<div id="splashDiv"><div id="splashDivLeft"></div><div id="splashDivRight"></div>' +
                    '<div id="splashDivCenter">' +
                    '<img id="splashImg" width="250" height="150" alt="splash image" src="chrome://yslow/content/yslow/img/speedometer.png">' +
                    '<div id="left"><h2>' + title + '</h2>' +
                    '<div id="content" class="padding50"><h3>' +
                    header  + '</h3>' + text +
                    '<label><input type="checkbox" name="autorun" onclick="javascript:document.ysview.setAutorun(this.checked)" ';

        if (YSLOW.util.Preference.getPref("extensions.yslow.autorun", false)) {
            sHtml += 'checked';
        }

        sHtml += '> Autorun YSlow each time a web page is loaded</label>' +
            '<div id="runtestDiv"><div id="runtestLeft"></div><div id="runtestRight"></div>' +
            '<div id="runtestCenter"><a id="bn_runtest" href="javascript:document.ysview.runTest()">Run Test</a></div></div>' +
            '<div class="footer"><div class="moreinfo">' +
            '<a href="javascript:document.ysview.openLink(\'https://developer.yahoo.com/yslow/\');"><b>&#187;</b>' +
            more_info_text + '</a></div></div><!-- END footer --></div><!-- END content --></div><!-- END left --></div></div>';

        this.addButtonView('panel_about', sHtml);
    },

    /**
     * Show progress bar.
     */
    genProgressView: function() {
	var sBody = '<div id="progressDiv"><div id="peel"><p>Finding components in the page:</p>' +
            '<div id="peelprogress"><div id="progbar"></div></div><div id="progtext"></div></div>' +
            '<div id="fetch"><p>Getting component information:</p>' +
            '<div id="fetchprogress"><div id="progbar2"></div></div><div id="progtext2">start...</div></div></div>';

	this.setButtonView('panel_about', sBody);
    },

    /**
     * Update progress bar with passed info.
     * @param {String} progress_type Type of progress info: either 'peel' or 'fetch'.
     * @param {Object} progress_info
     * <ul>For peel:
     * <li><code>current_step</code> - {Number} current phase of peeling</li>
     * <li><code>total_step</code> - {Number} total number peeling phases</li>
     * <li><code>message</code> - {String} Progress message</li>
     * </ul>
     * <ul>For fetch:
     * <li><code>current</code> - {Number} Number of components already downloaded </li>
     * <li><code>total</code> - {Number} Total number of componetns to be downloaded </li>
     * <li><code>last_component_url</code> - {String} URL of the last downloaded component.</li>
     * </ul>
     */
    updateProgressView: function(progress_type, progress_info) {

        var outerbar, progbar, progtext;
        var percent;
        var message = '';

        if (this.curButtonId == 'panel_about') {
            var view = this.getButtonView(this.curButtonId);

            if (progress_type == 'peel') {
                outerbar = this.getElementByTagNameAndId(view, 'div', 'peelprogress');
                progbar = this.getElementByTagNameAndId(view, 'div', 'progbar');
                progtext = this.getElementByTagNameAndId(view, 'div', 'progtext');
                message = progress_info.message;
                percent = (progress_info.current_step * 100) / progress_info.total_step;
            } else if (progress_type == 'fetch') {
                outerbar = this.getElementByTagNameAndId(view, 'div', 'fetchprogress');
                progbar = this.getElementByTagNameAndId(view, 'div', 'progbar2');
                progtext = this.getElementByTagNameAndId(view, 'div', 'progtext2');
                message = progress_info.last_component_url;
                percent = (progress_info.current * 100) / progress_info.total;
            } else {
                return;
            }
        }

        if ( outerbar && progbar && progtext ) {
            var maxwidth = outerbar.clientWidth;

            if (percent < 0) {
                percent = 0;
            }
            if (percent > 100) {
                percent = 100;
            }

            percent = 100 - percent;
            var width = (maxwidth*percent)/100;
            if ( width > maxwidth ) {
                width = maxwidth;
            }
            var left = maxwidth - parseInt(width, 10);
            progbar.style.width = parseInt(width, 10) + "px";
            progbar.style.left = parseInt(left, 10) + "px";

            progtext.innerHTML = message;
        }

    },

    /**
     * @private
     */
    updateStatusBar: function(doc) {
        if ( !this.yscontext.PAGE.statusbar ) {
            // only set the bar once
            this.yscontext.PAGE.statusbar = true;

            // If some of the info isn't available, we have to run some code.
            if ( ! this.yscontext.PAGE.overallScore ) {
                // run lint
                YSLOW.controller.lint(doc, this.yscontext);
            }
            if ( ! this.yscontext.PAGE.totalSize ) {
                // collect stats
                this.yscontext.collectStats();
            }

            var size = YSLOW.util.kbSize(this.yscontext.PAGE.totalSize);
            var score = this.yscontext.PAGE.overallScore;
            var grade = YSLOW.util.prettyScore(score);

            YSLOW.view.setStatusBar(grade, "yslow_status_grade");
            YSLOW.view.setStatusBar(size, "yslow_status_size");

	    // Send a beacon.
	    if ( YSLOW.util.Preference.getPref("optinBeacon", false) ) {
                YSLOW.util.sendBeacon(doc.location.href, score, this.yscontext);
            }
 	}
    },

    /**
     * @private
     */
    getRulesetListSource: function(rulesets) {
        var sHtml = '';
        var defaultRulesetId = YSLOW.controller.getDefaultRulesetId();

        var custom = false;
        for (var id in rulesets) {
            if (rulesets[id]) {
                sHtml += '<option value="' + rulesets[id].id + '" ';
                if (!custom && rulesets[id].hasOwnProperty('custom') && rulesets[id].custom === true) {
                    custom = true;
                    sHtml += 'class="firstInGroup" ';
                }

                if (defaultRulesetId !== undefined && id === defaultRulesetId) {
                    sHtml += 'selected';
                }
                sHtml += '>' + rulesets[id].name + '</option>';
            }
        }
        return sHtml;
    },

    /**
     * Refresh the Ruleset Dropdown list.  This is usually called after a ruleset is created or deleted.
     */
    updateRulesetList: function() {
        var selects = this.panel_doc.getElementsByTagName('select');
        var rulesets = YSLOW.controller.getRegisteredRuleset();
        var sText = this.getRulesetListSource(rulesets);

        var onchangeFunc = function(event) {
            var doc = this.ownerDocument;
            doc.ysview.onChangeRuleset(event);
        };

        for (var i = 0; i < selects.length; i++) {
            if (selects[i].id == "toolbar-rulesetList") {
                var div = selects[i].parentNode;
                if (div && div.id == "toolbar-ruleset") {
                    var new_select = this.panel_doc.createElement('select');
                    if (new_select) {
                        new_select.id = 'toolbar-rulesetList';
                        new_select.name = 'rulesets';
                        new_select.onchange = onchangeFunc;
                        new_select.innerHTML = sText;
                    }

                    div.replaceChild(new_select, selects[i]);
                }
            }
        }
    },

    /**
     * @private
     */
    getToolbarSource: function() {
        var sHtml = '<div id="menu">';
        var titles = {
            grade: 'Grade',
            components: 'Components',
            stats: 'Statistics',
            tools: 'Tools'
        };

        if (YSLOW.doc && YSLOW.doc.view_names) {
            for (var view in titles) {
                if (YSLOW.doc.view_names[view]) {
                    titles[view] = YSLOW.doc.view_names[view];
                }
            }
        }

        var rulesets = YSLOW.controller.getRegisteredRuleset();

        sHtml = '<div id="toolbar-ruleset" class="floatRight">Rulesets <select id="toolbar-rulesetList" name="rulesets" onchange="javascript:document.ysview.onChangeRuleset(event)">' + this.getRulesetListSource(rulesets) + '</select>';

        sHtml += '<a href="javascript:document.ysview.showRuleSettings()"><img src="chrome://yslow/content/yslow/img/bn_edit.gif"></a><span class="padding100"><ul><li class="first"><a href="javascript:document.ysview.openPrintableDialog(document)"><img class="icon" src="chrome://yslow/content/yslow/img/ico_print.gif"><em>Printable View</em></a></li><li id="helpLink"><a href="javascript:document.ysview.showHideHelp()"><img class="icon" src="chrome://yslow/content/yslow/img/ico_help.gif"><em>Help</em><img src="chrome://yslow/content/yslow/img/arrowDown.png"></a></li></ul></span></div>';

        // help menu
        sHtml += '<div id="helpDiv" class="help" style="visibility: hidden">' +
            '<div><a href="javascript:document.ysview.openLink(\'http://developer.yahoo.com/yslow/help/\')">YSlow Help</a></div>' +
            '<div><a href="javascript:document.ysview.openLink(\'http://developer.yahoo.com/yslow/faq.html\')">YSlow FAQ</a></div>' +
            '<div class="new-section"><a href="javascript:document.ysview.openLink(\'http://developer.yahoo.net/blog/archives/performance/\')">YSlow Blog</a></div>' +
            '<div><a href="javascript:document.ysview.openLink(\'http://tech.groups.yahoo.com/group/exceptional-performance/\')">YSlow Community</a></div>' +
            '<div class="new-section"><a href="javascript:document.ysview.openLink(\'http://developer.yahoo.com/yslow/feedback.html\')">Send Feedback</a></div>' +
            '<div class="new-section"><a href="javascript:document.ysview.openLink(\'http://developer.yahoo.com/yslow/\')">YSlow Home</a></div></div>';

        // toolbar nav menu
        sHtml += '<div id="nav-menu"><ul class="yui-nav" id="toolbarLinks">' +
            '<li class="first" id="ysPerfButton"><a href="javascript:document.ysview.showPerformance()" onclick="javascript:document.ysview.onclickToolbarMenu(event)"><em>' + titles.grade + '</em><span class="pipe"/></a></li>' +
            '<li id="ysCompsButton"><a href="javascript:document.ysview.showComponents()" onclick="javascript:document.ysview.onclickToolbarMenu(event)"><em>' + titles.components + '</em><span class="pipe"/></a></li>' +
            '<li id="ysStatsButton"><a href="javascript:document.ysview.showStats()" onclick="javascript:document.ysview.onclickToolbarMenu(event)"><em>' + titles.stats + '</em><span class="pipe"/></a></li>' +
            '<li id="ysToolButton"><a href="javascript:document.ysview.showTools()" onclick="javascript:document.ysview.onclickToolbarMenu(event)"><em>' + titles.tools + '</em></a></li></ul></div>';

        sHtml += '</div>';

        return sHtml;
    },

    /**
     * Show the passed view.  If nothing is passed, default view "Grade" will be shown.
     * Possible sView values are: "ysCompsButton", "ysStatsButton", "ysToolButton", "ysRuleEditButton" and "ysPerfButton".
     * If the page has not been peeled before this function is called, peeler will be run first and sView will not be displayed until
     * peeler is done.
     * @param {String} sView The view to be displayed.
     */
    show: function(sView) {
        sView = sView || this.yscontext.defaultview;
        var format = 'html';

        if (this.yscontext.component_set === null) {
            // need to run peeler first.
            YSLOW.controller.run(window.top.content, this.yscontext, false);
            this.yscontext.defaultview = sView;
        } else {
            var stext = "";

            if ( this.getButtonView(sView) ) {
                // This view already exists, just toggle to it.
                this.showButtonView(sView);
            }
            else if ( "ysCompsButton" == sView ) {
                stext += this.yscontext.genComponents(format);
                this.addButtonView("ysCompsButton", stext);
            }
            else if ( "ysStatsButton" == sView ) {
                stext += this.yscontext.genStats(format);
                this.addButtonView("ysStatsButton", stext);
                YSLOW.renderer.plotComponents(this.getButtonView("ysStatsButton"), this.yscontext);
            }
            else if ( "ysToolButton" == sView) {
                stext += this.yscontext.genToolsView(format);
                this.addButtonView("ysToolButton", stext);
            }
            else {
                // Default is Performance.
                stext += this.yscontext.genPerformance(format);
                this.addButtonView("ysPerfButton", stext);
            }

            this.panelNode.scrollTop = 0;
            this.panelNode.scrollLeft = 0;

            this.updateStatusBar(this.yscontext.document);

            // update toolbar selected tab.
            this.updateToolbarSelection();
        }
    },

    /**
     * @private
     */
    updateToolbarSelection: function() {
        switch (this.curButtonId) {
        case "ysCompsButton":
        case "ysPerfButton":
        case "ysStatsButton":
        case "ysToolButton":
            var elem = this.getElementByTagNameAndId(this.panelNode, 'li', this.curButtonId);
            if (elem) {
                if (elem.className.indexOf("selected") !== -1) {
                    // no need to do anything.
                    return;
                } else {
                    elem.className += " selected";
                }
            }
            break;
        default:
            break;
        }

        var ul_elem = this.getElementByTagNameAndId(this.panelNode, 'ul', 'toolbarLinks');
        var child = ul_elem.firstChild;
        while (child) {
            if (child.id !== this.curButtonId && child.className.indexOf("selected") !== -1) {
                this.unselect(child);
                if (child.previousSibling) {
                    YSLOW.view.removeClassName(child.previousSibling, 'off');
                }
            }
            child = child.nextSibling;
        }
    },

    /**
     * Show Grade screen. Use YSLOW.view.show(). Called from UI.
     */
    showPerformance: function() {
        this.show('ysPerfButton');
    },

    /**
     * Show Stats screen. Use YSLOW.view.show(). Called from UI.
     */
    showStats: function() {
        this.show('ysStatsButton');
    },

    /**
     * Show Components screen. Use YSLOW.view.show(). Called from UI.
     */
    showComponents: function() {
        this.show('ysCompsButton');
    },

    /**
     * Show Tools screen. Use YSLOW.view.show(). Called from UI.
     */
    showTools: function() {
        this.show('ysToolButton');
    },

    /**
     * Show Rule Settings screen. Use YSLOW.view.show(). Called from UI.
     */
    showRuleSettings: function() {
        var stext = this.yscontext.genRulesetEditView('html');
        this.addButtonView("ysRuleEditButton", stext);

        this.panelNode.scrollTop = 0;
        this.panelNode.scrollLeft = 0;

        // update toolbar selected tab.
        this.updateToolbarSelection();
    },

    /**
     * Run YSlow. Called from UI.
     */
    runTest: function() {
        YSLOW.controller.run(window.top.content, this.yscontext, false);
    },

    /**
     * Set autorun preference. Called from UI.
     * @param {boolean} set Pass true to turn autorun on, false otherwise.
     */
    setAutorun: function(set) {
        YSLOW.util.Preference.setPref("extensions.yslow.autorun", set);
    },

    /**
     * Handle Ruleset drop down list selection change. Update default ruleset and display
     * dialog to ask users if they want to run new ruleset at once.
     * @param {DOMEvent} event onchange event of Ruleset drop down list.
     */
    onChangeRuleset: function(event) {
        var select = event.currentTarget;
        var option = select.options[select.selectedIndex];
        YSLOW.controller.setDefaultRuleset(option.value);

        // ask if want to rerun test with the selected ruleset.
        var doc = select.ownerDocument;
        var line1 = 'Do you want to run the selected ruleset now?';
        var left_button_label = 'Run Test';
        var left_button_func = function(e) {
            doc.ysview.closeDialog(doc);
            if (doc.yslowContext.component_set === null) {
                YSLOW.controller.run(doc.yslowContext.document.defaultView, doc.yslowContext, false);
            } else {
                // page peeled, just run lint.
                YSLOW.controller.lint(doc.yslowContext.document, doc.yslowContext);
            }

            var stext = doc.yslowContext.genPerformance('html');
            doc.ysview.addButtonView("ysPerfButton", stext);
            doc.ysview.panelNode.scrollTop = 0;
            doc.ysview.panelNode.scrollLeft = 0;
            // update score in status bar.
            YSLOW.view.restoreStatusBar(doc.yslowContext);
            doc.ysview.updateToolbarSelection();
        };
        this.openDialog(doc, 389, 150, line1, undefined, left_button_label, left_button_func);
    },

    /**
     * @private
     * Implemented for handling onclick event of TabLabel in TabView.
     * Hide current tab content and make content associated with the newly selected tab visible.
     */
    onclickTabLabel: function(event, move_tab) {
        var li_elem = event.currentTarget;
        var ul_elem = li_elem.parentNode;
        var div_elem = ul_elem.nextSibling; // yui-content div

        if (li_elem.className.indexOf('selected') !== -1 || li_elem.id.indexOf('label') === -1) {
            return false;
        }
        if (ul_elem) {
            var child = ul_elem.firstChild;
            var tab;
            var hide_tab_id, show_tab_id;

            while (child) {
                if (this.unselect(child)) {
                    hide_tab_id = child.id.substring(5);
                    break;
                }
                child = child.nextSibling;
            }

            // select new tab selected.
            li_elem.className += ' selected';
            show_tab_id = li_elem.id.substring(5);

            // Go through all the tabs in yui-content to hide the old tab and show the new tab.
            var hide = false, show = false;
            var show_tab;
            child = div_elem.firstChild;
            while (child) {
                var id_substring = child.id.substring(3);
                if (!hide && hide_tab_id !== undefined && id_substring == hide_tab_id) {
                    if (child.className.indexOf("yui-hidden") === -1) {
                        //set yui-hidden
                        child.className += " yui-hidden";
                    }
                    hide = true;
                }
                if (!show && show_tab_id !== undefined && id_substring == show_tab_id) {
                    YSLOW.view.removeClassName(child, "yui-hidden");
                    show = true;
                    show_tab = child;
                }
                if ((hide || hide_tab_id === undefined) && (show || show_tab_id === undefined)) {
                    break;
                }
                child = child.nextSibling;
            }

            if (move_tab === true && show === true && show_tab) {
                this.positionResultTab(show_tab, div_elem, li_elem);
            }
        }
        return false;
    },

    positionResultTab: function(tab, container, label) {
        var doc = this.panel_doc;
        var win = doc.defaultView;
        var pageHeight = win.offsetHeight? win.offsetHeight : win.innerHeight;

        var currentHeight = container.offsetHeight;
        var height = label.offsetTop + tab.offsetHeight;
        container.style.height = height + 'px';
        tab.style.position = "absolute";
        tab.style.left = label.offsetLeft + label.offsetWidth + "px";
        tab.style.top = label.offsetTop + "px";

        /* now make sure tab is visible */
        var y = tab.offsetTop;
        var parent = tab.offsetParent;
        while (parent !== null) {
            y += parent.offsetTop;
            parent = parent.offsetParent;
        }

        var padding = 5;
        if (y < this.panelNode.scrollTop ||
            y + tab.offsetHeight > this.panelNode.scrollTop + pageHeight) {

            if (y < this.panelNode.scrollTop) {
                // scroll up
                this.panelNode.scrollTop = y - padding;
            } else {
                // scroll down
                var delta = y + tab.offsetHeight - this.panelNode.scrollTop - pageHeight + padding;
                if (delta > y - this.panelNode.scrollTop) {
                    delta = y - this.panelNode.scrollTop;
                }
                this.panelNode.scrollTop += delta;
            }
        }
    },

    /**
     * Event handling for onclick event on result tab (Grade screen). Called from UI.
     * @param {DOMEevent} event onclick event
     */
    onclickResult: function(event) {
        return  this.onclickTabLabel(event, true);
    },

    /**
     * @private
     * Helper function to unselect element.
     */
    unselect: function(elem) {
        return YSLOW.view.removeClassName(elem, "selected");
    },

    /**
     * @private
     * Helper function to filter result based on its category. (Grade Screen)
     */
    filterResult: function(doc, category) {
        var showAll = false;
        var ul_elem;

        if (category == "all") {
            showAll = true;
        }

        /* go through tab-label to re-adjust hidden state */
        var view = this.getButtonView('ysPerfButton');
        if (view) {
            ul_elem = this.getElementByTagNameAndId(view, "ul", "tab-label-list");
        }
        if (ul_elem) {
            var child = ul_elem.firstChild;
            var firstTab, tab, firstChild;
            var index, className;
            var div_elem = ul_elem.nextSibling; // yui-content div
            tab = div_elem.firstChild;

            while (child) {
                YSLOW.view.removeClassName(child, 'first');
                if (showAll || child.className.indexOf(category) !== -1) {
                    child.style.display = "block";
                    if (firstTab === undefined) {
                        firstTab = tab;
                        firstChild = child;
                        YSLOW.view.removeClassName(tab, "yui-hidden");
                        child.className += ' first';
                        if (child.className.indexOf("selected") === -1) {
                            /* set selected class */
                            child.className += " selected";
                        }
                        child = child.nextSibling;
                        tab = tab.nextSibling;
                        continue;
                    }
                } else {
                    child.style.display = "none";
                }

                /* hide non-first tab */
                if (tab.className.indexOf("yui-hidden") === -1) {
                    tab.className += " yui-hidden";
                }

                /* remove selected from class */
                this.unselect(child);

                child = child.nextSibling;
                tab = tab.nextSibling;
            }

            if (firstTab) {
                /* tab back to top position */
                this.positionResultTab(firstTab, div_elem, firstChild);
            }
        }
    },

    /**
     * Event handler of onclick event of category filter (Grade screen).  Called from UI.
     * @param {DOMEvent} event onclick event
     */
    updateFilterSelection: function(event) {
        var elem = event.currentTarget;
        if (elem.className.indexOf("selected") !== -1) {
            return;  /* click on something already selected */
        }
        elem.className += " selected";

        var index;
        var done = false;

        var li = elem.parentNode.firstChild;
        while (li) {
            if (li != elem && this.unselect(li)) {
                break;
            }
            li = li.nextSibling;
        }
        this.filterResult(elem.ownerDocument, elem.id);
    },

    /**
     * Event handler of toolbar menu.
     * @param {DOMEvent} event onclick event
     */
    onclickToolbarMenu: function(event) {
        var a_elem = event.currentTarget;
        var li_elem = a_elem.parentNode;
        var ul_elem = li_elem.parentNode;

        if (li_elem.className.indexOf("selected") !== -1) {
            /* selecting an already selected target, do nothing. */
            return;
        }
        li_elem.className += " selected";

        if (li_elem.previousSibling) {
            li_elem.previousSibling.className += " off";
        }

        if (ul_elem) {
            var child = ul_elem.firstChild;
            while (child) {
                if (child != li_elem && this.unselect(child)) {
                    if (child.previousSibling) {
                        YSLOW.view.removeClassName(child.previousSibling, 'off');
                    }
                    break;
                }
                child = child.nextSibling;
            }
        }
    },

    /**
     * Expand components with the passed type. (Components Screen)
     * @param {Document} doc Document object of the YSlow Chrome window.
     * @param {String} type Component type.
     */
    expandCollapseComponentType: function(doc, type) {
        var renderer = YSLOW.controller.getRenderer('html');
        var view = this.getButtonView('ysCompsButton');
        if (view) {
            var table = this.getElementByTagNameAndId(view, 'table', 'components-table');
            renderer.expandCollapseComponentType(doc, table, type);
        }
    },

    /**
     * Expand all components. (Components Screen)
     * @param {Document} doc Document object of the YSlow Chrome window.
     */
    expandAll: function(doc) {
        var renderer = YSLOW.controller.getRenderer('html');
        var view = this.getButtonView('ysCompsButton');
        if (view) {
            var table = this.getElementByTagNameAndId(view, 'table', 'components-table');
            renderer.expandAllComponentType(doc, table);
        }
    },

    /**
     * Regenerate the components table. (Components Screen)
     * @param {Document} doc Document object of the YSlow Chrome window.
     * @param {String} column_name The column to sort by.
     * @param {boolean} sortDesc true if to Sort descending order, false otherwise.
     */
    regenComponentsTable: function(doc, column_name, sortDesc) {
        var renderer = YSLOW.controller.getRenderer('html');
        var view = this.getButtonView('ysCompsButton');
        if (view) {
            var table = this.getElementByTagNameAndId(view, 'table', 'components-table');
            renderer.regenComponentsTable(doc, table, column_name, sortDesc, this.yscontext.component_set);
        }
    },

    /**
     * Show Component header row. (Component Screen)
     * @param {String} headersDivId id of the HTML TR element containing the component header.
     */
    showComponentHeaders: function(headersDivId) {
        var view = this.getButtonView('ysCompsButton');
        if (view) {
            var elem = this.getElementByTagNameAndId(view, "tr", headersDivId);
            if (elem) {
                var td = elem.firstChild;
                if (elem.style.display == "none") {
                    elem.style.display = "table-row";
                } else {
                    elem.style.display = "none";
                }
            }
        }
    },

    /**
     * Open link in new tab.
     * @param {String} url URL of the page to be opened.
     */
    openLink: function(url) {
        YSLOW.util.openLink(url);
    },

    /**
     * Launch tool.
     * @param {String} tool_id
     * @param {Object} param to be passed to tool's run method.
     */
    runTool: function(tool_id, param) {
        YSLOW.controller.runTool(tool_id, this.yscontext, param);
    },

    /**
     * Onclick event handler of Ruleset tab in Rule Settings screen.
     * @param {DOMEvent} event onclick event
     */
    onclickRuleset: function(event) {
        var li_elem = event.currentTarget;
        var ruleset_id;

        var index = li_elem.className.indexOf('ruleset-');
        if (index !== -1) {
            var end = li_elem.className.indexOf(' ', index+8);
            if (end !== -1) {
                ruleset_id = li_elem.className.substring(index+8, end);
            } else {
                ruleset_id = li_elem.className.substring(index+8);
            }
            var view = this.getButtonView('ysRuleEditButton');
            if (view) {
                var form = this.getElementByTagNameAndId(view, 'form', 'edit-form');
                YSLOW.renderer.initRulesetEditForm(li_elem.ownerDocument, form, YSLOW.controller.getRuleset(ruleset_id));
            }
        }

        return this.onclickTabLabel(event, false);
    },

    /**
     * Display Save As Dialog
     * @param {Document} doc Document object of YSlow Chrome window.
     * @param {String} form_id id of the HTML form element that contains the ruleset settings to be submit (or saved).
     */
    openSaveAsDialog: function(doc, form_id) {
        var line1 = '<label>Save ruleset as: <input type="text" id="saveas-name" class="text-input" name="saveas-name" length="100" maxlength="100"></label>';
        var left_button_label = 'Save';
        var left_button_func = function(e) {
            var doc = e.currentTarget.ownerDocument;
            var textbox;
            if (doc.ysview.modaldlg) {
                textbox = doc.ysview.getElementByTagNameAndId(doc.ysview.modaldlg, 'input', 'saveas-name');
            }
            if (textbox) {
                if (YSLOW.controller.checkRulesetName(textbox.value) === true) {
                    var line = line1 + '<div class="error">' + textbox.value + ' ruleset already exists.</div>';
                    doc.ysview.closeDialog(doc);
                    doc.ysview.openDialog(doc, 389, 150, line, '', left_button_label, left_button_func);
                } else {
                    var view = doc.ysview.getButtonView('ysRuleEditButton');
                    if (view) {
                        var form = doc.ysview.getElementByTagNameAndId(view, 'form', form_id);
                        var input = doc.createElement('input');
                        input.type = 'hidden';
                        input.name = 'saveas-name';
                        input.value = textbox.value;
                        form.appendChild(input);
                        form.submit();
                    }
                    doc.ysview.closeDialog(doc);
                }
            }

        };
        this.openDialog(doc, 389, 150, line1, undefined, left_button_label, left_button_func);
    },

    /**
     * Display Printable View Dialog
     * @param {Document} doc Document object of YSlow Chrome window.
     */
    openPrintableDialog: function(doc) {
        if (doc.yslowContext.component_set === null) {
            var line = 'Please run YSlow first before using Printable View.';
            this.openDialog(doc, 389, 150, line, '', 'Ok');
            return;
        }

        var line1 = 'Check which information you want to view or print<br>';
        var line2 = '<div id="printOptions">' +
            '<label><input type="checkbox" name="print-type" value="grade" checked>Grade</label>'+
            '<label><input type="checkbox" name="print-type" value="components" checked>Components</label>' +
            '<label><input type="checkbox" name="print-type" value="stats" checked>Statistics</label></div>';
        var left_button_label = 'Ok';
        var left_button_func = function(e) {
            var doc = e.currentTarget.ownerDocument;
            var aInputs = doc.getElementsByName('print-type');
            var print_type = {};
            for (var i = 0; i < aInputs.length; i++) {
                if (aInputs[i].checked) {
                    print_type[aInputs[i].value] = 1;
                }
            }
            doc.ysview.closeDialog(doc);
            doc.ysview.runTool('printableview', {'options': print_type, 'yscontext': doc.yslowContext });
        };
        this.openDialog(doc, 389, 150, line1, line2, left_button_label, left_button_func);
    },

    /**
     * @private
     * helper function to get element with id and tagname in node.
     */
    getElementByTagNameAndId: function(node, tagname, id) {
        var arrElements;
        if (node) {
            arrElements = node.getElementsByTagName(tagname);
            if (arrElements.length > 0) {
                for (var i = 0; i < arrElements.length; i++) {
                    if (arrElements[i].id === id) {
                        return arrElements[i];
                    }
                }
            }
        }
        return null;
    },

    /**
     * Helper function for displaying dialog.
     * @param {Document} doc Document object of YSlow Chrome window
     * @param {Number} width desired width of the dialog
     * @param {Number} height desired height of the dialog
     * @param {String} text1 first line of text
     * @param {String} text2 second line fo text
     * @param {String} left_button_label left button label
     * @param {Function} left_button_func onclick function of left button
     */
    openDialog: function(doc, width, height, text1, text2, left_button_label, left_button_func) {
        var overlay = this.modaldlg;
        var dialog, text, more_text;

        var elems = overlay.getElementsByTagName('div');
        for (var i = 0; i < elems.length; i++) {
            if (elems[i].className && elems[i].className.length > 0) {
                if (elems[i].className == "dialog-box") {
                    dialog = elems[i];
                } else if (elems[i].className == "dialog-text") {
                    text = elems[i];
                } else if (elems[i].className == "dialog-more-text") {
                    more_text = elems[i];
                }
            }
        }

        if (overlay && dialog && text && more_text) {
            text.innerHTML = (text1 ? text1: '');
            more_text.innerHTML = (text2 ? text2: '');

            var button;
            var inputs = overlay.getElementsByTagName('input');
            for (var j = 0; j < inputs.length; j++) {
                if (inputs[j].className == "dialog-left-button") {
                    button = inputs[j];
                }
            }
            if (button) {
                button.value = left_button_label;
                button.onclick = (left_button_func ? left_button_func :
                                      (function(e) {doc.ysview.closeDialog(doc);}) );
            }

            // position dialog to center of panel.
            var win = doc.defaultView;
            var pageWidth = win.innerWidth;
            var pageHeight = win.innerHeight;

            var left = Math.floor((pageWidth - width)/2);
            var top = Math.floor((pageHeight - height)/2);
            dialog.style.left = ((left && left > 0) ? left : 225) + 'px';
            dialog.style.top = ((top && top > 0) ? top : 80) + 'px';

            overlay.style.left = this.panelNode.scrollLeft + 'px';
            overlay.style.top = this.panelNode.scrollTop + 'px';
            overlay.style.display = "block";

            // put focus on the first input.
            if (inputs.length > 0) {
                inputs[0].focus();
            }
        }

    },

    /**
     * Close the dialog.
     * @param {Document} doc Document object of YSlow Chrome window
     */
    closeDialog: function(doc) {
        var dialog = this.modaldlg;
        dialog.style.display = "none";
    },

    /**
     * Save the modified changes in the selected ruleset in Rule settings screen.
     * @param {Document} doc Document object of YSlow Chrome window
     * @param {String} form_id ID of Form element
     */
    saveRuleset: function(doc, form_id) {
        var renderer = YSLOW.controller.getRenderer('html');
        var view = this.getButtonView('ysRuleEditButton');
        if (view) {
            var form = this.getElementByTagNameAndId(view, 'form', form_id);
            renderer.saveRuleset(doc, form);
        }
    },

    /**
     * Delete the selected ruleset in Rule Settings screen.
     * @param {Document} doc Document object of YSlow Chrome window
     * @param {String} form_id ID of Form element
     */
    deleteRuleset: function(doc, form_id) {
        var renderer = YSLOW.controller.getRenderer('html');
        var view = this.getButtonView('ysRuleEditButton');
        if (view) {
            var form = this.getElementByTagNameAndId(view, 'form', form_id);
            renderer.deleteRuleset(doc, form);
        }
    },

    /**
     * Share the selected ruleset in Rule Settings screen.  Create a .XPI file on Desktop.
     * @param {Document} doc Document object of YSlow Chrome window
     * @param {String} form_id ID of Form element
     */
    shareRuleset: function(doc, form_id) {
        var renderer = YSLOW.controller.getRenderer('html');
        var view = this.getButtonView('ysRuleEditButton');
        if (view) {
            var form = this.getElementByTagNameAndId(view, 'form', form_id);
            var ruleset_id = renderer.getEditFormRulesetId(form);
            var ruleset = YSLOW.controller.getRuleset(ruleset_id);

            if (ruleset) {
                var result = YSLOW.Exporter.exportRuleset(ruleset);

                if (result) {
                    var line1 = '<label>' + result.message + '</label>';
                    this.openDialog(doc, 389, 150, line1, '', "Ok");
                }
            }
        }
    },

    /**
     * Reset the form selection for creating a new ruleset.
     * @param {HTMLElement} button New Set button
     * @param {String} form_id ID of Form element
     */
    createRuleset: function(button, form_id) {
        // unselect ruleset
        var li_elem = button.parentNode;
        var ul_elem = li_elem.parentNode;
        var child = ul_elem.firstChild;
        while (child) {
            this.unselect(child);
            child = child.nextSibling;
        }

        var view = this.getButtonView('ysRuleEditButton');
        if (view) {
            var form = this.getElementByTagNameAndId(view, 'form', form_id);
            YSLOW.renderer.initRulesetEditForm(this.panel_doc, form);
        }
    },

    /**
     * Show/Hide the help menu.
     */
    showHideHelp: function() {
        var help;
        // In order to support YSlow running on mutli-tab,
        // we need to look up helpDiv using panelNode.
        // panel_doc.getElementById('helpDiv') will always find
        // helpDiv of YSlow running on the first browser tab.
        var toolbar = this.getElementByTagNameAndId(this.panelNode, "div", "toolbarDiv");
        if (toolbar) {
            help = this.getElementByTagNameAndId(toolbar, "div", "helpDiv");
        }
        if (help) {
            if (help.style.visibility == "visible") {
                help.style.visibility = "hidden";
            } else {
                help.style.visibility = "visible";
            }
        }
    },

    /**
     * Run smushIt.
     * @param {Document} doc Document object of YSlow Chrome window
     * @param {String} url URL of the image to be smushed.
     */
    smushIt: function(doc, url) {
        YSLOW.util.smushIt(url,
                           /*
                            * @ignore
                            */
                           function(resp) {
                               var txt = '';
                               if (resp.error) {
                                   txt += '<br><div>' + resp.error + '</div>';
                               } else {
                                   var smushurl = YSLOW.util.getSmushUrl();
                                   var dest_url = YSLOW.util.makeAbsoluteUrl(resp.dest, smushurl);
                                   txt += '<div>Original size: ' + resp.src_size + ' bytes</div>' +
                                       '<div>Result size: ' + resp.dest_size + ' bytes</div>' +
                                       '<div>% Savings: ' + resp.percent + '%</div>'+
                                       '<div><a href="javascript:document.ysview.openLink(\'' + dest_url + '\')">Click here to view or save the result image.</a></div>';
                               }

                               var line1 = '<div class="smushItResult"><div>Image: ' + YSLOW.util.briefUrl(url, 250) + '</div></div>';
                               var line2 = txt;
                               doc.ysview.openDialog(doc, 389, 150, line1, line2, "Ok");
                           });
    },

    checkAllRules: function(doc, form_id, check) {
        if (typeof check !== "boolean") {
            return;
        }
        var view = this.getButtonView('ysRuleEditButton');
        if (view) {
            var form = this.getElementByTagNameAndId(view, 'form', form_id);
            var aElements = form.elements;
            for (var i = 0; i < aElements.length; i++) {
                if (aElements[i].type == "checkbox") {
                    aElements[i].checked = check;
                }
            }
        }
    }

};

YSLOW.view.Tooltip = function(panel_doc, parentNode) {
    this.tooltip = panel_doc.createElement('div');
    if (this.tooltip) {
        this.tooltip.id = "tooltipDiv";
        this.tooltip.innerHTML = '';
        this.tooltip.style.display = "none";
        if (parentNode) {
            parentNode.appendChild(this.tooltip);
        }
    }
    this.timer = null;
};

YSLOW.view.Tooltip.prototype = {

    show: function(text, target) {
        this.text = text;
        this.target = target;
        this.tooltipData = {
            'text': text,
            'target': target
        };
        var tooltip = this;
        this.timer = YSLOW.platform.util.setTimer(function() { tooltip.showX(); }, 500);
    },

    showX: function() {

        if (this.tooltipData) {
            this.showTooltip(this.tooltipData.text, this.tooltipData.target);
        }
        this.timer = null;
    },

    showTooltip: function(text, target) {
        var doc = target.ownerDocument;
        var win = doc.defaultView;
        var pageWidth = win.offsetWidth? win.offsetWidth : win.innerWidth;
        var pageHeight = win.offsetHeight? win.offsetHeight : win.innerHeight;

        this.tooltip.innerHTML = text;
        this.tooltip.style.display = "block";

        var tooltipWidth = this.tooltip.offsetWidth;
        var tooltipHeight = this.tooltip.offsetHeight;
        var padding = 10;
        var x = 0, y = 0;

        if (tooltipWidth > pageWidth || tooltipHeight > pageHeight) {
            // forget it, the viewport is too small, don't bother.
            this.tooltip.style.display = "none";
            return;
        }

        var parent = target.offsetParent;
        while (parent !== null) {
            x += parent.offsetLeft;
            y += parent.offsetTop;
            parent = parent.offsetParent;
        }
        x += target.offsetLeft;
        y += target.offsetTop;

        if (x < doc.ysview.panelNode.scrollLeft || y < doc.ysview.panelNode.scrollTop ||
            (y + target.offsetHeight > doc.ysview.panelNode.scrollTop+pageHeight)) {
            // target is not fully visible.
            this.tooltip.style.display = "none";
            return;
        }

        var midpt_x = x + target.offsetWidth/2;
        var midpt_y = y + target.offsetHeight/2;
        var sClass;

        //decide if tooltip will fit to the right
        if (x + target.offsetWidth + padding + tooltipWidth < pageWidth) {
            // fit to the right?
            x += target.offsetWidth + padding;
            // check vertical alignment
            if ((y >= doc.ysview.panelNode.scrollTop) && (y-padding+tooltipHeight+padding <= doc.ysview.panelNode.scrollTop+pageHeight)) {
                y = y - padding;
                sClass = 'right top';
            } else {
                // align bottom
                y += target.offsetHeight - tooltipHeight;
                sClass = 'right bottom';
            }
        } else {
            if (y - tooltipHeight - padding >= doc.ysview.panelNode.scrollTop) {
                // put it to the top.
                y -= tooltipHeight + padding;
                sClass = 'top';
            } else {
                // put it to the bottom.
                y += target.offsetHeight + padding;
                sClass = 'bottom';
            }
            var new_x = Math.floor(midpt_x - tooltipWidth/2);
            if ((new_x >= doc.ysview.panelNode.scrollLeft) && (new_x+tooltipWidth <= doc.ysview.panelNode.scrollLeft+pageWidth)) {
                x = new_x;
            } else if (new_x < doc.ysview.panelNode.scrollLeft) {
                x = doc.ysview.panelNode.scrollLeft;
            } else {
                x = doc.ysview.panelNode.scrollLeft + pageWidth - padding - tooltipWidth;
            }
        }

        if (sClass) {
            this.tooltip.className = sClass;
        }
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
    },

    hide: function() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.tooltip.style.display = "none";
    }

};

/**
 * Set YSlow status bar text.
 * @param {String} text text to put on status bar
 * @param {String} sId id of the status bar element to put the text.
 */
YSLOW.view.setStatusBar = function(text, sId) {
    sId = sId || "yslow_status_grade";
    var sbelem = document.getElementById(sId);
    sbelem.value = text;
};

/**
 * Clear YSlow status bar text.
 */
YSLOW.view.clearStatusBar = function() {
    this.setStatusBar("", "yslow_status_time");
    this.setStatusBar("YSlow", "yslow_status_grade");
    this.setStatusBar("", "yslow_status_size");
};

/**
 * Restore YSlow status bar text
 * @param {YSLOW.context} yscontext YSlow context that contains page result and statistics.
 */
YSLOW.view.restoreStatusBar = function(yscontext) {
    if (yscontext) {
        if (yscontext.PAGE.overallScore) {
            var grade = YSLOW.util.prettyScore(yscontext.PAGE.overallScore);
            this.setStatusBar(grade, "yslow_status_grade");
        }
        if (yscontext.PAGE.totalSize) {
            var size = YSLOW.util.kbSize(yscontext.PAGE.totalSize);
            this.setStatusBar(size, "yslow_status_size");
        }
        if (yscontext.PAGE.t_done) {
            var t_done = yscontext.PAGE.t_done/1000 + "s";
            this.setStatusBar(t_done, "yslow_status_time");
        }
    }
};

/**
 * Toggle YSlow in status bar.
 * @param {Boolean} bhide show or hide YSlow in status bar.
 */
YSLOW.view.toggleStatusBar = function(bHide) {
    document.getElementById('yslow-status-bar').hidden = bHide;
};

/**
 * Remove name from element's className.
 * @param {HTMLElement} element
 * @param {String} name name to be removed from className.
 * @return true if name is found in element's classname
 */
YSLOW.view.removeClassName = function(element, name) {
    if (element && element.className && element.className.length > 0 && name && name.length > 0) {
        var names = element.className.split(" " );
        for (var i = 0; i < names.length; i++) {
            if (names[i] === name) {
                names.splice(i, 1);
                element.className = names.join(" ");
                return true;
            }
        }
    }
    return false;
};
