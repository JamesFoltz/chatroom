
function randomId() {
    return Math.random()
        .toString(36)
        .substr(2, 9);
}

function copyToClipboard() {
    const copyText = document.getElementById("shareable-link").innerText;
    const textArea = document.createElement("textarea");
    textArea.value = copyText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
}

class RandomColorGenerator {
    constructor() {
        this.cache = {};
    }
    hashCode(s) {
        let n = s.split("").reduce(function (a, b) {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
        }, 0);
        n = Math.abs(n);
        const x = "0." + n.toString();
        return parseFloat(x);
    }
    generateColor(key) {
        if (key in this.cache) {
            return this.cache[key];
        } else {
            const color =
                "#" +
                (((1 << 24) * /* Math.random() */ this.hashCode(key)) | 0).toString(16);
            this.cache[key] = color;
            return color;
        }
    }
}

function selectText(id) {
    var sel, range;
    var el = document.getElementById(id); //get element id
    if (window.getSelection && document.createRange) { //Browser compatibility
        sel = window.getSelection();
        if (sel.toString() == '') { //no text selection
            window.setTimeout(function () {
                range = document.createRange(); //range object
                range.selectNodeContents(el); //sets Range
                sel.removeAllRanges(); //remove all ranges from selection
                sel.addRange(range);//add Range to a Selection.
            }, 1);
        }
    } else if (document.selection) { //older ie
        sel = document.selection.createRange();
        if (sel.text == '') { //no text selection
            range = document.body.createTextRange();//Creates TextRange object
            range.moveToElementText(el);//sets Range
            range.select(); //make selection.
        }
    }

    copyToClipboard()
}

async function main() {
    const randomColorGenerator = new RandomColorGenerator();
    const maxPeers = 5;
    const peerId = prompt("Please pick a username").toLowerCase().replace(/\s/, "");
    const chatMessages = [];
    const chatPanel = document.getElementById("chat-panel");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");

    const appendMessageElement = (messageID, peerId, message) => {
        console.log("* appendMessageElement: ", messageID, peerId, message);
        if (chatMessages.find(m => m.id === messageID)) { // Message already exists
            return;
        }

        chatMessages.push({ id: messageID, peerId: peerId, message: message });
        const messageContainer = document.createElement("div");
        messageContainer.classList.add("message-container")
        const sender = document.createElement("code");
        sender.classList.add("sender")
        sender.innerText = peerId
        sender.style.color = randomColorGenerator.generateColor(peerId);
        const messageElement = document.createElement("p");
        messageElement.classList.add("message");
        messageElement.innerText = message;
        messageContainer.appendChild(sender);
        messageContainer.appendChild(messageElement);
        chatPanel.appendChild(messageContainer)


        chatPanel.scrollTop = chatPanel.scrollHeight * 2;
    }

    const targetRoomIdMatch = location.search.match(/roomId\=(.+)$/);
    let roomId = "";
    if (targetRoomIdMatch) {
        roomId = targetRoomIdMatch[1];
    }

    const peer = new Korona.Korona({
        peerId: peerId,
        roomId: roomId,
        peerJSOptions: {
            // debug: 2,
            // host: "crossnote.app",
            // path: "/peer",
            // secure: true,
        },
        maxPeers: maxPeers,
    });

    peer.on("open", async (peerId) => {
        document.getElementById("peer-id").innerText = peerId;
        document.getElementById("peer-id").style.color = randomColorGenerator.generateColor(peerId);
        document.getElementById("shareable-link").innerText =
            location.protocol + "//" + location.host + location.pathname + "?peerId=" + peer.peer.id;

        messageInput.placeholder = "Enter your message here"
        messageInput.disabled = false;

        const sendMessage = () => {
            const value = messageInput.value.trim();
            if (!value.length) {
                messageInput.value = "";
                return;
            }
            messageInput.value = "";
            messageInput.focus();

            // broadcast
            const messageID = randomId();
            peer.broadcast({
                type: "SendMessage",
                id: messageID,
                peerId: peerId,
                message: value
            });

            // create dom element
            appendMessageElement(messageID, peerId, value);
        }

        messageInput.addEventListener("keydown", (event) => {
            if (event.which === 13) {
                sendMessage();
            }
        })
        sendButton.addEventListener("click", () => {
            sendMessage();
        })


        const targetPeerIDMatch = location.search.match(/peerId\=(.+)$/);
        if (targetPeerIDMatch) {
            const targetPeerID = targetPeerIDMatch[1];
            peer.requestConnection(targetPeerID);
        }

        peer.on("peerJoined", async (peerId) => {
            console.log("peer joined: ", peerId);
            document.getElementById("peers-number").innerText = peer.network.size;
        })

        peer.on("peerLeft", async (peerId) => {
            console.log("peer left: ", peerId);
            document.getElementById("peers-number").innerText = peer.network.size;
        })

        peer.on("data", (data) => {
            console.log("received data: ", data)
            if (data.type === "SendMessage") {
                appendMessageElement(data.id, data.peerId, data.message);
            } else if (data.type === "ChatMessages") {
                const chatMessages = data.messages;
                chatMessages.forEach((chatMessage) => {
                    appendMessageElement(chatMessage.id, chatMessage.peerId, chatMessage.message);
                })
            }
        })

        peer.on("disconnected", () => {
            console.log("Disconnected");
        })

        peer.on("close", () => {
            console.log("Close")
        })

        peer.on("pubsubHostChanged", () => {
            console.log("pubsubHostChanged")
        })

        peer.on("sync", async (send) => {
            send({
                type: "ChatMessages",
                messages: chatMessages,
            })
        })

    })

    window["peer"] = peer;
}

main();
