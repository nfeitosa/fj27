/* ***** BEGIN LICENSE BLOCK *****
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

pref("extensions.yslow.autorun", false);
pref("extensions.yslow.hidestatusbar", false);
pref("extensions.yslow.getFramesComponents", true);
pref("extensions.yslow.observeNetwork", true);
pref("extensions.yslow.xhrWaitingTime", 120000);

pref("extensions.yslow.optinBeacon", false);
pref("extensions.yslow.beaconUrl", "http://rtblab.pclick.yahoo.com/images/ysb.gif");
pref("extensions.yslow.beaconInfo", "basic");

pref("extensions.yslow.excludeBeaconsFromLint", true);
pref("extensions.yslow.excludeAfterOnload", true);

pref("extensions.yslow.smushItURL", "http://www.smushit.com/ysmush.it");

pref("extensions.yslow.minFutureExpiresSeconds", 172800); // 2days
pref("extensions.yslow.cdnHostnames", "");

pref("extensions.yslow.allowNegativeScore", false);
