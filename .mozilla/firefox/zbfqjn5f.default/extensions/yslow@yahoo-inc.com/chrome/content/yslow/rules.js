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
 *
 * Example of a rule object:
 *
 * <pre>
 * YSLOW.registerRule({
 *
 *     id: 'myrule',
 *     name: 'Never say never',
 *     url: 'http://never.never/never.html',
 *     info: 'Short description of the rule',
 *
 *     config: {
 *          when: 'ever'
 *     },
 *
 *     lint: function(doc, components, config) {
 *         return {
 *             score: 100,
 *             message: "Did you just say never?",
 *             components: []
 *         };
 *     }
 * });
 * </pre>
 */

//
// 3/2/2009
// Centralize all name and info of builtin tool to YSLOW.doc class.
//

YSLOW.registerRule({

    id: 'ynumreq',
    //name: 'Make fewer HTTP requests',
    url: 'http://developer.yahoo.com/performance/rules.html#num_http',
    category: ['content'],

    config: {
        max_js: 3, // the number of scripts allowed before we start penalizing
        points_js: 4, // penalty points for each script over the maximum
        max_css: 2, // number of external stylesheets allowed before we start penalizing
        points_css: 4, // penalty points for each external stylesheet over the maximum
        max_cssimages: 6, // // number of background images allowed before we start penalizing
        points_cssimages: 3 // penalty points for each bg image over the maximum
    },

    lint: function(doc, cset, config) {

        var js  = cset.getComponentsByType('js').length - config.max_js;
        var css  = cset.getComponentsByType('css').length - config.max_css;
        var cssimg  = cset.getComponentsByType('cssimage').length - config.max_cssimages;

        var score = 100;
        var messages = [];

        if (js > 0) {
            score -= js * config.points_js;
            messages[messages.length] = 'This page has ' + YSLOW.util.plural('%num% external Javascript script%s%', (js + config.max_js))  + '.  Try combining them into one.';
        }
        if (css > 0) {
            score -= css * config.points_css;
            messages[messages.length] = 'This page has ' + YSLOW.util.plural('%num% external stylesheet%s%', (css + config.max_css)) + '.  Try combining them into one.';
        }
        if (cssimg > 0) {
            score -= cssimg * config.points_cssimages;
            messages[messages.length] = 'This page has ' + YSLOW.util.plural('%num% external background image%s%', (cssimg + config.max_cssimages)) + '.  Try combining them with CSS sprites.';
        }

        return {
            score: score,
            message: messages.join('\n'),
            components: []
        };
    }
});


