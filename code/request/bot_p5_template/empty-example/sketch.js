let profile;

function preload() {
  // Load JSON profile
  let url = '../traces/bing01-12-2020:16:06/profile.json';
  profile = loadJSON(url);
  console.log(profile);
  parseProfile(profile);
}

function setup() {
}

function draw() {
  // put drawing code here
}

class Script {
  scriptId;
  url;
  numFunctions;
  scriptType;
  name;
  firstCalled; // the first time a function from this script is called
  // stats of calls from this function (this function is parent)
  numCallsWithinScript = 0;
  numCallsToOtherScript = 0;
  // stats of calls to this function
  numCalledFromOutsideScript = 0;
}

class FunctionCall {
  name;
  id;
  parent;
  scriptId;
  parentScriptId;
  withinScript = true;
  function_id;
  ts;
}

class Function {
  functionId; // a combination of the function name and the scriptId since function names can collide in different scripts
}


/// Parse the profile.json file into
/// - scripts
/// - functions
/// - function calls
function parseProfile(p) {
  let scripts = [];
  let functions = [];
  let functionCalls = [];

  for(js_call of p["nodes"]) {
    let functionCall = new FunctionCall();
    functionCall.id = js_call["id"];
    functionCall.name = js_call["callFrame"].functionName;
    functionCall.scriptId = js_call["callFrame"].scriptId;
    functionCalls.push(functionCall);
  }
  console.log(functionCalls);
}