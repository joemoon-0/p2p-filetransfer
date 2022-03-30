const socket = io('/');
const peers = [];

/* PeerJS: API that allows the server to generate a peerId */
const peer = new Peer(undefined, {
    host: '/', 
    port: '3001'
});

// STEP 1: a peer is created. Calls the server's join-network function
peer.on('open', peerId => {
    // send event to server
    socket.emit('join-network', networkId, peerId);
});

socket.on('peer-connected', (peerId) => {
    console.log("Peer Connected.");
    registerPeer(peerId);
});

socket.on('peer-disconnected', (peerId) => {
    console.log("Peer Disconnected.");
    peers.splice(peers.indexOf(peerId), 1);
    console.log("peers on network: ", peers);
});

const registerPeer = (peerId) => {
    peers.push(peerId);
    console.log("peers on network: ", peersList);
};
