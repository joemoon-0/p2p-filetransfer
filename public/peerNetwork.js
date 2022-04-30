const socket = io("/");
let networkPeers = [];
let selfID = ""; // ID specific to this peer

// PeerJS: API that allows the server to generate a peerId
const peer = new Peer(undefined, {
    host: "/",
    port: "3001",
});

const file = document.getElementById("file");


// Open a connection to the network for a newly created peer
peer.on("open", (peerId) => {
    selfID = peerId;
    socket.emit("join-network", NETWORK_ID, peerId);
});

socket.on("peer-connected", (peerList) => {
    console.log("Peer Connected.");

    networkPeers = peerList.splice(0);
    console.log(networkPeers);

    printPeerDisplay(networkPeers);
});

socket.on("peer-disconnected", (peerId) => {
    console.log("Peer Disconnected.");
    networkPeers.splice(networkPeers.indexOf(peerId), 1);
    console.log("peers on network: ", networkPeers);
    printPeerDisplay(networkPeers);
});

const printPeerDisplay = (networkPeers) => {
    refreshPeerDisplay();

    const peerDisplay = document.getElementById("peerList");

    networkPeers.forEach((peer, index) => {
        const newRow = document.createElement("div");
        if (peer == selfID) {
            newRow.className = "row self";
        } else {
            newRow.className = "row";
        }
        newRow.innerHTML = `<div class="col-2 text-center">${index}</div><div class="col text-center">${peer}</div>`;
        peerDisplay.append(newRow);
    });
};

const refreshPeerDisplay = () => {
    const peerDisplay = document.getElementById("peerList");
    peerDisplay.innerHTML = ``;
};


const uploadFile = () => {
    console.log("UPLOADFILE => ", file.files); 
    if (file.files.length > 0) {
        const fileInfo = file.files[0];
        const filemeta = {
            lastModified: fileInfo.lastModified,
            lastModifiedDate: fileInfo.lastModifiedDate,
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type,
            webkitRelativePath: fileInfo.webkitRelativePath
        };
        socket.emit("registerFile", selfID, filemeta);
    }
}

document.getElementById("upload").addEventListener("click", uploadFile);
