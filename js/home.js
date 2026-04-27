const studyTips = [
  "Review your toughest course first while your energy is still high.",
  "Split long reading into 25-minute focus sessions and short breaks.",
  "Check attendance early so you never miss a required class."
];

const tipText = document.getElementById("home-tip-text");

if (tipText) {
  const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];
  tipText.textContent = randomTip;
}
