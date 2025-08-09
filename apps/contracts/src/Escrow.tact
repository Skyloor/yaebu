// SPDX-License-Identifier: MIT
//
// Простой контракт эскроу для двух игроков.  Игроки вносят одинаковую
// сумму TON на контракт.  Авторизованный посредник (backend игры) вызывает
// функцию resolve() с адресом победителя, чтобы отправить банк ему за
// вычетом комиссии (рейка) администратору.  Если матч не состоялся или
// истёк тайм‑аут, посредник вызывает refund() — депозиты возвращаются
// соответствующим игрокам.

import { Address, Builder, Slice } from "@ton/core";

contract Escrow {
    // Administrator that receives the rake.  Must be set at deployment.
    address admin;
    // Fee in basis points (1% = 100)
    int adminFeeBps;

    // Depositors
    address? player1;
    address? player2;
    // Total amount held in the pot (nanoTON)
    int pot;
    // Contract state: 0 = open, 1 = resolved, 2 = refunded
    int state;

    init(address admin_, int feeBps) {
        admin = admin_;
        adminFeeBps = feeBps;
        state = 0;
        pot = 0;
    }

    // Internal message: deposit.  The value sent with the message is added to
    // the pot.  Only two deposits are allowed and amounts must match.
    receive("deposit") {
        require(state == 0, "Escrow closed");
        let sender = msg.sender; // address of the depositor
        let value = msg.value;
        if (player1 == null) {
            player1 = sender;
            pot = value;
        } else if (player2 == null) {
            // Second deposit must match the first
            require(value == pot, "Stake mismatch");
            player2 = sender;
            pot += value;
        } else {
            throw("Already full");
        }
    }

    // Internal message: resolve.  Only the admin may call resolve, passing
    // winner address in the body.  Pays out pot minus fee to the winner and
    // fee to admin.
    receive("resolve", slice body) {
        require(msg.sender == admin, "Only admin");
        require(state == 0, "Already closed");
        // Parse winner address from body
        let winner = body.load_address();
        require(winner == player1? || winner == player2?, "Unknown winner");
        // Calculate fee and payout
        let fee = pot * adminFeeBps / 10000;
        let payout = pot - fee;
        // Send payout to winner
        send(winner, payout);
        // Send fee to admin
        send(admin, fee);
        pot = 0;
        state = 1;
    }

    // Internal message: refund.  Only the admin may call.  Refunds all deposits
    // to their respective players.  If only one deposit is present the entire
    // pot goes back to that player.
    receive("refund") {
        require(msg.sender == admin, "Only admin");
        require(state == 0, "Already closed");
        if (player1? != null && player2? != null) {
            // Split pot
            let half = pot / 2;
            send(player1?, half);
            send(player2?, pot - half);
        } else if (player1? != null) {
            send(player1?, pot);
        } else if (player2? != null) {
            send(player2?, pot);
        }
        pot = 0;
        state = 2;
    }
}