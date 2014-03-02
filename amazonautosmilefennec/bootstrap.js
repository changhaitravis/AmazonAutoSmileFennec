const Cc = Components.classes;
const Ci = Components.interfaces;

var BrowserApp;

function onPageLoad(aEvent) {
  // the target is an HTMLDocument
  let doc = aEvent.originalTarget;
  let browser = BrowserApp.getBrowserForDocument(doc);
  let tab = BrowserApp.getTabForBrowser(browser);
  if(browser.currentURI.host == "www.amazon.com"){ 
  	var path = browser.currentURI.path;
  	BrowserApp.loadURI("smile.amazon.com" + path, browser);
  }
}

function addListener() {
  BrowserApp.deck.addEventListener('load', onPageLoad, true);
};

function loadIntoWindow(window) {
  if (!window)
    return;
  // Add any persistent UI elements
  // Perform any other initialization
	BrowserApp = window.BrowserApp;
	if(BrowserApp.deck) {
	// BrowserApp.deck (and maybe whole BrowserApp?) has been initialized
	addListener();
      }
      else {
	// use the chrome window to wait for BrowserApp to initialize
	window.addEventListener("UIReady", addListener);
      }

}

function unloadFromWindow(window) {
  if (!window)
    return;
  // Remove any persistent UI elements
  // Perform any other cleanup
	window.removeEventListener('load', onPageLoad, false);
}

var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function onLoad() {
      domWindow.removeEventListener("load", onLoad, false);
      loadIntoWindow(domWindow);
    }, false);
  },
 
  onCloseWindow: function(aWindow) {},
  onWindowTitleChange: function(aWindow, aTitle) {}
};

function startup(aData, aReason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Load into any existing windows
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN)
    return;

  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Stop listening for new windows
  wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}