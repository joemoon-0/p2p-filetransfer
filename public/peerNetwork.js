const socket = io("/");
let networkPeers = [];
let selfID = ""; // ID specific to this peer
let conn = ""; // connection object between peers
let networkFileIndex = []; // contains network-wide file metadata: [key: peerId, value: metadata]
let localFileIndex = []; // contains local file metadata: [selfID, filemeta]
let localLibrary = []; // contains local file data: [filemeta, blob]

// Object for transferring messages between peers
class Message {
    constructor(selfID, messageType, message) {
        this.selfID = selfID;
        this.messageType = messageType;
        this.message = message;
    }
}

// PeerJS: API that allows the server to generate a peerId
const peer = new Peer(undefined, {
    host: "/",
    port: "3001",
});

// Open a connection to the network for a newly created peer
peer.on("open", (peerId) => {
    selfID = peerId;
    socket.emit("join-network", NETWORK_ID, peerId);
});

socket.on("peer-connected", (peerList) => {
    console.log("Peer Connected.");
    networkPeers = peerList.splice(0);
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

// --- Upload a file and make it available to peer network ---
const uploadFile = () => {
    if (!document.getElementById("file").files.length) {
        alert("Please select a file to upload.");
        return;
    }

    const file = document.getElementById("file").files[0];

    // Save file meta data for file identification among peers
    const filemeta = {
        lastModified: file.lastModified,
        // lastModifiedDate: file.lastModifiedDate,     // depricated
        name: file.name,
        size: file.size,
        type: file.type,
        webkitRelativePath: file.webkitRelativePath,
    };
    localFileIndex.push(filemeta);

    // Emit file data to network
    socket.emit("registerFile", selfID, filemeta);

    // Save file blob into localLibrary for transfer to a peer
    let startByte = 0;
    let endByte = file.size - 1;
    let reader = new FileReader();

    reader.onloadend = (e) => {
        if (e.target.readyState == FileReader.DONE) {
            localLibrary.push([filemeta, blob]);
        }
    };

    let blob = file.slice(startByte, endByte + 1);
    reader.readAsDataURL(blob);
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
const removeFile = (fileIndex) => {
    fileToRemove = networkFileIndex[fileIndex];

    // Remove file from localFileIndex
    localFileIndex.splice(localFileIndex.indexOf(fileToRemove.key));
    networkFileIndex.splice(fileIndex, 1);

    // Remove file from localLibrary
    localLibrary.forEach((element, index, array) => {
        if (compareMeta(element[0], fileToRemove.value)) {
            array.splice(index, 1);
        }
    });
};

// --- Peer Display Output ---
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
// --- End of Peer Display Output ---

// --- File Display Output ---
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
// --- End of File Display Output ---

const refreshFileDisplay = () => {
    const fileDisplay = document.getElementById("fileList");
    fileDisplay.innerHTML = "";
};

// Establish a connect with the peer that has the file and send request
const download = (fileIndex) => {
    // TODO: handle files held by multiple peers
    // OR redirect in case of peer failure
    let conn = peer.connect(networkFileIndex[fileIndex].key);
    conn.on("open", () => {
        // send meta data for requested file
        conn.send(
            new Message(
                selfID,
                "fileRequest",
                networkFileIndex[fileIndex].value
            )
        );
    });
};

// Receive data from a peer
peer.on("connection", (conn) => {
    // On receiving a Message, process data depending on Message type
    conn.on("data", (data) => {
        if (data.messageType === "fileRequest") {
            // Find requested file in localLibrary
            let fileData = localLibrary.find((element) =>
                compareMeta(element[0], data.message)
            );

            // Send file data to requesting peer
            const response = peer.connect(data.selfID);
            response.on("open", () => {
                response.send(new Message(selfID, "fileBlob", fileData));
            });
        } else if (data.messageType == "fileBlob") {
            // Receive and download request
            saveFile(data.message[0], data.message[1]);

            const meta = data.message[0];
            document.getElementById("file-status").innerHTML = `Downloading File: <span class="listTitle">${meta.name}</span>`;
            document.getElementById("source-peer").innerHTML = `Downloading from Peer: <span class="listTitle">${data.selfID}</span>`;
        }
    });
});

// Save file to disk
const saveFile = (meta, blob) => {
    let link = document.createElement("a");
    link.href = window.URL.createObjectURL(new Blob([blob]));
    link.download = meta.name;
    link.click();
};

// Compares two sets of file meta data
const compareMeta = (meta1, meta2) => {
    return (
        meta1.lastModified === meta2.lastModified &&
        meta1.name === meta2.name &&
        meta1.size === meta2.size &&
        meta1.type === meta2.type
    );
};

// EVENT DELEGATION
document.addEventListener("click", (e) => {
    if (e.target.id == "upload") {
        uploadFile();
    } else if (e.target.innerText == "Remove") {
        removeFile(e.target.id);
        socket.emit("updateFileIndex", networkFileIndex);
    } else if (e.target.innerText == "Download") {
        download(e.target.id);
    }
});