YSLOW.registerRule({

    id: 'ycdn',
    //name: 'Use a CDN',
    url: 'http://developer.yahoo.com/performance/rules.html#cdn',
    category: ['server'],

    config: {
        points: 10, // how many points to take out for each component not on CDN
        patterns: [ // array of regexps that match CDN-ed components
            "^([^\\.]*)\\.([^\\.]*)\\.yimg\\.com/[^/]*\\.yimg\\.com/.*$",
            "^([^\\.]*)\\.([^\\.]*)\\.yimg\\.com/[^/]*\\.yahoo\\.com/.*$",
            "^sec.yimg.com/",
            "^a248.e.akamai.net",
            "^[dehlps].yimg.com",
            "^(ads|cn|mail|maps|s1).yimg.com",
            "^a.l.yimg.com",
            "^us.(js|a)2.yimg.com",
            "^yui.yahooapis.com",
            "^adz.kr.yahoo.com",
            "^img.yahoo.co.kr",
            "^img.(shopping|news|srch).yahoo.co.kr",
            "^pimg.kr.yahoo.com",
            "^kr.img.n2o.yahoo.com",
            "^s3.amazonaws.com"
        ],
        exceptions: [// array of regexps that will be treated as exception.
            "^chart.yahoo.com",
            "^(a1|f3|f5|f3c|f5c).yahoofs.com",       // Images for 360 and YMDB
            "^us.(a1c|f3).yahoofs.com"   // Personals photos
        ],
        types: ['js', 'css', 'image', 'cssimage', 'flash', 'favicon'] // which component types should be on CDN
    },


    lint: function(doc, cset, config) {

        var score = 100, i, j, url, re, match, offenders = [], exceptions = [],
            hostname, message = '',
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {
            url = comps[i].url;
            hostname = YSLOW.util.getHostname(url);
            match = false;
            for (j = 0; j < config.patterns.length; j++) {
                re = new RegExp(config.patterns[j]);
                if (re.test(hostname) === true) {
                    match = true;
                    break;
                }
            }
            if (!match) {
                for (j = 0; j < config.exceptions.length; j++) {
                    re = new RegExp(config.exceptions[j]);
                    if (re.test(hostname) === true) {
                        exceptions.push(comps[i]);
                        match = true;
                        break;
                    }
                }
                if (!match) {
                    offenders.push(comps[i]);
                }
            }
        }

        score -= offenders.length * config.points;

        offenders.concat(exceptions);

        if (offenders.length > 0) {
            message = YSLOW.util.plural('There %are% %num% static component%s% that %are% not on CDN. ', offenders.length);
        }
        if (exceptions.length > 0) {
            message += YSLOW.util.plural('There %are% %num% component%s% that %are% not on CDN, but %are% exceptions:', exceptions.length) + '<ul>';
            for (i = 0; i < offenders.length; i++) {
                message += '<li>' + YSLOW.util.prettyAnchor(exceptions[i].url, exceptions[i].url, undefined, true, 120, undefined, exceptions[i].type) + '</li>';
            }
            message += '</ul>';
        }

        var user_cdns = YSLOW.util.Preference.getPref("cdnHostnames", "");
        if (user_cdns && user_cdns.length > 0) {
            message += '<p>Using these CDN hostnames from your preferences: ' + user_cdns + '</p>';
        } else {
            message += '<p>You can specify CDN hostnames in your preferences. See <a href="javascript:document.ysview.openLink(\'http://developer.yahoo.com/yslow/faq.html#faq_cdn\')">YSlow FAQ</a> for details.</p>';
        }

        return {
            score: score,
            message: message,
            components: offenders 
        };
    }
});




YSLOW.registerRule({

    id: 'yexpires',
    //name: 'Add an Expires header',
    url: 'http://developer.yahoo.com/performance/rules.html#expires',
    category: ['server'],

    config: {
        points: 11, // how many points to take for each component without Expires header
        howfar: 172800, // 2 days = 2 * 24 * 60 * 60 seconds, how far is far enough
        types: ['css', 'js', 'image', 'cssimage', 'flash', 'favicon'] // component types to be inspected for expires headers
    },

    lint: function(doc, cset, config) {

        var far = parseInt(config.howfar, 10) * 1000, // far-ness in milliseconds
        ts, i, offenders = [], expiration, score,
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {

            expiration = comps[i].expires;

            if (typeof expiration === 'object' && typeof expiration.getTime === 'function') { // looks like a Date object
                ts = new Date().getTime();
                if (expiration.getTime() > ts + far) {
                    continue;
                }
            }
            offenders.push(comps[i]);

        }

        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% static component%s%', offenders.length) + ' without a far-future expiration date.' : '',
            components: offenders
        };

    }
});





YSLOW.registerRule({

    id: 'ycompress',
    //name: 'Compress components',
    url: 'http://developer.yahoo.com/performance/rules.html#gzip',
    category: ['server'],

    config: {
        min_filesize: 500, // files below this size are exceptions of the gzip rule
        types: ['doc', 'iframe', 'xhr', 'js', 'css'], // file types to inspect
        points: 11 // points to take out for each non-compressed component
    },

    lint: function(doc, cset, config) {
        var i, offenders= [], score,
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {

            if (comps[i].compressed || comps[i].size < 500) {
                continue;
            }
            offenders.push(comps[i]);
        }

        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% plain text component%s%', offenders.length) + ' that should be sent compressed' : '',
            components: offenders
        };
    }
});





