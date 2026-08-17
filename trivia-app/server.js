const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { ROUNDS } = require("./questions");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ---------------- Game state (single in-memory game) ----------------
const game = {
  phase: "lobby", // lobby | wager | question | reveal | ended
  roundIndex: -1,
  questionIndex: -1,
  questionStartTime: null,
  players: new Map(), // socketId -> { id, name, score, connected, peekUsed, copyUsed }
  currentAnswers: new Map(), // socketId -> { optionIndex, locked, viaCopy, time }
  currentWagers: new Map(), // socketId -> amount
  autoTimer: null,
};

function currentRound() {
  return game.roundIndex >= 0 ? ROUNDS[game.roundIndex] : null;
}
function currentQuestion() {
  const round = currentRound();
  if (!round || game.questionIndex < 0) return null;
  return round.questions[game.questionIndex] || null;
}
function publicPlayerList() {
  return Array.from(game.players.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      peekUsed: p.peekUsed,
      copyUsed: p.copyUsed,
    }))
    .sort((a, b) => b.score - a.score);
}
function broadcastLobby() {
  io.to("players").emit("lobby:update", { players: publicPlayerList() });
  io.to("hosts").emit("lobby:update", { players: publicPlayerList() });
}
function broadcastHostState(extra = {}) {
  const round = currentRound();
  io.to("hosts").emit("host:state", {
    phase: game.phase,
    roundIndex: game.roundIndex,
    roundName: round ? round.name : null,
    wagering: round ? !!round.wagering : false,
    questionIndex: game.questionIndex,
    totalQuestionsInRound: round ? round.questions.length : 0,
    answeredCount: game.currentAnswers.size,
    wageredCount: game.currentWagers.size,
    totalPlayers: game.players.size,
    players: publicPlayerList(),
    totalRounds: ROUNDS.length,
    roundList: ROUNDS.map((r, i) => ({ index: i, name: r.name, questionCount: r.questions.length })),
    ...extra,
  });
}
function clearAutoTimer() {
  if (game.autoTimer) {
    clearTimeout(game.autoTimer);
    game.autoTimer = null;
  }
}

io.on("connection", (socket) => {
  socket.on("host:join", () => {
    socket.join("hosts");
    broadcastHostState();
  });

  socket.on("player:join", ({ name }) => {
    name = (name || "").toString().trim().slice(0, 24) || "Player";
    game.players.set(socket.id, {
      id: socket.id,
      name,
      score: 0,
      connected: true,
      peekUsed: false,
      copyUsed: false,
    });
    socket.join("players");
    socket.emit("player:joined", { id: socket.id, name });
    broadcastLobby();
    broadcastHostState();
  });

  socket.on("disconnect", () => {
    const p = game.players.get(socket.id);
    if (p) {
      p.connected = false;
      broadcastLobby();
      broadcastHostState();
    }
  });

  // ---- Host controls ----
  socket.on("host:startRound", ({ roundIndex }) => {
    if (roundIndex < 0 || roundIndex >= ROUNDS.length) return;
    game.roundIndex = roundIndex;
    game.questionIndex = -1;
    advanceQuestion();
  });

  socket.on("host:nextQuestion", () => {
    advanceQuestion();
  });

  socket.on("host:reveal", () => {
    if (game.phase === "wager") {
      startQuestionPhase();
    } else if (game.phase === "question") {
      revealNow();
    }
  });

  socket.on("host:endGame", () => {
    clearAutoTimer();
    game.phase = "ended";
    io.emit("game:end", { leaderboard: publicPlayerList() });
    broadcastHostState();
  });

  // ---- Player actions ----
  socket.on("player:answer", ({ optionIndex }) => {
    if (game.phase !== "question") return;
    const existing = game.currentAnswers.get(socket.id);
    if (existing && existing.locked) return;
    game.currentAnswers.set(socket.id, {
      optionIndex,
      locked: true,
      viaCopy: false,
      time: Date.now(),
    });
    socket.emit("answer:ack", { optionIndex });
    broadcastHostState();
  });

  socket.on("player:wager", ({ amount }) => {
    if (game.phase !== "wager") return;
    const player = game.players.get(socket.id);
    if (!player) return;
    const safeAmount = Math.max(0, Math.min(Math.floor(Number(amount)) || 0, player.score));
    game.currentWagers.set(socket.id, safeAmount);
    socket.emit("wager:ack", { amount: safeAmount });
    broadcastHostState();
  });

  socket.on("player:peek", () => {
    const player = game.players.get(socket.id);
    if (!player) return;
    if (player.peekUsed) {
      socket.emit("peek:result", { error: "You've already used your one Peek for the game." });
      return;
    }
    if (game.phase !== "question") {
      socket.emit("peek:result", { error: "Peek only works during a question." });
      return;
    }
    const candidates = Array.from(game.currentAnswers.entries()).filter(([id]) => id !== socket.id);
    if (candidates.length === 0) {
      socket.emit("peek:result", { error: "No one has answered yet — try again in a moment." });
      return;
    }
    const [targetId, targetAnswer] = candidates[Math.floor(Math.random() * candidates.length)];
    const targetPlayer = game.players.get(targetId);
    const q = currentQuestion();
    player.peekUsed = true;
    socket.emit("peek:result", {
      targetName: targetPlayer ? targetPlayer.name : "Someone",
      optionText: q.options[targetAnswer.optionIndex],
    });
    broadcastHostState();
  });

  socket.on("player:copy", () => {
    const player = game.players.get(socket.id);
    if (!player) return;
    if (player.copyUsed) {
      socket.emit("copy:result", { error: "You've already used your one Copy for the game." });
      return;
    }
    if (game.phase !== "question") {
      socket.emit("copy:result", { error: "Copy only works during a question." });
      return;
    }
    const existing = game.currentAnswers.get(socket.id);
    if (existing && existing.locked) {
      socket.emit("copy:result", { error: "You've already locked in an answer for this question." });
      return;
    }
    const candidates = Array.from(game.currentAnswers.entries()).filter(([id]) => id !== socket.id);
    if (candidates.length === 0) {
      socket.emit("copy:result", { error: "No one has answered yet — try again in a moment." });
      return;
    }
    const [targetId, targetAnswer] = candidates[Math.floor(Math.random() * candidates.length)];
    const targetPlayer = game.players.get(targetId);
    const q = currentQuestion();
    player.copyUsed = true;
    game.currentAnswers.set(socket.id, {
      optionIndex: targetAnswer.optionIndex,
      locked: true,
      viaCopy: true,
      time: Date.now(),
    });
    socket.emit("copy:result", {
      targetName: targetPlayer ? targetPlayer.name : "Someone",
      optionIndex: targetAnswer.optionIndex,
      optionText: q.options[targetAnswer.optionIndex],
    });
    broadcastHostState();
  });
});

