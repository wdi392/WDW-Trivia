// Question bank + round configuration for
// "Are You Smarter Than a 5th Grader?" — live trivia app

const ROUNDS = [
  {
    id: "round1",
    name: "Round 1: Elementary Essentials (1st–3rd Grade)",
    pointValue: 10,
    timeLimit: 30,
    wagering: false,
    questions: [
      { text: "What is 6 + 7?", options: ["11", "12", "13", "14"], correctIndex: 2 },
      { text: "Which word is a noun?", options: ["Run", "Quickly", "Dog", "Blue"], correctIndex: 2 },
      { text: "What continent is Egypt located on?", options: ["Asia", "Africa", "Europe", "South America"], correctIndex: 1 },
      { text: "What planet do we live on?", options: ["Mars", "Venus", "Earth", "Jupiter"], correctIndex: 2 },
      { text: "What is 15 - 9?", options: ["5", "6", "7", "8"], correctIndex: 1 },
      { text: "What is the opposite of “up”?", options: ["Down", "Left", "Over", "Under"], correctIndex: 0 },
      { text: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], correctIndex: 2 },
      { text: "How many legs does a spider have?", options: ["6", "8", "10", "4"], correctIndex: 1 },
      { text: "What is 4 x 5?", options: ["16", "20", "24", "25"], correctIndex: 1 },
      { text: "Which sentence is a question?", options: ["The cat is black.", "Run fast!", "Where is the cat?", "The cat sat."], correctIndex: 2 },
    ],
  },
  {
    id: "round2",
    name: "Round 2: Upper Elementary (4th–5th Grade)",
    pointValue: 20,
    timeLimit: 30,
    wagering: false,
    questions: [
      { text: "What is 1/2 + 1/4?", options: ["3/4", "2/6", "1/6", "3/8"], correctIndex: 0 },
      { text: "What is the capital of California?", options: ["Los Angeles", "San Francisco", "Sacramento", "San Diego"], correctIndex: 2 },
      { text: "What layer of the Earth are we standing on?", options: ["Core", "Mantle", "Crust", "Outer core"], correctIndex: 2 },
      { text: "Who wrote the Declaration of Independence?", options: ["Benjamin Franklin", "Thomas Jefferson", "John Adams", "James Madison"], correctIndex: 1 },
      { text: "Simplify 6/8 to lowest terms.", options: ["1/2", "3/4", "2/3", "4/5"], correctIndex: 1 },
      { text: "What is the capital of Texas?", options: ["Houston", "Dallas", "Austin", "San Antonio"], correctIndex: 2 },
      { text: "What causes tides on Earth?", options: ["The Sun's heat", "The Moon's gravity", "Wind", "Ocean currents"], correctIndex: 1 },
      { text: "In what year did the American Civil War end?", options: ["1861", "1865", "1870", "1900"], correctIndex: 1 },
      { text: "Which fraction is larger?", options: ["3/5", "5/8", "They are equal", "Cannot tell"], correctIndex: 1 },
      { text: "What is the capital of New York State?", options: ["New York City", "Buffalo", "Albany", "Rochester"], correctIndex: 2 },
    ],
  },
  {
    id: "bonus",
    name: "Bonus Round: The Stumper",
    pointValue: 30,
    timeLimit: 30,
    wagerTimeLimit: 20,
    wagering: true,
    questions: [
      { text: "What is the smallest prime number greater than 100?", options: ["101", "103", "105", "109"], correctIndex: 0 },
      { text: "Which element has the atomic number 79?", options: ["Silver", "Platinum", "Gold", "Lead"], correctIndex: 2 },
      { text: "The Treaty of Westphalia, which ended the Thirty Years' War, was signed in what year?", options: ["1588", "1648", "1701", "1815"], correctIndex: 1 },
    ],
  },
];

module.exports = { ROUNDS };
