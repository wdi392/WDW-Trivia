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
      { text: "What is 47 + 38?", options: ["75", "84", "85", "95"], correctIndex: 2 },
      { text: "What is 92 - 47?", options: ["35", "45", "55", "65"], correctIndex: 1 },
      { text: "What is 7 x 8?", options: ["54", "56", "58", "64"], correctIndex: 1 },
      { text: "What is 100 - 37?", options: ["63", "67", "73", "77"], correctIndex: 0 },
      { text: "Which word is an adverb?", options: ["Quickly", "Table", "Green", "Jump"], correctIndex: 0 },
      { text: "Which of these is a proper noun?", options: ["city", "Paris", "river", "ocean"], correctIndex: 1 },
      { text: "What is the plural of “child”?", options: ["Childs", "Childes", "Children", "Childrens"], correctIndex: 2 },
      { text: "Which word means the same as “enormous”?", options: ["Tiny", "Huge", "Quiet", "Fast"], correctIndex: 1 },
      { text: "What is the smallest continent?", options: ["Europe", "Australia", "Antarctica", "South America"], correctIndex: 1 },
      { text: "Which river is traditionally considered the longest in the world?", options: ["Amazon", "Nile", "Mississippi", "Yangtze"], correctIndex: 1 },
      { text: "How many continents are there?", options: ["5", "6", "7", "8"], correctIndex: 2 },
      { text: "What do you call an animal that eats only plants?", options: ["Carnivore", "Herbivore", "Omnivore", "Predator"], correctIndex: 1 },
      { text: "What is the center of an atom called?", options: ["Electron", "Proton", "Nucleus", "Neutron"], correctIndex: 2 },
      { text: "About how many bones are in the adult human body?", options: ["106", "166", "206", "306"], correctIndex: 2 },
      { text: "What gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], correctIndex: 2 },
    ],
  },
  {
    id: "round2",
    name: "Round 2: Upper Elementary (4th–5th Grade)",
    pointValue: 20,
    timeLimit: 30,
    wagering: false,
    questions: [
      { text: "What is 3/4 - 1/8?", options: ["5/8", "1/2", "3/8", "7/8"], correctIndex: 0 },
      { text: "Convert 7/10 to a decimal.", options: ["0.07", "0.7", "7.0", "0.17"], correctIndex: 1 },
      { text: "What is 2/3 x 3/4?", options: ["1/2", "2/7", "3/4", "5/12"], correctIndex: 0 },
      { text: "What is 15% of 60?", options: ["6", "9", "12", "15"], correctIndex: 1 },
      { text: "What is the capital of Illinois?", options: ["Chicago", "Springfield", "Peoria", "Rockford"], correctIndex: 1 },
      { text: "What is the capital of Florida?", options: ["Miami", "Orlando", "Tallahassee", "Jacksonville"], correctIndex: 2 },
      { text: "What is the capital of Washington State?", options: ["Seattle", "Spokane", "Olympia", "Tacoma"], correctIndex: 2 },
      { text: "Which type of rock forms from cooled lava or magma?", options: ["Sedimentary", "Igneous", "Metamorphic", "Mineral"], correctIndex: 1 },
      { text: "In the water cycle, what is it called when water turns into vapor?", options: ["Precipitation", "Condensation", "Evaporation", "Collection"], correctIndex: 2 },
      { text: "Which layer of the atmosphere do we live in?", options: ["Stratosphere", "Troposphere", "Mesosphere", "Thermosphere"], correctIndex: 1 },
      { text: "Who was president during the Louisiana Purchase?", options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "James Monroe"], correctIndex: 1 },
      { text: "In what year did the Constitutional Convention take place?", options: ["1776", "1783", "1787", "1791"], correctIndex: 2 },
      { text: "Which document begins with the words “We the People”?", options: ["Declaration of Independence", "US Constitution", "Bill of Rights", "Magna Carta"], correctIndex: 1 },
      { text: "What is the perimeter of a rectangle with length 9 and width 6?", options: ["15", "30", "54", "45"], correctIndex: 1 },
      { text: "Round 4,867 to the nearest hundred.", options: ["4,800", "4,900", "4,870", "5,000"], correctIndex: 1 },
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
      { text: "What is the square root of 1,024?", options: ["30", "32", "34", "36"], correctIndex: 1 },
      { text: "Which country has the most time zones, including its overseas territories?", options: ["Russia", "United States", "France", "China"], correctIndex: 2 },
      { text: "In Roman numerals, what year does “MCMXCIV” represent?", options: ["1894", "1944", "1994", "1984"], correctIndex: 2 },
    ],
  },
];

module.exports = { ROUNDS };
