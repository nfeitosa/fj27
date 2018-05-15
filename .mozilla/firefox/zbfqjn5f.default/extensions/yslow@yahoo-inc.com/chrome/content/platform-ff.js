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
 * ***** END LICENSE BLOCK *****/

YSLOW.platform = YSLOW.platform || {};
YSLOW.platform.util = {

    eval: function(text) {
        var s = new Components.utils.Sandbox("about:blank");
        return Components.utils.evalInSandbox("(" + text + ")", s);
    },

    setTimer: function(callback, delay) {

        var event = {
            notify: function (timer) {
                try {
                    callback.call();
                } catch (e) {
                    YSLOW.util.dump(e);
                }
            }
        };

        // Now it is time to create the timer...
        var timer = Components.classes["@mozilla.org/timer;1"]
            .createInstance(Components.interfaces.nsITimer);

        if (delay === undefined) {
            delay = 0;
        }

        // ... and to initialize it, we want to call event.notify() ...
        // ... one time after exactly ten second.
        timer.initWithCallback(
            event,
            delay,
            Components.interfaces.nsITimer.TYPE_ONE_SHOT);

    }

};
