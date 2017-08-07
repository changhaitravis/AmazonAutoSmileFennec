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
        
        console.log(domains);
	
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
	var domainSelector = document.getElementsByName("selectDomain")[0];
        var domainRemoveButton = document.getElementById("removeDomain");
        
        currentDomain = domainSelector.value
        
        for (let domain in domains)
        {
            if(typeof domain === "string"){
                let option = document.createElement("option");
                option.text = domain;
                option.value = domain;
                domainSelector.add(option);
            }
        }
        
	
	domainSelector.addEventListener("change", function() {
            currentDomain = domainSelector.value;
            var toCheck;
            if(!currentDomain){
                domainRemoveButton.setAttribute("disabled", "disabled");
                console.log(current);
                toCheck = document.querySelector("[data-string='" + current + "']") || document.getElementById('ua_default');
            }else{
                domainRemoveButton.removeAttribute("disabled");
                toCheck = document.querySelector("[data-string='" + domains[currentDomain] + "']") || document.getElementById('ua_default');
            }
            toCheck.checked = true;
	});
	
	//Remove button
	domainRemoveButton.addEventListener("click", (event) => {
            delete domains[currentDomain];
            browser.storage.local.set({
                "domains" : domains
            }).then(() => {
                domainSelector.remove(domainSelector.selectedIndex);
                domainSelector.dispatchEvent(new Event("change"));
            });
	});
	
	//+ Button
	document.getElementById("addNewDomain").addEventListener("click", (event) => {
            let newDomain = document.getElementsByName("newDomain")[0].value.toLowerCase();
            if(newDomain && typeof newDomain === 'string'){
                domains[newDomain] = current;
                let option = document.createElement("option");
                option.text = newDomain;
                option.value = newDomain;
                domainSelector.add(option);
                domainSelector.value = newDomain;
                browser.storage.local.set({
                    "domains" : domains
                });
                domainSelector.dispatchEvent(new Event("change"));
            }
	});
	
	document.getElementById("ua_default").addEventListener("change", (event) => {
		// Special "Default" item selected
		setUA(null);
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
		DOMAgentRadio.checked = (string === domains[currentDomain] || string === current);
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
                    setUA(event.target.dataset["string"]);
		});
		
		index++;
	}
	
	function setUA(uaString){
            if(currentDomain){
                domains[currentDomain] = uaString;
                browser.storage.local.set({
                    "domains": domains
                }).then(window.close, console.exception);
            }else{
                current = uaString;
                browser.storage.local.set({
                    "current": current
                }).then(window.close, console.exception);
            }
        }
	
}, console.exception);
