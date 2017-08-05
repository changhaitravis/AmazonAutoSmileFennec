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
 * Simple parser for the `user-agents.txt` text format
 */
class TextEntryParser {
	constructor(entries=[]) {
		this.entries = entries;
	}
	
	/**
	 * Parse the given file `text` content and add its user-agent entries to the `entries` list
	 *
	 * Unless `append` is set to true this will replace the current entries list instead of
	 * adding to it.
	 *
	 * @returns {Array} `this.entries`
	 */
	parse(text, append=false) {
		if(!append) {
			// Clear current user-agent list entries
			this.entries.splice(0, this.entries.length);
		}
		
		for(let line of text.split("\n")) {
			line = line.trim();
			
			let offset = line.indexOf(":");
			if(line.length < 1) {
				// Empty line
				this.entries.push({
					"type": "empty"
				});
			} else if(line.startsWith("#")) {
				// Comment line
				this.entries.push({
					"type": "comment",
					
					"text": line.substring(1)
				});
			} else if(offset < 0) {
				// Invalid line
				this.entries.push({
					"type": "invalid",
					
					"text": line
				});
			} else {
				// User-Agent string entry line
				this.entries.push({
					"type": "user-agent",
					
					"label":  decodeURIComponent(line.substring(0, offset)).trim(),
					"string": line.substring(offset + 1).trim()
				});
			}
		}
		
		return this.entries;
	}
	
	/**
	 * Serialize the current `entries` list as human-readable text
	 *
	 * @returns {String}
	 */
	serialize() {
		let text = [];
		for(let entry of this.entries) {
			switch(entry.type) {
				case "empty":
				break;
				
				case "comment":
					text.push("#", entry.text);
				break;
				
				case "invalid":
					text.push(entry.text);
				break;
				
				case "user-agent":
					text.push(entry.label.replace(":", "%3A"), ": ", entry.string);
				break;
			}
			
			text.push("\n");
		}
		text.pop();
		
		return text.join("");
	}
}


/**
 * Sub-class of `Array` that can be loaded from and written to the add-on options storage
 *
 * Automatically tracks whether the actual value has changed from the initial state
 * using a non-cryptographic hash function.
 */
class StorageArray extends Array {
	constructor(name, name_changed) {
		super(0);
		
		this._name_array   = name;
		this._name_changed = name_changed;
		
		this._original_hash = 2914; // .hashCode() of `[]`
	}
	
	static fromArray(name, data, name_changed) {
		let self = new StorageArray(name, name_changed);
		Array.prototype.push.apply(self, data);
		self.markUnchanged();
		return self;
	}
	
	static load(name, name_changed) {
		return browser.storage.local.get(name).then((result) => {
			return StorageArray.fromArray(name, result[name], name_changed);
		});
	}
	
	/**
	 * Producing a relatively unique integer value that changes based on
	 * current contents of this Array
	 */
	hashCode() {
		// Based on: http://stackoverflow.com/a/7616484/277882
		let string = JSON.stringify(this);
		let hash   = 0;
		if(string.length === 0) {
			return hash;
		}
		
		for(let i = 0; i < string.length; i++) {
			let chr = string.charCodeAt(i);
			
			hash  = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		
		return hash;
	}
	
	
	/**
	 * Recalculate what is considered the current, unchanged value of this Array
	 */
	markUnchanged() {
		this._original_hash = this.hashCode();
	}
	
	/**
	 * Whether the current value of this array is different from the initial value
	 */
	get changed() {
		return (this._original_hash !== this.hashCode());
	}
	
	store() {
		let values = new Object();
		values[this._name_array] = this;
		
		if(this.changed) {
			values[this._name_changed] = true;
		}
		
		return browser.storage.local.set(values);
	}
}
