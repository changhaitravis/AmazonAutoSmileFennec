/*
 * User Agent Changer
 * Copyright © 2017  Alexander Schlarb
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";


/**
 * Default values for all options
 *
 * Defined here so that they are instantly available until the actual value can be loaded from
 * storage.
 */
const OPTIONS_DEFAULT = {
	"current": null,
	"domains": {},
	"available":         null,
	"available-changed": false,
	"edit-mode": "table"
};


/**
 * Track current add-on options, so that their are always available when resolving a request
 */
// Start with the default options
let options = Object.assign({}, OPTIONS_DEFAULT);

Promise.resolve().then(() => {
	// Load all currently set options from storage
	return browser.storage.local.get();
}).then((result) => {
	// Update the default options with the real ones loaded from storage
	Object.assign(options, result);
	
	// Read default list of available user agents from file if none was found in storage or the user
	// has never edited it (so they will automatically stay up-to-date unless they change something)
	if(!options["available"] || !options["available-changed"]) {
		return fetch(browser.extension.getURL("assets/user-agents.txt"))
				.then((response) => response.text())
				.then((content)  => {
					let parser = new TextEntryParser();
					options["available"] = parser.parse(content);
				});
	}
}).then(() => {
	// Write back the final option list so that the defaults are properly displayed on the
	// options page as well
	return browser.storage.local.set(options);
}).then(() => {
	// Keep track of new developments in option land
	browser.storage.onChanged.addListener((changes, areaName) => {
		if(areaName !== "local") {
			return;
		}
		
		// Apply change
		for(let name of Object.keys(changes)) {
			options[name] = changes[name].newValue;
		}
	});
	
	// (Possibly) enable the request listener already
	updateProcessingStatus(Object.keys(options["domains"]).length > 0 || typeof(options["current"]) === "string");
	updateUserInterface(options["current"]);
	
	// Done setting up options
}).catch(console.exception);



/***************/
/* HTTP Header */
/***************/

/**
 * Callback function for processing about-to-be-sent blocking requests and
 * modifying their "User-Agent"-header based on the current options
 */
function requestListener(request) {
	let useragent = getUserAgentForUrl(request.url);
        
	if(typeof useragent === "string") {
		for(var header of request.requestHeaders) {
			if(header.name.toLowerCase() === "user-agent") {
				header.value = useragent;
                                //console.log("requestListener using: " + useragent + " for " + request.url);
			}
		}
	}
	
	return {
		requestHeaders: request.requestHeaders
	};
}



/**************/
/* JavaScript */
/**************/

/**
 * Callback function for modifying a tab's `navigator.userAgent` object based
 * on the current options
 */
function tabListener(tabId, changeInfo, tab) {
	let useragent = getUserAgentForUrl(tab.url);
        
	if(typeof(useragent === "string") && changeInfo["status"] === "loading") {
                //console.log("tabListener using: " + useragent + " for " + tab.url);
		browser.tabs.executeScript(tabId, {
			"allFrames": true,
			"runAt":     "document_start",
			"code": `void(
				Object.defineProperty(window.navigator.wrappedJSObject, "userAgent", {
					enumerable: true,
					value:      decodeURIComponent("${encodeURIComponent(useragent)}")
				})
			)`
		});
	}
}

function getUserAgentForUrl(url){
	let hostname = url.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i)[1] || "";
	while(!options["domains"][hostname] && hostname.indexOf(".") !== -1){
		let domainParts = hostname.split(".");
		domainParts.shift();
		hostname = domainParts.join(".");
	}
	
	return options["domains"][hostname] || options["current"];
}

/********************************
 * Orchestration and GUI tweaks *
 ********************************/

function generateIconBadgeText(userAgent) {
	// No text if disabled
	if(typeof(userAgent) !== "string") {
		return "";
	}
	
	// Lookup human-readable label for current UA string
	let entryLabel = null;
	for(let entry of options["available"]) {
		if(entry.type === "user-agent" && entry.string === userAgent) {
			entryLabel = entry.label;
			break;
		}
	}
	
	if(typeof(entryLabel) !== "string") {
		return "";
	}
	
	// Vary based on label style
	if(entryLabel.includes("/")) {
		// Style used by the default list: <OS> / <Browser> => O/B
		return entryLabel.split("/", 2).map((s) => s.trim().substr(0,1)).join("/").toUpperCase();
	} else if(entryLabel.includes(" ")) {
		// More than one word: <One> <Two> <Three> => OTT
		return entryLabel.split(/\s+/g, 3).map((s) => s.substr(0,1)).join("").toUpperCase();
	} else {
		// Just one word: <Word> => WO
		return entryLabel.substr(0, 2).toUpperCase();
	}
}

