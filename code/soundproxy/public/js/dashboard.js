let samples = []
function getSamples() {
    $.get('/api/samples', (data) => {
        samples = data;
    })
}

let users = []
function getUsers(callback) {
    $.get('/api/users', (data) => {
        users = data;
        renderUsers();
        if (callback) {
            console.log(callback)
            callback()
        }
    })
}
function renderUsers() {
    let content = ''
    for (let user of users) {
        content += '<li class="list-group-item  d-flex justify-content-between align-items-center">' + user.name + ' ' + '(' + user.ip + ')' + '<span class="">' + humanFileSize(user.len) + '</span><span class="badge badge-primary badge-pill">' + user.package + '</span></li>'
    }
    $("#connected_users").html(content)
}
function getInterface() {
    $.get('/api/interface', (data) => {
        $("#interface").val(data)
    })
}
function changeInterface() {
    if ($("#interface").val() == '') {
        return;
    }
    const data = {
        interface: $("#interface").val()
    }
    $.ajax({
        url: "/api/interface",
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
    }).done(() => {
        getInterface()
        getStatus();
    })
}

let speakers = []
function getSpeakers() {
    $.get('/api/speakers', (data) => {
        speakers = data;
        $("#nb_speaker").val(data.length)
        renderSpeaker()
    })
}
function deleteSpeaker(id) {
    $.ajax({
        url: '/api/speaker/' + id,
        type: 'DELETE'
    }).done(() => {
        getSpeakers();
    })
}

function updateUser(speaker, value) {
    $.post('/api/speaker/' + speaker + '/user/' + value, () => {
        console.log('Success')
    })
}
function renderSpeaker() {
    let content = ''
    for (let i in speakers) {
        const speaker = speakers[i]
        content += '<li class="list-group-item d-flex justify-content-between align-items-center">\
        <div class="col-md-5 m-0 p-0 speaker-id">\
            ' + speaker.id + '\
        </div>\
        <div class="form-group col-md-3 m-0 p-0">\
            <select id="inputState" class="form-control" onchange="updateUser(\'' + speaker.id + '\', this.value);">\
                <option ' + (speaker.user != null? '': 'selected') + ' value="null">None</option>';
        for (let user of users) {
            let selected = ''
            if (speaker.user == user.mac) {
                selected = ' selected'
            }
            content += '<option value="' + user.mac + '"' + selected + '>' + user.name + ' ' + '(' + user.ip + ')</option>'
        }
        content += '\
            </select>\
        </div>\
        <div class="form-group col-md-3 m-0 pl-2 p-0">\
            <div class="input-group">\
                <select class="custom-select">';
                for (let i of samples) {
                    content += '<option value="' + i + '"> ' + i + '</option>'
                }
                content += '\
                </select>\
                <div class="input-group-append">\
                    <button class="btn btn-outline-secondary play-button" type="button" onclick="play(this);">Play</button>\
                </div>\
            </div>\
        </div>\
        <button class="btn btn-outline-danger col-md-1 ml-2" type="button" onclick="deleteSpeaker(\'' + speaker.id + '\');">Delete</button>\
    </li>'
    }
    $("#speakers").html(content)
}

function getOSC() {
    $.get('/api/osc', (data) => {
        $("#osc_ip").val(data.config.ip)
        $("#osc_port").val(data.config.port)
        $("#osc_address").val(data.config.address)
        $("#osc_server_port").val(data.config.server_port)

        for (let v of data.values) {

        }
        let content = ''
        for (let v of data.values) {
            content += '<li class="list-group-item  d-flex justify-content-between align-items-center">' + v + '</span></li>'
        }
        $("#osc_values").html(content)
    })
}
function changeOSC() {
    const data = {}
    data.ip = $("#osc_ip").val()
    data.port = $("#osc_port").val()
    data.address = $("#osc_address").val()
    data.server_port = $("#osc_server_port").val()
    $.ajax({
        url: "/api/osc",
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
    }).done(() => {
        getOSC();
        getStatus();
    })
}

