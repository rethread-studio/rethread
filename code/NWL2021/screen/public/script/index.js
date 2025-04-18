function showAnswers(_show) {
  const answerE1 = document.querySelector(".answer1");
  const answerE2 = document.querySelector(".answer2");
  answerE1.style.display = _show ? null : "none";
  answerE2.style.display = _show ? null : "none";
}

function showResults(_show) {
  const results = document.querySelector(".result");
  results.style.display = _show ? null : "none";
}

function showQuestion(_show) {
  const results = document.querySelector(".question");
  results.style.display = _show ? null : "none";
}

function showDemo(_show) {
  const results = document.querySelector(".demo");
  results.style.display = _show ? null : "none";
}

function showTimer(_show) {
  const results = document.querySelector(".timer");
  results.style.display = _show ? null : "none";
}

function showVideo(_show) {
  const video = document.getElementById("videoPlayer");
  video.style.display = _show ? null : "none";
}

function hideAll() {
  clearCanvas();
  showAnswers(false);
  showResults(false);
  showQuestion(false);
  showDemo(false);
  showTimer(false);
  showVideo(false);
  videoPlay(false);
}

game.onQuestionChange((question) => {
  if (!game.setup) return;

  updateQuestion(question);
});

function render() {
  clearCanvas();
  game.hasChange = false;
  // game.page = "results";//delete
  // renderQuestion();//delete

  if (game.page == "demo") {
    renderDemo();
  } else if (game.page == "play") {
    renderGlitch();
    renderGame();
  } else if (game.page == "question") {
    // renderQuestionDecoration();
    renderQuestion();
  } else if (game.page == "answer") {
    renderQuestion();
    renderAnswer();
  } else if (game.page == "results") {
    renderResults();
  }
  window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);

// game.onUpdate(() => {
//   window.requestAnimationFrame(render);
// });

game.onPageChange((page) => {
  console.log("[PAGE]", "change", page);
  clearCanvas();
  clearGlitchCanvas();
  // page = "results";//delete
  hideAll();
  clearInterval(demoInterval);
  // showResults(true);//delete
  switch (page) {
    case "demo":
      displayDemo();
      showDemo(true);
      break;
    case "play":
      updateQuestion(game.question);
      showQuestion(true);
      showAnswers(true);
      showTimer(true);
      break;
    case "question":
      showQuestion(true);
      break;
    case "results":
      showResults(true);
      openResults();
      break;
  }
});
