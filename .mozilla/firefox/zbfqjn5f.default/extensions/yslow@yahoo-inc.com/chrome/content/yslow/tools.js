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
 *
 * Example of a tool object:
 *
 * <pre>
 * YSLOW.registerTool({
 *
 *     id: 'mytool',
 *     name: 'Custom tool #3',
 *     short_desc: 'short description of custom tool #3',
 *     print_output: true,
 *     run: function(doc, components, param) {
 *         return 'I am a custom tool';
 *     }
 * });
 * </pre>
 *
 * @class
 */

YSLOW.Tools = {

    tools: {},

    custom_tools: [],

    addBuiltinTool: function(tool) {
        // check YSLOW.doc class for text
        if (YSLOW.doc.rules && YSLOW.doc.tools[tool.id]) {
            var doc_obj = YSLOW.doc.tools[tool.id];
            if (doc_obj.name) {
                tool.name = doc_obj.name;
            }
            if (doc_obj.info) {
                tool.short_desc = doc_obj.info;
            }
        }

        this.tools[tool.id] = tool;
    },

    addCustomTool: function(tool) {
        var i, required = ['id','name','short_desc','print_output','run'];
        for (i = 0; i < required.length; i++) {
            if (typeof tool[required[i]] === 'undefined') {
                throw new YSLOW.Error('Interface error', 'Improperly implemented rule interface');
            }
        }
        if (tool.id in this.tools || tool.id in this.custom_tools) {
            throw new YSLOW.Error('Tool register error', tool.id + " is already defined.");
        }
        this.custom_tools[tool.id] = tool;
    },

    getTool: function(tool_id) {
        var tool = this.tools[tool_id];
        if (tool === undefined) {
            tool = this.custom_tools[tool_id];
        }
        return tool;
    },

    getCustomTools: function() {
        return this.custom_tools;
    },

    getAllTools: function() {
        var aTools = [];
        var id;
        for (id in this.tools) {
            if (this.tools[id]) {
                aTools.push(this.tools[id]);
            }
        }
        for (id in this.custom_tools) {
            if (this.custom_tools[id]) {
                aTools.push(this.custom_tools[id]);
            }
        }
        return aTools;
    },

    /**
     * @private
     */
    loadAllJS: function(doc, components, beautify) {

        var aComponents = components.getComponentsByType('js', true);
        var i;

        var renderer = new YSLOW.ToolResult();
        renderer.addTitle(((beautify) ? 'Beautified' : '') + " JavaScript for: " + YSLOW.util.escapeHtml(doc.location.href));

        // Iterate over the external JS files.
        for (i = 0; i < aComponents.length; i++) {
            var compObj = aComponents[i];
            if (typeof compObj.body == "string" && compObj.body.length > 0) {
                var heading = YSLOW.util.escapeHtml(compObj.url);
                var body = YSLOW.util.escapeHtml((beautify !== undefined) ? YSLOW.js_beautify(compObj.body) : compObj.body );
                renderer.addContent(heading, body);
            }
        }

        // Iterate over the inline SCRIPT blocks
        var aScripts = doc.getElementsByTagName('script');
        var index = 0;
        for (i = 0; i < aScripts.length; i++) {
            var script = aScripts[i];
            if (!script.src) { // avoid external script objects
                index++;
                var heading2 = "inline script block #" + parseInt(index, 10);
                var body2 = YSLOW.util.escapeHtml((beautify !== undefined) ? YSLOW.js_beautify(script.textContent) : script.textContent);
                renderer.addContent(heading2, body2);
            }
        }
        return renderer.htmlview();

    },

    /**
     * @private
     */
    runAllJSMin: function(doc, components) {

        var aComponents = components.getComponentsByType('js', true);
        var i;

        var renderer = new YSLOW.ToolResult();
        renderer.addTitle("Minified JavaScript for: " + YSLOW.util.escapeHtml(doc.location.href));

        // Iterate over the external JS files.
        for (i = 0; i < aComponents.length; i++) {
            var compObj = aComponents[i];
            if (typeof compObj.body == "string" && compObj.body.length > 0) {
                var heading = YSLOW.util.escapeHtml(compObj.url);
                var body = YSLOW.util.escapeHtml(YSLOW.jsmin('', compObj.body, 2));
                renderer.addContent(heading, body);
            }
        }

        // Iterate over the inline SCRIPT blocks
        var aScripts = doc.getElementsByTagName('script');
        var index = 0;
        for (i = 0; i < aScripts.length; i++) {
            var script = aScripts[i];
            if (!script.src) { // avoid external script objects
                index++;
                var heading2 = "inline script block #" + parseInt(index, 10);
                var body2 = YSLOW.util.escapeHtml(YSLOW.jsmin('', script.textContent, 2));
                renderer.addContent(heading2, body2);
            }
        }
        return renderer.htmlview();

    },

    /**
     * @private
     */
    loadAllCSS: function(doc, components) {

        var aComponents = components.getComponentsByType('css', true);
        var i;

        var renderer = new YSLOW.ToolResult();
        renderer.addTitle("All CSS for: " + YSLOW.util.escapeHtml(doc.location.href));

        // Iterate over the external files.
        for (i = 0; i < aComponents.length; i++) {
            var compObj = aComponents[i];
            if (typeof compObj.body == "string" && compObj.body.length > 0) {
                var heading = YSLOW.util.escapeHtml(compObj.url);
                var body = YSLOW.util.escapeHtml(compObj.body);
                renderer.addContent(heading, body);
            }
        }

        // Iterate over the inline STYLE blocks.
        var aElements = doc.getElementsByTagName('style');
        var index = 0;
        for (i = 0; i < aElements.length; i++) {
            var elem = aElements[i];
            if (elem.innerHTML) { // avoid external elem objects
                index++;
                var heading2 = "inline style block #" + parseInt(index, 10);
                renderer.addContent(heading2, YSLOW.util.escapeHtml(elem.textContent));
            }
        }
        return renderer.htmlview();

    },

    /**
     * @private
     */
    runCSSMin: function(doc, components) {

        var aComponents = components.getComponentsByType('css', true);
        var i;

        var renderer = new YSLOW.ToolResult();
        renderer.addTitle("Minified CSS for: " + YSLOW.util.escapeHtml(doc.location.href));

        // Iterate over the external files.
        for (i = 0; i < aComponents.length; i++) {
            var compObj = aComponents[i];
            if (typeof compObj.body == "string" && compObj.body.length > 0) {
                var heading = YSLOW.util.escapeHtml(compObj.url);
                var body = YSLOW.util.escapeHtml(YSLOW.cssmin(compObj.body, -1));
                renderer.addContent(heading, body);
            }
        }

        // Iterate over the inline STYLE blocks.
        var aElements = doc.getElementsByTagName('style');
        var index = 0;
        for (i = 0; i < aElements.length; i++) {
            var elem = aElements[i];
            if (elem.innerHTML) { // avoid external elem objects
                index++;
                var heading2 = "inline style block #" + parseInt(index, 10);
                renderer.addContent(heading2, YSLOW.util.escapeHtml(YSLOW.cssmin(elem.textContent, -1)));
            }
        }
        return renderer.htmlview();

    },

    /**
     * @private
     */
    printable: function(doc, components, param) {

        // read the yslow logo as a binary stream, then base64 and use as data URI
        netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
        var req = new XMLHttpRequest();
        req.open('GET', 'chrome://yslow/content/yslow/img/logo_32x32.png', false);
        req.overrideMimeType('text/plain; charset=x-user-defined');
        req.send(null);
        var logo = req.responseText;
        var logobytes = '';
        for (var i = 0; i < logo.length; i++) {
            logobytes += String.fromCharCode(logo.charCodeAt(i) & 0xff);
        }
        var data_uri = 'data:image/png;base64,' + btoa(logobytes);
        var plot_component = false;

        var cnt = '<div id="printableDiv">' +
            '<div id="print-title"><img src="' + data_uri +'" align="absbottom"/>YSlow for Firebug</div><hr />';

        try {
        //Print the website address:
        cnt += '<div class="pageURL"><span>URL:</span>' +
                '<span>' + YSLOW.util.prettyAnchor(doc.location.href, doc.location.href) + '</span></div>';

        } catch (err) {
            // do nothing
        }

        cnt += '<div id="yslowDiv">';	//yslowDiv start

        YSLOW.renderer.bPrintable = true;

        if (param && param.yscontext) {
            if (param.options === undefined) {
                param.options = { 'grade': 1, 'components': 1, 'stats': 1 };
            }
            var format = 'html';
            for (var view in param.options) {
                var sText = '<div class="section">';

                try {
                switch (view) {
                case 'grade':
                    sText += '<div class="title">Grade</div><div class="contentDiv">' + param.yscontext.genPerformance(format);
                    break;
                case 'components':
                    sText += '<div class="title">Components</div><div class="contentDiv">' + param.yscontext.genComponents(format);
                    break;
                case 'stats':
                    sText += '<div class="title">Stats</div><div class="contentDiv">' + param.yscontext.genStats(format);
                    plot_component = true;
                    break;
                default:
                    continue;
                }
                } catch (err) {
                    // do nothing.
                }
                if (sText.length > 0) {
                    cnt += sText + '</div></div>';
                }
            }
        }

        cnt += '</div>\n' + //yslowDiv END
        '<br /><hr />'+
        '<div class="copyright">' +
        (YSLOW.doc.copyright ? YSLOW.doc.copyright : 'Copyright &copy; 2010 Yahoo! Inc. All rights reserved.')
        + '</div>'+
        '</div>'; // printableDiv END


        //If we were generating performance stats for a printable version, we should reset this flag after we are done.
        //This is required so that performance output on the FF panel remains unexpanded and correctly formated.
        YSLOW.renderer.bPrintable = false;

        // add styling
        var URI = 'chrome://yslow/content/yslow/printable.css';
        var req2 = new XMLHttpRequest();
        req2.open('GET', URI, false);
        req2.overrideMimeType('text/css');
        req2.send(null);
        var css = req2.responseText;

        return { 'css': css, 'html': cnt, 'plot_component': plot_component };

    },

    /**
     * @private
     */
    runSmushIt: function(doc, components) {
        var images = components.getComponentsByType(['image', 'cssimage'], true);
        var i, imgs = [];

        if (images.length > 0) {
            for (i = 0; i < images.length; i++) {
                imgs.push(images[i].url);
            }
        }

        var new_doc = YSLOW.util.getNewDoc();

        new_doc.body.innerHTML = '<form method="post" action="' + YSLOW.util.getSmushUrl() + '">'+
                             '<input type="hidden" name="img" value="' + imgs.join('\n') + '">' +
                             '</form>';


        var js ='document.forms[0].submit();';
        var s = new_doc.createElement("script");
        s.setAttribute("type", "text/javascript");
        s.appendChild(new_doc.createTextNode(js));
        new_doc.body.appendChild(s);

    }

};