function getStatus(callback) {
    $.get('/api/status', (data) => {
        if (callback) {
            callback(data)
        }
        if (data.osc) {
            $("#osc_stop").show()
            $("#osc_start").hide()
        } else {
            $("#osc_start").show()
            $("#osc_stop").hide()
        }
        if (data.sniffing) {
            $("#sniffing_stop").show()
            $("#sniffing_start").hide()
        } else {
            $("#sniffing_start").show()
            $("#sniffing_stop").hide()
        }

        if (data.record) {
            $("#stop_sample").show()
            $("#record_sample").hide()
        } else {
            $("#record_sample").show()
            $("#stop_sample").hide()
        }
        if (data.play) {
            $('.play-button').text('Pause')
        } else {
            $('.play-button').text('Play')
        }
    })
}

function attackEvent(id, func) { 
    let changeTimeout = null;
    $("#" + id).change(() => {
        clearTimeout(changeTimeout)
        changeTimeout = setTimeout(() => {
            func()
        }, 350);
    })
}

function startSniffing(callback) {
    $.post('/api/sniffing/start', (err) => {
        console.log(err)
        if (callback) {
            callback();
        }
    })
}
function stopSniffing(callback) {
    $.post('/api/sniffing/stop', (err) => {
        console.log(err)
        if (callback) {
            callback();
        }
    })
}


function startOSC(callback) {
    $.post('/api/osc/start', (err) => {
        console.log(err)
        if (callback) {
            callback();
        }
    })
}
function stopOSC(callback) {
    $.post('/api/osc/stop', (err) => {
        console.log(err)
        if (callback) {
            callback();
        }
    })
}


function sendSampleCommand(action, data, callback) {
    $.ajax({
        url: "/api/sample/" + action,
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
    }).done(() => {
        callback();
    })
}
function recordSample() {
    getStatus((status) => {
        let action = 'record'
        if (status.record) {
            action = 'save'
        }
        if (!status.sniffing) {
            startSniffing(() => {
                sendSampleCommand(action, {name: $("#sample_name").val()}, () => {
                    getStatus()
                })
            })
        } else {
            sendSampleCommand(action, {name: $("#sample_name").val()}, () => {
                getStatus()
            })
        }
    });
}

function play(element) {
    const speaker = element.parentElement.parentNode.parentNode.parentNode;
    const sampleSelect = element.parentElement.parentNode.parentNode.querySelector("select")
    const sample = sampleSelect.options[sampleSelect.selectedIndex].value;
    const speakerId = speaker.querySelector(".speaker-id").innerText

    if (element.innerText == 'Play') {
        sendSampleCommand('play', {speaker: speakerId, sample}, () => {
            getStatus();
            getSpeakers()
        })
    } else {
        sendSampleCommand('stop', {speaker: speakerId, sample}, () => {
            getStatus();
            getSpeakers()
        })
    }
}

$(document).ready(() => {
    getStatus();
    getSamples();
    getUsers(() => {
        getSpeakers();
    });
    getInterface()
    getOSC();
    setInterval(getUsers, 1500)
    setInterval(getStatus, 500)

    attackEvent('interface', changeInterface)

    attackEvent('osc_ip', changeOSC)
    attackEvent('osc_port', changeOSC)
    attackEvent('osc_server_port', changeOSC)
    attackEvent('osc_address', changeOSC)

    $("#add_speaker").click(() => {
        if ($("#new_speaker_id").val() == '') {
            return;
        }
        $.ajax({
            url: "/api/speaker",
            type: 'POST',
            data: JSON.stringify({id: $("#new_speaker_id").val()}),
            contentType: 'application/json; charset=utf-8',
        }).done(() => {
            $("#new_speaker_id").val('')
            getSpeakers()
        })
    })

    $("#sniffing_start").click(() => {
        startSniffing(() => {
            getStatus();
        });
    })

    $("#sniffing_stop").click(() => {
        stopSniffing(() => {
            getStatus();
        });
    })

    $("#osc_start").click(() => {
        startOSC(() => {
            getStatus();
        });
    })

    $("#osc_stop").click(() => {
        stopOSC(() => {
            getStatus();
        });
    })

    $("#record_sample").click(() => {
        recordSample();
    });
})

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}