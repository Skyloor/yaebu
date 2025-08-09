export type GameType = 'rps' | 'durak' | 'checkers' | 'chess';

export enum RoomStatus {
  WAITING = 'WAITING',
  FULL = 'FULL',
  IN_GAME = 'IN_GAME',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export interface User {
  id: number;
  tgId: number;
  username?: string;
  lang: 'ru' | 'en';
  createdAt: string;
}

export interface Wallet {
  id: number;
  userId: number;
  tonAddress: string;
  isConnected: boolean;
  updatedAt: string;
}

export interface Room {
  id: number;
  game: GameType;
  rules: any;
  stakeTon: number;
  preset: number | null;
  privacy: 'public' | 'private';
  pinHash?: string;
  status: RoomStatus;
  ownerId: number;
  createdAt: string;
}

export interface Match {
  id: number;
  roomId: number;
  gameState: any;
  status: 'active' | 'finished' | 'cancelled';
  winnerUserId?: number;
  createdAt: string;
  finishedAt?: string;
}

export interface Escrow {
  id: number;
  matchId: number;
  adminFeeBps: number;
  potTon: number;
  state: 'initialized' | 'active' | 'resolved' | 'refunded';
  createdAt: string;
  txHashDeposit?: string;
  txHashPayout?: string;
  txHashRefund?: string;
}

export enum RpsMove {
  ROCK = 'rock',
  PAPER = 'paper',
  SCISSORS = 'scissors',
}

export interface InitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface InitDataUnsafe {
  query_id: string;
  user?: InitDataUser;
  receiver?: InitDataUser;
  start_param?: string;
  auth_date: string;
  hash: string;
  chat_type?: 'sender' | 'private' | 'group';
}

/**
 * Generic result returned from the backend when validating initData.
 */
export interface AuthResult {
  userId: number;
  lang: string;
  tgUser: InitDataUser;
  jwt: string;
}

/**
 * Schema for creating a new room.  Used by the frontend when POSTing to /api/rooms.
 */
export interface CreateRoomDto {
  game: GameType;
  rules: any;
  timeFormat: string;
  stake: number;
  privacy: 'public' | 'private';
  pin?: string;
}