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
// Players are keyed by a stable "playerKey" derived from their name (not
// socket.id), so a refreshed page / dropped connection can reconnect and
// resume its score and place in the game instead of starting over.
const game = {
  phase: "lobby", // lobby | wager | question | reveal | ended
  roundIndex: -1,
  questionIndex: -1,
  questionStartTime: null,
  players: new Map(), // playerKey -> { id, name, score, connected, peekUsed, copyUsed, socketId, lastReveal }
  socketToPlayer: new Map(), // socket.id -> playerKey
  currentAnswers: new Map(), // playerKey -> { optionIndex, locked, viaCopy, time }
  currentWagers: new Map(), // playerKey -> amount
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
  const payload = { players: publicPlayerList() };
  io.to("players").emit("lobby:update", payload);
  io.to("hosts").emit("lobby:update", payload);
}
function broadcastHostState(extra = {}) {
  const round = currentRound();
  const payload = {
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
  };
  io.to("hosts").emit("host:state", payload);
}
function clearAutoTimer() {
  if (game.autoTimer) {
    clearTimeout(game.autoTimer);
    game.autoTimer = null;
  }
}
function playerKeyFor(name) {
  return name.toString().trim().toLowerCase().slice(0, 24);
}

// Bring a (re)connecting player's screen up to date with whatever is
// happening right now, so a refresh or dropped connection doesn't strand
// someone on the wrong screen.
function sendCurrentPhaseToSocket(socket, key) {
  const player = game.players.get(key);
  if (!player) return;
  const round = currentRound();

  if (game.phase === "wager" && round) {
    socket.emit("wager:show", {
      roundName: round.name,
      questionNumber: game.questionIndex + 1,
      totalQuestions: round.questions.length,
      currentScore: player.score,
      timeLimit: round.wagerTimeLimit || 20,
      startTime: game.questionStartTime,
    });
    const existingWager = game.currentWagers.get(key);
    if (existingWager !== undefined) {
      socket.emit("wager:ack", { amount: existingWager });
    }
  } else if (game.phase === "question" && round) {
    const q = currentQuestion();
    socket.emit("question:show", {
      roundName: round.name,
      questionNumber: game.questionIndex + 1,
      totalQuestions: round.questions.length,
      text: q.text,
      options: q.options,
      timeLimit: round.timeLimit || 30,
      startTime: game.questionStartTime,
      pointValue: round.wagering ? null : round.pointValue,
      wagering: !!round.wagering,
    });
    const existingAnswer = game.currentAnswers.get(key);
    if (existingAnswer) {
      socket.emit("answer:ack", { optionIndex: existingAnswer.optionIndex });
    }
  } else if (game.phase === "reveal" && player.lastReveal) {
    socket.emit("reveal", player.lastReveal);
  } else if (game.phase === "ended") {
    socket.emit("game:end", { leaderboard: publicPlayerList() });
  } else if (game.phase === "lobby" && round && !currentQuestion()) {
    // A round just finished and the host hasn't started the next one yet.
    socket.emit("round:complete", { roundName: round.name, leaderboard: publicPlayerList() });
  }
}