function generateIconTitle(userAgent) {
	let titleMsgID = "icon_title_" + (typeof(userAgent) === "string" ? "enabled" : "disabled");
	
	let title = browser.runtime.getManifest().name + " – " + browser.i18n.getMessage(titleMsgID);
	if(typeof(userAgent) === "string") {
		title += " (" + generateIconBadgeText(userAgent) + ")";
	}
	return title;
}

/**
 * Update the extension icon, title & badge based on the current settings
 */
function updateUserInterface(userAgent) {
	//COMPAT: Firefox for Android 54-
	if(typeof(browser.browserAction) === "undefined") {
		return;
	}
	
	// Update text
	browser.browserAction.setTitle({ title: generateIconTitle(userAgent) });
	
	// Update icon
	if(typeof(userAgent) === "string") {
		// Colored icon
		//COMPAT: Firefox for Android 55+
		if(typeof(browser.browserAction.setIcon) !== "undefined") {
			browser.browserAction.setIcon({ path: "assets/icon.svg" });
		}
	} else {
		// Grayscale icon, "disabled" text
		//COMPAT: Firefox for Android 55+
		if(typeof(browser.browserAction.setIcon) !== "undefined") {
			browser.browserAction.setIcon({ path: "assets/icon-disabled.svg" });
		}
	}
	
	// Update badge
	//COMPAT: Firefox for Android
	if(typeof(browser.browserAction.setBadgeText)            !== "undefined"
	&& typeof(browser.browserAction.setBadgeBackgroundColor) !== "undefined") {
		browser.browserAction.setBadgeText({ text: generateIconBadgeText(userAgent) });
		browser.browserAction.setBadgeBackgroundColor({ color: "darkgray" });
	}
}

/**
 * Start or stop the HTTP header and JavaScript modifications
 */
let processingEnabled = false;
function updateProcessingStatus(enable) {
	if(!processingEnabled && enable) {
		processingEnabled = true;
		browser.webRequest.onBeforeSendHeaders.addListener(
                    requestListener,
                    {urls: ["<all_urls>"]},
                    ["blocking", "requestHeaders"]
		);
		browser.tabs.onUpdated.addListener(tabListener);
	} else if(processingEnabled && !enable) {
		browser.tabs.onUpdated.removeListener(tabListener);
		browser.webRequest.onBeforeSendHeaders.removeListener(requestListener);
		processingEnabled = false;
	}
}

// Monitor options for changes to the request processing setting
browser.storage.onChanged.addListener((changes, areaName) => {
	for(let name of Object.keys(changes)) {
            if(areaName === "local" && name === "current") {
                updateUserInterface(changes[name].newValue);
            }
	}
});


/*************************************************
 * Browser action workarounds for Firefox Mobile *
 *************************************************/
//COMPAT: Firefox for Android 54-
if(typeof(browser.browserAction) === "undefined") {
	// This is required because the Firefox for Android does not currently support any kind of
	// user interaction except for a broken version of "page actions" (that are not actually page
	// specific) and notification popups. 
	// Note that the parameter is currently ignored on Firefox for Android (usually passing in a tab
	// ID would be required) and hence the "page action" actually becomes a browser action.
	browser.pageAction.show(1);

//COMPAT: Firefox for Android 55+ (This could otherwise be set in the manifest.)
} else {
	updateUserInterface(null);
	
	let popupURL = browser.extension.getURL("content/popup.html");
	if(typeof(browser.browserAction.setPopup) !== "undefined") {
		browser.browserAction.setPopup({
			popup: popupURL
		});
	} else {
		browser.browserAction.onClicked.addListener((tab) => {
			browser.tabs.create({
				active: true,
				url:    popupURL
			}).catch(console.exception);
		});
	}
}
