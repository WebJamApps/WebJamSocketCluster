import type mongoose from 'mongoose';

export interface ISocketConsumer<T = unknown> {
  next(): Promise<{ value?: T; done?: boolean }>;
}

export interface ISocketListener {
  createConsumer(): ISocketConsumer;
}

export interface ISocketExchange {
  transmitPublish(channel: string, data: unknown): void;
}

export interface ISocket {
  id?: string;
  transmit?: (event: string, data?: unknown) => void;
  receiver?: (event: string) => { createConsumer: () => ISocketConsumer };
  listener?: (event: string) => { createConsumer: () => ISocketConsumer };
  [key: string]: unknown;
}

export interface IClient {
  socket?: ISocket;
  listener?: (event: string) => { createConsumer: () => ISocketConsumer };
  id?: string | number;
  [key: string]: unknown;
}

export interface IGig {
  _id?: string | mongoose.Types.ObjectId;
  venueId?: string | mongoose.Types.ObjectId;
  venue?: string;
  artist?: string;
  datetime?: string | Date;
  tickets?: string;
  location?: string;
  [key: string]: unknown;
}

export interface IJamPic {
  _id?: string | mongoose.Types.ObjectId;
  url?: string;
  caption?: string;
  [key: string]: unknown;
}

export interface IGigsForArtistPayload {
  artist?: string;
}

export interface INewTourPayload {
  gig?: IGig;
  tour?: IGig;
  token?: string;
}

export interface INewImagePayload {
  token?: string;
  image?: IJamPic;
}

export interface IRemoveImagePayload {
  data?: string;
  token?: string;
}

export interface IRemoveGigPayload {
  gig?: { gigId?: string; tourId?: string };
  tour?: { gigId?: string; tourId?: string };
  token?: string;
}

export interface IUpdateImagePayload {
  data?: IJamPic;
  token?: string;
}

export interface IEditGigPayload {
  gig?: IGig;
  tour?: IGig;
  token?: string;
}

export interface IUser {
  userType?: string;
  privileges?: string[];
  [key: string]: unknown;
}

export type SortOrder = Record<string, 'asc' | 'desc' | number>;
export type QueryFilter = Record<string, unknown>;
