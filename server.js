const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
   res.redirect(`/${uuidV4()}`); 
});

app.get('/:peerNode', (req, res) => {
   res.render('peerNode', { nodeId: req.params.node });
});

// execution when user connects to a node's id-page
io.on('connection', (socket) => {
    // Execution on a peer joining a node
    socket.on('join-node', (nodeId, peerId) => {
        // STEP 1: join the node
        socket.join(nodeId);
                
        // STEP 2: announce existence to all peers on the network with same nodeId
        socket.to(nodeId).emit('peer-connected', peerId);

        // STEP 3: disconnect a peer from the network when they leave
        socket.on('disconnect', () => {
            socket.to(nodeId).emit('peer-disconnected', peerId);
        });
    });
});

//const port = process.env.PORT || 3000;
const port = 3000;
server.listen(port);
