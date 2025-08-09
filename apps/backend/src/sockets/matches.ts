// Регистрация namespace Socket.IO для матчей.  Клиенты вызывают
// `join(matchId)`, чтобы подписаться на события конкретного матча.
import { Server as IOServer, Socket } from 'socket.io';

/**
 * Register the Socket.IO namespaces and event handlers for match play.  Clients
 * should emit a `join` event with the match ID to subscribe to updates.  The
 * server broadcasts `move`, `commit` and `reveal` events when actions occur.
 */
export default function registerMatchSockets(io: IOServer) {
  io.on('connection', (socket: Socket) => {
    socket.on('join', (matchId: number) => {
      const room = `match_${matchId}`;
      socket.join(room);
    });
    socket.on('disconnect', () => {
      // Nothing to clean up for now
    });
  });
}