YSLOW.registerRule({

    id: 'ycsstop',
    //name: 'Put CSS at the top',
    url: 'http://developer.yahoo.com/performance/rules.html#css_top',
    category: ['css'],

    config: {
        points: 10
    },

    lint: function(doc, cset, config) {

        var i, score,
            bodylinks = (doc && doc.body) ? doc.body.getElementsByTagName('link') : [],
            hrefs = {},
            comps = cset.getComponentsByType('css'),
            offenders = [];

        for (i = 0; i < bodylinks.length; i++) {
            if (bodylinks[i].href && bodylinks[i].rel && bodylinks[i].rel === 'stylesheet') {
                hrefs[bodylinks[i].href] = 1;
            }
        }

        // expose all offenders
        for (i = 0; i < comps.length; i++) {
            if (hrefs[comps[i].url]) { // key exists
                offenders.push(comps[i]);
            }
        }

        score = 100;
        if (offenders.length > 0) {
            // start at 99 so each ding drops us a grade
            score -= 1 + offenders.length * parseInt(config.points, 10);
        }

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% stylesheet%s%', offenders.length) + ' found in the body of the document' : '',
            components: offenders
        };
    }
});





YSLOW.registerRule({

    id: 'yjsbottom',
    //name: 'Put Javascript at the bottom',
    url: 'http://developer.yahoo.com/performance/rules.html#js_bottom',
    category: ['javascript'],

    config: {
        points: 5 // how many points for each script in the <head>
    },

    lint: function(doc, cset, config) {

        var comp, headScript, i, rawScript, rawScripts, score, src,
            headSrcs = {},
            offenders = [],
            rawSrcs = {},
            comps = cset.getComponentsByType('js'),
            container = doc.createElement('div'),
            headScripts = doc.getElementsByTagName('head')[0].getElementsByTagName('script'),
            rawDoc = (rawDoc = cset.getComponentsByType('doc')) && rawDoc[0] || {};

        container.innerHTML = rawDoc.body || '';
        rawScripts = container.getElementsByTagName('script');

        // get scripts from original document (raw)
        for (i = 0; (rawScript = rawScripts[i]); i += 1) {
            if ((src = rawScript.src)) {
                rawSrcs[src] = 1;
            }
        }

        // check if scripts in current head is within orignal document
        // if not found, then those were dynamically injected, thus not
        // considered offenders, except if it has defer attribute
        for (i = 0; (headScript = headScripts[i]); i += 1) {
            if ((src = headScript.src) && rawSrcs[src] && !headScript.defer) {
                headSrcs[src] = 1;
            }
        }

        // expose all offenders
        for (i = 0; (comp = comps[i]); i += 1) {
            if (headSrcs[comp.url]) { // key exists
                offenders.push(comp);
            }
        }

        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% JavaScript script%s%', offenders.length) + ' found in the head of the document' : '',
            components: offenders
        };


    }
});





YSLOW.registerRule({

    id: 'yexpressions',
    //name: 'Avoid CSS expressions',
    url: 'http://developer.yahoo.com/performance/rules.html#css_expressions',
    category: ['css'],

    config: {
        points: 2 // how many points for each expression
    },

    lint: function(doc, cset, config) {


        var i, score,
            instyles = doc.getElementsByTagName('style'),
            comps = cset.getComponentsByType('css'),
            offenders = [],
            expr_count,
            total = 0;

        for (i = 0; i < comps.length; i++) {
            if (typeof comps[i].expr_count === 'undefined') {
                expr_count = YSLOW.util.countExpressions(comps[i].body);
                comps[i].expr_count = expr_count;
            } else {
                expr_count = comps[i].expr_count;
            }

            // offence
            if (expr_count > 0) {
                comps[i].yexpressions = YSLOW.util.plural('%num% expression%s%', expr_count);
                total += expr_count;
                offenders.push(comps[i]);
            }
        }

        for (i = 0; i < instyles.length; i++) {

            expr_count = YSLOW.util.countExpressions(instyles[i].innerHTML);
            if (expr_count > 0) {
                offenders.push('inline <style> tag #' + (i + 1) + ' (' + YSLOW.util.plural('%num% expression%s%', expr_count) + ')');
                total += expr_count;
            }

        }

        score = 100;
        if (total > 0) {
            score = 90 - total * config.points;
        }

        return {
            score: score,
            message: total > 0 ? 'There are a total of ' + YSLOW.util.plural('%num% expression%s%', total) : '',
            components: offenders
        };
    }
});



