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

var currentDomain;
//
//browser.windows.getCurrent({populate:true}).then(function(thisWindow){
//	currentTabs = thisWindow.tabs;
//});

browser.storage.local.get(["current", "domains", "available"]).then(({current, domains, available: entries}) => {
	
	domains = domains || {};
	
	document.getElementById("panel-item-preferences").addEventListener("click", (event) => {
		//COMPAT: Firefox for Android
		if(typeof(browser.runtime.openOptionsPage) === "undefined") {
			browser.runtime.openOptionsPage();
			window.close();
		} else {
			browser.tabs.create({
				active: true,
				url:    browser.extension.getURL("content/options.html")
			}).then(window.close, console.exception);
		}
	});
	
	//Domain Select Change Handler
	var domainSelector = document.getElementbyName("selectDomain");
	var domainRemoveButton = document.getElementById("removeDomain");
	domainSelector.addEventListener("change", function() {
		if(!domainSelector.value){
			domainRemoveButton.setAttribute("disabled", "disabled");
		}else{
			domainRemoveButton.removeAttribute("disabled");
			currentDomain = domainSelector.value;
		}
	});
	
	//Remove button
	domainRemoveButton.addEventListener("click", (event) => {
		console.log("we're in!");
	});
	
	//+ Button
	document.getElementById("addNewDomain").addEventListener("click", (event) => {
		domains[document.getElementByName("newDomain")] = current
		browser.storage.local.set({
			"domains" : domains
		})
	});
	
	document.getElementById("ua_default").addEventListener("change", (event) => {
		// Special "Default" item selected
		browser.storage.local.set({
			"current": null
		}).then(window.close, console.exception);
	});
	
	let index = 1;
	let DOMAgentList = document.getElementById("agent-list");
	for(let entry of entries) {
		if(entry.type !== "user-agent") {
			continue;
		}
		
		let { label, string } = entry;
		let DOMAgentItem = document.createElement("div");
		DOMAgentItem.className = "panel-list-item";
		
		let DOMAgentRadio = document.createElement("input");
		DOMAgentRadio.type    = "radio";
		DOMAgentRadio.name    = "current";
		DOMAgentRadio.id      = `ua${index}`;
		DOMAgentRadio.checked = (string === current);
		DOMAgentRadio.dataset["string"] = string;
		DOMAgentItem.appendChild(DOMAgentRadio);
		
		let DOMAgentLabel = document.createElement("label");
		DOMAgentLabel.className   = "text";
		DOMAgentLabel.htmlFor     = `ua${index}`;
		DOMAgentLabel.textContent = label;
		DOMAgentItem.appendChild(DOMAgentLabel);
		
		DOMAgentList.appendChild(DOMAgentItem);
		
		DOMAgentRadio.addEventListener("change", (event) => {
			// Radio button with User-Agent selected (possibly through its label)
			current = event.target.dataset["string"];
			browser.storage.local.set({
				"current": current
			}).then(window.close, console.exception);
		});
		
		index++;
	}
}, console.exception);
