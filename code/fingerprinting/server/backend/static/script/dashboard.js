function getCounters(callback) {
  $.get("/api/fp/counters", data => {
    console.log(data);
    if (callback) {
      callback(data);
    }
  });
}

function getKeyValues(key) {
  $.get("/api/fp/keys/" + key, data => {
    console.log(data);
    if (callback) {
      callback(data);
    }
  });
}

function getRandomFP(callback) {
  $.get("/api/fp/random", data => {
    console.log(data);
    if (callback) {
      callback(data);
    }
  });
}
function countFP(callback) {
    $.get("/api/fp/count", data => {
      console.log(data);
      if (callback) {
        callback(data);
      }
    });
  }
countFP(value => {
    $('#count').html(value)
})
getCounters(counters => {
    let content = ''
    for (let key in counters) {
        content += '<tr><td>' + key + '</td><td>' + counters[key] + '</td></tr>'
    }
    $('#keys').html(content)
})
getRandomFP(fp => {
    let content = '<table>'
    for (let key in fp.original) {
        if (key == '_id') {
            continue
        }
        if (key == 'canvas') {
            content += '<tr><td>' + key + '</td><td>' + fp.normalized[key] + '</td><td><img src="' + fp.original[key] + '"></td></tr>'
        } else {
            content += '<tr><td>' + key + '</td><td>' + fp.normalized[key] + '</td><td>' + fp.original[key] + '</td></tr>'
        }
    }
    $('#fp').html(content +  '</table>')
})