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


//Create the Lints namespace within the global YSLOW namespace.
if (typeof YSLOW.JSLint === 'undefined') {
    YSLOW.JSLint = {};
}

YSLOW.JSLint = {

    jslintcntr: 0,

    runJSLint: function(doc, cset) {
        var begin, character, className, css, docTitle, end, errLen, exp_col_id, errCount, error,
            html, hrefScript, i, idx, j, js, jsLintErrors, line, lintResult, req, result, uri,
            bailed = '',
            delta = 50,
            errors = '',
            reValidClassChar = /[_a-zA-Z0-9\-]/,
            errorClass = function (name) {
                return 'JSLintError_' + (name || '').split('').map(function (a) {
                    return reValidClassChar.test(a) ? a : '';
                }).join('');
            };

        // fix for about:blank
        doc = doc.location ? doc : cset.root_node;

        lintResult = this.loadJSLint(doc, cset);
        jsLintErrors = YSLOW.JSLINT.errors;
        errLen = jsLintErrors.length;
        errCount = '<div class="bailed">' + (!errLen || jsLintErrors[errLen - 1] ? errLen : errLen - 1) + ' problems found.</div>\n';

        if (lintResult) {
            if ( lintResult.lastErrObj && lintResult.lastErrObj.reason.match(/Too many errors. \(([0-9]*)% scanned/) ) {
	        // JSLint bailed early because of too many errors. Make it clear to the user.
	        bailed = "<div class=bailed>JSLint stopped after analyzing " + RegExp.$1 + "% of the code because there were too many errors.</div>\n";
	    }

            for (i = 0; (result = lintResult.results[i]); i += 1) {
                exp_col_id = "jslintdiv_" + result.id;    // iError is unique across all divs
	        hrefScript = 'target="_blank" href="' + result.script + '"';
	        if ( -1 != result.script.indexOf("script tag") ) {
	            errors += '<div class=scriptheader>' +
		        '<a href="javascript:exp_col(\'' + exp_col_id + '\')"><img id="' + exp_col_id + '_img" border=0 src="http://us.i1.yimg.com/us.yimg.com/i/us/plus/csp/cn/norgie_open_dna.gif"></a> ' +
		        '<b>' + result.script + '</b></div><div class=exp_col_div id=' + exp_col_id + '>';
	        }
	        else {
	            errors += '<div class=scriptheader>' +
		        '<a href="javascript:exp_col(\'' + exp_col_id + '\')"><img id="' + exp_col_id + '_img" border=0 src="http://us.i1.yimg.com/us.yimg.com/i/us/plus/csp/cn/norgie_open_dna.gif"></a> ' +
		        '<a ' + hrefScript + '><b>' + result.script + '</b></a></div><div class=exp_col_div id=' + exp_col_id + '>';
                }
                for (j = 0; (error = result.errors[j]); j += 1) {
                    className = errorClass(error.reason) + '_' + result.id;
                    character = error.character;
	            begin = (character - delta > 0 ? character - delta : 0);
	            end = character + delta;
                    line = error.evidence || '';
	            // Find a better breaking point - semi-colon?
	            if (begin < 30) {
	                begin = 0;  // start at the beginning if we're already close to there
	            }
	            if (begin && (idx = line.lastIndexOf(';', begin)) > -1 && character - idx < delta) {
	                begin = idx + 1;
	            }
	            if (end > line.length - 30) {
	                end = line.length - 1;
	            }
	            if (end < line.length - 1 && (idx = line.indexOf(';', end)) > -1 && idx - character < delta) {
	                end = idx + 1;
	            }

	            errors += '<div class="' + className + ' ' + ((j % 2) ? 'jserrorOdd' : 'jserrorEven') + '">';
	            errors += YSLOW.util.escapeHtml(error.reason) + ' line ' + error.line + ', char ' + character +
                        ':&nbsp;&nbsp;&nbsp;' + '<a href="javascript:ignoreError(\'' + className +
                        '\')" class="eplink" style="font-size: 0.8em;">ignore all</a>';

	            errors += '<div style="margin-left: 30px;"><nobr><code>' + (begin ? '...' : '') +
                        YSLOW.util.escapeHtml(line.substring(begin, character - 1)) +
	                '<span style="background:#FBB">' + line.substring(character - 1, character) + '</span>' +
	                YSLOW.util.escapeHtml(line.substring(character, end)) +
	                (end >= line.length - 1 ? '' : '...') + '</code>' + '</nobr></div></div>\n';
                }
                errors += '</div>';
            }
        }

        html = '<div class=titleheader><font style="font-size: 2em;">JSLint Report for: </font>' +
            YSLOW.util.escapeHtml(doc.location.href) +
            '</div>\n' +
            errCount +
            bailed +
            '<p style="margin-top: 8px;">\n' +
            errors +
            '<p style="margin-top: 15px;"><hr><a href="http://jslint.com/">JSLint</a>' +
            ' is courtesy of <a href="mailto:douglas@crockford.com">Douglas Crockford</a>. Copyright 2002. '+
            '<a href="http://www.crockford.com/">All Rights Reserved Wrrrldwide</a>.' +
            '';
        docTitle = 'JSLint Report for: ' + YSLOW.util.escapeHtml(doc.location.href.substring(0, 25));

        uri = 'chrome://yslow/content/yslow/tool.css';
        req = new XMLHttpRequest();
        req.open('GET', uri, false);
        req.send(null);
        css = req.responseText;

        js ='function ignoreError(sClass) {\n' +
            '   var aDivs = document.getElementsByTagName("div");\n' +
            '   for ( var i = 0; i < aDivs.length; i++ ) {\n' +
            '       if ( -1 != aDivs[i].className.indexOf(sClass) ) {\n' +
            '           aDivs[i].style.display = "none";\n' +
            '       }\n' +
            '   }\n' +
            '}\n' +
            'function exp_col(id, bExpand) {\n' +
            '   var element = document.getElementById(id);\n' +
            '   var image = document.getElementById(id + "_img");\n' +
            '   if ( element && image ) {\n' +
            '       if ( "undefined" == typeof(bExpand) ) {\n' +
            '           bExpand = ( -1 == image.src.indexOf("open") );\n' +
            '       }\n' +
            '       element.style.display = ( bExpand ? "block" : "none" );\n' +
            '       image.src = "http://us.i1.yimg.com/us.yimg.com/i/us/plus/csp/cn/norgie_" + ( bExpand ? "open" : "closed" ) + "_dna.gif";\n' +
            '   }\n' +
            '}';

        html = '<!--<h1>' + docTitle + '</h1>-->' + html;

        return {
            'css': css,
            'js': js,
            'html': html
        };
    },

    loadJSLint: function(doc, components, jslintOptions) {
        YSLOW.JSLint.jslintcntr = 0;
        return YSLOW.JSLint.launchJSLint(doc, components, jslintOptions);
    },

    // Complications:
    // - We need to submit ALL the JS code in one call to JSLINT. Otherwise, JSLINT
    //   complains about undefined symbols that are from other external js files.
    launchJSLint: function(doc, components, jslintOptions) {
        if (typeof YSLOW.JSLINT !== "function") {
            YSLOW.JSLint.jslintcntr++;
            if (YSLOW.JSLint.jslintcntr > 5) {
                YSLOW.util.dump("YSLOW.JSLint.launchJSLint: Failed to load fulljslint.js!  continuing anyway");
            } else {
                YSLOW.platform.util.setTimer(function() { YSLOW.JSLint.launchJSLint(doc, components); }, 1000);
                return {};
            }
        }

        if (jslintOptions === undefined || jslintOptions === null) {
            jslintOptions =  { 'browser' : true, 'undef' : true };
        }

	// If we got here, the jslint file is loaded.
	var aJSCode = [];
	var sJSCode = "";
	var aScriptsInfo = [];
	var nLineTotal = 0;
        var i;

	// Iterate over the external JS files.
	var aComponents = components.getComponentsByType('js');
	for ( i = 0; i < aComponents.length; i++ ) {
	    var compObj = aComponents[i];
	    if ( typeof compObj.body === "string" && compObj.body.length > 0 ) {
		sJSCode += compObj.body;
		aJSCode = aJSCode.concat(compObj.body.split("\n"));
		aScriptsInfo.push( { url: compObj.url, lines: (aJSCode.length-nLineTotal) } );
		nLineTotal = aJSCode.length;
	    }
	}

	// Iterate over the inline SCRIPT blocks.
	var aScripts = doc.getElementsByTagName("script");
	var bFirstInline = true;
	var iScripts = 0;
	for ( i = 0; i < aScripts.length; i++ ) {
	    var script = aScripts[i];
	    if ( !script.src ) {  // avoid external script objects
	        iScripts++;
		sJSCode += script.innerHTML;
		aJSCode = aJSCode.concat(script.innerHTML.split("\n"));
		aScriptsInfo.push( { 'url': "script tag #" + iScripts, 'lines': (aJSCode.length-nLineTotal) } );
		nLineTotal = aJSCode.length;
	    }
	}

        var jslintContext = { jslintUrl: "", results: [] };

        if (aScriptsInfo.length == 0) {
            return jslintContext;
        }

	var lastErrObj;  // So we can track if JSLint bailed early.
	if ( ! YSLOW.JSLINT(aJSCode, jslintOptions) ) {
            jslintContext.jslintUrl = "";  // keep track of the current script URL we're evaluating
	    var hClasses = {};
	    var nClasses = 0;
	    for ( i = 0; i < YSLOW.JSLINT.errors.length; i++ ) {
		var errObj = YSLOW.JSLINT.errors[i];
		if ( errObj ) {         // the last errObj can be NULL
		    lastErrObj = errObj;
		    var sReason = YSLOW.JSLint.cleanReason(errObj.reason);
		    if ( ! hClasses[ sReason ] ) {
			// Give each error type a unique #.
                        // We use this to generate a css classname for hiding errors by type.
			nClasses++;
			hClasses[ sReason ] = nClasses;
		    }
                    YSLOW.JSLint.genError(jslintContext, errObj, aScriptsInfo, aJSCode, "errclass" + hClasses[sReason], i);
		}
	    }
	}

        jslintContext.lastErrObj = lastErrObj;
        return jslintContext;
    },

    // Extract a substring from the line of JS code that includes the error location.
    // Also close/open new div when the JS source (external file or inline) changes.
    genError: function(jslintContext, errObj, aScriptsInfo, aJSCode, sClassname, iError) {

	var nLineTotal = 0;
	var iRelLine = 0;
	var sScript = "";
	var iLine = parseInt(errObj.line, 10);   // this is relative to all the js combined together and is ZERO BASED!!
	var iChar = parseInt(errObj.character, 10);   // this is relative to all the js combined together
	for ( var i = 0; i < aScriptsInfo.length; i++ ) {
	    if ( iLine < (nLineTotal + aScriptsInfo[i].lines) ) {
		iRelLine = iLine - nLineTotal + 1;  // because it's zero-based
		sScript = aScriptsInfo[i].url;
		break;
	    }
	    nLineTotal += aScriptsInfo[i].lines;
        }

	if ( sScript != jslintContext.jslintUrl ) {
	    jslintContext.jslintUrl = sScript;
            jslintContext.results.push( { "script": sScript, "id": iError, "errors": []} );
	}

        var jslintErrorEntry = {};
        jslintErrorEntry.reason = errObj.reason;
        jslintErrorEntry.line = iRelLine;
        jslintErrorEntry.character = iChar;
        jslintErrorEntry.evidence = errObj.evidence;
        jslintErrorEntry.raw = errObj.raw;
        jslintErrorEntry.code = aJSCode[iLine];

        jslintContext.results[jslintContext.results.length-1].errors.push(jslintErrorEntry);

    },


    // Some reasons are different, but are really the same.
    // Normalize them here.
    cleanReason: function(sReason) {
	if ( -1 != sReason.indexOf("Missing '{' before") ) {
	    sReason = "Missing '{' before";
	}
        return sReason;
    }
};
