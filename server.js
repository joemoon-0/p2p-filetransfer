const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

const peerList = [];

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
   res.redirect(`/${uuidV4()}`); 
});

app.get('/:peerNetwork', (req, res) => {
   res.render('peerNetwork', { networkId: req.params.network });
});

// execution when user connects to a network's id-page
io.on('connection', (socket) => {
    // Execution on a peer joining a network
    socket.on('join-network', (networkId, peerId) => {
        // STEP 1: join the network
        socket.join(networkId);
                
        // STEP 2: announce existence to all peers on the network with same networkId
        socket.to(networkId).emit('peer-connected', peerId);

        // STEP 3: disconnect from the network when the peer leaves
        socket.on('disconnect', () => {
            socket.to(networkId).emit('peer-disconnected', peerId);
        });
    });
});

//const port = process.env.PORT || 3000;
const port = 3000;
server.listen(port);
