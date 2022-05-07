const socket = io("/");
let networkPeers = [];
let selfID = ""; // ID specific to this peer
let conn = ""; // connection object between peers
let networkFileIndex = []; // contains network-wide file metadata
let localFileIndex = []; // contains local file metadata: [selfID, filemeta]
let localLibrary = []; // contains local file data: [filemeta, blob]

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
    if (!document.getElementById("file").files.length) {
        alert("Please select a file to upload.");
        return;
    }

    const file = document.getElementById("file").files[0];

    // Save file meta data for file identification among peers
    const filemeta = {
        lastModified: file.lastModified,
        // lastModifiedDate: file.lastModifiedDate,
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
            console.log("Local Library => ", localLibrary);
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
const removeFile = (index) => {
    fileToRemove = networkFileIndex[index];

    // Remove file from localFileIndex
    localFileIndex.splice(localFileIndex.indexOf(fileToRemove.key));
    networkFileIndex.splice(index, 1);

    // Remove file from localLibrary
    localLibrary.forEach((element, localIndex, array) => {
        if (compareMeta(element[0], fileToRemove.value)) {
            array.splice(localIndex, 1);
        }
    });
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

// const arrayBufferToBase64 = (buffer) => {
//     let binary = "";
//     let bytes = new Uint8Array(buffer);
//     let len = bytes.byteLength;
//     for (let i = 0; i < len; i++) {
//         binary += String.fromCharCode(bytes[i]);
//     }
//     return btoa(binary);
// };

// const base64ToBlob = (b64Data, contentType) => {
//     contentType = contentType || "";
//     let byteArrays = [];
//     let byteNumbers;
//     let slice;

//     for (let i = 0; i < b64Data.length; i++) {
//         slice = b64Data[i];
//         byteNumbers = new Array(slice.length);
//         for (let j = 0; j < slice.length; j++) {
//             byteNumbers[j] = slice.charCodeAt(j);
//         }

//         let byteArray = new Uint8Array(byteNumbers);
//         byteArrays.push(byteArray);
//     }

//     let blob = new Blob(byteArrays, { type: contentType });
//     return blob;
// };

const saveFile = (meta, blob) => {
    let reader = new FileReader();
    let result = new File([blob], meta.name);
    reader.readAsDataURL(result);
    reader.onload = () => {
        let link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = meta.name;
        link.click();
    };
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
        console.log("REMOVE");
        removeFile(e.target.id);
        socket.emit("updateFileIndex", networkFileIndex);
    } else if (e.target.innerText == "Download") {
        console.log("DOWNLOAD");
    }
});
