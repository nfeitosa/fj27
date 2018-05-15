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
 * This class implement YSLOW.util.Preferences for Firefox.
 * @class
 * @static
 */

YSLOW.firefox.Preference = {

    prefDomain: "extensions.yslow",

    /**
     * Get Preference value from Mozilla preferences-service.
     * @param {String} name name of preference to get.
     * @return preference value
     */
    getPrefValue: function(name) {
        var nsIPrefBranch = Components.interfaces.nsIPrefBranch;
        var nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(nsIPrefBranch2);

        //Check if this is global firefox preference.
        var prefName;
        if ( name.indexOf("extensions.") !== -1 || name.indexOf("browser.") !== -1)  {
            prefName = name;
        } else {
            prefName = this.prefDomain + "." + name;
        }

        var type = prefs.getPrefType(prefName);
        if (type == nsIPrefBranch.PREF_STRING) {
            return prefs.getCharPref(prefName);
        } else if (type == nsIPrefBranch.PREF_INT) {
            return prefs.getIntPref(prefName);
        } else if (type == nsIPrefBranch.PREF_BOOL) {
            return prefs.getBoolPref(prefName);
        }
        return undefined;
    },

    /**
     * Get Preference with default value.  If the preference does not exist,
     * return the passed default_value.
     * @param {String} name preference name
     * @return preference value or default value.
     */
    getPref: function(name, default_value) {
        var val = this.getPrefValue(name);
        return (("undefined" == typeof val) ? default_value : val);
    },

    /**
     * Get child preference list in branch.
     * @param {String} branch_name branch name
     * @param default_value value to return if no preference is found.
     * @return array of preference name/value pairs.
     */
    getPrefList: function(branch_name, default_value) {
        var nsIPrefBranch = Components.interfaces.nsIPrefBranch;
        var prefName;
        if (branch_name.indexOf("extensions.") !== -1) {
            prefName = branch_name;
        } else {
            prefName = this.prefDomain + "." + branch_name;
        }

        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var branch = prefs.getBranch(prefName);
        var children = branch.getChildList("", {});
        var values = [];

        for (var i = 0; i < children.length; i++) {
            var value;
            var type = branch.getPrefType(children[i]);
            if (type == nsIPrefBranch.PREF_STRING) {
                value = branch.getCharPref(children[i]);
            } else if (type == nsIPrefBranch.PREF_INT) {
                value =  branch.getIntPref(children[i]);
            } else if (type == nsIPrefBranch.PREF_BOOL) {
                value = branch.getBoolPref(children[i]);
            } else {
                continue;
            }
            values.push({'name': children[i], 'value': value});
        }
        return (values.length === 0 ? default_value : values);
    },

    /**
     * Set Preference.
     * @param {String} name preference name
     * @param {String} value preference value
     */
    setPref: function(name, value) {
        var nsIPrefBranch = Components.interfaces.nsIPrefBranch;
        var nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(nsIPrefBranch2);

        //Check if this is global firefox preference.
        var prefName;
        if ( name.indexOf("extensions.") !== -1) {
            prefName = name;
        } else {
            prefName = this.prefDomain + "." + name;
        }

        if (typeof value == "string") {
            prefs.setCharPref(prefName, value);
        } else if (typeof value == "number") {
            prefs.setIntPref(prefName, value);
        } else if (typeof value == "boolean") {
            prefs.setBoolPref(prefName, value);
        } else {
            prefs.setCharPref(prefName, value.toString());
        }
    },

    /**
     * Delete Preference with passed name.
     * @param {String} name name of preference to be deleted
     */
    deletePref: function(name) {
        var prefName;
        if (name.indexOf("extensions.") !== -1) {
            prefName = name;
        } else {
            prefName = this.prefDomain + "." + name;
        }
        if (prefName.indexOf("extensions.yslow.") === -1 && prefName.indexOf("extensions.firebug.yslow.") === -1) {
            // only delete yslow pref.
            return;
        }

        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var branch_name;
        var index = prefName.lastIndexOf(".");
        if (index !== -1) {
            var pref_name = prefName.substring(index+1);
            var branch = prefs.getBranch(prefName.substring(0, index+1));
            branch.deleteBranch(pref_name);
        }
    }

};
YSLOW.util.Preference.registerNative(YSLOW.firefox.Preference);