/**
 * @private
 * Helper class to generate html code for tools.
 * @constructor
 */
YSLOW.ToolResult = function() {
    this.title = '';
    this.content = [];
};

YSLOW.ToolResult.prototype = {

    /**
     * @private
     */
    addTitle: function(title) {
        this.title = title;
    },

    /**
     * @private
     */
    addContent: function(heading, body) {
        this.content[this.content.length] = {'heading': heading, 'content': body };
    },

    /**
     * @private
     */
    htmlview: function() {
        var html = '';
        var toc = '';

        toc += '<ol>';
        if (this.content.length > 0) {
            html += '<pre>';
            for (var j = 0; j < this.content.length; j++) {
                toc += '<li><a href="about:blank#' + j + '">' + this.content[j].heading + '</a></li>';
                html += '<a name="' + j + '"><div id="#' + j + '" class="blockheader">' +
                    this.content[j].heading + '</div>';
                html += this.content[j].content;
            }
            html += '</pre>';
        }
        toc += '</ol>';

        html = toc + html;
        if (typeof this.title == "string" && this.title.length > 0) {
            html = '<div class="gentitleheader">' + this.title + '</div>' + html;
        }

        return html;
    }

};

/**
 * Register tools
 */

YSLOW.Tools.addBuiltinTool({
    id: 'jslint',
    //name: 'Run JSLint',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.JSLint.runJSLint(doc, components);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'alljs',
    //name: 'All JS',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.Tools.loadAllJS(doc, components);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'jsbeautified',
    //name: 'All JS beautified',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.Tools.loadAllJS(doc, components, true);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'jsminified',
    //name: 'All JS minified',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.Tools.runAllJSMin(doc, components);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'allcss',
    //name: 'All CSS',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.Tools.loadAllCSS(doc, components);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'cssmin',
    //name: 'YUI CSS Compressor',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.Tools.runCSSMin(doc, components);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'smushItAll',
    //name: 'Smush.It All',
    print_output: false,
    run: function(doc, components) {
        return YSLOW.Tools.runSmushIt(doc, components);
    }
});

YSLOW.Tools.addBuiltinTool({
    id: 'printableview',
    //name: 'Printable View',
    print_output: true,
    run: function(doc, components, param) {
        return YSLOW.Tools.printable(doc, components, param);
    }
});