YSLOW.registerRule({

    id: 'yexternal',
    //name: 'Make JS and CSS external',
    url: 'http://developer.yahoo.com/performance/rules.html#external',
    category: ['javascript', 'css'],

    config: {
        check_inline: ['style', 'script'] // inlide tags to check for minification
    },

    lint: function(doc, components, config) {

        var i, j, inlines, message,
            offenders = [];

        // check inline scripts/styles/whatever
        if (config.check_inline) {
            for(j = 0; j < config.check_inline.length; j++) {
                inlines = doc.getElementsByTagName(config.check_inline[j]);
                if (inlines.length > 0) {
                    message = 'There are a total of %num% inline ' +
                        (config.check_inline[j] == "style" ? 'css' : 'script%s%');
                    message = YSLOW.util.plural(message, inlines.length);
                    offenders.push(message);
                }
            }
        }

        return {
            score: 'n/a',
            message: 'Only consider this if your property is a common user home page.',
            components: offenders
        };
    }
});



YSLOW.registerRule({

    id: 'ydns',
    //name: 'Reduce DNS lookups',
    url: 'http://developer.yahoo.com/performance/rules.html#dns_lookups',
    category: ['content'],

    config: {
        max_domains: 4, // maximum allowed domains, excluding ports and IP addresses
        points: 5 // the cost of each additional domain over the maximum
    },

    lint: function(doc, cset, config) {

        var score,
            domains = YSLOW.util.getUniqueDomains(cset.components, true);

        score = 100;
        if (domains.length > config.max_domains) {
            score -= (domains.length - config.max_domains) * config.points;
        }

        return {
            score: score,
            message: (domains.length > config.max_domains) ? YSLOW.util.plural('The components are split over more than %num% domain%s%', config.max_domains) : '',
            components: (domains.length > config.max_domains) ? domains : []
        };
    }
});





YSLOW.registerRule({

    id: 'yminify',
    //name: 'Minify JS and CSS',
    url: 'http://developer.yahoo.com/performance/rules.html#minify',
    category: ['javascript', 'css'],

    config: {
        points: 10, // penalty for each unminified component
        types:  ['js', 'css'], // types of components to inspect for minification
        check_inline: ['style', 'script'] // inlide tags to check for minification
    },

    lint: function(doc, cset, config) {

        var i, j, score,
            comps = cset.getComponentsByType(config.types),
            inlines,
            offenders = [],
            minified;


        // check all peeled components
        for (i = 0; i < comps.length; i++) {
            // set/get minified flag
            if (typeof comps[i].minified === 'undefined') {
                minified = YSLOW.util.isMinified(comps[i].body);
                comps[i].minified = minified;
            } else {
                minified = comps[i].minified;
            }

            if (!minified) {
                offenders.push(comps[i]);
            }

        }

        // check inline scripts/styles/whatever
        if (config.check_inline) {
            for(j = 0; j < config.check_inline.length; j++) {
                inlines = doc.getElementsByTagName(config.check_inline[j]);
                for (i = 0; i < inlines.length; i++) {
                    if (!YSLOW.util.isMinified(inlines[i].innerHTML)) {
                        offenders.push('Inline ' + config.check_inline[j] + ' tag #' + (i + 1));
                    }
                }
            }
        }

        score = 100 - offenders.length * config.points;

        return {
            score: score,
            message: (offenders.length > 0) ?  YSLOW.util.plural('There %are% %num% component%s% that can be minified', offenders.length) : '',
            components: offenders
        };
    }
});





YSLOW.registerRule({

    id: 'yredirects',
    //name: 'Avoid redirects',
    url: 'http://developer.yahoo.com/performance/rules.html#redirects',
    category: ['content'],

    config: {
        points: 10 // the penalty for each redirect
    },

    lint: function(doc, cset, config) {

        var i, score, offenders = [],
            comps = cset.getComponentsByType('redirect');

        for (i = 0; i < comps.length; i++) {
            offenders.push(YSLOW.util.briefUrl(comps[i].url, 80) + "<br> redirects to <br>" + YSLOW.util.briefUrl(comps[i].headers.Location, 60));
        }
        score = 100 - comps.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (comps.length > 0) ? YSLOW.util.plural('There %are% %num% redirect%s%', comps.length) : '',
            components: offenders
        };


    }
});





