function setupTypewriter(otps) {
  otps.element.innerHTML = "";

  var cursorPosition = 0,
    tag = "",
    writingTag = false,
    tagOpen = false,
    typeSpeed = 50,
    stop = false,
    tempTypeSpeed = 0;

  var type = function () {
    if (stop) {
      if (otps.callback) {
        otps.callback();
      }
      return;
    }
    if (writingTag === true) {
      tag += otps.html[cursorPosition];
    }

    if (otps.html[cursorPosition] === "<") {
      tempTypeSpeed = 0;
      if (tagOpen) {
        tagOpen = false;
        writingTag = true;
      } else {
        tag = "";
        tagOpen = true;
        writingTag = true;
        tag += otps.html[cursorPosition];
      }
    }
    if (!writingTag && tagOpen) {
      tag.innerHTML += otps.html[cursorPosition];
    }
    if (!writingTag && !tagOpen) {
      if (otps.html[cursorPosition] === " ") {
        tempTypeSpeed = 0;
      } else {
        tempTypeSpeed = Math.random() * typeSpeed;
      }
      otps.element.innerHTML += otps.html[cursorPosition];
    }
    if (writingTag === true && otps.html[cursorPosition] === ">") {
      tempTypeSpeed = Math.random() * typeSpeed;
      writingTag = false;
      if (tagOpen) {
        var newSpan = document.createElement("span");
        otps.element.appendChild(newSpan);
        newSpan.innerHTML = tag;
        tag = newSpan.firstChild;
      }
    }

    cursorPosition += 1;
    if (cursorPosition < otps.html.length - 1) {
      setTimeout(type, tempTypeSpeed);
    } else {
      if (otps.callback) {
        otps.callback();
      }
    }
  };

  return {
    type: type,
    stop: () => (stop = true),
  };
}
