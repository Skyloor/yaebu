// Простой модульный тест для мок‑реализации контракта Escrow на уровне
// приложения.  Проверяет корректность депонирования, выплаты и возврата
// средств.  Не является on‑chain тестом.
import assert from 'assert';

// In-memory mock of the Escrow contract.  See src/Escrow.tact for the on‑chain
// version.  These tests ensure the basic deposit, resolve and refund logic
// functions as expected on a high level.

class EscrowMock {
  admin: string;
  feeBps: number;
  player1: string | null = null;
  player2: string | null = null;
  pot = 0;
  state: 0 | 1 | 2 = 0;
  constructor(admin: string, feeBps = 100) {
    this.admin = admin;
    this.feeBps = feeBps;
  }
  deposit(sender: string, amount: number) {
    if (this.state !== 0) throw new Error('Escrow closed');
    if (!this.player1) {
      this.player1 = sender;
      this.pot = amount;
    } else if (!this.player2) {
      if (amount !== this.pot) throw new Error('Stake mismatch');
      this.player2 = sender;
      this.pot += amount;
    } else {
      throw new Error('Already full');
    }
  }
  resolve(winner: string): { payout: number; fee: number } {
    if (this.state !== 0) throw new Error('Escrow closed');
    if (winner !== this.player1 && winner !== this.player2) throw new Error('Unknown winner');
    const fee = Math.floor((this.pot * this.feeBps) / 10000);
    const payout = this.pot - fee;
    this.state = 1;
    this.pot = 0;
    return { payout, fee };
  }
  refund(): { p1: number; p2: number } {
    if (this.state !== 0) throw new Error('Escrow closed');
    let p1 = 0;
    let p2 = 0;
    if (this.player1 && this.player2) {
      p1 = Math.floor(this.pot / 2);
      p2 = this.pot - p1;
    } else if (this.player1) {
      p1 = this.pot;
    } else if (this.player2) {
      p2 = this.pot;
    }
    this.state = 2;
    this.pot = 0;
    return { p1, p2 };
  }
}

// Test deposit and resolve
(() => {
  const escrow = new EscrowMock('admin', 100);
  escrow.deposit('alice', 100);
  escrow.deposit('bob', 100);
  const { payout, fee } = escrow.resolve('alice');
  assert.equal(payout, 200 - 2);
  assert.equal(fee, 2);
})();

// Test refund
(() => {
  const escrow = new EscrowMock('admin', 100);
  escrow.deposit('alice', 50);
  escrow.deposit('bob', 50);
  const { p1, p2 } = escrow.refund();
  assert.equal(p1 + p2, 100);
})();