YSLOW.registerRule({

    id: 'ydupes',
    //name: 'Remove duplicate JS and CSS',
    url: 'http://developer.yahoo.com/performance/rules.html#js_dupes',
    category: ['javascript', 'css'],

    config: {
        points: 5, // penalty for each duplicate
        types: ['js', 'css'] // component types to check for duplicates
    },

    lint: function(doc, cset, config) {

        var i, url, score,
            hash = {},
            offenders = [],
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {
            url = comps[i].url;
            if (typeof hash[url] === 'undefined') {
                hash[url] = {count: 1, compindex: i};
            } else {
                hash[url].count++;
            }
        }

        for (i in hash) {
            if (hash[i].count > 1) {
                offenders.push(comps[hash[i].compindex]);
            }
        }

        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% duplicate component%s%', offenders.length) : '',
            components: offenders
        };
    }
});





YSLOW.registerRule({

    id: 'yetags',
    //name: 'Configure ETags',
    url: 'http://developer.yahoo.com/performance/rules.html#etags',
    category: ['server'],

    config: {
        points: 11, // points to take out for each misconfigured etag
        types: ['flash', 'js', 'css', 'cssimage', 'image', 'favicon'] // types to inspect for etags
    },

    lint: function(doc, cset, config) {

        var i, score,
            offenders = [],
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {
            if (comps[i].headers && comps[i].headers.Etag && comps[i].headers.Server &&
                !YSLOW.util.isETagGood(comps[i].headers.Etag, comps[i].headers.Server)) {
                offenders.push(comps[i]);
            }
        }

        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% component%s% with misconfigured ETags', offenders.length) : '',
            components: offenders
        };
    }
});




YSLOW.registerRule({

    id: 'yxhr',
    //name: 'Make Ajax cacheable',
    url: 'http://developer.yahoo.com/performance/rules.html#cacheajax',
    category: ['content'],

    config: {
        points: 5, // points to take out for each non-cached XHR
        min_cache_time: 3600 // at least an hour in cache.
    },

    lint: function(doc, cset, config) {

        var min = parseInt(config.min_cache_time, 10) * 1000, // far-ness in milliseconds
            i, expiration, ts, score,
            offenders = [],
            comps = cset.getComponentsByType('xhr'),
            cache_control;

        for (i = 0; i < comps.length; i++) {

            // check for cache-control: no-cache and cache-control: no-store
            cache_control = comps[i].headers['Cache-Control'];
            if (cache_control) {
                if (cache_control.indexOf("no-cache") != -1 || cache_control.indexOf("no-store") != -1) {
                    continue;
                }
            }

            expiration = comps[i].expires;
            if (typeof expiration === 'object' && typeof expiration.getTime === 'function') { // looks like a Date object
                ts = new Date().getTime();
                if (expiration.getTime() > ts + min) {
                    continue;
                }
                // expires less than min_cache_time => BAD.
            }
            offenders.push(comps[i]);
        }

        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% XHR component%s% that %are% not cacheable', offenders.length) : '',
            components: offenders
        };
    }
});


YSLOW.registerRule({

    id: 'yxhrmethod',
    //name: 'Use GET for AJAX Requests',
    url: 'http://developer.yahoo.com/performance/rules.html#ajax_get',
    category: ['server'],

    config: {
        points: 5  // points to take out for each ajax request that uses http method other than GET.
    },

    lint: function(doc, cset, config) {

        var i, offenders = [], score,
            comps = cset.getComponentsByType('xhr');

        for (i = 0; i < comps.length; i++) {
            if (typeof comps[i].method === 'string') {
                if (comps[i].method !== 'GET' && comps[i].method !== 'unknown') {
                    offenders.push(comps[i]);
                }
            }
        }
        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% XHR component%s% that %do% not use GET HTTP method', offenders.length) : '',
            components: offenders
        };
    }

});


