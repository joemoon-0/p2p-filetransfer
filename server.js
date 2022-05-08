const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

let peerList = []; // array of all peerIds connected to the network
let fileIndex = []; // array of available files on the network

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.get("/favicon.ico", (req, res) => {
    // Capture favicon requests.  Respond 204 - no content
    res.status(204);
});

app.get("/:peerNetwork", (req, res) => {
    res.render("peerNetwork", { networkId: req.params.peerNetwork });
});

io.on("connection", (socket) => {
    // Execution on a peer joining a network
    socket.on("join-network", (networkId, peerId) => {
        // Connect to the network
        socket.join(networkId);
        registerPeer(socket, networkId, peerId);
        socket.emit("receiveFileData", fileIndex);

        socket.on("registerFile", (peerId, file) => {
            const fileData = {
                key: peerId,
                value: file, // meta data
            };
            fileIndex.push(fileData);
            socket.in(networkId).emit("receiveFileData", fileIndex);
            socket.emit("receiveFileData", fileIndex);
        });

        socket.on("updateFileIndex", (networkFileIndex) => {
            fileIndex = networkFileIndex.splice(0);
            socket.in(networkId).emit("receiveFileData", fileIndex);
            socket.emit("receiveFileData", fileIndex);
        });

        // Disconnect from the network when the peer leaves
        socket.on("disconnect", () => {
            peerList.splice(peerList.indexOf(peerId), 1);
            fileIndex.forEach((element, index, array) => {
                if (!peerList.includes(peerId)) {
                    array.splice(index, 1);
                }
            });
            socket.to(networkId).emit("peer-disconnected", peerId);
        });
    });
});

// Registers a peer when it joins the network
const registerPeer = (socket, networkId, peerId) => {
    // Update peerList with new peerId
    if (!peerList.includes(peerId)) {
        peerList.push(peerId);
        console.log("Peers registered on network => ", peerList);
    }

    // Announce existence to all peers on the network with same networkId
    socket.in(networkId).emit("peer-connected", peerList);
    socket.emit("peer-connected", peerList);
};

const port = 3000;
server.listen(port);
