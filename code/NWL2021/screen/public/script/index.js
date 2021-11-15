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

function hideAll() {
  clearCanvas();
  showAnswers(false);
  showResults(false);
  showQuestion(false);
  showDemo(false);
  showTimer(false);
}

game.onQuestionChange((question) => {
  if (!game.setup) return;

  updateQuestion(question);
});

game.onUpdate(() => {
  clearCanvas();
  game.hasChange = false;
  if (game.page == "demo") {
    renderDemo();
  } else if (game.page == "play") {
    renderGame();
  } else if (game.page == "question") {
    renderQuestion();
  } else if (game.page == "answer") {
    renderQuestion();
    renderAnswer();
  } else if (game.page == "results") {
    renderResults();
    console.log("render results")
  }
});

game.onPageChange((page) => {
  console.log("[PAGE]", "change", page);
  clearCanvas();
  hideAll();
  clearInterval(demoInterval);
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
      break;
  }
});