YSLOW.registerRule({

    id: 'ymindom',
    //name: 'Reduce the Number of DOM Elements',
    url: 'http://developer.yahoo.com/performance/rules.html#min_dom',
    category: ['content'],

    config: {
        range: 250,  // the range
        points: 10, // points to take out for each range of DOM that's more than max.
        maxdom: 900  // number of DOM elements are considered too many if exceeds maxdom.
    },

    lint: function(doc, cset, config) {

        var numdom = doc.getElementsByTagName('*').length,
            score = 100;

        if (numdom > config.maxdom) {
            score = 99 - Math.ceil((numdom - parseInt(config.maxdom, 10)) / parseInt(config.range, 10)) * parseInt(config.points, 10);
        }

        return {
            score: score,
            message: (numdom > config.maxdom) ? YSLOW.util.plural('There %are% %num% DOM element%s% on the page', numdom) : '',
            components: []
        };
    }
});

YSLOW.registerRule({

    id: 'yno404',
    //name: 'No 404s',
    url: 'http://developer.yahoo.com/performance/rules.html#no404',
    category: ['content'],

    config: {
        points: 5,  // points to take out for each 404 response.
        types: ['css', 'js', 'image', 'cssimage', 'flash', 'xhr', 'favicon'] // component types to be inspected for expires headers
    },

    lint: function(doc, cset, config) {

        var i, offenders = [], score,
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {
            if (comps[i].status === 404) {
                offenders.push(comps[i]);
            }
        }
        score = 100 - offenders.length * parseInt(config.points, 10);
        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% request%s% that %are% 404 Not Found', offenders.length) : '',
            components: offenders
        };

    }
});

YSLOW.registerRule({

    id: 'ymincookie',
    //name: 'Reduce Cookie Size',
    url: 'http://developer.yahoo.com/performance/rules.html#cookie_size',
    category: ['cookie'],

    config: {
        points: 10, // points to take out if cookie size is more than config.max_cookie_size.
        max_cookie_size: 1000   // 1000 bytes.
    },

    lint: function(doc, cset, config) {

        var cookie_size = 0, score = 100;

        if (typeof doc.cookie === 'string') {
            cookie_size = doc.cookie.length;
        }
        if (cookie_size > config.max_cookie_size) {
            var n = Math.floor(cookie_size / config.max_cookie_size);
            score -= 1 + n * parseInt(config.points, 10);
        }

        return {
            score: score,
            message: (cookie_size > config.max_cookie_size) ? YSLOW.util.plural('There %are% %num% byte%s% of cookies on this page', cookie_size) : '',
            components: []
        };

    }
});

YSLOW.registerRule({
    id: 'ycookiefree',
    //name: 'Use Cookie-free Domains',
    url: 'http://developer.yahoo.com/performance/rules.html#cookie_free',
    category: ['cookie'],

    config: {
        points: 5, // points to take out for each component that send cookie.
        types: ['js', 'css', 'image', 'cssimage', 'flash', 'favicon'] // which component types should be cookie-free
    },

    lint: function(doc, cset, config) {

        var i, offenders = [], score,
            comps = cset.getComponentsByType(config.types);

        for (i = 0; i < comps.length; i++) {
            if (typeof comps[i].cookie == 'string' && comps[i].cookie.length > 0) {
                offenders.push(comps[i]);
            }
        }
        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% component%s% that %are% not cookie-free', offenders.length) : '',
            components: offenders
        };
    }

});

