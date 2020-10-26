speechSynthesis.getVoices().forEach(function(voice) {
    console.log(voice.name, voice.default ? voice.default :'');
});

document.getElementById('speak').onclick = (e) => {
    speechSynthesis.getVoices().forEach(function(voice) {
        console.log(voice.name, voice.default ? voice.default :'');
    });
    
    var msg = new SpeechSynthesisUtterance();
    var voices = window.speechSynthesis.getVoices();
    msg.voice = voices[0]; 
    msg.volume = 1; // From 0 to 1
    msg.rate = 1; // From 0.1 to 10
    msg.pitch = 1; // From 0 to 2
    msg.text = "Leta efter en högljudd sida"; //"Hej och välkommen till Pellow";
    msg.lang = 'sv';
    speechSynthesis.speak(msg);
}
