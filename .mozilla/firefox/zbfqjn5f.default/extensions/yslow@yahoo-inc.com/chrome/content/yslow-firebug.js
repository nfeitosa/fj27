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
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Firebug integration
 * @class
 * @static
 */

YSLOW.FBYSlow = {

    /**
     * Initialize YSlowModule and YSlowPanel.
     */
    init: function() {

        /**
         * @class Firebug
         */
    with (FBL) {

    Firebug.YSlow = extend(Firebug.Module, {

        initialize: function(prefDomain, prefNames) {

            YSLOW.net.registerNative(YSLOW.FBYSlow.net);

            YSLOW.controller.init();

            // add yslow event listeners.
            YSLOW.util.event.addListener("peelStart", this.ysOnPeelStart, this);
            YSLOW.util.event.addListener("peelProgress", this.ysShowPeelProgress, this);
            YSLOW.util.event.addListener("componentFetchProgress", this.ysShowFetchProgress, this);
            YSLOW.util.event.addListener("componentFetchDone", this.ysOnFetchDone, this);

            YSLOW.view.toggleStatusBar(YSLOW.util.Preference.getPref("extensions.yslow.hidestatusbar"));
        },

        showContext: function(browser, context) {
            YSLOW.view.clearStatusBar();
            if (context.yslowContext) {
                YSLOW.view.restoreStatusBar(context.yslowContext);
            }
        },

        loadedContext: function(context) {
            if (!context.yslowContext) {
                context.yslowContext = g_latest_yslowContext;
            }
        },

        reattachContext: function(context) {
            if (!FirebugContext.getPanel("YSlow").document.yslowContext ) {
                // Save a pointer back to this object from the iframe's document:
                var panel = FirebugContext.getPanel("YSlow");
                panel.document.yslow_panel = panel;
                panel.document.yslowContext = FirebugContext.yslowContext;
                panel.document.ysview = panel.ysview;
                // update the document object we store in ysview
                panel.ysview.setDocument(panel.document);
                // reload all css.
                panel.ysview.loadCSS(panel.document);
            }
        },

        destroyContext: function(context) {
            g_latest_yslowContext = undefined;
        },

        shutdown: function() {
            if (Firebug.getPref('defaultPanelName') == 'YSlow') {
                /* optional */
                Firebug.setPref('defaultPanelname', 'console');
            }
        },

        showPanel: function(browser, panel) {
            var isYSlow = panel && panel.name == "YSlow";
            var YSlowButtons = browser.chrome.$("fbYSlowButtons");
            collapse(YSlowButtons, !isYSlow);
        },

        watchWindow: function(context, win) {
            if (win === win.top) {
                context.window.addEventListener("load", this.yslowOnload, false);
                context.window.addEventListener("beforeunload", this.yslowUnload, false);
                context.window.addEventListener("DOMContentLoaded", this.yslowOnDOMContentLoaded, false);
            }
        },

        unwatchWindow: function(context, win) {
            if (win === win.top) {
                content.window.removeEventListener("load", this.yslowOnload, false);
                context.window.removeEventListener("beforeunload", this.yslowUnload, false);
                context.window.removeEventListener("DOMContentLoaded", this.yslowOnDOMContentLoaded, false);
            }
        },

        yslowOnload: function(event) {
            var now = Number(new Date());
            var win = event.currentTarget;
            var fbcontext;

            // onload event from another browser tab.
            // don't peel or update status bar, just save the page load time and return.
            if (win !== FirebugContext.window) {
                fbcontext = TabWatcher.getContextByWindow(win);
            } else {
                fbcontext = FirebugContext;
            }
            // This cause initialNode to be called, thus creating FirebugContext.yslowContext.
            var t_start = fbcontext.browser.t_start;
            fbcontext.getPanel('YSlow');
            fbcontext.yslowContext.PAGE.loaded = true;

            // Display the page load time
            if (t_start !== undefined) {
                fbcontext.yslowContext.PAGE.t_done = now - t_start;
                fbcontext.browser.t_start = undefined;
            }
            // fire onload event.
            YSLOW.util.event.fire('onload', {'time': now, 'window': win });

            if (fbcontext !== FirebugContext) {
                return;
            }
            if (fbcontext.yslowContext.PAGE.t_done) {
                YSLOW.view.setStatusBar( fbcontext.yslowContext.PAGE.t_done/1000 + "s", "yslow_status_time" );
            }

            if (YSLOW.util.Preference.getPref("extensions.yslow.autorun", false)) {
                YSLOW.controller.run(win, fbcontext.yslowContext, true);
            }
        },

        yslowUnload: function(event) {
            var win = event.currentTarget;
            // fire onUnload event.
            var now = Number(new Date());
            var fbcontext;

            // unload event from another browser tab.
            // don't peel or update status bar, just save the page load time and return.
            if (win !== FirebugContext.window) {
                fbcontext = TabWatcher.getContextByWindow(win);
            } else {
                fbcontext = FirebugContext;
            }
            // Save the time this page UNloads, so we can determine the total load time of the NEXT page.
            // We save it in the browser object so that it is persistant ACROSS page loads, but separated
            // from one browser tab to another.
            fbcontext.browser.t_start = now;
            YSLOW.util.event.fire('onUnload', {'time': now, 'window': win});

            if (fbcontext !== FirebugContext) {
                return;
            }

            // Clear status bar
            YSLOW.view.clearStatusBar();

        },

        yslowOnDOMContentLoaded: function(event) {
            var win = event.currentTarget;
            var now = Number(new Date());
            YSLOW.util.event.fire('onDOMContentLoaded', {'time': now, 'window': win});
        },

        ysOnPeelStart: function(event_object) {
            FirebugContext.getPanel("YSlow").createProgressBar();
        },

        ysOnFetchDone: function(event_object) {
            FirebugContext.getPanel("YSlow").removeProgressBar();
            FirebugContext.getPanel("YSlow").doView();
        },

        ysShowPeelProgress: function(event_object) {
            FirebugContext.getPanel("YSlow").setPeelProgress(event_object);
        },

        ysShowFetchProgress: function(event_object) {
            FirebugContext.getPanel("YSlow").setFetchProgress(event_object);
        },

        run: function(autorun) {
            YSLOW.controller.run(FirebugContext.window, FirebugContext.yslowContext, false);
        },

        onClickStatusIcon: function() {
            Firebug.toggleBar(undefined, "YSlow");
        },

        onClickStatusSize: function() {
            Firebug.toggleBar(true, "YSlow");
            FirebugContext.getPanel("YSlow").doView("ysStatsButton");
        },

        onClickStatusGrade: function() {
            Firebug.toggleBar(true, "YSlow");
            FirebugContext.getPanel("YSlow").doView("ysPerfButton");
        }

    });

    function YSlowFBPanel() {};
    YSlowFBPanel.prototype = extend(Firebug.Panel, {

        name: "YSlow",
        title: "YSlow",
        searchable: true,
        editable: false,

        initialize: function(context, doc) {
            this.context = context;
            this.document = doc;
            this.panelNode = doc.createElement("div");
            this.panelNode.ownerPanel = this;
            this.panelNode.id = "yslowDiv";
            setClass(this.panelNode, "panelNode panelNode-" + this.name);
            doc.body.appendChild(this.panelNode);

            this.initializeNode(this.panelNode);
        },

        initializeNode: function() {
            if (this.context.yslowContext) {
                // YSLOW.util.dump("YSlowFBPanel.initializeNode: FirebugContenxt.yslowContext already exists.");
            }
            this.context.yslowContext = new YSLOW.context(this.context.window.document);

            // Save a pointer back to this object from the iframe's document.
            this.document.yslow_panel = this;
            this.document.yslowContext = this.context.yslowContext;

            this.ysview = new YSLOW.view(this, this.context.yslowContext);
            YSLOW.ysview = this.ysview;
            this.document.ysview = this.ysview;

            this.ysview.setSplashView();
        },

        show: function() {
            g_latest_yslowContext = FirebugContext.yslowContext;

	    // There is only ONE DOCUMENT shared by all browser tabs. So if the user opens two
	    // browser tabs, we have to restore the appropriate yslowContext when switching between tabs.
	    this.document.yslowContext = FirebugContext.yslowContext;
            this.document.ysview = this.ysview;
        },

        search: function(text) {
            return false;
        },

        createProgressBar: function() {
            this.ysview.genProgressView();
        },

        removeProgressBar: function() {
        },

        setPeelProgress: function(progress) {
            this.ysview.updateProgressView('peel', progress);
        },

        setFetchProgress: function(progress) {
            this.ysview.updateProgressView('fetch', progress);
        },

        doView: function(sView) {
            this.ysview.show(sView);
        },

        // tooltip
        showInfoTip: function (infoTip, target, x, y) {
            if (target.nodeName === "A" && target.rel && (target.rel === 'image' || target.rel === 'cssimage')) {
                return Firebug.InfoTip.populateImageInfoTip(infoTip, target.href);
            }
            return false;
        },

        /**
         * Global Search
         */
        search: function(text) {
            if (!text) {
                delete this.currentSearch;
                return false;
            }

            var row;
            if (this.currentSearch && text == this.currentSearch.text) {
                row = this.currentSearch.findNext(true);
            } else {
                this.currentSearch = new TextSearch(this.panelNode, function(node){return node.parentNode;});
                row = this.currentSearch.find(text);
            }

            if (row) {
                var sel = this.document.defaultView.getSelection();
                sel.removeAllRanges();
                sel.addRange(this.currentSearch.range);
                scrollIntoCenterView(row, this.panelNode);
                return true;
            }

            return false;
        }

    });

    Firebug.registerModule(Firebug.YSlow);
    Firebug.registerPanel(YSlowFBPanel);

    }

    }

};


