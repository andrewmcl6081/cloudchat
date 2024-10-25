// app/server/index.ts
import express from 'express';
import { createServer } from 'http';
import { createRequestHandler } from '@remix-run/express';
import type { ServerBuild } from '@remix-run/node';
import * as build from '../../build/index.js';
import { SocketServer } from './socket.server';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO as singleton
const socketServer = SocketServer.getInstance();
socketServer.initialize(httpServer);

// Serve static files
app.use(express.static('public'));
app.use('/build', express.static('public/build'));

// Handle all other routes with Remix
app.all(
  '*',
  createRequestHandler({
    build: build as unknown as ServerBuild,
    mode: process.env.NODE_ENV,
  })
);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});