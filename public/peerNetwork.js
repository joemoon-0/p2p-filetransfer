const socket = io("/");
let networkPeers = [];
let selfID = ""; // ID specific to this peer
let conn = ""; // connection object between peers
let networkFileIndex = [];
let localFileIndex = [];

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
    // Remove Peer from network
    console.log("Peer Disconnected.");
    networkPeers.splice(networkPeers.indexOf(peerId), 1);
    printPeerDisplay(networkPeers);

    // Remove Peer's files from library
    removeAllFiles(peerId);
    printFileDisplay(networkFileIndex, localFileIndex);
});

socket.on("receiveFileData", (fileIndex) => {
    networkFileIndex = fileIndex.splice(0);
    printFileDisplay(networkFileIndex, localFileIndex);
});

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
            webkitRelativePath: fileInfo.webkitRelativePath,
        };
        localFileIndex.push(filemeta);

        // Emit file data to network
        socket.emit("registerFile", selfID, filemeta);
    }
};

// Removes all files from networkFileIndex associated with peerId
const removeAllFiles = (peerId) => {
    networkFileIndex.forEach((element, index, array) => {
        if (!networkPeers.includes(element.key)) {
            array.splice(index, 1);
        }
    });
};

// Removes a file from networkFileIndex associated with its file index
const removeFile = (index) => {
    fileToRemove = networkFileIndex[index];
    localFileIndex.splice(localFileIndex.indexOf(fileToRemove.key));
    networkFileIndex.splice(index, 1);
};

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

const printFileDisplay = (networkFileIndex, localFileIndex) => {
    refreshFileDisplay();
    const fileDisplay = document.getElementById("fileList");

    let counterID = 0;

    networkFileIndex.forEach((fileObject) => {
        const downloadBtn = document.createElement("button");
        downloadBtn.className = "btn btn-primary";
        downloadBtn.innerText = "Download";
        downloadBtn.setAttribute("id", `${counterID}`);

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-danger";
        removeBtn.innerText = "Remove";
        removeBtn.setAttribute("id", `${counterID}`);

        const newRow = document.createElement("div");
        newRow.innerHTML = `<div class="col-3 text-center"></div><div class="col text-center">${fileObject.value.name}</div>`;
        if (fileObject.key == selfID) {
            newRow.className = "row";
            newRow.firstChild.append(removeBtn);
            newRow.getElementsByTagName("div")[1].classList.add("self");
        } else {
            newRow.className = "row";
            newRow.firstChild.append(downloadBtn);
        }
        fileDisplay.append(newRow);

        counterID++;
    });
};

const refreshFileDisplay = () => {
    const fileDisplay = document.getElementById("fileList");
    fileDisplay.innerHTML = "";
};

const arrayBufferToBase64 = (buffer) => {
    let binary = "";
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// EVENT LISTENERS
// document.getElementById("upload").addEventListener("click", uploadFile);
document.addEventListener("click", (e) => {
    if (e.target.id == "upload") {
        uploadFile();
    } else if (e.target.innerText == "Remove") {
        console.log("REMOVE");
        removeFile(e.target.id);
        socket.emit("updateFileIndex", networkFileIndex);
    }
});
