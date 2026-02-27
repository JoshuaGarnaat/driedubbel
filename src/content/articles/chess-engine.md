---
title: "Coding a Chess Engine in C++"
description: "A practical guide to building a C++ chess engine covering bitboards move generation, evaluation and minimax search with alpha-beta pruning with tips and insights."
pubDate: "2026-02-27"
tags: ["C++", "Data Structures", "Algorithms", "Chess"]
---

## Introduction
Creating a chess engine from scratch in C++ is an interesting challenge. It combines thinking about algorithms, data structures and being a little creative. At its core a chess engine is a decision making tool. It looks at the state of the chessboard thinks about possible moves and chooses the move that gives it the best chance of winning while minimizing risks. Chess is a complex game with a huge number of possible positions approximately $10^{120}$. It is impossible to explore every possibility for modern supercomputers.

The key to building a chess engine is breaking down this problem into smaller manageable parts. This involves representing the board in a way generating legal moves quickly evaluating positions using a heuristic function and exploring potential moves with search algorithms like minimax, optimized with techniques like alpha-beta pruning. A C++ chess engine offers the balance between speed and control over memory making it ideal for implementing performance sensitive techniques like bitboards and recursive search.

## Representing the Board

One of the important decisions is how to represent the chessboard. One of the efficient ways is a bitboard, where each 64-bit integer represents the presence of a piece on the 8x8 board. Each bit corresponds to a square:

```
bit 0 -> a1, bit 1 -> b1... bit 63 -> h8
```

For example:

`uint64_t whitePawns`. Bits set to 1 wherever a white pawn exists.
`uint64_t blackKnights`. Bits set to 1 wherever a black knight exists.

Bitboards allow operations like move generation to be performed with bitwise operations:

```c++
uint64_t whitePawns = 0x000000000000FF00; // Pawns on rank 2
uint64_t singlePush = (whitePawns << 8) & emptySquares;
```

Here singlePush represents all possible one square forward moves for white pawns. Bit shifting makes movement calculations extremely fast compared to array based boards.

## Move Generation

Move generation is the core of the chess engine. Every turn the engine must know all moves. Using bitboards moves are generated efficiently for each piece:

`Pawns`: single push, double push, captures, en passant.
`Knights`: precomputed 64- attack masks.
`Bishops` `Rooks` `Queens`: sliding pieces require ray attacks along ranks, files and diagonals.
`King`: one square in each direction. Castling rights.

Sliding moves can be generated using bitboards, a clever hashing technique that turns occupancy into attack sets.

## Evaluation Function

A chess engine needs a way to determine which board positions are better. The evaluation function assigns a score to a position:

```c++
float evaluation = materialScore + positionalScore + mobility + kingSafety
```

- Material Score: Sum of pieces using standard weights (`Pawn=100`, `Knight/Bishop=320`, `Rook=500`, `Queen=900`).
- Positional Score: Square tables assign bonuses or penalties based on piece placement.
- Mobility: Number of moves available.
- King Safety: Checks for exposed king or pawn shield.

For example:

```c++
int evaluateMaterial(const Board &board) {
    int score = 0;
    score += 100 * (countBits(board.whitePawns) - CountBits(board.blackPawns));
    score += 320 * (countBits(board.whiteKnights) - CountBits(board.blackKnights));
    return score;
}
```

`countBits` uses a population count to count the number of set bits, which is highly efficient on modern CPUs.

## Search Algorithm

The engine explores moves using the minimax algorithm, which assumes both players play optimally:

```c++
float minimax(node, depth, maximizingPlayer) {
    if depth == 0 or node is terminal:
        return evaluate(node)
    if maximizingPlayer:
        maxEval = -INF
        for each child of node:
            eval = minimax(child, depth-1, false)
            maxEval = max(maxEval, eval)
        return maxEval
    else:
        minEval = INF
        for each child of node:
            eval = minimax(child, depth-1, true)
            minEval = min(minEval, eval)
        return minEval
}
```

