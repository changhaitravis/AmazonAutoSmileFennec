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



class DOMEntriesBase {
	constructor(id) {
		this._DOMContainer = document.getElementById(id);
	}
	
	setVisible(visible) {
		this._DOMContainer.dataset["visible"] = Boolean.prototype.toString.call(visible);
	}
}


const ENTRIES_COLUMN_COUNT = 2;
const ENTRIES_COLUMN_NAMES = ["label", "string"];

class DOMEntriesTable extends DOMEntriesBase {
	constructor(entries) {
		super("entries-view-table");
		this._entries = entries;
		
		this._DOMTable = this._DOMContainer.querySelector("table > tbody");
	}
	
	/**
	 * Replace all currently displayed rows with a new batch generated from the current
	 * state of the stored `entries` object
	 */
	refresh() {
		// Remove all existing table rows
		while(this._DOMTable.hasChildNodes()) {
			this._DOMTable.removeChild(this._DOMTable.lastChild);
		}
		
		// Add table row for each item current part of the configuration
		for(let index = 0; index < this._entries.length; index++) {
			this.addBoundRow(index);
		}
		
		// Add special table row for a yet-to-be-created item
		this.addUnboundRow();
	}
	
	/**
	 * Render a new row for the given `rowIndex` in `entries`
	 *
	 * @returns {HTMLTrElement} The newly created row element
	 */
	addBoundRow(rowIndex) {
		if(this._entries[rowIndex].type !== "user-agent") {
			return null;
		}
		
		let DOMRow = document.createElement("tr");
		DOMRow.dataset["state"] = "bound";
		DOMRow.dataset["index"] = rowIndex.toString();
		
		for(let columnName of ENTRIES_COLUMN_NAMES) {
			this.addRowColumnField(DOMRow, columnName);
		}
		this.addRowColumnRemove(DOMRow);
		
		this._DOMTable.appendChild(DOMRow);
		return DOMRow;
	}
	
	/**
	 * Render a new row that can be used to add another row to `entries`
	 *
	 * @returns {HTMLTrElement} The newly created row element
	 */
	addUnboundRow() {
		let DOMRow = document.createElement("tr");
		DOMRow.dataset["state"] = "unbound";
		
		for(let columnName of ENTRIES_COLUMN_NAMES) {
			this.addRowColumnField(DOMRow, columnName);
		}
		
		this._DOMTable.appendChild(DOMRow);
		return DOMRow;
	}
	
	/**
	 * Add a currently unbound row to `entries` and add all remaining UI elements that set
	 * such a row apart from a bound row – thereby making it a bound row
	 *
	 * @returns {Number} Index of the newly created row
	 */
	upgradeUnboundRow(DOMRow) {
		let row = { "type": "user-agent" };
		for(let columnName of ENTRIES_COLUMN_NAMES) {
			row[columnName] = "";
		}
		let rowIndex = (this._entries.push(row) - 1);
		
		// Add remove button and index attribute to row
		DOMRow.dataset["index"] = rowIndex.toString();
		this.addRowColumnRemove(DOMRow);
		
		// Declare row to be bound to an entry of the extension options now
		DOMRow.dataset["state"] = "bound";
		
		return rowIndex;
	}
	
	/**
	 * Add column for textual data field to a row
	 *
	 * @returns {HTMLInputElement} The created text input field
	 */
	addRowColumnField(DOMRow, columnName) {
		let rowIndex = -1;
		if(DOMRow.dataset["state"] !== "unbound") {
			rowIndex = parseInt(DOMRow.dataset["index"]);
		}
		
		let DOMFieldCol = document.createElement("td");
		let DOMFieldItm = document.createElement("input");
		DOMFieldItm.type  = "text";
		DOMFieldItm.value = (rowIndex >= 0) ? this._entries[rowIndex][columnName] : "";
		DOMFieldCol.appendChild(DOMFieldItm);
		DOMRow.appendChild(DOMFieldCol);
		
		DOMFieldItm.addEventListener("change", (event) => {
			let DOMRow = event.target.parentNode.parentNode;
			let rowIndex;
			
			// Upgrade row if it is currently not bound to an entry in `entries`
			if(DOMRow.dataset["state"] === "unbound") {
				rowIndex = this.upgradeUnboundRow(DOMRow);
				
				// Add a new unbound row to table (so that users can create more rows)
				this.addUnboundRow();
			} else {
				rowIndex = parseInt(DOMRow.dataset["index"])
			}
			
			// Set new value
			this._entries[rowIndex][columnName] = event.target.value;
			
			// Save changes
			this._entries.store().then(() => {
				if(this._entries.changed) {
					document.body.setAttribute("data-entries-changed", "true");
				}
			}, console.exception);
		});
		
		return DOMFieldItm;
	}
	
	/**
	 * Add column for removing the row and its data
	 *
	 * @returns {HTMLButtonElement} The created button
	 */
	addRowColumnRemove(DOMRow) {
		let DOMRemoveCol = document.createElement("td");
		let DOMRemoveItm = document.createElement("button");
		DOMRemoveItm.textContent = "➖";
		DOMRemoveItm.title       = "Remove Item";
		DOMRemoveCol.appendChild(DOMRemoveItm);
		DOMRow.appendChild(DOMRemoveCol);
		
		DOMRemoveItm.addEventListener("click", (event) => {
			let DOMRow = event.target.parentNode.parentNode;
			
			// Remove entry row from storage
			let idx = parseInt(DOMRow.dataset["index"]);
			this._entries.splice(idx, 1);
			this._entries.store().then(() => {
				let DOMRowSibling = DOMRow.nextSibling;
				
				// Remove the entry's row from the table
				DOMRow.parentNode.removeChild(DOMRow);
				
				// Update the indices of all following entry rows in the table
				while(DOMRowSibling !== null) {
					let idx = parseInt(DOMRowSibling.dataset["index"]);
					if(!isNaN(idx)) {
						DOMRowSibling.dataset["index"] = (idx - 1).toString();
					}
					
					DOMRowSibling = DOMRowSibling.nextSibling;
				}
				
				if(this._entries.changed) {
					document.body.setAttribute("data-entries-changed", "true");
				}
			}, console.exception);
		});
		
		return DOMRemoveItm;
	}
}