YSLOW.registerRule({

    id: 'ynofilter',
    //name: 'Avoid Filters',
    url: 'http://developer.yahoo.com/performance/rules.html#no_filters',
    category: ['css'],

    config: {
        points: 5, // points to take out for each AlphaImageLoader filter not using _filter hack.
        halfpoints: 2 // points to take out for each AlphaImageLoader filter using _filter hack.
    },

    lint: function(doc, cset, config) {

        var i, score,
            instyles = doc.getElementsByTagName('style'),
            comps = cset.getComponentsByType('css'),
            offenders = [],
            type, count,
            filter_count,
            filter_total = 0,
            _filter_total = 0;


        for (i = 0; i < comps.length; i++) {
            if (typeof comps[i].filter_count === 'undefined') {
                filter_count = YSLOW.util.countAlphaImageLoaderFilter(comps[i].body);
                comps[i].filter_count = filter_count;
            } else {
                filter_count = comps[i].filter_count;
            }

            // offence
            count = 0;
            for (type in filter_count) {
                if (type === "_filter") {
                    _filter_total += filter_count[type];
                    count += filter_count[type];
                } else {
                    filter_total += filter_count[type];
                    count += filter_count[type];
                }
            }
            if (count > 0) {
                comps[i].yfilters = YSLOW.util.plural('%num% filter%s%', count);
                offenders.push(comps[i]);
            }
        }

        for (i = 0; i < instyles.length; i++) {
            filter_count = YSLOW.util.countAlphaImageLoaderFilter(instyles[i].innerHTML);
            count = 0;
            for (type in filter_count) {
                if (type === "_filter") {
                    _filter_total += filter_count[type];
                    count += filter_count[type];
                } else {
                    filter_total += filter_count[type];
                    count += filter_count[type];
                }
            }
            if (count > 0) {
                offenders.push('inline &lt;style&gt; tag #' + (i + 1) + ' (' + YSLOW.util.plural('%num% filter%s%', count) + ')');
            }
        }

        score = 100 - (filter_total * config.points + _filter_total * config.halfpoints);

        return {
            score: score,
            message: (filter_total+_filter_total) > 0 ? 'There are a total of ' + YSLOW.util.plural('%num% filter%s%', filter_total+_filter_total) : '',
            components: offenders
        };

    }

});

YSLOW.registerRule({

    id: 'yimgnoscale',
    //name: 'Don\'t Scale Images in HTML',
    url: 'http://developer.yahoo.com/performance/rules.html#no_scale',
    category: ['images'],

    config: {
        points: 5  // points to take out for each image that scaled.
    },

    lint: function(doc, cset, config) {

        var i, offenders = [], score,
        comps = cset.getComponentsByType('image');

        for (i = 0; i < comps.length; i++) {
            if (comps[i].object_prop !== null) {
                var prop = comps[i].object_prop;
                if (prop && typeof prop.width !== "undefined" && typeof prop.height !== "undefined" &&
                    typeof prop.actual_width !== "undefined" && typeof prop.actual_height !== "undefined") {
                    if (prop.width < prop.actual_width || prop.height < prop.actual_height) {
                        // allow scale up
                        offenders.push(comps[i]);
                    }
                }
            }
        }
        score = 100 - offenders.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (offenders.length > 0) ? YSLOW.util.plural('There %are% %num% image%s% that %are% scaled down', offenders.length) : '',
            components: offenders
        };
    }

});

YSLOW.registerRule({

    id: 'yfavicon',
    //name: 'Make favicon Small and Cacheable',
    url: 'http://developer.yahoo.com/performance/rules.html#favicon',
    category: ['images'],

    config: {
        points: 5, // points to take out for each offend.
        size: 2000, // deduct point if size of favicon is more than this number.
        min_cache_time: 3600  // at least this amount of seconds in cache to consider cacheable.
    },

    lint: function(doc, cset, config) {

        var ts, expiration, messages = [], score,
            min = parseInt(config.min_cache_time, 10) * 1000,
            comps = cset.getComponentsByType('favicon');

        if (comps.length > 0) {
            // check size
            if (comps[0].size > config.size) {
                messages.push = YSLOW.util.plural('Favicon is more than %num% bytes', config.size);
            }
            // check cacheability
            expiration = comps[0].expires;

            if (typeof expiration === 'object' && typeof expiration.getTime === 'function') { // looks like a Date object
                ts = new Date().getTime();
                if (expiration.getTime() < ts + min) {
                    messages.push = 'Favicon is not cacheable';
                }
            }
        }
        score = 100 - messages.length * parseInt(config.points, 10);

        return {
            score: score,
            message: (messages.length > 0) ? messages.join('\n') : '',
            components: []
        };
    }

});

YSLOW.registerRule({

    id: 'yemptysrc',
    // name: 'Avoid empty src or href',
    url: 'http://developer.yahoo.com/performance/rules.html#emptysrc',
    category: ['server'],
    config: {
        points: 100
    },
    lint: function(doc, cset, config) {
        var type, score, offenders = [], messages = [], msg = '',
            points = parseInt(config.points, 10);

        score = 100;
        if (cset.empty_url) {
            for (type in cset.empty_url) {
                score -= cset.empty_url[type] * points;
                messages.push(cset.empty_url[type] + ' ' + type);
            }
            msg = messages.join(', ')  + ' components with empty link were found.';
        }

        return {
            score: score,
            message: msg,
            components: offenders
        };
    }
});