To optimize alpha-beta pruning is applied, skipping branches that cannot influence the decision:

```c++
float minimax(node, depth, alpha, beta, maximizingPlayer) {
    if depth == 0 or node is terminal:
        return evaluate(node)
    if maximizingPlayer:
        maxEval = -INF
        for each child:
            eval = minimax(child, depth-1, alpha, beta, false)
            maxEval = max(maxEval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break // prune branch
        return maxEval
    else:
        minEval = INF
        for each child:
            eval = minimax(child, depth-1, alpha, beta, true)
            minEval = min(minEval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break // prune branch
        return minEval
}
```

## Move Ordering and Iterative Deepening

Move ordering improves pruning effectiveness. Captures, checks and promotions are evaluated first increasing the chance of cutoffs in alpha-beta pruning.

Iterative deepening repeatedly runs minimax with increasing depth:

```c++
for (int depth = 1; depth <= MAX_DEPTH; depth++) {
    auto bestMove = minimax(root, depth)
}
```

This allows the chess engine to return the available move even if time runs out and ensures better move ordering for deeper searches.

## Handling Special Rules

Chess has unique rules that make move generation more complex than simple piece movement. Handling these correctly is essential for a chess engine. Special moves include castling, en passant and pawn promotion, each requiring careful implementation.

#### Castling

Castling is a king move that also moves a rook. It is allowed if:

1. Neither the king nor the rook involved has moved yet.
2. All squares between the king and rook are empty.
3. The king is not currently in check and the squares it moves through are not under attack.

In a representation castling is handled by checking occupancy bits along the path and verifying that none of these squares are attacked by opponent pieces. Once validated the move simultaneously updates the king’s and rook’s bitboards.

```c++
bool canCastleKingSide(bool isWhite) {
    if (kingHasMoved[isWhite] || rookHasMoved[isWhite][H_FILE])
        return false;
    if (occupied & (squareF | squareG)) // squares between king and rook
        return false;
    if (isAttacked(squareE) || isAttacked(squareF) || isAttacked(squareG))
        return false;
    return true;
}
```

This ensures the chess engine only considers castling moves preventing illegal king exposures.

#### En Passant

En passant occurs when a pawn moves two squares forward from its starting position and lands beside an opponent’s pawn. The opponent can capture it as if it had moved one square.

To implement this:

- Track the square passed by the double-step pawn.
- When generating pawn captures allow en passant only if the target square matches this square.
- Update bitboards carefully to remove the captured pawn from its original square, not the destination square.

#### Pawn Promotion

When a pawn gets to the row it has to become a queen, rook, bishop or knight. Most chess engines automatically make it a queen because that piece is very powerful. Sometimes it might be better to make it something else.

In a chess engine that uses bitboards promotion works like this:

- Remove the pawn from its position.
- Add the new piece to its position.

```c++
if (move == enPassantTarget) {
    removePawn(capturedPawnSquare);
    movePawn(origin, destination);
}
```

We need to think about what happens when we make a pawn into something other than a queen like a rook, bishop or knight in our evaluation and move generation.

## Conclusion

Making a chess engine from scratch in C++ involves areas of computer science like data structures, algorithms and performance optimization. Bitboards help us represent the board in an efficient way. Minimax and alpha-beta pruning help the engine think ahead.

Evaluation functions can be simple or complex. We can always make them better. A basic evaluation that looks at the pieces can play okay. Adding more details makes it much better. We can also make the engine respond faster by using iterative deepening and move ordering.

There are ways to improve our engine:

- `Quiescence Search`: Look ahead more in positions that are changing fast.
- `Opening Book`: Store common openings so we don't have to recalculate them.
- `Endgame Tablebases`: Know exactly what to do in simple endgames.
- `Parallelization`: Use many cores to think deeper, in the same amount of time.

Building a chess engine is a way to practice programming and algorithm design. Every optimization and decision we make helps the engine play better and think faster.