class DOMEntriesText extends DOMEntriesBase {
	constructor(entries) {
		super("entries-view-text");
		this._parser = new TextEntryParser(entries);
		
		this._DOMTextarea  = this._DOMContainer.querySelector("textarea");
		this._DOMTextarea.addEventListener("change", (event) => {
			this._parser.parse(event.target.value);
			this._parser.entries.store().then(() => {
				if(this._parser.entries.changed) {
					document.body.setAttribute("data-entries-changed", "true");
				}
			}, console.exception);
		});
	}
	
	
	refresh() {
		this._DOMTextarea.value = this._parser.serialize();
	}
}



/**
 * Display and implement an interactive popup that confirms that all entries have been reset and
 * offers to undo this action
 */
function displayResetUndoPopup(refreshView, entries, previousEntries) {
	let DOMResetUndoPopup = document.getElementById("reset-undo-popup");
	DOMResetUndoPopup.style.visibility = "visible";
	DOMResetUndoPopup.style.opacity    = "1";
	
	
	let DOMResetUndoButton = DOMResetUndoPopup.querySelector("button");
	
	let resetUndoHandler = ((event) => {
		// Reset state of entries list
		entries.splice(0, entries.length);
		Array.prototype.push.apply(entries, previousEntries);
		
		// Remove all event listeners
		DOMResetUndoButton.removeEventListener("click", resetUndoHandler);
		document.body.removeEventListener("click", bodyClickHandler);
		
		// Save changes (should automatically mark entries as changed again)
		entries.store().then(() => {
			refreshView();
			
			// Fade-out popup
			DOMResetUndoPopup.style.opacity = "0";
			window.setTimeout(() => {
				DOMResetUndoPopup.style.visibility = "hidden";
			}, 500);
		});
	});
	
	let bodyClickHandler = ((event) => {
		// Don't do anything if click was somewhere within our popup
		for(let DOMNode = event.target; DOMNode !== null; DOMNode = DOMNode.parentNode) {
			if(DOMNode === DOMResetUndoPopup) {
				return;
			}
		}
		
		// Remove all event listeners
		DOMResetUndoButton.removeEventListener("click", resetUndoHandler);
		document.body.removeEventListener("click", bodyClickHandler);
		
		// Fade-out popup
		DOMResetUndoPopup.style.opacity = "0";
		window.setTimeout(() => {
			DOMResetUndoPopup.style.visibility = "hidden";
		}, 500);
	});
	
	DOMResetUndoButton.addEventListener("click", resetUndoHandler);
	document.body.addEventListener("click", bodyClickHandler);
}


document.addEventListener("DOMContentLoaded", () => {
	// Reloading the add-on while it add-on page is open often causes spurious errors
	// because the global `browser` object goes missing
	if(typeof(browser) === "undefined") {
		window.location.reload();
		return;
	}
	
	
	browser.storage.local.get(["available", "available-changed", "edit-mode"])
	.then(({ available, "available-changed": available_changed, "edit-mode": edit_mode}) => {
		let entries = StorageArray.fromArray("available", available, "available-changed");
		
		// Initialize all available views
		let views = {
			"table": new DOMEntriesTable(entries),
			"text":  new DOMEntriesText(entries)
		};
		
		let currentViewName = null;
		function changeView(viewName) {
			if(viewName !== currentViewName) {
				for(let name of Object.keys(views)) {
					if(name !== viewName) {
						views[name].setVisible(false);
					}
				}
			
				let view = views[viewName];
				view.setVisible(true);
				view.refresh();
			
				browser.storage.local.set({
					"edit-mode": viewName
				}).catch(console.exception);
				
				currentViewName = viewName;
			} else {
				views[viewName].refresh();
			}
		}
		
		function refreshView() {
			changeView(currentViewName);
			
			browser.storage.local.get("available-changed").then(({"available-changed": changed}) => {
				document.body.setAttribute("data-entries-changed", changed);
			});
		}
		
		// Show currently stored view
		changeView(edit_mode);
		document.body.setAttribute("data-entries-changed", available_changed);
		
		// Bind "change view" links
		document.querySelector("#entries-view-table > a.switch").addEventListener("click", (event) => {
			event.preventDefault();
			
			changeView("text");
		});
		document.querySelector("#entries-view-text > a.switch").addEventListener("click", (event) => {
			event.preventDefault();
			
			changeView("table");
		});
		
		for(let DOMResetLink of document.querySelectorAll("body > section > a.reset")) {
			DOMResetLink.addEventListener("click", (event) => {
				event.preventDefault();
				
				let previousEntries = entries.slice(0);
				fetch(browser.extension.getURL("../assets/user-agents.txt"))
					.then((response) => response.text())
					.then((content)  => {
						let parser = new TextEntryParser(entries);
						parser.parse(content);
						
						entries.markUnchanged();
						return browser.storage.local.set({
							"available":         entries,
							"available-changed": false
						});
					}).then(() => {
						refreshView();
						
						// Display popup with "Undo" link
						displayResetUndoPopup(refreshView, entries, previousEntries);
					});
			});
		}
	}, console.exception);
});
