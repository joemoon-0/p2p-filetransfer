const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

let peerList = [];  // array of all peerIds connected to the network

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
   res.redirect(`/${uuidV4()}`); 
});

app.get('/favicon.ico', (req, res) => {
    // Capture favicon requests.  Respond 204 - no content
    res.status(204);
});

app.get('/:peerNetwork', (req, res) => {
    res.render('peerNetwork', { networkId: req.params.peerNetwork });
});

io.on('connection', (socket) => {
    // Execution on a peer joining a network
    socket.on('join-network', (networkId, peerId) => {
        // Connect to the network
        socket.join(networkId);
                
        // Update peerList with new peerId
        if (!peerList.includes(peerId)) {
            peerList.push(peerId);
            console.log(peerList);
        }

        // Announce existence to all peers on the network with same networkId
        updatePeers(socket, networkId);
        
        // STEP 4: disconnect from the network when the peer leaves
        socket.on('disconnect', () => {
            peerList.splice(peerList.indexOf(peerId), 1);
            socket.to(networkId).emit('peer-disconnected', peerId);
        });
    });
});

const updatePeers = (socket, networkId) => {
    socket.in(networkId).emit('peer-connected', peerList);
    socket.emit('peer-connected', peerList);
}

//const port = process.env.PORT || 3000;
const port = 3000;
server.listen(port);