io.on("connection", (socket) => {
  socket.on("host:join", () => {
    socket.join("hosts");
    broadcastHostState();
  });

  socket.on("display:join", () => {
    // The room display gets the same read-only state stream as the host
    // console, just rendered differently — no control events are ever sent
    // back from this socket.
    socket.join("hosts");
    broadcastHostState();
  });

  socket.on("player:join", ({ name }) => {
    const displayName = (name || "").toString().trim().slice(0, 24) || "Player";
    const key = playerKeyFor(displayName);
    if (!key) return;

    const existing = game.players.get(key);
    if (existing && existing.connected && existing.socketId !== socket.id) {
      socket.emit("player:join:error", {
        message: "That name is already in use by someone currently playing. Try a nickname or an initial.",
      });
      return;
    }

    let player;
    let reconnected = false;
    if (existing) {
      existing.name = displayName;
      existing.connected = true;
      existing.socketId = socket.id;
      player = existing;
      reconnected = true;
    } else {
      player = {
        id: key,
        name: displayName,
        score: 0,
        connected: true,
        peekUsed: false,
        copyUsed: false,
        socketId: socket.id,
        lastReveal: null,
      };
      game.players.set(key, player);
    }
    game.socketToPlayer.set(socket.id, key);
    socket.join("players");
    socket.emit("player:joined", {
      id: key,
      name: player.name,
      score: player.score,
      reconnected,
      peekUsed: player.peekUsed,
      copyUsed: player.copyUsed,
    });
    broadcastLobby();
    broadcastHostState();
    sendCurrentPhaseToSocket(socket, key);
  });

  socket.on("disconnect", () => {
    const key = game.socketToPlayer.get(socket.id);
    if (!key) return;
    game.socketToPlayer.delete(socket.id);
    const p = game.players.get(key);
    if (p && p.socketId === socket.id) {
      p.connected = false;
      p.socketId = null;
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
    const key = game.socketToPlayer.get(socket.id);
    if (!key) return;
    const existing = game.currentAnswers.get(key);
    if (existing && existing.locked) return;
    game.currentAnswers.set(key, {
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
    const key = game.socketToPlayer.get(socket.id);
    const player = key && game.players.get(key);
    if (!player) return;
    const safeAmount = Math.max(0, Math.min(Math.floor(Number(amount)) || 0, player.score));
    game.currentWagers.set(key, safeAmount);
    socket.emit("wager:ack", { amount: safeAmount });
    broadcastHostState();
  });

  socket.on("player:peek", () => {
    const key = game.socketToPlayer.get(socket.id);
    const player = key && game.players.get(key);
    if (!player) return;
    if (player.peekUsed) {
      socket.emit("peek:result", { error: "You've already used your one Peek for the game." });
      return;
    }
    if (game.phase !== "question") {
      socket.emit("peek:result", { error: "Peek only works during a question." });
      return;
    }
    const candidates = Array.from(game.currentAnswers.entries()).filter(([k]) => k !== key);
    if (candidates.length === 0) {
      socket.emit("peek:result", { error: "No one has answered yet — try again in a moment." });
      return;
    }
    const [targetKey, targetAnswer] = candidates[Math.floor(Math.random() * candidates.length)];
    const targetPlayer = game.players.get(targetKey);
    const q = currentQuestion();
    player.peekUsed = true;
    socket.emit("peek:result", {
      targetName: targetPlayer ? targetPlayer.name : "Someone",
      optionText: q.options[targetAnswer.optionIndex],
    });
    broadcastHostState();
  });

  socket.on("player:copy", () => {
    const key = game.socketToPlayer.get(socket.id);
    const player = key && game.players.get(key);
    if (!player) return;
    if (player.copyUsed) {
      socket.emit("copy:result", { error: "You've already used your one Copy for the game." });
      return;
    }
    if (game.phase !== "question") {
      socket.emit("copy:result", { error: "Copy only works during a question." });
      return;
    }
    const existing = game.currentAnswers.get(key);
    if (existing && existing.locked) {
      socket.emit("copy:result", { error: "You've already locked in an answer for this question." });
      return;
    }
    const candidates = Array.from(game.currentAnswers.entries()).filter(([k]) => k !== key);
    if (candidates.length === 0) {
      socket.emit("copy:result", { error: "No one has answered yet — try again in a moment." });
      return;
    }
    const [targetKey, targetAnswer] = candidates[Math.floor(Math.random() * candidates.length)];
    const targetPlayer = game.players.get(targetKey);
    const q = currentQuestion();
    player.copyUsed = true;
    game.currentAnswers.set(key, {
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

  for (const player of game.players.values()) {
    const socketRef = player.socketId && io.sockets.sockets.get(player.socketId);
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

  for (const [key, player] of game.players.entries()) {
    const ans = game.currentAnswers.get(key);
    const correct = !!ans && ans.optionIndex === q.correctIndex;
    let pointsChange = 0;
    if (round.wagering) {
      const wager = game.currentWagers.get(key) || 0;
      pointsChange = correct ? wager : -wager;
    } else {
      pointsChange = correct ? round.pointValue : 0;
    }
    player.score += pointsChange;

    const revealPayload = {
      correctIndex: q.correctIndex,
      correctText: q.options[q.correctIndex],
      yourAnswerIndex: ans ? ans.optionIndex : null,
      correct,
      pointsChange,
      newScore: player.score,
    };
    player.lastReveal = revealPayload; // so a reconnect during 'reveal' can catch up

    const socketRef = player.socketId && io.sockets.sockets.get(player.socketId);
    if (socketRef) {
      socketRef.emit("reveal", revealPayload);
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
  console.log(`Room display:  http://localhost:${PORT}/display.html`);
  console.log(`Player join:   http://localhost:${PORT}/`);
});