/**
 * YSLOW.registerRuleset({
 *
 *     id: 'myalgo',
 *     name: 'The best algo',
 *     rules: {
 *         myrule: {
 *             ever: 2,
 *         }
 *     }
 *
 * });
 */




YSLOW.registerRuleset({ // yahoo default with default configuration

    id: 'ydefault',
    name: 'YSlow(V2)',
    rules: {
        ynumreq:      {}, //  1
        ycdn:         {}, //  2
        yemptysrc:    {},
        yexpires:     {}, //  3
        ycompress:    {}, //  4
        ycsstop:      {}, //  5
        yjsbottom:    {}, //  6
        yexpressions: {}, //  7
        yexternal:    {}, //  8
        ydns:         {}, //  9
        yminify:      {}, // 10
        yredirects:   {}, // 11
        ydupes:       {}, // 12
        yetags:       {}, // 13
        yxhr:         {}, // 14
        yxhrmethod:   {}, // 16
        ymindom:      {}, // 19
        yno404:       {}, // 22
        ymincookie:   {}, // 23
        ycookiefree:  {}, // 24
        ynofilter:    {}, // 28
        yimgnoscale:  {}, // 31
        yfavicon:     {}  // 32
    },
    weights: {
        ynumreq:      8,
        ycdn:         6,
        yemptysrc:   30,
        yexpires:    10,
        ycompress:    8,
        ycsstop:      4,
        yjsbottom:    4,
        yexpressions: 3,
        yexternal:    4,
        ydns:         3,
        yminify:      4,
        yredirects:   4,
        ydupes:       4,
        yetags:       2,
        yxhr:         4,
        yxhrmethod:   3,
        ymindom:      3,
        yno404:       4,
        ymincookie:   3,
        ycookiefree:  3,
        ynofilter:    4,
        yimgnoscale:  3,
        yfavicon:     2
    }

});

YSLOW.registerRuleset({

    id: 'yslow1',
    name: 'Classic(V1)',
    rules: {
        ynumreq:      {}, //  1
        ycdn:         {}, //  2
        yexpires:     {}, //  3
        ycompress:    {}, //  4
        ycsstop:      {}, //  5
        yjsbottom:    {}, //  6
        yexpressions: {}, //  7
        yexternal:    {}, //  8
        ydns:         {}, //  9
        yminify:      {   // 10
            types: ['js'],
            check_inline: false
                      },
        yredirects:   {}, // 11
        ydupes:       {   // 12
            types: ['js']
                      },
        yetags:       {}  // 13
    },
    weights: {
        ynumreq:      8,
        ycdn:         6,
        yexpires:    10,
        ycompress:    8,
        ycsstop:      4,
        yjsbottom:    4,
        yexpressions: 3,
        yexternal:    4,
        ydns:         3,
        yminify:      4,
        yredirects:   4,
        ydupes:       4,
        yetags:       2
    }

});


YSLOW.registerRuleset({
    id: 'yblog',
    name: 'Small Site or Blog',
    rules: {
        ynumreq:      {}, //  1
        yemptysrc:    {},
        ycompress:    {}, //  4
        ycsstop:      {}, //  5
        yjsbottom:    {}, //  6
        yexpressions: {}, //  7
        ydns:         {}, //  9
        yminify:      {}, // 10
        yredirects:   {}, // 11
        ydupes:       {}, // 12
        ymindom:      {}, // 19
        yno404:       {}, // 22
        ynofilter:    {}, // 28
        yimgnoscale:  {}, // 31
        yfavicon:     {}  // 32
    },
    weights: {
        ynumreq:      8,
        yemptysrc:   30,
        ycompress:    8,
        ycsstop:      4,
        yjsbottom:    4,
        yexpressions: 3,
        ydns:         3,
        yminify:      4,
        yredirects:   4,
        ydupes:       4,
        ymindom:      3,
        yno404:       4,
        ynofilter:    4,
        yimgnoscale:  3,
        yfavicon:     2
    }
});

