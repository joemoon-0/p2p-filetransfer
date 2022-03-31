const socket = io('/');
let networkPeers = [];

// PeerJS: API that allows the server to generate a peerId 
const peer = new Peer(undefined, {
    host: '/', 
    port: '3001'
});

// Open a connection to the network for a newly created peer
peer.on('open', peerId => {
    socket.emit('join-network', NETWORK_ID, peerId);
});

socket.on('peer-connected', (peerList) => {
    console.log("Peer Connected.");

    networkPeers = peerList.splice(0);
    console.log(networkPeers);
});

socket.on('peer-disconnected', (peerId) => {
    console.log("Peer Disconnected.");
    networkPeers.splice(networkPeers.indexOf(peerId), 1);
    console.log("peers on network: ", networkPeers);
});