function advanceQuestion() {
  clearAutoTimer();
  const round = currentRound();
  if (!round) return;
  game.questionIndex++;
  if (game.questionIndex >= round.questions.length) {
    game.phase = "lobby";
    io.emit("round:complete", { roundName: round.name, leaderboard: publicPlayerList() });
    broadcastHostState();
    return;
  }
  game.currentAnswers.clear();
  game.currentWagers.clear();

  if (round.wagering) {
    startWagerPhase();
  } else {
    startQuestionPhase();
  }
}

function startWagerPhase() {
  game.phase = "wager";
  const round = currentRound();
  game.questionStartTime = Date.now();
  const timeLimit = round.wagerTimeLimit || 20;

  for (const [socketId, player] of game.players.entries()) {
    const socketRef = io.sockets.sockets.get(socketId);
    if (socketRef) {
      socketRef.emit("wager:show", {
        roundName: round.name,
        questionNumber: game.questionIndex + 1,
        totalQuestions: round.questions.length,
        currentScore: player.score,
        timeLimit,
        startTime: game.questionStartTime,
      });
    }
  }
  broadcastHostState({ timeLimit, startTime: game.questionStartTime });
  game.autoTimer = setTimeout(() => startQuestionPhase(), timeLimit * 1000);
}

function startQuestionPhase() {
  clearAutoTimer();
  game.phase = "question";
  const round = currentRound();
  const q = currentQuestion();
  game.questionStartTime = Date.now();
  const timeLimit = round.timeLimit || 30;

  io.to("players").emit("question:show", {
    roundName: round.name,
    questionNumber: game.questionIndex + 1,
    totalQuestions: round.questions.length,
    text: q.text,
    options: q.options,
    timeLimit,
    startTime: game.questionStartTime,
    pointValue: round.wagering ? null : round.pointValue,
    wagering: !!round.wagering,
  });
  broadcastHostState({ questionText: q.text, options: q.options, timeLimit, pointValue: round.pointValue, startTime: game.questionStartTime });
  game.autoTimer = setTimeout(() => revealNow(), timeLimit * 1000);
}

function revealNow() {
  if (game.phase !== "question") return;
  clearAutoTimer();
  game.phase = "reveal";
  const round = currentRound();
  const q = currentQuestion();

  for (const [socketId, player] of game.players.entries()) {
    const ans = game.currentAnswers.get(socketId);
    const correct = !!ans && ans.optionIndex === q.correctIndex;
    let pointsChange = 0;
    if (round.wagering) {
      const wager = game.currentWagers.get(socketId) || 0;
      pointsChange = correct ? wager : -wager;
    } else {
      pointsChange = correct ? round.pointValue : 0;
    }
    player.score += pointsChange;

    const socketRef = io.sockets.sockets.get(socketId);
    if (socketRef) {
      socketRef.emit("reveal", {
        correctIndex: q.correctIndex,
        correctText: q.options[q.correctIndex],
        yourAnswerIndex: ans ? ans.optionIndex : null,
        correct,
        pointsChange,
        newScore: player.score,
      });
    }
  }

  io.to("hosts").emit("host:reveal", {
    correctIndex: q.correctIndex,
    correctText: q.options[q.correctIndex],
    leaderboard: publicPlayerList(),
  });
  broadcastHostState();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Trivia server running at http://localhost:${PORT}`);
  console.log(`Host console:  http://localhost:${PORT}/host.html`);
  console.log(`Player join:   http://localhost:${PORT}/`);
});
